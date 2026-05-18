const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { asyncHandler } = require('../utils/helpers');

// -- COMPETITION TYPES --

router.get('/types', asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM competition_types ORDER BY id ASC');
  res.json({ success: true, data: result.rows });
}));

router.post('/types', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name, type } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Атауы көрсетілуі тиіс' });
  
  const result = await query(
    'INSERT INTO competition_types (name, type) VALUES ($1, $2) RETURNING *',
    [name, type || 'Offline']
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

router.get('/types/:id', asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM competition_types WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

router.put('/types/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name, type } = req.body;
  const result = await query(
    'UPDATE competition_types SET name = $1, type = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [name, type, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

router.delete('/types/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM competition_types WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, message: 'Өшірілді' });
}));


// -- COMPETITION LEVELS --

router.get('/levels', asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM competition_levels ORDER BY id ASC');
  res.json({ success: true, data: result.rows });
}));

router.post('/levels', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Атауы көрсетілуі тиіс' });
  
  const result = await query(
    'INSERT INTO competition_levels (name) VALUES ($1) RETURNING *',
    [name]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

router.get('/levels/:id', asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM competition_levels WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

router.put('/levels/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name } = req.body;
  const result = await query(
    'UPDATE competition_levels SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [name, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

router.delete('/levels/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM competition_levels WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, message: 'Өшірілді' });
}));

module.exports = router;
