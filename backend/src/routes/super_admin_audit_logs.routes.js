const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireSuperAdmin } = require('../middleware/rbac');
const { asyncHandler, paginate, paginatedResponse } = require('../utils/helpers');

router.get('/', authenticate, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, action, school_id, user_id } = req.query;
  const { pageNum, limitNum, offset } = paginate(page, limit);

  let whereClause = '1=1';
  const params = [];
  if (action) {
    params.push(action);
    whereClause += ` AND action = $${params.length}`;
  }
  if (school_id) {
    params.push(school_id);
    whereClause += ` AND school_id = $${params.length}`;
  }
  if (user_id) {
    params.push(user_id);
    whereClause += ` AND user_id = $${params.length}`;
  }

  const [rows, countResult] = await Promise.all([
    query(
      `SELECT al.*, u.full_name AS user_name, u.iin AS user_iin
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNum, offset]
    ),
    query(
      `SELECT COUNT(*)::int AS total FROM audit_logs WHERE ${whereClause}`,
      params
    )
  ]);

  res.json({ success: true, ...paginatedResponse(rows.rows, countResult.rows[0].total, pageNum, limitNum) });
}));

module.exports = router;
