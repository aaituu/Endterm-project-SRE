const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { asyncHandler } = require('../utils/helpers');

// POST /api/contact  (public - send message)
router.post('/', asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !message) {
    return res.status(400).json({ success: false, message: 'Аты-жөні және хабарлама міндетті' });
  }
  await query(
    'INSERT INTO contacts (name,email,phone,subject,message) VALUES ($1,$2,$3,$4,$5)',
    [name, email, phone, subject, message]
  );
  res.status(201).json({ success: true, message: 'Хабарламаңыз жіберілді. Жақын арада хабарласамыз.' });
}));

module.exports = router;
