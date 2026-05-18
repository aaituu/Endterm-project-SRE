const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireTeacher } = require('../middleware/rbac');
const { asyncHandler } = require('../utils/helpers');

// Legacy routes just in case
router.get('/', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT o.*, s.name as subject_name 
     FROM olympiads o 
     LEFT JOIN subjects s ON o.subject_id = s.id 
     ORDER BY o.date DESC`
  ).catch(e => ({rows: []})); // catch if olympiads table doesnt exist
  res.json({ success: true, data: result.rows || [] });
}));

// POST /api/olympiads
router.post('/', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { title, subject_id, date, level } = req.body;
  const result = await query(
    `INSERT INTO olympiads (title, subject_id, date, level) VALUES ($1, $2, $3, $4) RETURNING *`,
    [title, subject_id || null, date || null, level || null]
  );
  res.json({ success: true, data: result.rows[0] });
}));

// PUT /api/olympiads/:id
router.put('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { title, subject_id, date, level } = req.body;
  const result = await query(
    `UPDATE olympiads SET title = $1, subject_id = $2, date = $3, level = $4 WHERE id = $5 RETURNING *`,
    [title, subject_id || null, date || null, level || null, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

// DELETE /api/olympiads/:id
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const result = await query(`DELETE FROM olympiads WHERE id = $1 RETURNING id`, [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, message: 'Жойылды' });
}));

// -- PREPARATIONS --

// GET /api/olympiads/preparations
router.get('/preparations', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  if (!req.user.teacher_id) return res.status(400).json({ success: false, message: 'No teacher profile' });
  const result = await query(
    `SELECT p.*, s.full_name as student_name, s.iin as student_iin 
     FROM olympiad_preparations p
     LEFT JOIN students s ON p.student_id = s.id
     WHERE p.teacher_id = $1
     ORDER BY p.created_at DESC`,
    [req.user.teacher_id]
  );
  res.json({ success: true, data: result.rows });
}));

// POST /api/olympiads/preparations
router.post('/preparations', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const { student_id, competition_type, competition_subtype } = req.body;
  if (!req.user.teacher_id) return res.status(400).json({ success: false, message: 'No teacher profile' });
  
  try {
    const result = await query(
      `INSERT INTO olympiad_preparations (student_id, teacher_id, competition_type, competition_subtype) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [student_id, req.user.teacher_id, competition_type, competition_subtype]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') { // UNIQUE constraint violation
      return res.status(400).json({ success: false, message: 'Бұл оқушыны басқа мұғалім дайындап жатыр' });
    }
    throw err;
  }
}));

// DELETE /api/olympiads/preparations/:id
router.delete('/preparations/:id', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM olympiad_preparations WHERE id = $1 AND teacher_id = $2 RETURNING id', [req.params.id, req.user.teacher_id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, message: 'Жойылды' });
}));

// -- ACHIEVEMENTS --
router.post('/achievements', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const { preparation_id, place, diploma_url, photo_url, date } = req.body;
  const result = await query(
    `INSERT INTO olympiad_achievements (preparation_id, place, diploma_url, photo_url, date) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [preparation_id, place, diploma_url, photo_url, date]
  );
  // Update status
  await query(`UPDATE olympiad_preparations SET status = 'completed' WHERE id = $1`, [preparation_id]);
  res.json({ success: true, data: result.rows[0] });
}));

router.get('/achievements', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  if (!req.user.teacher_id) return res.status(400).json({ success: false, message: 'No teacher profile' });
  const result = await query(
    `SELECT a.*, p.competition_type, p.competition_subtype, s.full_name as student_name
     FROM olympiad_achievements a
     JOIN olympiad_preparations p ON a.preparation_id = p.id
     JOIN students s ON p.student_id = s.id
     WHERE p.teacher_id = $1
     ORDER BY a.date DESC`,
    [req.user.teacher_id]
  );
  res.json({ success: true, data: result.rows });
}));

// -- ADMIN APPLICATIONS --
router.get('/admin-applications', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT p.*, s.full_name as student_name, s.iin as student_iin, 
            t.full_name as teacher_name, t.category as teacher_category, t.subject as teacher_subject
     FROM olympiad_preparations p
     LEFT JOIN students s ON p.student_id = s.id
     LEFT JOIN teachers t ON p.teacher_id = t.id
     ORDER BY p.created_at DESC`
  );
  res.json({ success: true, data: result.rows });
}));

router.post('/admin-applications', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { student_id, teacher_id, competition_type, competition_subtype } = req.body;
  if (!teacher_id || !competition_type) {
     return res.status(400).json({ success: false, message: 'Мұғалім және жарыс түрі міндетті' });
  }
  
  if (!student_id) {
    return res.status(400).json({ success: false, message: 'Оқушы міндетті' });
  }
  
  try {
    const result = await query(
      `INSERT INTO olympiad_preparations (student_id, teacher_id, competition_type, competition_subtype) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [student_id, teacher_id, competition_type, competition_subtype]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') { // UNIQUE constraint violation
      return res.status(400).json({ success: false, message: 'Бұл оқушыны басқа мұғалім дайындап жатыр' });
    }
    throw err;
  }
}));

router.delete('/admin-applications/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM olympiad_preparations WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, message: 'Жойылды' });
}));

module.exports = router;
