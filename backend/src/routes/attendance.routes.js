const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireTeacher } = require('../middleware/rbac');
const { attachSchoolContext } = require('../middleware/tenant');
const { asyncHandler, paginate, paginatedResponse } = require('../utils/helpers');

// GET /api/attendance/today-summary
router.get('/today-summary', authenticate, attachSchoolContext, asyncHandler(async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const params = [today];
  let where = 'WHERE date = $1';
  if (req.user.role !== 'super_admin') {
    params.push(req.school_id);
    where += ` AND school_id = $${params.length}`;
  }

  if (req.user.role === 'parent') {
    const linked = await query('SELECT student_id FROM parent_student_links WHERE parent_user_id = $1', [req.user.id]);
    const studentIds = linked.rows.map((row) => row.student_id);
    if (studentIds.length) {
      params.push(studentIds);
      where += ` AND student_id = ANY($${params.length})`;
    } else {
      where += ' AND 1=0';
    }
  }

  const result = await query(
    `SELECT
      COUNT(*) FILTER (WHERE status='late') AS late_count,
      COUNT(*) FILTER (WHERE status='absent') AS absent_count
     FROM attendance ${where}`,
    params
  );
  res.json({ success: true, data: result.rows[0] });
}));

// GET /api/attendance — күн аралығы, сынып, оқушы, себеп
router.get('/', authenticate, attachSchoolContext, asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 30,
    date,
    date_from,
    date_to,
    status,
    class_id,
    q,
    note_q,
  } = req.query;
  const { pageNum, limitNum, offset } = paginate(page, limit);

  let df = date_from;
  let dt = date_to;
  if (date && !df && !dt) {
    df = date;
    dt = date;
  }
  if (!df && !dt) {
    const today = new Date().toISOString().split('T')[0];
    df = today;
    dt = today;
  }
  if (df && !dt) dt = df;
  if (!df && dt) df = dt;

  const params = [];
  let where = 'WHERE a.date >= $' + (params.push(df), params.length) + ' AND a.date <= $' + (params.push(dt), params.length);

  if (status) {
    params.push(status);
    where += ` AND a.status = $${params.length}`;
  }
  if (class_id) {
    params.push(class_id);
    where += ` AND a.class_id = $${params.length}`;
  }
  if (q && String(q).trim()) {
    params.push(`%${String(q).trim()}%`);
    where += ` AND s.full_name ILIKE $${params.length}`;
  }
  if (note_q && String(note_q).trim()) {
    params.push(`%${String(note_q).trim()}%`);
    where += ` AND COALESCE(a.note,'') ILIKE $${params.length}`;
  }

  if (req.user.role === 'student') {
    const studentResult = await query('SELECT id FROM students WHERE user_id = $1 LIMIT 1', [req.user.id]);
    if (studentResult.rows[0]) {
      params.push(studentResult.rows[0].id);
      where += ` AND a.student_id = $${params.length}`;
    }
  } else if (req.user.role === 'parent') {
    const linked = await query('SELECT student_id FROM parent_student_links WHERE parent_user_id = $1', [req.user.id]);
    const studentIds = linked.rows.map((row) => row.student_id);
    if (studentIds.length) {
      params.push(studentIds);
      where += ` AND a.student_id = ANY($${params.length})`;
    } else {
      where += ' AND 1=0';
    }
  }

  if (req.user.role !== 'super_admin') {
    params.push(req.school_id);
    where += ` AND a.school_id = $${params.length}`;
  }

  params.push(limitNum, offset);
  const limIdx = params.length - 1;
  const offIdx = params.length;

  const [rows, countRes] = await Promise.all([
    query(
      `SELECT a.*, s.full_name AS student_name, c.name AS class_name
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       LEFT JOIN classes c ON a.class_id = c.id
       ${where}
       ORDER BY a.date DESC, a.id DESC
       LIMIT $${limIdx} OFFSET $${offIdx}`,
      params
    ),
    query(
      `SELECT COUNT(*)::int AS c FROM attendance a
       JOIN students s ON a.student_id = s.id
       ${where}`,
      params.slice(0, params.length - 2)
    ),
  ]);
  res.json({ success: true, ...paginatedResponse(rows.rows, countRes.rows[0].c, pageNum, limitNum) });
}));

