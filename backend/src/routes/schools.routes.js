const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { centralQuery, getPoolForDatabase } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/rbac');
const { asyncHandler, paginate, paginatedResponse } = require('../utils/helpers');
const {
  LOCAL_SCHOOL_ID,
  buildTenantDatabaseName,
  ensureCentralTenantColumns,
  provisionSchoolDatabase,
  syncTenantSchoolMetadata
} = require('../services/tenantDatabaseService');

router.get('/', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  await ensureCentralTenantColumns();
  const { page = 1, limit = 30, search = '' } = req.query;
  const { pageNum, limitNum, offset } = paginate(page, limit);
  const searchParam = `%${search}%`;

  const [rows, countResult] = await Promise.all([
    centralQuery(`SELECT s.id, s.name, s.slug, s.subdomain, s.code, s.domain, s.is_active,
                  s.database_name, s.database_status, s.database_created_at, s.created_at,
                  0::int AS users_count,
                  0::int AS classes_count
           FROM schools s
           WHERE s.name ILIKE $1 OR s.code ILIKE $1 OR s.slug ILIKE $1 OR COALESCE(s.subdomain, '') ILIKE $1
           ORDER BY s.created_at DESC
           LIMIT $2 OFFSET $3`, [searchParam, limitNum, offset]),
    centralQuery(`SELECT COUNT(*)::int AS total FROM schools WHERE name ILIKE $1 OR code ILIKE $1 OR slug ILIKE $1 OR COALESCE(subdomain, '') ILIKE $1`, [searchParam])
  ]);

  res.json({ success: true, ...paginatedResponse(rows.rows, countResult.rows[0].total, pageNum, limitNum) });
}));

