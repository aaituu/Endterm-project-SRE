const express = require('express');
const router = express.Router();
const { query, getCurrentTenant } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { attachSchoolContext } = require('../middleware/tenant');
const { asyncHandler } = require('../utils/helpers');
const {
  isTelegramConfigured,
  generateUserLinkCode,
  unlinkUserTelegram,
  getUserTelegramStatus
} = require('../services/telegram.service');

function requireTenantUser(req, res, next) {
  if (!req.school_id || req.user.role === 'super_admin') {
    return res.status(403).json({ success: false, message: 'Telegram тек мектеп пайдаланушыларына қолжетімді' });
  }
  return next();
}

function databaseKey() {
  return getCurrentTenant()?.databaseName || 'active';
}

router.use(authenticate, attachSchoolContext, requireTenantUser);

router.get('/status', asyncHandler(async (req, res) => {
  const status = await getUserTelegramStatus(query, {
    userId: req.user.id,
    schoolId: req.school_id,
    databaseKey: databaseKey()
  });
  res.json({ success: true, data: status });
}));

router.post('/link-code', asyncHandler(async (req, res) => {
  if (!isTelegramConfigured()) {
    return res.status(503).json({ success: false, message: 'Telegram bot token бапталмаған' });
  }

  const data = await generateUserLinkCode(query, {
    userId: req.user.id,
    schoolId: req.school_id,
    databaseKey: databaseKey()
  });
  res.json({ success: true, data });
}));

router.post('/unlink', asyncHandler(async (req, res) => {
  await unlinkUserTelegram(query, {
    userId: req.user.id,
    schoolId: req.school_id,
    databaseKey: databaseKey()
  });
  res.json({ success: true, message: 'Telegram байланысы өшірілді' });
}));

module.exports = router;
