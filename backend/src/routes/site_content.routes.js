const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../utils/helpers');
const upload = require('../middleware/upload');

// GET /api/site-content?section=about  (public)
router.get('/', asyncHandler(async (req, res) => {
  const { section } = req.query;
  let result;
  if (section) {
    result = await query(
      'SELECT * FROM site_content WHERE section = $1 AND is_active = TRUE ORDER BY sort_order ASC',
      [section]
    );
  } else {
    result = await query('SELECT * FROM site_content WHERE is_active = TRUE ORDER BY section, sort_order ASC');
  }
  res.json({ success: true, data: result.rows });
}));

// GET /api/site-content/all (admin)
router.get('/all', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { section } = req.query;
  let result;
  if (section) {
    result = await query('SELECT * FROM site_content WHERE section = $1 ORDER BY sort_order ASC', [section]);
  } else {
    result = await query('SELECT * FROM site_content ORDER BY section, sort_order ASC');
  }
  res.json({ success: true, data: result.rows });
}));

// POST /api/site-content  (admin)
router.post('/', authenticate, requireAdmin, upload.single('image'), asyncHandler(async (req, res) => {
  const { section, content_key, title, body, sort_order } = req.body;
  if (!section) return res.status(400).json({ success: false, message: 'Section міндетті' });
  const image_url = req.file ? `resources/images/${req.file.filename}` : (req.body.image_url || null);
  const result = await query(
    'INSERT INTO site_content (section, content_key, title, body, image_url, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [section, content_key, title, body, image_url, sort_order || 0]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

// PUT /api/site-content/:id  (admin)
router.put('/:id', authenticate, requireAdmin, upload.single('image'), asyncHandler(async (req, res) => {
  const { section, content_key, title, body, sort_order, is_active } = req.body;
  const image_url = req.file ? `resources/images/${req.file.filename}` : (req.body.image_url || null);
  const result = await query(
    `UPDATE site_content SET
      section = COALESCE($1, section),
      content_key = COALESCE($2, content_key),
      title = COALESCE($3, title),
      body = COALESCE($4, body),
      image_url = COALESCE($5, image_url),
      sort_order = COALESCE($6, sort_order),
      is_active = COALESCE($7, is_active),
      updated_at = NOW()
     WHERE id = $8 RETURNING *`,
    [section, content_key, title, body, image_url, sort_order, is_active, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

// DELETE /api/site-content/:id  (admin)
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM site_content WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, message: 'Жойылды' });
}));

module.exports = router;
