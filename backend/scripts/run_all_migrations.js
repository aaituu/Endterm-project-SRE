const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const configDir = path.resolve(__dirname, '..', 'src', 'config');
const migrationFiles = [
  'migration_v3.sql',
  'migration_educational.sql',
  'migration_v4_teacher_dashboard.sql',
  'migration_v5_teacher_extended.sql',
  'migration_v6_admin_ui.sql',
  'migration_v7_admin_modules.sql',
  'migration_v8_admin_screens.sql',
  'migration_v9_olympiad_dictionaries.sql',
  'migration_v10_events.sql',
  'migration_v11_ratings_competitions.sql',
  'migration_v12_lesson_observations.sql',
  'migration_v13_site_content.sql',
  'migration_v14_teacher_courses.sql',
  'migration_v15_user_import.sql',
  'migration_v16_school_databases.sql',
  'migration_v17_telegram.sql'
];

function readSql(fileName) {
  return fs.readFileSync(path.join(configDir, fileName), 'utf8');
}

function expandSqlIncludes(filePath, seen = new Set()) {
  const resolved = path.resolve(filePath);
  if (seen.has(resolved)) return '';
  seen.add(resolved);

  const dir = path.dirname(resolved);
  const sql = fs.readFileSync(resolved, 'utf8');
  return sql
    .replace(/^\\ir\s+(.+)$/gm, (_, includeName) => {
      return expandSqlIncludes(path.resolve(dir, includeName.trim()), seen);
    })
    .replace(/^COMMIT;\s*$/gm, '');
}

async function tableExists(pool, tableName) {
  const result = await pool.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return Boolean(result.rows[0]);
}

async function ensureMigrationTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function markMigration(client, fileName) {
  await client.query(
    'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
    [fileName]
  );
}

async function migrationApplied(pool, fileName) {
  const result = await pool.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [fileName]);
  return Boolean(result.rows[0]);
}

async function run() {
  const shouldRunSchema = process.argv.includes('--with-schema');
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'school_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    connectionTimeoutMillis: 10000
  });

  try {
    const hasBaseSchema = await tableExists(pool, 'roles');
    if (shouldRunSchema || !hasBaseSchema) {
      console.log('Applying base database schema...');
      const schemaSql = expandSqlIncludes(path.join(configDir, 'database.sql'));
      await pool.query(schemaSql);
    }

    await ensureMigrationTable(pool);

    for (const fileName of migrationFiles) {
      if (await migrationApplied(pool, fileName)) {
        console.log(`Skipping ${fileName}: already applied`);
        continue;
      }

      const client = await pool.connect();
      try {
        console.log(`Applying ${fileName}...`);
        await client.query('BEGIN');
        await client.query(readSql(fileName));
        await markMigration(client, fileName);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`${fileName} failed: ${error.message}`);
      } finally {
        client.release();
      }
    }

    console.log('Database migrations completed.');
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
