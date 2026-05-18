const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

// GET all competition names
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cn.*, ct.name as type_name
      FROM competition_names cn
      LEFT JOIN competition_types ct ON cn.competition_type_id = ct.id
      ORDER BY cn.id DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET one
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM competition_names WHERE id=$1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, competition_type_id, is_active, is_online, start_date, end_date } = req.body;
    const result = await pool.query(
      'INSERT INTO competition_names (name, competition_type_id, is_active, is_online, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, competition_type_id || null, is_active !== false, is_online === true, start_date || null, end_date || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, competition_type_id, is_active, is_online, start_date, end_date } = req.body;
    const result = await pool.query(
      'UPDATE competition_names SET name=$1, competition_type_id=$2, is_active=$3, is_online=$4, start_date=$5, end_date=$6, updated_at=NOW() WHERE id=$7 RETURNING *',
      [name, competition_type_id || null, is_active !== false, is_online === true, start_date || null, end_date || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM competition_names WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
