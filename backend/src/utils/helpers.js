/**
 * Async wrapper to avoid try/catch in every controller
 */
const { query } = require('../config/db');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Persist an audit log entry for admin and login actions.
 */
const logAudit = async ({ userId = null, schoolId = null, action, entity = null, entityId = null, details = {} }) => {
  await query(
    `INSERT INTO audit_logs (user_id, school_id, action, entity, entity_id, details, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [userId, schoolId, action, entity, entityId, details]
  );
};

/**
 * Build file URL from request and relative path
 */
const buildFileUrl = (req, filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith('http')) return filePath;
  return `${req.protocol}://${req.get('host')}/${filePath.replace(/\\/g, '/')}`;
};

/**
 * Pagination helper
 */
const paginate = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;
  return { pageNum, limitNum, offset };
};

/**
 * Format pagination response
 */
const paginatedResponse = (rows, total, page, limit) => ({
  data: rows,
  pagination: {
    total: parseInt(total),
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(parseInt(total) / parseInt(limit))
  }
});

module.exports = { asyncHandler, buildFileUrl, paginate, paginatedResponse, logAudit };
