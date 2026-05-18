const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../utils/helpers');

router.get('/templates', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM site_templates ORDER BY created_at DESC');
  res.json({ success: true, data: result.rows });
}));

router.post('/templates', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { name, slug, config } = req.body;
  if (!name || !slug) return res.status(400).json({ success: false, message: 'Атауы мен slug міндетті' });
  const result = await query(
    'INSERT INTO site_templates (name, slug, config) VALUES ($1, $2, $3) RETURNING *',
    [name, slug, config || {}]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

router.put('/templates/:id', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { name, slug, config, is_default } = req.body;
  const result = await query(
    `UPDATE site_templates SET
       name = COALESCE($1, name),
       slug = COALESCE($2, slug),
       config = COALESCE($3, config),
       is_default = COALESCE($4, is_default, is_default),
       updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [name, slug, config, is_default, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Шаблон табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

router.get('/global-styles', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM global_styles ORDER BY created_at DESC');
  res.json({ success: true, data: result.rows });
}));

router.post('/global-styles', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { name, slug, config, is_default } = req.body;
  if (!name || !slug) return res.status(400).json({ success: false, message: 'Атауы мен slug міндетті' });
  const result = await query(
    'INSERT INTO global_styles (name, slug, config, is_default) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, slug, config || {}, is_default || false]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

router.put('/global-styles/:id', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { name, slug, config, is_default } = req.body;
  const result = await query(
    `UPDATE global_styles SET
      name = COALESCE($1, name),
      slug = COALESCE($2, slug),
      config = COALESCE($3, config),
      is_default = COALESCE($4, is_default, is_default),
      updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [name, slug, config, is_default, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Стиль табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

router.get('/components', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM components_config ORDER BY created_at DESC');
  res.json({ success: true, data: result.rows });
}));

router.post('/components', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { name, slug, config } = req.body;
  if (!name || !slug) return res.status(400).json({ success: false, message: 'Атауы мен slug міндетті' });
  const result = await query(
    'INSERT INTO components_config (name, slug, config) VALUES ($1, $2, $3) RETURNING *',
    [name, slug, config || {}]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

router.put('/components/:id', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { name, slug, config } = req.body;
  const result = await query(
    `UPDATE components_config SET
       name = COALESCE($1, name),
       slug = COALESCE($2, slug),
       config = COALESCE($3, config),
       updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [name, slug, config, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Компонент табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

module.exports = router;
