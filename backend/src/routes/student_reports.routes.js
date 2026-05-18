const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireTeacher } = require('../middleware/rbac');
const { asyncHandler, paginate, paginatedResponse } = require('../utils/helpers');

// GET /api/student-reports/teacher-status?from=&to=
router.get('/teacher-status', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ success: false, message: 'from және to параметрлері керек' });
  }
  const rows = await query(
    `SELECT t.id, t.full_name,
        EXISTS (
          SELECT 1 FROM student_reports r
          WHERE r.teacher_id = t.id AND r.report_type = 'gifted'
            AND r.report_date >= $1::date AND r.report_date <= $2::date
        ) AS has_gifted,
        EXISTS (
          SELECT 1 FROM student_reports r
          WHERE r.teacher_id = t.id AND r.report_type = 'underperforming'
            AND r.report_date >= $1::date AND r.report_date <= $2::date
        ) AS has_under,
        (SELECT COUNT(*)::int FROM student_reports r
          WHERE r.teacher_id = t.id
            AND r.report_date >= $1::date AND r.report_date <= $2::date) AS report_count
     FROM teachers t
     ORDER BY t.full_name`,
    [from, to]
  );
  const enriched = rows.rows.map((row) => {
    let status = 'none';
    if (row.has_gifted && row.has_under) status = 'full';
    else if (row.has_gifted || row.has_under) status = 'partial';
    else if (row.report_count > 0) status = 'partial';
    else status = 'missing';
    return { ...row, status_key: status };
  });
  res.json({ success: true, data: enriched });
}));

// GET /api/student-reports
router.get('/', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const {
    page = 1,
    limit = 20,
    type,
    report_type,
    teacher_id: tidQ,
    q,
  } = req.query;
  const rt = report_type || type || '';
  const { pageNum, limitNum, offset } = paginate(page, limit);

  if (!isAdmin && !req.user.teacher_id) {
    return res.status(400).json({ success: false, message: 'Мұғалім профилі жоқ' });
  }

  const params = [];
  const where = ['1=1'];

  if (!isAdmin) {
    params.push(req.user.teacher_id);
    where.push(`r.teacher_id = $${params.length}`);
  } else if (tidQ) {
    params.push(tidQ);
    where.push(`r.teacher_id = $${params.length}`);
  }

  if (rt && rt !== 'all') {
    params.push(rt);
    where.push(`r.report_type = $${params.length}`);
  }

  if (q && String(q).trim()) {
    const qq = `%${String(q).trim()}%`;
    params.push(qq, qq, qq);
    const a = params.length - 2;
    const b = params.length - 1;
    const c = params.length;
    where.push(`(r.topic ILIKE $${a} OR COALESCE(r.feedback,'') ILIKE $${b} OR s.full_name ILIKE $${c})`);
  }

  const whereSql = where.join(' AND ');
  params.push(limitNum, offset);
  const limI = params.length - 1;
  const offI = params.length;

  const [rows, countRes] = await Promise.all([
    query(
      `SELECT r.*, s.full_name AS student_name, sub.name AS subject_name, t.full_name AS teacher_name
       FROM student_reports r
       JOIN students s ON r.student_id = s.id
       JOIN teachers t ON r.teacher_id = t.id
       LEFT JOIN subjects sub ON r.subject_id = sub.id
       WHERE ${whereSql}
       ORDER BY r.report_date DESC, r.created_at DESC
       LIMIT $${limI} OFFSET $${offI}`,
      params
    ),
    query(
      `SELECT COUNT(*)::int AS c FROM student_reports r
       JOIN students s ON r.student_id = s.id
       WHERE ${whereSql}`,
      params.slice(0, params.length - 2)
    ),
  ]);

  res.json({
    success: true,
    ...paginatedResponse(rows.rows, countRes.rows[0].c, pageNum, limitNum),
  });
}));

// GET /api/student-reports/:id
router.get('/:id', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const r = await query(
    `SELECT r.*, s.full_name AS student_name, sub.name AS subject_name, t.full_name AS teacher_name
     FROM student_reports r
     JOIN students s ON r.student_id = s.id
     JOIN teachers t ON r.teacher_id = t.id
     LEFT JOIN subjects sub ON r.subject_id = sub.id
     WHERE r.id = $1`,
    [req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Есеп табылмады' });
  res.json({ success: true, data: r.rows[0] });
}));

// POST /api/student-reports (мұғалім)
router.post('/', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  if (!req.user.teacher_id) return res.status(400).json({ success: false, message: 'Мұғалім профилі жоқ' });
  const { report_type, report_date, subject_id, topic, task_type, results, feedback } = req.body;

  const inserted = [];
  if (Array.isArray(results)) {
    for (const r of results) {
      if (!r.student_id) continue;
      const resDb = await query(
        `INSERT INTO student_reports
         (teacher_id, student_id, report_type, subject_id, topic, task_type, score, feedback, report_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, CURRENT_DATE)) RETURNING *`,
        [
          req.user.teacher_id,
          r.student_id,
          report_type,
          subject_id || null,
          topic,
          task_type,
          r.score,
          feedback,
          report_date || null,
        ]
      );
      inserted.push(resDb.rows[0]);
    }
  }

  res.json({ success: true, data: inserted });
}));

// DELETE /api/student-reports/:id (әкімші)
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await query('DELETE FROM student_reports WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Жойылды' });
}));

module.exports = router;
