const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { attachSchoolContext } = require('../middleware/tenant');

// GET /api/messages
router.get('/', authenticate, attachSchoolContext, asyncHandler(async (req, res) => {
  const params = [req.user.id];
  let where = '(sender_id = $1 OR receiver_id = $1)';

  if (req.user.role !== 'super_admin') {
    params.push(req.school_id);
    where += ' AND school_id = $2';
  }

  const result = await query(
    `SELECT * FROM messages WHERE ${where} ORDER BY created_at DESC LIMIT 200`,
    params
  );
  res.json({ success: true, data: result.rows });
}));

// POST /api/messages
router.post('/', authenticate, attachSchoolContext, asyncHandler(async (req, res) => {
  const { receiver_id, subject, body } = req.body;
  if (!receiver_id || !body) return res.status(400).json({ success: false, message: 'Қабылдаушы және мәтін қажет' });

  const schoolId = req.user.role === 'super_admin' ? req.body.school_id || null : req.school_id;
  const result = await query(
    `INSERT INTO messages (school_id, sender_id, receiver_id, subject, body) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [schoolId, req.user.id, receiver_id, subject || null, body]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

// PUT /api/messages/:id/read
router.put('/:id/read', authenticate, attachSchoolContext, asyncHandler(async (req, res) => {
  const params = [req.params.id, req.user.id];
  let queryText = `UPDATE messages SET is_read = TRUE WHERE id = $1 AND receiver_id = $2`;
  if (req.user.role !== 'super_admin') {
    params.push(req.school_id);
    queryText += ` AND school_id = $3`;
  }
  const result = await query(`${queryText} RETURNING *`, params);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Хабарлама табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

module.exports = router;
