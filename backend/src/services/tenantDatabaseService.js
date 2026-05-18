const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const {
  centralQuery,
  getPoolForDatabase,
  withTenantDatabase
} = require('../config/db');

const SCHEMA_PATH = path.join(__dirname, '..', 'config', 'database.sql');
const LOCAL_SCHOOL_ID = 1;

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function normalizeTenantToken(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  if (!normalized) return `school_${Date.now()}`;
  if (/^\d/.test(normalized)) return `school_${normalized}`;
  return normalized;
}

function buildTenantDatabaseName(slug, code) {
  const prefix = normalizeTenantToken(process.env.DB_TENANT_PREFIX || 'school_tenant');
  const token = normalizeTenantToken(slug || code);
  return `${prefix}_${token}`.slice(0, 63);
}

async function ensureCentralTenantColumns() {
  await centralQuery('ALTER TABLE schools ADD COLUMN IF NOT EXISTS database_name VARCHAR(120)');
  await centralQuery("ALTER TABLE schools ADD COLUMN IF NOT EXISTS database_status VARCHAR(40) DEFAULT 'pending'");
  await centralQuery('ALTER TABLE schools ADD COLUMN IF NOT EXISTS database_created_at TIMESTAMPTZ');
  await centralQuery('ALTER TABLE schools ADD COLUMN IF NOT EXISTS database_error TEXT');
  await centralQuery(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_database_name
    ON schools(database_name)
    WHERE database_name IS NOT NULL
  `);
}

function expandSqlIncludes(filePath, seen = new Set()) {
  const resolved = path.resolve(filePath);
  if (seen.has(resolved)) return '';
  seen.add(resolved);

  const dir = path.dirname(resolved);
  const sql = fs.readFileSync(resolved, 'utf8');
  return sql.replace(/^\\ir\s+(.+)$/gm, (_, includeName) => {
    const includePath = path.resolve(dir, includeName.trim());
    return expandSqlIncludes(includePath, seen);
  });
}

async function databaseExists(databaseName) {
  const result = await centralQuery('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  return !!result.rows[0];
}

async function createDatabaseIfMissing(databaseName) {
  if (await databaseExists(databaseName)) return false;
  await centralQuery(`CREATE DATABASE ${quoteIdent(databaseName)} TEMPLATE template0 ENCODING 'UTF8'`);
  return true;
}

async function applyTenantSchema(databaseName) {
  const tenantPool = getPoolForDatabase(databaseName);
  const sql = expandSqlIncludes(SCHEMA_PATH);
  await tenantPool.query(sql);
}

async function configureTenantSchool(databaseName, school) {
  const pool = getPoolForDatabase(databaseName);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO schools (id, name, slug, code, domain, subdomain, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         code = EXCLUDED.code,
         domain = EXCLUDED.domain,
         subdomain = EXCLUDED.subdomain,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()`,
      [
        LOCAL_SCHOOL_ID,
        school.name,
        school.slug,
        school.code,
        school.domain || null,
        school.subdomain || school.slug,
        school.is_active !== false
      ]
    );

    await client.query(
      `UPDATE users
       SET is_active = FALSE, updated_at = NOW()
       WHERE iin = '000000000001'
         AND role_id = (SELECT id FROM roles WHERE name = 'super_admin')`
    );

    await client.query('DELETE FROM administration WHERE school_id = $1', [LOCAL_SCHOOL_ID]);
    await client.query('DELETE FROM teachers WHERE COALESCE(school_id, $1) = $1', [LOCAL_SCHOOL_ID]);
    await client.query('DELETE FROM news WHERE COALESCE(school_id, $1) = $1', [LOCAL_SCHOOL_ID]);
    await client.query('DELETE FROM gallery WHERE COALESCE(school_id, $1) = $1', [LOCAL_SCHOOL_ID]);
    await client.query('DELETE FROM slides WHERE COALESCE(school_id, $1) = $1', [LOCAL_SCHOOL_ID]);
    await client.query('DELETE FROM site_content');

    await client.query(
      `INSERT INTO slides (school_id, title_kz, quote, sort_order, is_active)
       VALUES ($1, $2, 'Сапалы білім және қауіпсіз мектеп ортасы.', 1, TRUE)
       ON CONFLICT DO NOTHING`,
      [LOCAL_SCHOOL_ID, school.name]
    );

    await client.query(
      `INSERT INTO site_content (section, content_key, title, body, sort_order, is_active)
       VALUES
         ('history', 'start', 'Мектеп туралы', $1, 1, TRUE),
         ('programs', 'primary', 'Бастауыш сынып', '1-4 сыныптар бойынша оқу үдерісі.', 1, TRUE),
         ('programs', 'middle', 'Негізгі мектеп', '5-9 сыныптар бойынша негізгі білім беру.', 2, TRUE),
         ('programs', 'high', 'Жоғары мектеп', '10-11 сыныптар бойынша бейіндік дайындық.', 3, TRUE)
       ON CONFLICT DO NOTHING`,
      [`${school.name} ресми мектеп парақшасы.`]
    );

    await client.query(
      `INSERT INTO stats (key, value, label) VALUES
         ('teachers_count', '0', 'Мұғалімдер саны'),
         ('students_count', '0', 'Оқушылар саны'),
         ('experience_years', '0', 'Тәжірибе жылдары'),
         ('founded_year', EXTRACT(YEAR FROM CURRENT_DATE)::text, 'Тіркелген жыл')
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, label = EXCLUDED.label`
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function createOrUpdateTenantAdmin(databaseName, school, admin = {}) {
  const pool = getPoolForDatabase(databaseName);
  const iin = admin.admin_iin || '000000000001';
  const password = admin.admin_password || 'Admin123!';
  const passwordHash = await bcrypt.hash(password, 10);
  const fullName = admin.admin_name || `${school.name} әкімші`;

  const existing = await pool.query(
    `SELECT u.id, r.name AS role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.iin = $1
     LIMIT 1`,
    [iin]
  );

  if (existing.rows[0]) {
    const shouldResetPassword = existing.rows[0].role === 'super_admin' || admin.admin_password;
    const result = await pool.query(
      `UPDATE users SET
         full_name = $1,
         role_id = (SELECT id FROM roles WHERE name = 'admin'),
         school_id = $2,
         is_active = TRUE,
         ${shouldResetPassword ? 'password_hash = $3,' : ''}
         updated_at = NOW()
       WHERE id = $${shouldResetPassword ? 4 : 3}
       RETURNING id, full_name, iin, school_id`,
      shouldResetPassword
        ? [fullName, LOCAL_SCHOOL_ID, passwordHash, existing.rows[0].id]
        : [fullName, LOCAL_SCHOOL_ID, existing.rows[0].id]
    );
    return { admin: result.rows[0], password: shouldResetPassword ? password : null };
  }

  const result = await pool.query(
    `INSERT INTO users (full_name, iin, password_hash, role_id, school_id, is_active)
     VALUES ($1, $2, $3, (SELECT id FROM roles WHERE name = 'admin'), $4, TRUE)
     RETURNING id, full_name, iin, school_id`,
    [fullName, iin, passwordHash, LOCAL_SCHOOL_ID]
  );

  return { admin: result.rows[0], password };
}

async function provisionSchoolDatabase({ school, admin = {} }) {
  await ensureCentralTenantColumns();
  const databaseName = school.database_name || buildTenantDatabaseName(school.slug, school.code);
  await createDatabaseIfMissing(databaseName);
  await applyTenantSchema(databaseName);
  await configureTenantSchool(databaseName, { ...school, database_name: databaseName });
  const defaultAdmin = await createOrUpdateTenantAdmin(databaseName, school, admin);
  return { database_name: databaseName, default_admin: defaultAdmin.admin, default_password: defaultAdmin.password };
}

async function syncTenantSchoolMetadata(school) {
  if (!school?.database_name) return;
  await withTenantDatabase(school.database_name, { school }, async () => {
    const pool = getPoolForDatabase(school.database_name);
    await pool.query(
      `UPDATE schools SET
         name = $1,
         slug = $2,
         code = $3,
         domain = $4,
         subdomain = $5,
         is_active = $6,
         updated_at = NOW()
       WHERE id = $7`,
      [
        school.name,
        school.slug,
        school.code,
        school.domain || null,
        school.subdomain || school.slug,
        school.is_active !== false,
        LOCAL_SCHOOL_ID
      ]
    );
  });
}

module.exports = {
  LOCAL_SCHOOL_ID,
  buildTenantDatabaseName,
  ensureCentralTenantColumns,
  provisionSchoolDatabase,
  syncTenantSchoolMetadata
};
