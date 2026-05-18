const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireTeacher } = require('../middleware/rbac');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'src/uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({ storage });

// GET all events
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, start_date, end_date } = req.query;
    let query = `
      SELECT e.*, et.name as type_name, et.points as type_points
      FROM events e
      LEFT JOIN event_types et ON e.event_type_id = et.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (search) {
      query += ` AND e.title ILIKE $${idx}`;
      params.push(`%${search}%`);
      idx++;
    }
    if (start_date) {
      query += ` AND e.date >= $${idx}`;
      params.push(start_date);
      idx++;
    }
    if (end_date) {
      query += ` AND e.date <= $${idx}`;
      params.push(end_date);
      idx++;
    }

    query += ' ORDER BY e.date DESC, e.time DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET single event including participants and creator info
router.get('/:id', authenticate, async (req, res) => {
  try {
    const eventId = req.params.id;
    const eventRes = await pool.query(`
      SELECT e.*, et.name as type_name, u.full_name as creator_name, r.name as creator_role
      FROM events e
      LEFT JOIN event_types et ON e.event_type_id = et.id
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE e.id = $1
    `, [eventId]);

    if (eventRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    const eventData = eventRes.rows[0];

    const partRes = await pool.query(`
      SELECT p.user_id, u.full_name, u.iin, r.name as role
      FROM event_participants p
      JOIN users u ON p.user_id = u.id
      JOIN roles r ON u.role_id = r.id
      WHERE p.event_id = $1
    `, [eventId]);
    
    eventData.participants = partRes.rows;

    res.json({ success: true, data: eventData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create event
router.post('/', authenticate, requireTeacher, upload.single('image'), async (req, res) => {
  const { title, description, date, time, location, event_type_id, status } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  const created_by = req.user.id; // From auth token

  try {
    const result = await pool.query(`
      INSERT INTO events (title, description, date, time, location, event_type_id, status, image_url, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `, [title, description, date, time, location, event_type_id || null, status || 'өтті', image_url, created_by]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT update event
router.put('/:id', authenticate, requireAdmin, upload.single('image'), async (req, res) => {
  const { title, description, date, time, location, event_type_id, status } = req.body;
  const eventId = req.params.id;

  try {
    let query, params;
    if (req.file) {
      const image_url = `/uploads/${req.file.filename}`;
      query = `UPDATE events SET title=$1, description=$2, date=$3, time=$4, location=$5, event_type_id=$6, status=$7, image_url=$8, updated_at=NOW() WHERE id=$9 RETURNING *`;
      params = [title, description, date, time, location, event_type_id || null, status, image_url, eventId];
    } else {
      query = `UPDATE events SET title=$1, description=$2, date=$3, time=$4, location=$5, event_type_id=$6, status=$7, updated_at=NOW() WHERE id=$8 RETURNING *`;
      params = [title, description, date, time, location, event_type_id || null, status, eventId];
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE event
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- PARTICIPATION MANAGEMENT ---

router.post('/:id/participants', authenticate, requireAdmin, async (req, res) => {
  const eventId = req.params.id;
  const { user_id } = req.body;
  try {
    await pool.query('INSERT INTO event_participants (event_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [eventId, user_id]);
    res.json({ success: true, message: 'Added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id/participants/:userId', authenticate, requireAdmin, async (req, res) => {
  const { id, userId } = req.params;
  try {
    await pool.query('DELETE FROM event_participants WHERE event_id = $1 AND user_id = $2', [id, userId]);
    res.json({ success: true, message: 'Removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
