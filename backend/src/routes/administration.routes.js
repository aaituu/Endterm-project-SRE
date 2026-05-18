const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../utils/helpers');
const upload = require('../middleware/upload');

// GET /api/administration  (public)
router.get('/', asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT DISTINCT ON (sort_order, full_name, id) * FROM administration WHERE is_active = TRUE ORDER BY sort_order ASC, full_name ASC, id ASC'
  );
  // Manual distinct by full name to preserve sort_order
  const unique = [];
  const names = new Set();
  for (const r of result.rows) {
    if (!names.has(r.full_name)) {
      names.add(r.full_name);
      unique.push(r);
    }
  }
  res.json({ success: true, data: unique });
}));

// GET /api/administration/search-user?q=iin_or_name  (admin — to prefill from user data)
router.get('/search-user', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ success: true, data: [] });
  const result = await query(
    `SELECT u.id, u.full_name, u.iin, 
            COALESCE(t.photo_url, NULL) AS photo_url,
            r.name AS role
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN teachers t ON u.teacher_id = t.id
     WHERE u.full_name ILIKE $1 OR u.iin ILIKE $1
     ORDER BY u.full_name ASC LIMIT 10`,
    [`%${q}%`]
  );
  res.json({ success: true, data: result.rows });
}));

// GET /api/administration/:id  (public)
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM administration WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Қызметкер табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

// POST /api/administration
router.post('/', authenticate, requireAdmin, upload.single('photo'), asyncHandler(async (req, res) => {
  const { full_name, position, bio, email, phone, sort_order } = req.body;
  if (!full_name || !position) {
    return res.status(400).json({ success: false, message: 'Аты-жөні және лауазымы міндетті' });
  }
  const photo_url = req.file ? req.file.path : (req.body.photo_url || null);
  const result = await query(
    'INSERT INTO administration (full_name,position,photo_url,bio,email,phone,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [full_name, position, photo_url, bio, email, phone, sort_order || 0]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

// PUT /api/administration/:id
router.put('/:id', authenticate, requireAdmin, upload.single('photo'), asyncHandler(async (req, res) => {
  const { full_name, position, bio, email, phone, sort_order, is_active } = req.body;
  const photo_url = req.file ? req.file.path : (req.body.photo_url || null);
  const result = await query(
    `UPDATE administration SET
      full_name = COALESCE($1, full_name), position = COALESCE($2, position),
      photo_url = COALESCE($3, photo_url), bio = COALESCE($4, bio),
      email = COALESCE($5, email), phone = COALESCE($6, phone),
      sort_order = COALESCE($7, sort_order), is_active = COALESCE($8, is_active)
     WHERE id = $9 RETURNING *`,
    [full_name, position, photo_url, bio, email, phone, sort_order, is_active, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Қызметкер табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

// DELETE /api/administration/:id
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM administration WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Қызметкер табылмады' });
  res.json({ success: true, message: 'Қызметкер жойылды' });
}));

module.exports = router;
