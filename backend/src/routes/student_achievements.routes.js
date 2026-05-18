const express = require('express');
const router = express.Router();
const path = require('path');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireTeacher } = require('../middleware/rbac');
const upload = require('../middleware/upload');
const { asyncHandler, paginate, paginatedResponse } = require('../utils/helpers');

function fileUrl(file) {
  if (!file) return null;
  const rel = path.join(file.destination, file.filename).replace(/\\/g, '/');
  return rel.startsWith('resources/') ? rel : `resources/${rel}`;
}

// GET /api/student-achievements
router.get('/', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, q } = req.query;
  const { pageNum, limitNum, offset } = paginate(page, limit);
  const params = [];
  let where = 'WHERE 1=1';

  if (q && String(q).trim()) {
    const qq = `%${String(q).trim()}%`;
    params.push(qq, qq, qq, qq);
    const a = params.length - 3;
    const b = params.length - 2;
    const c = params.length - 1;
    const d = params.length;
    where += ` AND (a.competition_name ILIKE $${a} OR s.full_name ILIKE $${b}
      OR CAST(a.id AS TEXT) ILIKE $${c} OR teach.full_name ILIKE $${d})`;
  }

  params.push(limitNum, offset);
  const limI = params.length - 1;
  const offI = params.length;

  const [rows, countRes] = await Promise.all([
    query(
      `SELECT a.*, s.full_name AS student_name, teach.full_name AS teacher_name, teach.category AS teacher_role
       FROM student_achievements a
       JOIN students s ON a.student_id = s.id
       LEFT JOIN teachers teach ON a.curator_teacher_id = teach.id
       ${where}
       ORDER BY a.achievement_date DESC NULLS LAST, a.id DESC
       LIMIT $${limI} OFFSET $${offI}`,
      params
    ),
    query(
      `SELECT COUNT(*)::int AS c FROM student_achievements a
       JOIN students s ON a.student_id = s.id
       LEFT JOIN teachers teach ON a.curator_teacher_id = teach.id
       ${where}`,
      params.slice(0, params.length - 2)
    ),
  ]);

  res.json({
    success: true,
    ...paginatedResponse(rows.rows, countRes.rows[0].c, pageNum, limitNum),
  });
}));

// GET /api/student-achievements/:id
router.get('/:id', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  const r = await query(
    `SELECT a.*, s.full_name AS student_name, teach.full_name AS teacher_name, teach.category AS teacher_role
     FROM student_achievements a
     JOIN students s ON a.student_id = s.id
     LEFT JOIN teachers teach ON a.curator_teacher_id = teach.id
     WHERE a.id = $1`,
    [req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, data: r.rows[0] });
}));

function maybeUpload(req, res, next) {
  const ct = req.get('content-type') || '';
  if (ct.includes('application/json')) return next();
  return upload.single('certificate')(req, res, next);
}

// POST /api/student-achievements
router.post('/', authenticate, requireTeacher, maybeUpload, asyncHandler(async (req, res) => {
  const {
    student_id,
    curator_teacher_id,
    competition_name,
    achievement_type,
    level,
    place_rank,
    achievement_date,
    publish_to_news,
    verified,
  } = req.body;
  if (!student_id || !competition_name) {
    return res.status(400).json({ success: false, message: 'Оқушы және байқау атауы керек' });
  }
  const cert = req.file ? fileUrl(req.file) : null;
  const ver = verified === true || verified === 'true';
  // Teachers can create only for themselves as curator
  let curatorId = curator_teacher_id || null;
  if (req.user.role === 'teacher') {
    curatorId = req.user.teacher_id;
  }

  const result = await query(
    `INSERT INTO student_achievements
      (student_id, curator_teacher_id, competition_name, achievement_type, level, place_rank,
       achievement_date, certificate_url, publish_to_news, verified, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,'none'),$10,
       CASE WHEN $10 THEN 'reviewed' ELSE 'pending' END)
     RETURNING *`,
    [
      student_id,
      curatorId,
      competition_name,
      achievement_type || null,
      level || null,
      place_rank || null,
      achievement_date || null,
      cert,
      publish_to_news,
      ver,
    ]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

// PUT /api/student-achievements/:id
router.put('/:id', authenticate, requireTeacher, maybeUpload, asyncHandler(async (req, res) => {
  const prev = await query('SELECT * FROM student_achievements WHERE id = $1', [req.params.id]);
  if (!prev.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  const p = prev.rows[0];
  const b = req.body;

  const student_id = b.student_id != null ? b.student_id : p.student_id;
  let curator_teacher_id = b.curator_teacher_id !== undefined ? (b.curator_teacher_id || null) : p.curator_teacher_id;
  if (req.user.role === 'teacher') {
    if (p.curator_teacher_id && p.curator_teacher_id !== req.user.teacher_id) {
      return res.status(403).json({ success: false, message: 'Рұқсат жоқ' });
    }
    curator_teacher_id = req.user.teacher_id;
  }
  const competition_name = b.competition_name != null ? b.competition_name : p.competition_name;
  const achievement_type = b.achievement_type !== undefined ? b.achievement_type : p.achievement_type;
  const level = b.level !== undefined ? b.level : p.level;
  const place_rank = b.place_rank !== undefined ? b.place_rank : p.place_rank;
  const achievement_date = b.achievement_date !== undefined ? b.achievement_date : p.achievement_date;
  const publish_to_news = b.publish_to_news !== undefined ? b.publish_to_news : p.publish_to_news;
  const verified = b.verified !== undefined ? (b.verified === true || b.verified === 'true') : p.verified;
  let certificate_url = p.certificate_url;
  if (req.file) certificate_url = fileUrl(req.file);

  const result = await query(
    `UPDATE student_achievements SET
       student_id = $1, curator_teacher_id = $2, competition_name = $3, achievement_type = $4,
       level = $5, place_rank = $6, achievement_date = $7, certificate_url = $8,
       publish_to_news = $9, verified = $10,
       status = CASE WHEN $10 THEN 'reviewed' ELSE status END,
       updated_at = NOW()
     WHERE id = $11 RETURNING *`,
    [
      student_id,
      curator_teacher_id,
      competition_name,
      achievement_type,
      level,
      place_rank,
      achievement_date,
      certificate_url,
      publish_to_news,
      verified,
      req.params.id,
    ]
  );
  res.json({ success: true, data: result.rows[0] });
}));

// DELETE /api/student-achievements/:id
router.delete('/:id', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  if (req.user.role === 'teacher') {
    await query('DELETE FROM student_achievements WHERE id = $1 AND curator_teacher_id = $2', [req.params.id, req.user.teacher_id]);
  } else {
    await query('DELETE FROM student_achievements WHERE id = $1', [req.params.id]);
  }
  res.json({ success: true, message: 'Жойылды' });
}));

module.exports = router;
