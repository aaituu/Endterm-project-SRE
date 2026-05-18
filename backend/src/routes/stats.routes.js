const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../utils/helpers');

// GET /api/stats  (public - school stats for homepage)
router.get('/', asyncHandler(async (req, res) => {
  const result = await query('SELECT key, value, label FROM stats ORDER BY id');
  const stats = {};
  result.rows.forEach(row => { stats[row.key] = { value: row.value, label: row.label }; });
  res.json({ success: true, data: stats });
}));

// GET /api/stats/dashboard  (admin only - full dashboard data)
router.get('/dashboard', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const [
    newsCount, newsPublished, usersCount, teachersCount, studentsCount,
    totalViews, lateToday, absentToday, latestNews, weeklyRows, usersToday
  ] = await Promise.all([
    query('SELECT COUNT(*) FROM news'),
    query("SELECT COUNT(*) FROM news WHERE status = 'approved'"),
    query('SELECT COUNT(*) FROM users WHERE is_active = TRUE'),
    query('SELECT COUNT(*) FROM teachers WHERE is_active = TRUE'),
    query('SELECT COUNT(*) FROM students WHERE is_active = TRUE'),
    query('SELECT COALESCE(SUM(views), 0) AS total FROM news'),
    query("SELECT COUNT(*) FROM attendance WHERE date = $1 AND status = 'late'", [today]),
    query("SELECT COUNT(*) FROM attendance WHERE date = $1 AND status = 'absent'", [today]),
    query('SELECT id, title, date, event_type, views, recommended, status FROM news ORDER BY date DESC LIMIT 8'),
    query(`
      SELECT date::date AS d,
        COUNT(*) FILTER (WHERE TRUE) AS news_cnt,
        COALESCE(SUM(views), 0) AS views_sum
      FROM news
      WHERE date >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY date::date
      ORDER BY d
    `),
    query(`SELECT COUNT(*) FROM users WHERE is_active = TRUE AND created_at::date = CURRENT_DATE`)
  ]);
  const newsTotal = parseInt(newsCount.rows[0].count);
  const published = parseInt(newsPublished.rows[0].count);
  res.json({
    success: true,
    data: {
      news_count: newsTotal,
      news_published: published,
      news_draft: Math.max(0, newsTotal - published),
      users_count: parseInt(usersCount.rows[0].count),
      users_today: parseInt(usersToday.rows[0].count),
      teachers_count: parseInt(teachersCount.rows[0].count),
      students_count: parseInt(studentsCount.rows[0].count),
      total_views: parseInt(totalViews.rows[0].total),
      avg_views: newsTotal ? Math.round(parseInt(totalViews.rows[0].total) / newsTotal) : 0,
      late_today: parseInt(lateToday.rows[0].count),
      absent_today: parseInt(absentToday.rows[0].count),
      latest_news: latestNews.rows,
      weekly_stats: weeklyRows.rows
    }
  });
}));

// PUT /api/stats/:key  (admin only)
router.put('/:key', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { value, label } = req.body;
  const result = await query(
    `INSERT INTO stats (key, value, label) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET value = $2, label = COALESCE($3, stats.label)
     RETURNING *`,
    [req.params.key, value, label]
  );
  res.json({ success: true, data: result.rows[0] });
}));

module.exports = router;
