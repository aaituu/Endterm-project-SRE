const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

// GET all event types
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        et.*,
        (SELECT COUNT(*) FROM events e WHERE e.event_type_id = et.id) as events_count
      FROM event_types et
      ORDER BY et.id ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET single event type
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM event_types WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST new event type
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, points } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO event_types (name, points) VALUES ($1, $2) RETURNING *',
      [name, points || 0]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update event type
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, points } = req.body;
  try {
    const result = await pool.query(
      'UPDATE event_types SET name = $1, points = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [name, points || 0, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE event type
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM event_types WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
