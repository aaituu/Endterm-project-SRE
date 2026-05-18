const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { attachSchoolContext } = require('../middleware/tenant');
const { asyncHandler, paginate, paginatedResponse } = require('../utils/helpers');

async function ensureTeacherProfile({ userId, fullName, schoolId, teacherId = null }) {
  if (teacherId) return teacherId;

  const existingTeacher = await query(
    'SELECT id FROM teachers WHERE school_id = $1 AND full_name = $2 LIMIT 1',
    [schoolId, fullName]
  );
  if (existingTeacher.rows[0]) {
    await query('UPDATE users SET teacher_id = $1 WHERE id = $2', [existingTeacher.rows[0].id, userId]);
    return existingTeacher.rows[0].id;
  }

  const teacherResult = await query(
    'INSERT INTO teachers (school_id, full_name, is_active) VALUES ($1, $2, true) RETURNING id',
    [schoolId, fullName]
  );
  const createdTeacherId = teacherResult.rows[0].id;
  await query('UPDATE users SET teacher_id = $1 WHERE id = $2', [createdTeacherId, userId]);
  return createdTeacherId;
}

// GET /api/users  (admin only)
router.get('/', authenticate, requireAdmin, attachSchoolContext, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '', role_id, school_id } = req.query;
  const { pageNum, limitNum, offset } = paginate(page, limit);

  const searchParam = `%${search}%`;
  let whereClause = `(u.full_name ILIKE $1 OR u.iin ILIKE $1)`;
  const queryParams = [searchParam];
  const countParams = [searchParam];
  let paramIndex = 2;

  if (role_id) {
    whereClause += ` AND u.role_id = $${paramIndex}`;
    queryParams.push(role_id);
    countParams.push(role_id);
    paramIndex++;
  }

  if (req.user.role === 'super_admin' && school_id) {
    whereClause += ` AND u.school_id = $${paramIndex}`;
    queryParams.push(school_id);
    countParams.push(school_id);
    paramIndex++;
  } else if (req.user.role !== 'super_admin') {
    whereClause += ` AND u.school_id = $${paramIndex}`;
    queryParams.push(req.school_id);
    countParams.push(req.school_id);
    paramIndex++;
  }

  queryParams.push(limitNum, offset);

  const [rows, countResult] = await Promise.all([
    query(
      `SELECT u.id, u.full_name, u.iin, u.is_active, u.created_at, r.name AS role, u.school_id
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE ${whereClause}
       ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      queryParams
    ),
    query(
      `SELECT COUNT(*) FROM users u WHERE ${whereClause}`,
      countParams
    )
  ]);

  res.json({ success: true, ...paginatedResponse(rows.rows, countResult.rows[0].count, pageNum, limitNum) });
}));

// GET /api/users/:id
router.get('/:id', authenticate, requireAdmin, attachSchoolContext, asyncHandler(async (req, res) => {
  const params = [req.params.id];
  let whereClause = 'u.id = $1';
  if (req.user.role !== 'super_admin') {
    whereClause += ' AND u.school_id = $2';
    params.push(req.school_id);
  }

  const result = await query(
    `SELECT u.id, u.full_name, u.iin, u.teacher_id, u.school_id, u.is_active, u.created_at, r.name AS role
     FROM users u JOIN roles r ON u.role_id = r.id WHERE ${whereClause}`,
    params
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Пайдаланушы табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

// POST /api/users
router.post('/', authenticate, requireAdmin, attachSchoolContext, asyncHandler(async (req, res) => {
  const { full_name, iin, password, role_id, teacher_id, school_id } = req.body;
  if (!full_name || !iin || !password || !role_id) {
    return res.status(400).json({ success: false, message: 'Барлық міндетті өрістерді толтырыңыз' });
  }
  if (iin.length !== 12) return res.status(400).json({ success: false, message: 'ЖСН 12 цифрдан тұруы керек' });

  const hash = await bcrypt.hash(password, 10);
  const assignedSchoolId = req.user.role === 'super_admin' ? (school_id || req.school_id) : req.school_id;
  const result = await query(
    `INSERT INTO users (full_name, iin, password_hash, role_id, teacher_id, school_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, full_name, iin, role_id, teacher_id, school_id, created_at`,
    [full_name, iin, hash, role_id, teacher_id || null, assignedSchoolId]
  );

  const user = result.rows[0];

  // If role is teacher, create teacher record if not exists
  const roleRes = await query('SELECT name FROM roles WHERE id = $1', [role_id]);
  if (roleRes.rows[0]?.name === 'teacher') {
    user.teacher_id = await ensureTeacherProfile({
      userId: user.id,
      fullName: full_name,
      schoolId: assignedSchoolId,
      teacherId: teacher_id || null
    });
  }

  res.status(201).json({ success: true, message: 'Пайдаланушы сәтті жасалды', data: user });
}));

// PUT /api/users/:id
router.put('/:id', authenticate, requireAdmin, attachSchoolContext, asyncHandler(async (req, res) => {
  const { full_name, iin, password, role_id, teacher_id, is_active, school_id } = req.body;
  const { id } = req.params;

  const currentParams = [id];
  let currentWhere = 'u.id = $1';
  if (req.user.role !== 'super_admin') {
    currentWhere += ' AND u.school_id = $2';
    currentParams.push(req.school_id);
  }
  const current = await query(
    `SELECT u.*, r.name AS role
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE ${currentWhere}
     LIMIT 1`,
    currentParams
  );
  if (!current.rows[0]) return res.status(404).json({ success: false, message: 'Пайдаланушы табылмады' });

  const assignedSchoolId = school_id && req.user.role === 'super_admin'
    ? school_id
    : current.rows[0].school_id;
  const hasTeacherId = Object.prototype.hasOwnProperty.call(req.body, 'teacher_id');
  let nextTeacherId = hasTeacherId ? (teacher_id || null) : current.rows[0].teacher_id;

  const roleRes = await query('SELECT name FROM roles WHERE id = $1', [role_id]);
  const nextRoleName = roleRes.rows[0]?.name;
  if (!nextRoleName) return res.status(400).json({ success: false, message: 'Рөл табылмады' });

  if (nextRoleName === 'teacher' && !nextTeacherId) {
    nextTeacherId = await ensureTeacherProfile({
      userId: id,
      fullName,
      schoolId: assignedSchoolId
    });
  }

  let updateQuery = `UPDATE users SET full_name=$1, iin=$2, role_id=$3, teacher_id=$4, is_active=$5, updated_at=NOW()`;
  const params = [full_name, iin, role_id, nextTeacherId, is_active !== undefined ? is_active : true];

  if (school_id && req.user.role === 'super_admin') {
    updateQuery += `, school_id=$${params.length + 1}`;
    params.push(school_id);
  }

  if (password) {
    const hash = await bcrypt.hash(password, 10);
    updateQuery += `, password_hash=$${params.length + 1}`;
    params.push(hash);
  }

  if (req.user.role !== 'super_admin') {
    updateQuery += ` WHERE id=$${params.length + 1} AND school_id=$${params.length + 2} RETURNING id, full_name, iin, role_id, is_active, school_id`;
    params.push(id, req.school_id);
  } else {
    updateQuery += ` WHERE id=$${params.length + 1} RETURNING id, full_name, iin, role_id, is_active, school_id`;
    params.push(id);
  }

  const result = await query(updateQuery, params);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Пайдаланушы табылмады' });

  res.json({ success: true, message: 'Пайдаланушы жаңартылды', data: result.rows[0] });
}));

// DELETE /api/users/:id
router.delete('/:id', authenticate, requireAdmin, attachSchoolContext, asyncHandler(async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ success: false, message: 'Өзіңізді өшіре алмайсыз' });
  }

  let result;
  if (req.user.role === 'super_admin') {
    result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
  } else {
    result = await query('DELETE FROM users WHERE id = $1 AND school_id = $2 RETURNING id', [req.params.id, req.school_id]);
  }

  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Пайдаланушы табылмады' });
  res.json({ success: true, message: 'Пайдаланушы жойылды' });
}));

module.exports = router;
