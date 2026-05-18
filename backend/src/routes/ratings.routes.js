const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

// GET all ratings with user details and stats count
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, user_id, sort } = req.query;
    let query = `
      SELECT 
        ur.id, ur.user_id, ur.total_points, ur.created_at,
        u.full_name as user_name, u.iin as user_iin,
        (SELECT COUNT(*) FROM user_rating_details urd WHERE urd.user_rating_id = ur.id) as stats_count
      FROM user_ratings ur
      JOIN users u ON ur.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIdx = 1;

    if (search) {
      query += ` AND (u.full_name ILIKE $${paramIdx} OR u.iin ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (user_id) {
      query += ` AND ur.user_id = $${paramIdx}`;
      params.push(user_id);
      paramIdx++;
    }

    if (sort === 'points_desc') {
      query += ' ORDER BY ur.total_points DESC';
    } else if (sort === 'points_asc') {
      query += ' ORDER BY ur.total_points ASC';
    } else {
      query += ' ORDER BY ur.id DESC';
    }

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET single rating by ID (with details)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const urResult = await pool.query(`
      SELECT ur.*, u.full_name, u.iin
      FROM user_ratings ur
      JOIN users u ON ur.user_id = u.id
      WHERE ur.id = $1
    `, [id]);

    if (urResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    
    const urdResult = await pool.query(`
      SELECT urd.*, rt.name as type_name
      FROM user_rating_details urd
      LEFT JOIN rating_types rt ON urd.rating_type_id = rt.id
      WHERE urd.user_rating_id = $1
    `, [id]);

    const data = urResult.rows[0];
    data.details = urdResult.rows;

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create rating
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { user_id, total_points, details } = req.body;
    await client.query('BEGIN');

    // Check if user already has a rating, maybe update or create new? Let's just create new per form.
    // Or we handle it as 1 rating per user. Lets assume we can just create multiple or there's only 1.
    // To match design, let's insert.
    const resUr = await client.query(
      'INSERT INTO user_ratings (user_id, total_points) VALUES ($1, $2) RETURNING *',
      [user_id, total_points || 0]
    );

    const userRatingId = resUr.rows[0].id;

    if (details && Array.isArray(details)) {
      for (const d of details) {
        if (!d.rating_type_id) continue;
        await client.query(
          'INSERT INTO user_rating_details (user_rating_id, rating_type_id, material_link, points) VALUES ($1, $2, $3, $4)',
          [userRatingId, d.rating_type_id, d.material_link, d.points || 0]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: resUr.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT update rating
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { total_points, details } = req.body;
    const { id } = req.params;
    await client.query('BEGIN');

    const urCheck = await client.query('SELECT * FROM user_ratings WHERE id=$1', [id]);
    if (urCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    await client.query('UPDATE user_ratings SET total_points=$1, updated_at=NOW() WHERE id=$2', [total_points || 0, id]);

    // Clear old details and re-insert
    await client.query('DELETE FROM user_rating_details WHERE user_rating_id=$1', [id]);

    if (details && Array.isArray(details)) {
      for (const d of details) {
        if (!d.rating_type_id) continue;
        await client.query(
          'INSERT INTO user_rating_details (user_rating_id, rating_type_id, material_link, points) VALUES ($1, $2, $3, $4)',
          [id, d.rating_type_id, d.material_link, d.points || 0]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Updated exactly' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

// DELETE
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM user_ratings WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