// GET /api/attendance/:id
router.get('/:id', authenticate, attachSchoolContext, asyncHandler(async (req, res) => {
  const params = [req.params.id];
  let where = 'a.id = $1';
  if (req.user.role !== 'super_admin') {
    params.push(req.school_id);
    where += ' AND a.school_id = $2';
  }

  const r = await query(
    `SELECT a.*, s.full_name AS student_name, c.name AS class_name
     FROM attendance a
     JOIN students s ON a.student_id = s.id
     LEFT JOIN classes c ON a.class_id = c.id
     WHERE ${where}`,
    params
  );
  if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Жазба табылмады' });
  res.json({ success: true, data: r.rows[0] });
}));

// POST /api/attendance
router.post('/', authenticate, requireTeacher, attachSchoolContext, asyncHandler(async (req, res) => {
  const { student_id, class_id, date, status, minutes_late, note, lesson_context } = req.body;
  if (!student_id) return res.status(400).json({ success: false, message: 'Оқушы таңдаңыз' });
  const d = date || new Date().toISOString().split('T')[0];
  const lc = lesson_context != null ? JSON.stringify(lesson_context) : null;
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id || req.school_id : req.school_id;

  const result = await query(
    `INSERT INTO attendance (school_id, student_id, class_id, date, status, minutes_late, note, lesson_context)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
     ON CONFLICT (student_id, date) DO UPDATE SET
       school_id=EXCLUDED.school_id, class_id=EXCLUDED.class_id, status=EXCLUDED.status, minutes_late=EXCLUDED.minutes_late,
       note=EXCLUDED.note, lesson_context=EXCLUDED.lesson_context, updated_at=NOW()
     RETURNING *`,
    [schoolId, student_id, class_id, d, status || 'late', minutes_late || 0, note, lc]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

// PUT /api/attendance/:id
router.put('/:id', authenticate, requireTeacher, attachSchoolContext, asyncHandler(async (req, res) => {
  const { status, minutes_late, note, lesson_context } = req.body;
  const lc = lesson_context !== undefined
    ? (lesson_context == null ? null : JSON.stringify(lesson_context))
    : undefined;
  const sets = [];
  const vals = [];
  let n = 0;
  if (status !== undefined) { vals.push(status); sets.push(`status=$${++n}`); }
  if (minutes_late !== undefined) { vals.push(minutes_late); sets.push(`minutes_late=$${++n}`); }
  if (note !== undefined) { vals.push(note); sets.push(`note=$${++n}`); }
  if (lc !== undefined) { vals.push(lc); sets.push(`lesson_context=$${++n}::jsonb`); }
  if (!sets.length) return res.status(400).json({ success: false, message: 'Өзгеріс жоқ' });

  let queryText = `UPDATE attendance SET ${sets.join(', ')}, updated_at=NOW() WHERE id=$${sets.length + 1}`;
  const params = [...vals, req.params.id];

  if (req.user.role !== 'super_admin') {
    params.push(req.school_id);
    queryText += ` AND school_id=$${params.length}`;
  }

  const result = await query(`${queryText} RETURNING *`, params);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Жазба табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

// DELETE /api/attendance/:id
router.delete('/:id', authenticate, requireAdmin, attachSchoolContext, asyncHandler(async (req, res) => {
  let result;
  if (req.user.role === 'super_admin') {
    result = await query('DELETE FROM attendance WHERE id = $1 RETURNING id', [req.params.id]);
  } else {
    result = await query('DELETE FROM attendance WHERE id = $1 AND school_id = $2 RETURNING id', [req.params.id, req.school_id]);
  }
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Жазба табылмады' });
  res.json({ success: true, message: 'Жазба жойылды' });
}));

module.exports = router;
