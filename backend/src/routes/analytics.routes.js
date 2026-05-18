const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { attachSchoolContext } = require('../middleware/tenant');
const { asyncHandler } = require('../utils/helpers');

const requireAnalyticsAccess = requireRole('director', 'admin', 'super_admin');

const buildWhere = (req, tableAlias = 'g') => {
  if (req.user.role === 'super_admin') return { clause: '', params: [] };
  return { clause: `WHERE ${tableAlias}.school_id = $1`, params: [req.school_id] };
};

// GET /api/analytics/performance
router.get('/performance', authenticate, requireAnalyticsAccess, attachSchoolContext, asyncHandler(async (req, res) => {
  const { clause, params } = buildWhere(req, 'g');

  const [byClass, bySubject, byMonth] = await Promise.all([
    query(`SELECT c.name AS class_name, ROUND(AVG(g.value)::numeric, 2) AS avg_grade
           FROM grades g
           LEFT JOIN classes c ON g.class_id = c.id
           ${clause}
           GROUP BY c.name
           ORDER BY avg_grade DESC
           LIMIT 12`, params),
    query(`SELECT s.name AS subject_name, ROUND(AVG(g.value)::numeric, 2) AS avg_grade
           FROM grades g
           LEFT JOIN subjects s ON g.subject_id = s.id
           ${clause}
           GROUP BY s.name
           ORDER BY avg_grade DESC
           LIMIT 12`, params),
    query(`SELECT TO_CHAR(g.date, 'YYYY-MM') AS month, ROUND(AVG(g.value)::numeric, 2) AS avg_grade
           FROM grades g
           ${clause}
           GROUP BY month
           ORDER BY month ASC
           LIMIT 12`, params)
  ]);

  res.json({ success: true, data: {
    by_class: byClass.rows,
    by_subject: bySubject.rows,
    by_month: byMonth.rows
  }});
}));

// GET /api/analytics/attendance
router.get('/attendance', authenticate, requireAnalyticsAccess, attachSchoolContext, asyncHandler(async (req, res) => {
  const { clause, params } = buildWhere(req, 'a');
  const attendanceParams = [...params];

  const [byDay, byClass] = await Promise.all([
    query(`SELECT a.date::date AS day,
                 COUNT(*) FILTER (WHERE a.status = 'present')::int AS present_count,
                 COUNT(*)::int AS total_count,
                 ROUND(100.0 * SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS attendance_rate
           FROM attendance a
           ${clause}
           GROUP BY a.date::date
           ORDER BY a.date::date ASC
           LIMIT 40`, attendanceParams),
    query(`SELECT c.name AS class_name,
                 ROUND(100.0 * SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS attendance_rate
           FROM attendance a
           LEFT JOIN classes c ON a.class_id = c.id
           ${clause}
           GROUP BY c.name
           ORDER BY attendance_rate DESC
           LIMIT 12`, attendanceParams)
  ]);

  res.json({ success: true, data: { by_day: byDay.rows, by_class: byClass.rows } });
}));

// GET /api/analytics/teachers-load
router.get('/teachers-load', authenticate, requireAnalyticsAccess, attachSchoolContext, asyncHandler(async (req, res) => {
  const { clause, params } = buildWhere(req, 't');

  const result = await query(`
    SELECT t.id, t.full_name,
           COUNT(DISTINCT s.id) AS lessons_count,
           COALESCE(SUM(CASE WHEN ts.grade IS NOT NULL THEN 1 ELSE 0 END), 0) AS graded_tasks
    FROM teachers t
    LEFT JOIN schedule s ON s.teacher_id = t.id ${req.user.role === 'super_admin' ? '' : 'AND s.school_id = $1'}
    LEFT JOIN tasks tk ON tk.teacher_id = t.id ${req.user.role === 'super_admin' ? '' : 'AND tk.school_id = $1'}
    LEFT JOIN task_submissions ts ON ts.task_id = tk.id ${req.user.role === 'super_admin' ? '' : 'AND ts.school_id = $1'}
    ${clause}
    GROUP BY t.id, t.full_name
    ORDER BY lessons_count DESC, graded_tasks DESC
    LIMIT 20`, params);

  res.json({ success: true, data: result.rows });
}));

// GET /api/analytics/system-activity
router.get('/system-activity', authenticate, requireAnalyticsAccess, attachSchoolContext, asyncHandler(async (req, res) => {
  const { clause, params } = buildWhere(req, 't');
  const common = ` ${clause}`;

  const [tasksCount, messagesCount, gradesCount, activityByMonth] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM tasks t ${common}`, params),
    query(`SELECT COUNT(*)::int AS total FROM messages m ${common}`, params),
    query(`SELECT COUNT(*)::int AS total FROM grades g ${common}`, params),
    query(`SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*)::int AS events_count
           FROM (
             SELECT created_at FROM tasks ${clause}
             UNION ALL
             SELECT created_at FROM messages ${clause}
             UNION ALL
             SELECT created_at FROM grades ${clause}
           ) x
           GROUP BY month
           ORDER BY month ASC
           LIMIT 12`, params)
  ]);

  res.json({ success: true, data: {
    tasks_count: tasksCount.rows[0]?.total || 0,
    messages_count: messagesCount.rows[0]?.total || 0,
    grades_count: gradesCount.rows[0]?.total || 0,
    activity_by_month: activityByMonth.rows
  }});
}));

module.exports = router;
