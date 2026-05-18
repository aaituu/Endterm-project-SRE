const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { asyncHandler, paginate, paginatedResponse } = require('../utils/helpers');
const upload = require('../middleware/upload');

// GET /api/gallery  (public)
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const { pageNum, limitNum, offset } = paginate(page, limit);
  const [rows, countRes] = await Promise.all([
    query('SELECT * FROM gallery ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limitNum, offset]),
    query('SELECT COUNT(*) FROM gallery')
  ]);
  res.json({ success: true, ...paginatedResponse(rows.rows, countRes.rows[0].count, pageNum, limitNum) });
}));

// POST /api/gallery
router.post('/', authenticate, requireAdmin, upload.single('image'), asyncHandler(async (req, res) => {
  const { description } = req.body;
  if (!req.file) return res.status(400).json({ success: false, message: 'Сурет қажет' });
  const image_url = req.file.path;
  const result = await query(
    'INSERT INTO gallery (image_url, description) VALUES ($1, $2) RETURNING *',
    [image_url, description]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

// DELETE /api/gallery/:id
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM gallery WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Сурет табылмады' });
  res.json({ success: true, message: 'Сурет жойылды' });
}));

module.exports = router;
