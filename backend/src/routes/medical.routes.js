const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireNurse } = require('../middleware/rbac');
const { asyncHandler, paginate, paginatedResponse } = require('../utils/helpers');

// GET /api/medical
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, search = '', student_id } = req.query;
  const { pageNum, limitNum, offset } = paginate(page, limit);
  const params = [];
  let where = 'WHERE 1=1';

  if (student_id) {
    params.push(student_id);
    where += ` AND mr.student_id = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (mr.notes ILIKE $${params.length} OR mr.status ILIKE $${params.length} OR mr.doctor ILIKE $${params.length})`;
  }

  if (req.user.role === 'student') {
    const studentRes = await query('SELECT id FROM students WHERE user_id = $1 LIMIT 1', [req.user.id]);
    if (studentRes.rows[0]) {
      params.push(studentRes.rows[0].id);
      where += ` AND mr.student_id = $${params.length}`;
    }
  }

  const [rows, countRes] = await Promise.all([
    query(
      `SELECT mr.*, s.full_name AS student_name
       FROM medical_records mr
       LEFT JOIN students s ON mr.student_id = s.id
       ${where} ORDER BY mr.record_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    ),
    query(`SELECT COUNT(*) FROM medical_records mr ${where}`, params)
  ]);

  res.json({ success: true, ...paginatedResponse(rows.rows, countRes.rows[0].count, pageNum, limitNum) });
}));

// POST /api/medical
router.post('/', authenticate, requireNurse, asyncHandler(async (req, res) => {
  const { student_id, notes, status, doctor, record_date } = req.body;
  if (!student_id) return res.status(400).json({ success: false, message: 'Оқушы міндетті' });
  const result = await query(
    `INSERT INTO medical_records (student_id, notes, status, doctor, record_date)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [student_id, notes || null, status || null, doctor || null, record_date || null]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

// PUT /api/medical/:id
router.put('/:id', authenticate, requireNurse, asyncHandler(async (req, res) => {
  const { notes, status, doctor, record_date } = req.body;
  const result = await query(
    `UPDATE medical_records SET
      notes = COALESCE($1, notes),
      status = COALESCE($2, status),
      doctor = COALESCE($3, doctor),
      record_date = COALESCE($4, record_date),
      updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [notes || null, status || null, doctor || null, record_date || null, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Жазба табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

// DELETE /api/medical/:id
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await query('DELETE FROM medical_records WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Жазба жойылды' });
}));

module.exports = router;
