const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { asyncHandler, paginate, paginatedResponse } = require('../utils/helpers');
const upload = require('../middleware/upload');

// GET /api/teachers  (public)
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 100 } = req.query;
  const { pageNum, limitNum, offset } = paginate(page, limit);
  const [rows, countRes] = await Promise.all([
    query(
      `SELECT DISTINCT ON (full_name) id, full_name, photo_url, category, subject,
              achievements_count, lessons_count, events_count, awards_count
       FROM teachers WHERE is_active = TRUE ORDER BY full_name, id ASC LIMIT $1 OFFSET $2`,
      [limitNum, offset]
    ),
    query('SELECT COUNT(DISTINCT full_name) FROM teachers WHERE is_active = TRUE')
  ]);
  res.json({ success: true, ...paginatedResponse(rows.rows, countRes.rows[0].count, pageNum, limitNum) });
}));

// GET /api/teachers/:id  (public)
router.get('/:id', asyncHandler(async (req, res) => {
  const t = await query('SELECT * FROM teachers WHERE id = $1 AND is_active = TRUE', [req.params.id]);
  if (!t.rows[0]) return res.status(404).json({ success: false, message: 'Мұғалім табылмады' });
  const teacher = t.rows[0];
  const [awards, certs, events] = await Promise.all([
    query('SELECT * FROM teacher_awards WHERE teacher_id = $1 ORDER BY year DESC', [teacher.id]),
    query('SELECT * FROM teacher_certificates WHERE teacher_id = $1 ORDER BY issued_at DESC', [teacher.id]),
    query(
      `SELECT n.id, n.title, n.date, n.event_type, n.image_url
       FROM teacher_events te JOIN news n ON te.news_id = n.id
       WHERE te.teacher_id = $1 ORDER BY n.date DESC`,
      [teacher.id]
    )
  ]);
  res.json({ success: true, data: { ...teacher, awards: awards.rows, certificates: certs.rows, events: events.rows } });
}));

// POST /api/teachers
router.post('/', authenticate, requireAdmin, upload.single('photo'), asyncHandler(async (req, res) => {
  const { full_name, category, subject, bio, class_leadership, iin, password } = req.body;
  if (!full_name) return res.status(400).json({ success: false, message: 'Аты-жөні міндетті' });
  if (!iin || !password) return res.status(400).json({ success: false, message: 'ЖСН және құпия сөз міндетті' });
  if (iin.length !== 12) return res.status(400).json({ success: false, message: 'ЖСН 12 цифрдан тұруы керек' });

  const photo_url = req.file ? req.file.path : (req.body.photo_url || null);

  // Check if user with this iin exists
  const existingUser = await query('SELECT id, teacher_id FROM users WHERE iin = $1', [iin]);
  if (existingUser.rows.length > 0) {
    return res.status(400).json({ success: false, message: 'Бұл ЖСН-мен пайдаланушы бар' });
  }

  // Get teacher role id
  const roleRes = await query("SELECT id FROM roles WHERE name = 'teacher'");
  if (!roleRes.rows.length) {
    return res.status(500).json({ success: false, message: 'Teacher role not found' });
  }
  const teacherRoleId = roleRes.rows[0].id;

  // Create teacher
  const teacherResult = await query(
    'INSERT INTO teachers (full_name, photo_url, category, subject, bio, class_leadership) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [full_name, photo_url, category, subject, bio, class_leadership]
  );
  const teacher = teacherResult.rows[0];

  // Create user
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash(password, 10);
  await query(
    'INSERT INTO users (full_name, iin, password_hash, role_id, teacher_id) VALUES ($1, $2, $3, $4, $5)',
    [full_name, iin, hash, teacherRoleId, teacher.id]
  );

  res.status(201).json({ success: true, data: teacher });
}));

// PUT /api/teachers/:id
router.put('/:id', authenticate, requireAdmin, upload.single('photo'), asyncHandler(async (req, res) => {
  const {
    full_name, category, subject, bio, class_leadership,
    achievements_count, lessons_count, events_count, awards_count, is_active
  } = req.body;
  const photo_url = req.file ? req.file.path : (req.body.photo_url || null);
  const result = await query(
    `UPDATE teachers SET
      full_name = COALESCE($1, full_name), photo_url = COALESCE($2, photo_url),
      category = COALESCE($3, category), subject = COALESCE($4, subject),
      bio = COALESCE($5, bio), class_leadership = COALESCE($6, class_leadership),
      achievements_count = COALESCE($7, achievements_count),
      lessons_count = COALESCE($8, lessons_count),
      events_count = COALESCE($9, events_count),
      awards_count = COALESCE($10, awards_count),
      is_active = COALESCE($11, is_active), updated_at = NOW()
     WHERE id = $12 RETURNING *`,
    [full_name, photo_url, category, subject, bio, class_leadership,
     achievements_count, lessons_count, events_count, awards_count, is_active, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Мұғалім табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

// DELETE /api/teachers/:id
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM teachers WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Мұғалім табылмады' });
  res.json({ success: true, message: 'Мұғалім жойылды' });
}));

// POST /api/teachers/:id/awards
router.post('/:id/awards', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { title, year } = req.body;
  const result = await query(
    'INSERT INTO teacher_awards (teacher_id,title,year) VALUES ($1,$2,$3) RETURNING *',
    [req.params.id, title, year]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

// DELETE /api/teachers/:id/awards/:awardId
router.delete('/:id/awards/:awardId', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await query('DELETE FROM teacher_awards WHERE id = $1 AND teacher_id = $2', [req.params.awardId, req.params.id]);
  res.json({ success: true, message: 'Жойылды' });
}));

// POST /api/teachers/:id/certificates
router.post('/:id/certificates', authenticate, requireAdmin, upload.single('image'), asyncHandler(async (req, res) => {
  const { title, issued_at } = req.body;
  const image_url = req.file ? req.file.path : null;
  const result = await query(
    'INSERT INTO teacher_certificates (teacher_id,title,image_url,issued_at) VALUES ($1,$2,$3,$4) RETURNING *',
    [req.params.id, title, image_url, issued_at]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

module.exports = router;
