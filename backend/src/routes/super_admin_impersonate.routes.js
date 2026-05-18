const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { centralQuery, getPoolForDatabase } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../utils/helpers');
const { LOCAL_SCHOOL_ID, ensureCentralTenantColumns } = require('../services/tenantDatabaseService');

const generateIin = () => {
  return Math.floor(100000000000 + Math.random() * 900000000000).toString();
};

router.post('/:schoolId', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  await ensureCentralTenantColumns();
  const { schoolId } = req.params;
  const schoolResult = await centralQuery(
    'SELECT id, name, slug, subdomain, database_name, database_status FROM schools WHERE id = $1',
    [schoolId]
  );
  const school = schoolResult.rows[0];
  if (!school) {
    return res.status(404).json({ success: false, message: 'Мектеп табылмады' });
  }
  if (!school.database_name || school.database_status !== 'ready') {
    return res.status(409).json({ success: false, message: 'Мектептің жеке дерекқоры дайын емес' });
  }

  const pool = getPoolForDatabase(school.database_name);
  const adminRoleResult = await pool.query('SELECT id FROM roles WHERE name = $1', ['admin']);
  if (!adminRoleResult.rows[0]) {
    return res.status(500).json({ success: false, message: 'Администратор рөлі анықталған жоқ' });
  }
  const adminRoleId = adminRoleResult.rows[0].id;

  let userResult = await pool.query(
    `SELECT u.*, r.name AS role, r.label_kz AS role_label
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.school_id = $1 AND r.name = 'admin' AND u.is_active = TRUE
     ORDER BY u.created_at ASC
     LIMIT 1`,
    [LOCAL_SCHOOL_ID]
  );

  let user = userResult.rows[0];
  if (!user) {
    const newIin = generateIin();
    const passwordHash = await bcrypt.hash(`${newIin.slice(0, 6)}A!`, 10);
    const createResult = await pool.query(
      `INSERT INTO users (full_name, iin, password_hash, role_id, school_id, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, full_name, iin, role_id, school_id`,
      [`${school.name} Admin`, newIin, passwordHash, adminRoleId, LOCAL_SCHOOL_ID]
    );
    user = createResult.rows[0];
    user.role = 'admin';
    user.role_label = 'Администратор';
  }

  const token = jwt.sign(
    {
      id: user.id,
      iin: user.iin,
      role: user.role,
      full_name: user.full_name,
      school_id: user.school_id,
      central_school_id: school.id,
      school_slug: school.slug,
      school_name: school.name,
      is_super_admin: false
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({
    success: true,
    message: 'Имперсонация жүзеге асырылды',
    data: {
      token,
      school,
      user: {
        id: user.id,
        full_name: user.full_name,
        iin: user.iin,
        role: user.role,
        role_label: user.role_label,
        school_id: user.school_id,
        central_school_id: school.id,
        school_slug: school.slug,
        school_name: school.name
      }
    }
  });
}));

module.exports = router;
