const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireTeacher } = require('../middleware/rbac');
const { asyncHandler } = require('../utils/helpers');

// GET /api/teacher-qmg
router.get('/', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  if (!req.user.teacher_id) return res.status(400).json({ success: false, message: 'No teacher profile' });
  const result = await query(
    `SELECT m.*, s.name as subject_name 
     FROM teacher_qmg m
     LEFT JOIN subjects s ON m.subject_id = s.id
     WHERE m.teacher_id = $1
     ORDER BY m.created_at DESC`,
    [req.user.teacher_id]
  );
  res.json({ success: true, data: result.rows });
}));

// POST /api/teacher-qmg/generate
router.post('/generate', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  if (!req.user.teacher_id) return res.status(400).json({ success: false, message: 'No teacher profile' });
  const { title, subject_id, duration_mins, class_category } = req.body;
  if (!title || !subject_id) return res.status(400).json({ success: false, message: 'Барлық өрістерді толтырыңыз' });

  // Insert as pending
  const result = await query(
    `INSERT INTO teacher_qmg (teacher_id, title, subject_id, class_category, duration_mins, status)
     VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
    [req.user.teacher_id, title, subject_id, class_category, duration_mins || 45]
  );
  
  const createdRecord = result.rows[0];

  // AI Simulation (Set to ready after 15 seconds)
  setTimeout(async () => {
    try {
      await query(`UPDATE teacher_qmg SET status = 'ready' WHERE id = $1`, [createdRecord.id]);
    } catch (e) {
      console.error('Failed to update AI simulation status', e);
    }
  }, 10000); 

  res.json({ success: true, data: createdRecord, message: "QMG generation started" });
}));

module.exports = router;
