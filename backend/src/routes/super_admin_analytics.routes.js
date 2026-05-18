const express = require('express');
const router = express.Router();
const { centralQuery, getPoolForDatabase } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../utils/helpers');
const { ensureCentralTenantColumns } = require('../services/tenantDatabaseService');

router.get('/', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  await ensureCentralTenantColumns();
  const [totals, schools, activityCounts, schoolGrowth] = await Promise.all([
    centralQuery(`
      SELECT
        COUNT(*)::int AS total_schools,
        SUM(CASE WHEN is_active THEN 1 ELSE 0 END)::int AS active_schools
      FROM schools
    `),
    centralQuery(`
      SELECT id, name, database_name, database_status
      FROM schools
      WHERE is_active = TRUE
      ORDER BY created_at DESC
    `),
    centralQuery(`
      SELECT action, COUNT(*)::int AS count
      FROM audit_logs
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY action
      ORDER BY count DESC
    `),
    centralQuery(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*)::int AS count
      FROM schools
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month ASC
    `)
  ]);

  const userTotals = { total_users: 0, admin_users: 0, teacher_users: 0, student_users: 0 };
  const topSchools = [];
  for (const school of schools.rows) {
    if (!school.database_name || school.database_status !== 'ready') continue;
    try {
      const pool = getPoolForDatabase(school.database_name);
      const counts = await pool.query(`
        SELECT
          COUNT(*)::int AS total_users,
          SUM(CASE WHEN r.name = 'admin' THEN 1 ELSE 0 END)::int AS admin_users,
          SUM(CASE WHEN r.name = 'teacher' THEN 1 ELSE 0 END)::int AS teacher_users,
          SUM(CASE WHEN r.name = 'student' THEN 1 ELSE 0 END)::int AS student_users
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.is_active = TRUE
      `);
      const row = counts.rows[0];
      userTotals.total_users += row.total_users || 0;
      userTotals.admin_users += row.admin_users || 0;
      userTotals.teacher_users += row.teacher_users || 0;
      userTotals.student_users += row.student_users || 0;
      topSchools.push({ id: school.id, name: school.name, users_count: row.total_users || 0 });
    } catch (error) {
      topSchools.push({ id: school.id, name: school.name, users_count: 0 });
    }
  }
  topSchools.sort((a, b) => b.users_count - a.users_count);

  const loginActivity = await centralQuery(`
    SELECT COUNT(DISTINCT user_id)::int AS active_users_last_30_days
    FROM audit_logs
    WHERE action = 'login' AND created_at >= NOW() - INTERVAL '30 days'
  `);

  res.json({
    success: true,
    data: {
      total_schools: totals.rows[0].total_schools,
      active_schools: totals.rows[0].active_schools,
      total_users: userTotals.total_users,
      admin_users: userTotals.admin_users,
      teacher_users: userTotals.teacher_users,
      student_users: userTotals.student_users,
      active_users_last_30_days: loginActivity.rows[0].active_users_last_30_days,
      recent_signups_last_30_days: 0,
      activity_counts: activityCounts.rows,
      school_growth: schoolGrowth.rows,
      user_growth: [],
      top_schools: topSchools.slice(0, 5)
    }
  });
}));

module.exports = router;
