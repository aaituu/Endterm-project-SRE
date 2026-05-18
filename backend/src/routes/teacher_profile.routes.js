const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireTeacher } = require('../middleware/rbac');
const { attachSchoolContext } = require('../middleware/tenant');
const { asyncHandler } = require('../utils/helpers');

// GET /api/teacher/dashboard/stats
router.get('/stats', authenticate, requireTeacher, attachSchoolContext, asyncHandler(async (req, res) => {
  if (!req.user.teacher_id) return res.status(400).json({ success: false, message: 'No teacher profile' });

  const teacherId = req.user.teacher_id;
  const schoolId = req.school_id;

  const schoolParams = req.user.role === 'super_admin' ? [teacherId] : [teacherId, schoolId];
  const planFilter = req.user.role === 'super_admin' ? '' : 'AND (school_id = $2 OR school_id IS NULL)';
  const eventFilter = req.user.role === 'super_admin' ? '' : 'AND school_id = $2';
  const taskFilter = req.user.role === 'super_admin' ? '' : 'AND t.school_id = $2';
  const scheduleFilter = req.user.role === 'super_admin' ? '' : 'AND school_id = $2';

  const [plansRes, eventsRes, gradedRes, scheduleRes] = await Promise.all([
    query(`SELECT COUNT(*) FROM teacher_monthly_plans WHERE teacher_id = $1 ${planFilter}`, schoolParams),
    query(`SELECT COUNT(*) FROM teacher_events WHERE teacher_id = $1 ${eventFilter}`, schoolParams),
    query(`SELECT COUNT(ts.*)::INT AS graded_count
           FROM task_submissions ts
           JOIN tasks t ON ts.task_id = t.id
           WHERE t.teacher_id = $1 ${taskFilter}`, schoolParams),
    query(`SELECT COUNT(*)::INT AS lessons_count FROM schedule WHERE teacher_id = $1 ${scheduleFilter}`, schoolParams)
  ]);

  const homeroomClassRes = await query(
    `SELECT id FROM classes WHERE homeroom_teacher_id = $1 ${req.user.role === 'super_admin' ? '' : 'AND school_id = $2'} LIMIT 1`,
    schoolParams
  );
  let attendanceStats = {
    today_present_count: 0,
    today_late_count: 0,
    today_absent_count: 0,
    today_attendance_total: 0
  };
  if (homeroomClassRes.rows[0]) {
    const attendanceRes = await query(
      `SELECT
         COUNT(*) FILTER (WHERE sa.status = 'present')::int AS today_present_count,
         COUNT(*) FILTER (WHERE sa.status = 'late')::int AS today_late_count,
         COUNT(*) FILTER (WHERE sa.status = 'absent')::int AS today_absent_count,
         COUNT(sa.id)::int AS today_attendance_total
       FROM students s
       LEFT JOIN student_attendance sa ON sa.student_id = s.id AND sa.date = CURRENT_DATE
       WHERE s.class_id = $1 ${req.user.role === 'super_admin' ? '' : 'AND s.school_id = $2'}`,
      req.user.role === 'super_admin' ? [homeroomClassRes.rows[0].id] : [homeroomClassRes.rows[0].id, schoolId]
    );
    attendanceStats = {
      today_present_count: parseInt(attendanceRes.rows[0].today_present_count) || 0,
      today_late_count: parseInt(attendanceRes.rows[0].today_late_count) || 0,
      today_absent_count: parseInt(attendanceRes.rows[0].today_absent_count) || 0,
      today_attendance_total: parseInt(attendanceRes.rows[0].today_attendance_total) || 0
    };
  }

  res.json({
    success: true,
    data: {
      events_count: parseInt(eventsRes.rows[0].count) || 0,
      assignments_reviewed: parseInt(gradedRes.rows[0].graded_count) || 0,
      monthly_plans_count: parseInt(plansRes.rows[0].count) || 0,
      teaching_load: parseInt(scheduleRes.rows[0].lessons_count) || 0,
      ...attendanceStats
    }
  });
}));

// GET /api/teacher/dashboard/homeroom
router.get('/homeroom', authenticate, requireTeacher, attachSchoolContext, asyncHandler(async (req, res) => {
  if (!req.user.teacher_id) return res.status(400).json({ success: false, message: 'No teacher profile' });
  const schoolId = req.school_id;

  const classRes = await query(
    `SELECT * FROM classes WHERE homeroom_teacher_id = $1 ${req.user.role === 'super_admin' ? '' : 'AND school_id = $2'}`,
    req.user.role === 'super_admin' ? [req.user.teacher_id] : [req.user.teacher_id, schoolId]
  );
  if (!classRes.rows.length) {
    return res.json({ success: true, is_homeroom: false, classData: null, students: [] });
  }

  const cls = classRes.rows[0];
  const studentsRes = await query(
    `SELECT s.*, sa.status AS attendance_status, sa.reason AS attendance_reason
     FROM students s
     LEFT JOIN student_attendance sa ON s.id = sa.student_id AND sa.date = CURRENT_DATE
     WHERE s.class_id = $1 ${req.user.role === 'super_admin' ? '' : 'AND s.school_id = $2'}
     ORDER BY s.full_name`,
    req.user.role === 'super_admin' ? [cls.id] : [cls.id, schoolId]
  );

  res.json({
    success: true,
    is_homeroom: true,
    classData: cls,
    students: studentsRes.rows
  });
}));

module.exports = router;
