const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { attachSchoolContext } = require('../middleware/tenant');
const { asyncHandler } = require('../utils/helpers');

// GET /api/notifications
router.get('/', authenticate, attachSchoolContext, asyncHandler(async (req, res) => {
  const params = [req.user.id];
  let where = 'user_id = $1';
  if (req.user.role !== 'super_admin') {
    params.push(req.school_id);
    where += ' AND school_id = $2';
  }
  const result = await query(`SELECT * FROM notifications WHERE ${where} ORDER BY created_at DESC LIMIT 100`, params);
  res.json({ success: true, data: result.rows });
}));

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, attachSchoolContext, asyncHandler(async (req, res) => {
  const params = [req.params.id, req.user.id];
  let queryText = `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`;
  if (req.user.role !== 'super_admin') {
    params.push(req.school_id);
    queryText += ' AND school_id = $3';
  }
  const result = await query(`${queryText} RETURNING *`, params);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Хабарлама табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

// POST /api/notifications
router.post('/', authenticate, requireAdmin, attachSchoolContext, asyncHandler(async (req, res) => {
  const { user_id, type, content, metadata } = req.body;
  if (!user_id || !content) return res.status(400).json({ success: false, message: 'Пайдаланушы мен мазмұны қажет' });
  const schoolId = req.user.role === 'super_admin' ? req.body.school_id || null : req.school_id;
  const result = await query(
    `INSERT INTO notifications (school_id, user_id, type, content, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [schoolId, user_id, type || null, content, metadata ? JSON.stringify(metadata) : '{}']
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

module.exports = router;
