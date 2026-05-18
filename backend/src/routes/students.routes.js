const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireStudentWorkAccess } = require('../middleware/rbac');
const { attachSchoolContext } = require('../middleware/tenant');
const { asyncHandler } = require('../utils/helpers');

// GET /api/students/my-class
router.get('/my-class', authenticate, asyncHandler(async (req, res) => {
  const studentRes = await query(
    `SELECT s.*, c.name AS class_name
     FROM students s
     LEFT JOIN classes c ON c.id = s.class_id
     WHERE s.user_id = $1
     LIMIT 1`,
    [req.user.id]
  );

  const student = studentRes.rows[0];
  if (!student?.class_id) {
    return res.json({ success: true, data: { student: student || null, classmates: [], schedule: [] } });
  }

  const [classmatesRes, scheduleRes] = await Promise.all([
    query(
      `SELECT id, full_name, iin
       FROM students
       WHERE class_id = $1 AND is_active = TRUE
       ORDER BY full_name`,
      [student.class_id]
    ),
    query(
      `SELECT s.*, sub.name AS subject_name, t.full_name AS teacher_name, cr.name AS classroom_name
       FROM schedule s
       JOIN subjects sub ON s.subject_id = sub.id
       JOIN teachers t ON s.teacher_id = t.id
       LEFT JOIN classrooms cr ON s.classroom_id = cr.id
       WHERE s.class_id = $1
       ORDER BY s.day_of_week, s.time_slot`,
      [student.class_id]
    )
  ]);

  res.json({
    success: true,
    data: {
      student,
      classmates: classmatesRes.rows,
      schedule: scheduleRes.rows
    }
  });
}));

// PUT /api/students/:id/profession
router.put('/:id/profession', authenticate, requireStudentWorkAccess, attachSchoolContext, asyncHandler(async (req, res) => {
  const { profession } = req.body;
  const params = [profession, req.params.id];
  let schoolWhere = '';
  if (req.user.role !== 'super_admin') {
    params.push(req.school_id);
    schoolWhere = ` AND school_id = $${params.length}`;
  }
  const result = await query(
    `UPDATE students SET profession = $1 WHERE id = $2${schoolWhere} RETURNING *`,
    params
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

// POST /api/students/attendance
router.post('/attendance', authenticate, requireStudentWorkAccess, attachSchoolContext, asyncHandler(async (req, res) => {
  const { student_id, status, reason } = req.body;
  if (!student_id || !status) {
    return res.status(400).json({ success: false, message: 'Оқушы және статус міндетті' });
  }
  const teacherId = req.user.teacher_id || null;
  const studentParams = [student_id];
  let studentWhere = 'id = $1';
  if (req.user.role !== 'super_admin') {
    studentParams.push(req.school_id);
    studentWhere += ' AND school_id = $2';
  }
  const studentRes = await query(`SELECT id, class_id, school_id FROM students WHERE ${studentWhere} LIMIT 1`, studentParams);
  const student = studentRes.rows[0];
  if (!student) return res.status(404).json({ success: false, message: 'Оқушы табылмады' });
  const schoolId = req.user.role === 'super_admin'
    ? (student.school_id || req.body.school_id || 1)
    : req.school_id;

  // upsert attendance for today
  const check = await query(`SELECT id FROM student_attendance WHERE student_id = $1 AND date = CURRENT_DATE`, [student_id]);
  let result;
  if (check.rows.length) {
    result = await query(
      `UPDATE student_attendance SET status = $1, reason = $2, teacher_id = $3 WHERE id = $4 RETURNING *`,
      [status, reason || null, teacherId, check.rows[0].id]
    );
  } else {
    result = await query(
      `INSERT INTO student_attendance (student_id, teacher_id, status, reason) VALUES ($1, $2, $3, $4) RETURNING *`,
      [student_id, teacherId, status, reason || null]
    );
  }

  await query(
    `INSERT INTO attendance (school_id, student_id, class_id, date, status, minutes_late, note, lesson_context)
     VALUES ($1,$2,$3,CURRENT_DATE,$4,$5,$6,NULL)
     ON CONFLICT (student_id, date) DO UPDATE SET
       school_id = EXCLUDED.school_id,
       class_id = EXCLUDED.class_id,
       status = EXCLUDED.status,
       minutes_late = EXCLUDED.minutes_late,
       note = EXCLUDED.note,
       updated_at = NOW()`,
    [schoolId, student_id, student.class_id || null, status, status === 'late' ? 1 : 0, reason || null]
  );
  
  res.json({ success: true, data: result.rows[0] });
}));

// GET /api/students/search
router.get('/search', authenticate, requireStudentWorkAccess, attachSchoolContext, asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ success: true, data: [] });
  const params = [`%${q}%`];
  let schoolWhere = '';
  if (req.user.role !== 'super_admin') {
    params.push(req.school_id);
    schoolWhere = ` AND school_id = $${params.length}`;
  }
  const result = await query(
    `SELECT * FROM students WHERE (full_name ILIKE $1 OR iin ILIKE $1)${schoolWhere} ORDER BY full_name LIMIT 20`,
    params
  );
  res.json({ success: true, data: result.rows });
}));

// GET /api/students/classes
router.get('/classes', authenticate, requireStudentWorkAccess, attachSchoolContext, asyncHandler(async (req, res) => {
  const params = [];
  let schoolWhere = '';
  let studentSchoolWhere = '';
  if (req.user.role !== 'super_admin') {
    params.push(req.school_id);
    schoolWhere = ` AND c.school_id = $${params.length}`;
    studentSchoolWhere = ` AND s.school_id = $${params.length}`;
  }
  const result = await query(
    `SELECT c.*, COUNT(s.id)::int AS student_count
     FROM classes c
     LEFT JOIN students s ON s.class_id = c.id AND s.is_active = TRUE${studentSchoolWhere}
     WHERE c.is_active = TRUE${schoolWhere}
     GROUP BY c.id
     ORDER BY c.name`,
    params
  );
  res.json({ success: true, data: result.rows });
}));

// GET /api/students/by-class/:classId
router.get('/by-class/:classId', authenticate, requireStudentWorkAccess, attachSchoolContext, asyncHandler(async (req, res) => {
  const params = [req.params.classId];
  let schoolWhere = '';
  if (req.user.role !== 'super_admin') {
    params.push(req.school_id);
    schoolWhere = ` AND s.school_id = $${params.length}`;
  }
  const result = await query(
    `SELECT s.*,
            COALESCE(sa.status, a.status) AS attendance_status,
            COALESCE(sa.reason, a.note) AS attendance_reason,
            COALESCE(sa.created_at, a.created_at) AS attendance_marked_at
     FROM students s
     LEFT JOIN student_attendance sa ON sa.student_id = s.id AND sa.date = CURRENT_DATE
     LEFT JOIN attendance a ON a.student_id = s.id AND a.date = CURRENT_DATE
     WHERE s.class_id = $1${schoolWhere}
     ORDER BY s.full_name`,
    params
  );
  res.json({ success: true, data: result.rows });
}));

module.exports = router;
