const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../utils/helpers');

// GET /api/roles — with user counts + display label
router.get('/', asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT r.id, r.name,
           COALESCE(NULLIF(TRIM(r.label_kz), ''), r.name) AS display_name,
           r.label_kz,
           COUNT(u.id)::INTEGER AS users_count
    FROM roles r
    LEFT JOIN users u ON u.role_id = r.id
    GROUP BY r.id
    ORDER BY r.id
  `);
  res.json({ success: true, data: result.rows });
}));

// POST /api/roles
router.post('/', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name, label_kz } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Рөл атауын енгізіңіз' });
  const slug = String(name).toLowerCase().replace(/\s+/g, '_');
  const result = await query(
    'INSERT INTO roles (name, label_kz) VALUES ($1, $2) RETURNING *',
    [slug, label_kz || null]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

// PUT /api/roles/:id
router.put('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { label_kz, name } = req.body;
  const existing = await query('SELECT id, name FROM roles WHERE id = $1', [req.params.id]);
  if (!existing.rows[0]) return res.status(404).json({ success: false, message: 'Рөл табылмады' });

  let newName = existing.rows[0].name;
  if (name && String(name).trim()) {
    newName = String(name).toLowerCase().replace(/\s+/g, '_');
  }

  const result = await query(
    `UPDATE roles SET name = $1, label_kz = COALESCE($2, label_kz) WHERE id = $3 RETURNING *`,
    [newName, label_kz !== undefined ? label_kz : null, req.params.id]
  );
  res.json({ success: true, data: result.rows[0] });
}));

// DELETE /api/roles/:id
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const cnt = await query('SELECT COUNT(*)::int AS c FROM users WHERE role_id = $1', [req.params.id]);
  if (cnt.rows[0].c > 0) {
    return res.status(400).json({ success: false, message: 'Бұл рөлде пайдаланушылар бар, жою мүмкін емес' });
  }
  const result = await query('DELETE FROM roles WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Рөл табылмады' });
  res.json({ success: true, message: 'Рөл жойылды' });
}));

module.exports = router;
