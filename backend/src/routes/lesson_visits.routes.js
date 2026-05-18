const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireTeacher } = require('../middleware/rbac');
const { asyncHandler } = require('../utils/helpers');
const upload = require('../middleware/upload');

// GET /api/lesson-visits
router.get('/', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  if (!req.user.teacher_id) return res.status(400).json({ success: false, message: 'No teacher profile' });
  const result = await query(
    `SELECT v.*, vt.full_name as visited_teacher_name, sub.name as subject_name, c.name as class_name
     FROM lesson_visits v
     JOIN teachers vt ON v.visited_teacher_id = vt.id
     LEFT JOIN subjects sub ON v.subject_id = sub.id
     LEFT JOIN classes c ON v.class_id = c.id
     WHERE v.visiting_teacher_id = $1
     ORDER BY v.visit_date DESC`,
    [req.user.teacher_id]
  );
  
  res.json({ success: true, data: result.rows });
}));

// GET /api/lesson-visits/teachers/options
router.get('/teachers/options', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT id, full_name
     FROM teachers
     WHERE is_active = TRUE
     ORDER BY full_name`
  );
  res.json({ success: true, data: result.rows });
}));

// GET /api/lesson-visits/teachers/:teacherId/subjects
router.get('/teachers/:teacherId/subjects', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const teacherId = Number(req.params.teacherId);
  const result = await query(
    `SELECT DISTINCT s.id, s.name
     FROM subjects s
     JOIN (
       SELECT subject_id FROM subject_teachers WHERE teacher_id = $1
       UNION
       SELECT subject_id FROM schedule WHERE teacher_id = $1
     ) x ON x.subject_id = s.id
     ORDER BY s.name`,
    [teacherId]
  );
  res.json({ success: true, data: result.rows });
}));

// GET /api/lesson-visits/teachers/:teacherId/subjects/:subjectId/classes
router.get('/teachers/:teacherId/subjects/:subjectId/classes', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const teacherId = Number(req.params.teacherId);
  const subjectId = Number(req.params.subjectId);
  const result = await query(
    `SELECT DISTINCT c.id, c.name
     FROM classes c
     JOIN schedule s ON s.class_id = c.id
     WHERE s.teacher_id = $1 AND s.subject_id = $2
     ORDER BY c.name`,
    [teacherId, subjectId]
  );
  res.json({ success: true, data: result.rows });
}));

// POST /api/lesson-visits
router.post('/', authenticate, requireTeacher, upload.single('photo'), asyncHandler(async (req, res) => {
  if (!req.user.teacher_id) return res.status(400).json({ success: false, message: 'No teacher profile' });
  const { visited_teacher_id, visit_date, subject_id, class_id, lesson_type, students_total, students_present, topic, qmg_standard, organization, homework_check, teacher_communication, new_topic_explanation, topic_reveal, methods_used, task_level, feedback_given, overall_conclusion } = req.body;
  if (!visited_teacher_id || !visit_date) return res.status(400).json({ success: false, message: 'Міндетті өрістерді толтырыңыз (Күні, Мұғалім)' });
  if (!subject_id || !class_id) return res.status(400).json({ success: false, message: 'Пән мен сынып міндетті' });

  const scheduleCheck = await query(
    `SELECT id
     FROM schedule
     WHERE teacher_id = $1
       AND subject_id = $2
       AND class_id = $3
       AND day_of_week = EXTRACT(ISODOW FROM $4::date)
     LIMIT 1`,
    [visited_teacher_id, subject_id, class_id, visit_date]
  );
  if (!scheduleCheck.rows.length) {
    return res.status(400).json({
      success: false,
      message: 'Бұл мұғалімде таңдалған күні осы пән/сынып бойынша сабақ жоқ (кестеде табылмады).'
    });
  }

  const photoUrl = req.file ? req.file.path.replace(/\\/g, '/') : null;

  const result = await query(
    `INSERT INTO lesson_visits 
     (visiting_teacher_id, visited_teacher_id, visit_date, subject_id, class_id, lesson_type, students_total, students_present, topic, qmg_standard, organization, homework_check, teacher_communication, new_topic_explanation, topic_reveal, methods_used, task_level, feedback_given, overall_conclusion, photo_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *`,
    [req.user.teacher_id, visited_teacher_id, visit_date, subject_id || null, class_id || null, lesson_type, students_total || 0, students_present || 0, topic, qmg_standard, organization, homework_check, teacher_communication, new_topic_explanation, topic_reveal, methods_used, task_level, feedback_given, overall_conclusion, photoUrl]
  );

  res.json({ success: true, data: result.rows[0] });
}));

module.exports = router;
