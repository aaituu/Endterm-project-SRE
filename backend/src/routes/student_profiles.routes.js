const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireStudentWorkAccess } = require('../middleware/rbac');
const { asyncHandler, paginate, paginatedResponse } = require('../utils/helpers');

// GET /api/student-profiles
router.get('/', authenticate, requireStudentWorkAccess, asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, q, profile_type, status } = req.query;
  const { pageNum, limitNum, offset } = paginate(page, limit);
  const params = [];
  const where = ['1=1'];

  if (q && String(q).trim()) {
    params.push(`%${String(q).trim()}%`);
    where.push(`s.full_name ILIKE $${params.length}`);
  }
  if (profile_type && profile_type !== 'all') {
    params.push(profile_type);
    where.push(`p.profile_type = $${params.length}`);
  }
  if (status === 'active') {
    where.push(`COALESCE(p.is_active, TRUE) = TRUE`);
  } else if (status === 'inactive') {
    where.push(`COALESCE(p.is_active, TRUE) = FALSE`);
  }

  const whereSql = where.join(' AND ');
  params.push(limitNum, offset);
  const limI = params.length - 1;
  const offI = params.length;

  const [rows, countRes] = await Promise.all([
    query(
      `SELECT p.*, s.full_name AS student_name, s.class_id, c.name AS class_name,
              teach.full_name AS teacher_name
       FROM student_profiles p
       JOIN students s ON p.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN teachers teach ON p.assigned_teacher_id = teach.id
       WHERE ${whereSql}
       ORDER BY p.updated_at DESC NULLS LAST, p.id DESC
       LIMIT $${limI} OFFSET $${offI}`,
      params
    ),
    query(
      `SELECT COUNT(*)::int AS c FROM student_profiles p
       JOIN students s ON p.student_id = s.id
       WHERE ${whereSql}`,
      params.slice(0, params.length - 2)
    ),
  ]);

  res.json({
    success: true,
    ...paginatedResponse(rows.rows, countRes.rows[0].c, pageNum, limitNum),
  });
}));

// GET /api/student-profiles/:id
router.get('/:id', authenticate, requireStudentWorkAccess, asyncHandler(async (req, res) => {
  const r = await query(
    `SELECT p.*, s.full_name AS student_name, s.class_id, c.name AS class_name,
            teach.full_name AS teacher_name
     FROM student_profiles p
     JOIN students s ON p.student_id = s.id
     LEFT JOIN classes c ON s.class_id = c.id
     LEFT JOIN teachers teach ON p.assigned_teacher_id = teach.id
     WHERE p.id = $1`,
    [req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, data: r.rows[0] });
}));

// POST /api/student-profiles
router.post('/', authenticate, requireStudentWorkAccess, asyncHandler(async (req, res) => {
  const {
    student_id,
    profile_type,
    assigned_teacher_id,
    assigned_at,
    ends_at,
    is_active,
    notes,
  } = req.body;
  if (!student_id || !profile_type) {
    return res.status(400).json({ success: false, message: 'Оқушы және түрі міндетті' });
  }
  const result = await query(
    `INSERT INTO student_profiles
      (student_id, profile_type, assigned_teacher_id, assigned_at, ends_at, is_active, notes)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6,TRUE),$7)
     ON CONFLICT (student_id) DO UPDATE SET
       profile_type = EXCLUDED.profile_type,
       assigned_teacher_id = EXCLUDED.assigned_teacher_id,
       assigned_at = EXCLUDED.assigned_at,
       ends_at = EXCLUDED.ends_at,
       is_active = EXCLUDED.is_active,
       notes = EXCLUDED.notes,
       updated_at = NOW()
     RETURNING *`,
    [
      student_id,
      profile_type,
      assigned_teacher_id || null,
      assigned_at || null,
      ends_at || null,
      is_active,
      notes || null,
    ]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

// PUT /api/student-profiles/:id
router.put('/:id', authenticate, requireStudentWorkAccess, asyncHandler(async (req, res) => {
  const prev = await query('SELECT * FROM student_profiles WHERE id = $1', [req.params.id]);
  if (!prev.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  const p = prev.rows[0];
  const b = req.body;

  const profile_type = b.profile_type !== undefined ? b.profile_type : p.profile_type;
  const assigned_teacher_id = b.assigned_teacher_id !== undefined ? b.assigned_teacher_id : p.assigned_teacher_id;
  const assigned_at = b.assigned_at !== undefined ? b.assigned_at : p.assigned_at;
  const ends_at = b.ends_at !== undefined ? b.ends_at : p.ends_at;
  const is_active = b.is_active !== undefined ? b.is_active : p.is_active;
  const notes = b.notes !== undefined ? b.notes : p.notes;

  const result = await query(
    `UPDATE student_profiles SET
       profile_type = $1,
       assigned_teacher_id = $2,
       assigned_at = $3,
       ends_at = $4,
       is_active = COALESCE($5, TRUE),
       notes = $6,
       updated_at = NOW()
     WHERE id = $7 RETURNING *`,
    [profile_type, assigned_teacher_id, assigned_at, ends_at, is_active, notes, req.params.id]
  );
  res.json({ success: true, data: result.rows[0] });
}));

// DELETE /api/student-profiles/:id
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const r = await query('DELETE FROM student_profiles WHERE id = $1 RETURNING id', [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, message: 'Жойылды' });
}));

module.exports = router;
