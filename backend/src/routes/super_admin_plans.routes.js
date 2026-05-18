const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../utils/helpers');

router.get('/', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM service_plans ORDER BY created_at DESC');
  res.json({ success: true, data: result.rows });
}));

router.post('/', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { name, slug, description, price_per_month, limits, is_active } = req.body;
  if (!name || !slug) return res.status(400).json({ success: false, message: 'Атауы мен slug міндетті' });
  const result = await query(
    'INSERT INTO service_plans (name, slug, description, price_per_month, limits, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [name, slug, description || null, price_per_month || 0, limits || {}, is_active || true]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

router.put('/:id', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { name, slug, description, price_per_month, limits, is_active } = req.body;
  const result = await query(
    `UPDATE service_plans SET
       name = COALESCE($1, name),
       slug = COALESCE($2, slug),
       description = COALESCE($3, description),
       price_per_month = COALESCE($4, price_per_month, price_per_month),
       limits = COALESCE($5, limits, limits),
       is_active = COALESCE($6, is_active, is_active),
       updated_at = NOW()
     WHERE id = $7 RETURNING *`,
    [name, slug, description, price_per_month, limits, is_active, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Жоспар табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

router.delete('/:id', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM service_plans WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Жоспар табылмады' });
  res.json({ success: true, message: 'Жоспар жойылды' });
}));

router.get('/assignments', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const result = await query(`
    SELECT a.*, p.name AS plan_name, p.slug AS plan_slug, s.name AS school_name
    FROM school_plan_assignments a
    LEFT JOIN service_plans p ON a.plan_id = p.id
    LEFT JOIN schools s ON a.school_id = s.id
    ORDER BY a.updated_at DESC, a.created_at DESC
  `);
  res.json({ success: true, data: result.rows });
}));

router.post('/assignments', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { school_id, plan_id, status, start_date, end_date } = req.body;
  if (!school_id || !plan_id) return res.status(400).json({ success: false, message: 'Мектеп және жоспар міндетті' });

  const existing = await query('SELECT id FROM school_plan_assignments WHERE school_id = $1', [school_id]);
  if (existing.rows[0]) {
    const result = await query(
      `UPDATE school_plan_assignments SET plan_id = $1, status = $2, start_date = $3, end_date = $4, updated_at = NOW() WHERE school_id = $5 RETURNING *`,
      [plan_id, status || 'active', start_date || new Date(), end_date || null, school_id]
    );
    return res.json({ success: true, data: result.rows[0] });
  }

  const result = await query(
    `INSERT INTO school_plan_assignments (school_id, plan_id, status, start_date, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [school_id, plan_id, status || 'active', start_date || new Date(), end_date || null]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

module.exports = router;