router.get('/:id/users', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  await ensureCentralTenantColumns();
  const schoolResult = await centralQuery(
    'SELECT id, name, database_name FROM schools WHERE id = $1 LIMIT 1',
    [req.params.id]
  );
  const school = schoolResult.rows[0];
  if (!school) return res.status(404).json({ success: false, message: 'Мектеп табылмады' });
  if (!school.database_name) {
    return res.json({ success: true, data: [], pagination: { total: 0, page: 1, limit: 50, pages: 0 } });
  }

  const { page = 1, limit = 50, search = '' } = req.query;
  const { pageNum, limitNum, offset } = paginate(page, limit);
  const searchParam = `%${search}%`;
  const pool = getPoolForDatabase(school.database_name);
  const [rows, countResult] = await Promise.all([
    pool.query(
      `SELECT u.id, u.full_name, u.iin, u.is_active, u.created_at, r.name AS role, u.school_id
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.school_id = $1
         AND (u.full_name ILIKE $2 OR u.iin ILIKE $2)
       ORDER BY u.created_at DESC
       LIMIT $3 OFFSET $4`,
      [LOCAL_SCHOOL_ID, searchParam, limitNum, offset]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM users u
       WHERE u.school_id = $1
         AND (u.full_name ILIKE $2 OR u.iin ILIKE $2)`,
      [LOCAL_SCHOOL_ID, searchParam]
    )
  ]);

  res.json({ success: true, ...paginatedResponse(rows.rows, countResult.rows[0].total, pageNum, limitNum) });
}));

router.post('/:id/admin-password', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  await ensureCentralTenantColumns();
  const { password = 'Admin123!', admin_iin = '000000000001' } = req.body || {};

  if (!password || String(password).length < 6) {
    return res.status(400).json({ success: false, message: 'Пароль кемінде 6 таңбадан тұруы керек' });
  }

  const schoolResult = await centralQuery(
    'SELECT id, name, database_name, database_status FROM schools WHERE id = $1 LIMIT 1',
    [req.params.id]
  );
  const school = schoolResult.rows[0];
  if (!school) return res.status(404).json({ success: false, message: 'Мектеп табылмады' });
  if (!school.database_name || school.database_status !== 'ready') {
    return res.status(409).json({ success: false, message: 'Мектептің жеке дерекқоры дайын емес' });
  }

  const pool = getPoolForDatabase(school.database_name);
  const roleResult = await pool.query("SELECT id FROM roles WHERE name = 'admin' LIMIT 1");
  if (!roleResult.rows[0]) {
    return res.status(500).json({ success: false, message: 'Admin рөлі табылмады' });
  }

  let userResult = await pool.query(
    `SELECT u.id, u.full_name, u.iin, u.school_id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.school_id = $1 AND u.iin = $2 AND r.name = 'admin'
     LIMIT 1`,
    [LOCAL_SCHOOL_ID, admin_iin]
  );

  if (!userResult.rows[0]) {
    userResult = await pool.query(
      `SELECT u.id, u.full_name, u.iin, u.school_id
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.school_id = $1 AND r.name = 'admin'
       ORDER BY u.created_at ASC
       LIMIT 1`,
      [LOCAL_SCHOOL_ID]
    );
  }

  let admin = userResult.rows[0];
  const hash = await bcrypt.hash(String(password), 10);

  if (admin) {
    const updated = await pool.query(
      `UPDATE users
       SET password_hash = $1, is_active = TRUE, updated_at = NOW()
       WHERE id = $2 AND school_id = $3
       RETURNING id, full_name, iin, school_id`,
      [hash, admin.id, LOCAL_SCHOOL_ID]
    );
    admin = updated.rows[0];
  } else {
    const created = await pool.query(
      `INSERT INTO users (full_name, iin, password_hash, role_id, school_id, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, full_name, iin, school_id`,
      [`${school.name} әкімші`, admin_iin, hash, roleResult.rows[0].id, LOCAL_SCHOOL_ID]
    );
    admin = created.rows[0];
  }

  res.json({
    success: true,
    message: 'Мектеп админінің паролі жаңартылды',
    data: { admin }
  });
}));

router.get('/:id', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  await ensureCentralTenantColumns();
  const result = await centralQuery('SELECT * FROM schools WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Мектеп табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

router.post('/', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  await ensureCentralTenantColumns();
  const { name, slug, code, domain, subdomain, admin_name, admin_iin, admin_password } = req.body;
  if (!name || !slug || !code) return res.status(400).json({ success: false, message: 'Мектеп атауы, slug және коды міндетті' });

  const normalizedSlug = String(slug).trim().toLowerCase();
  const normalizedSubdomain = String(subdomain || normalizedSlug).trim().toLowerCase();
  const normalizedCode = String(code).trim().toUpperCase();
  const duplicate = await centralQuery(
    `SELECT id FROM schools
     WHERE slug = $1 OR code = $2 OR subdomain = $3
     LIMIT 1`,
    [normalizedSlug, normalizedCode, normalizedSubdomain]
  );
  if (duplicate.rows[0]) {
    return res.status(409).json({ success: false, message: 'Slug, код немесе subdomain бұрын қолданылған' });
  }

  const databaseName = buildTenantDatabaseName(normalizedSlug, normalizedCode);
  const existingDb = await centralQuery('SELECT id FROM schools WHERE database_name = $1 LIMIT 1', [databaseName]);
  if (existingDb.rows[0]) {
    return res.status(409).json({ success: false, message: 'Бұл мектеп үшін дерекқор атауы бұрын қолданылған' });
  }

  let school;
  try {
    const schoolResult = await centralQuery(
      `INSERT INTO schools (name, slug, code, domain, subdomain, database_name, database_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'provisioning')
       RETURNING *`,
      [name.trim(), normalizedSlug, normalizedCode, domain || null, normalizedSubdomain, databaseName]
    );
    school = schoolResult.rows[0];

    const provisioned = await provisionSchoolDatabase({
      school,
      admin: { admin_name, admin_iin, admin_password }
    });

    const readyResult = await centralQuery(
      `UPDATE schools SET database_status = 'ready', database_created_at = NOW(), database_error = NULL
       WHERE id = $1
       RETURNING *`,
      [school.id]
    );

    res.status(201).json({
      success: true,
      data: {
        school: readyResult.rows[0],
        default_admin: provisioned.default_admin,
        default_password: provisioned.default_password
      }
    });
  } catch (error) {
    if (school?.id) {
      await centralQuery(
        `UPDATE schools SET database_status = 'failed', database_error = $1, updated_at = NOW()
         WHERE id = $2`,
        [error.message, school.id]
      ).catch(() => {});
    }
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Мектеп немесе админ деректері қайталанып тұр' });
    }
    throw error;
  }
}));

router.put('/:id', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  await ensureCentralTenantColumns();
  const { name, slug, code, domain, subdomain, is_active } = req.body;
  const normalizedSlug = slug ? String(slug).trim().toLowerCase() : null;
  const normalizedSubdomain = subdomain ? String(subdomain).trim().toLowerCase() : null;
  const normalizedCode = code ? String(code).trim().toUpperCase() : null;

  const result = await centralQuery(
    `UPDATE schools SET
      name = COALESCE($1, name),
      slug = COALESCE($2, slug),
      code = COALESCE($3, code),
      domain = COALESCE($4, domain),
      subdomain = COALESCE($5, subdomain),
      is_active = COALESCE($6, is_active, is_active),
      updated_at = NOW()
     WHERE id = $7 RETURNING *`,
    [name, normalizedSlug, normalizedCode, domain, normalizedSubdomain, is_active, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Мектеп табылмады' });
  await syncTenantSchoolMetadata(result.rows[0]).catch((error) => {
    console.error('Tenant school metadata sync failed:', error.message);
  });
  res.json({ success: true, data: result.rows[0] });
}));

router.delete('/:id', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  await ensureCentralTenantColumns();
  const result = await centralQuery(
    'UPDATE schools SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id',
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Мектеп табылмады' });
  res.json({ success: true, message: 'Мектеп өшірілді' });
}));

module.exports = router;
