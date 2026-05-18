const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { asyncHandler, logAudit } = require('../utils/helpers');

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { iin, password } = req.body;

  if (!iin || !password) {
    return res.status(400).json({ success: false, message: 'ЖСН және құпия сөзді енгізіңіз' });
  }

  const result = await query(
    `SELECT u.*, r.name AS role, u.school_id, r.label_kz AS role_label
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.iin = $1 AND u.is_active = TRUE`,
    [iin]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ success: false, message: 'ЖСН немесе құпия сөз қате' });
  }

  const user = result.rows[0];
  if (!req.school && user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Мектептің жеке адресі арқылы кіріңіз' });
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'ЖСН немесе құпия сөз қате' });
  }

  const token = jwt.sign(
    {
      id: user.id,
      iin: user.iin,
      role: user.role,
      full_name: user.full_name,
      teacher_id: user.teacher_id,
      school_id: user.school_id,
      central_school_id: req.central_school_id || null,
      school_slug: req.school?.slug || null,
      school_name: req.school?.name || null,
      is_super_admin: user.role === 'super_admin'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  await logAudit({
    userId: user.id,
    schoolId: user.school_id,
    action: 'login',
    entity: 'auth',
    details: { ip: req.ip }
  });

  res.json({
    success: true,
    message: 'Жүйеге сәтті кірдіңіз',
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      iin: user.iin,
      role: user.role,
      role_label: user.role_label,
      teacher_id: user.teacher_id,
      school_id: user.school_id,
      central_school_id: req.central_school_id || null,
      school_slug: req.school?.slug || null,
      school_name: req.school?.name || null,
      photo_url: user.photo_url || null,
      is_super_admin: user.role === 'super_admin'
    }
  });
}));

// POST /api/auth/change-password
router.post('/change-password', authenticate, asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, message: 'Барлық өрістерді толтырыңыз' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ success: false, message: 'Жаңа құпия сөз кемінде 6 таңбадан тұруы керек' });
  }

  const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const user = result.rows[0];
  const isMatch = await bcrypt.compare(current_password, user.password_hash);

  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Ағымдағы құпия сөз қате' });
  }

  const hash = await bcrypt.hash(new_password, 10);
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);
  await logAudit({ userId: req.user.id, schoolId: req.user.school_id, action: 'password_change', entity: 'users', entityId: req.user.id });

  res.json({ success: true, message: 'Құпия сөз сәтті өзгертілді' });
}));

// GET /api/auth/me
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT u.id, u.full_name, u.iin, u.teacher_id, u.school_id, u.photo_url, u.is_active, u.created_at, r.name AS role, r.label_kz AS role_label
     FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
    [req.user.id]
  );

  if (!result.rows[0]) {
    return res.status(404).json({ success: false, message: 'Пайдаланушы табылмады' });
  }

  res.json({
    success: true,
    data: {
      ...result.rows[0],
      central_school_id: req.central_school_id || req.user.central_school_id || null,
      school_slug: req.school?.slug || req.user.school_slug || null,
      school_name: req.school?.name || req.user.school_name || null
    }
  });
}));

router.put('/profile', authenticate, upload.single('photo'), asyncHandler(async (req, res) => {
  const { full_name, iin, current_password, new_password } = req.body;
  const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!userRes.rows[0]) {
    return res.status(404).json({ success: false, message: 'Пайдаланушы табылмады' });
  }

  const updates = [];
  const params = [];

  if (full_name !== undefined) {
    params.push(full_name.trim());
    updates.push(`full_name=$${params.length}`);
  }
  if (iin !== undefined) {
    params.push(iin.trim());
    updates.push(`iin=$${params.length}`);
  }
  if (req.file) {
    params.push(`/resources/images/${req.file.filename}`);
    updates.push(`photo_url=$${params.length}`);
  }

  if (new_password) {
    if (!current_password) {
      return res.status(400).json({ success: false, message: 'Ағымдағы құпия сөзді енгізіңіз' });
    }
    const isMatch = await bcrypt.compare(current_password, userRes.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Ағымдағы құпия сөз қате' });
    }
    const hash = await bcrypt.hash(new_password, 10);
    params.push(hash);
    updates.push(`password_hash=$${params.length}`);
  }

  if (!updates.length) {
    const sameResult = await query(
      `SELECT u.id, u.full_name, u.iin, u.teacher_id, u.school_id, u.photo_url, u.is_active, u.created_at, r.name AS role, r.label_kz AS role_label
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
      [req.user.id]
    );
    return res.json({ success: true, message: 'Өзгерістер жоқ', data: sameResult.rows[0] });
  }

  params.push(req.user.id);
  await query(
    `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`,
    params
  );
  await logAudit({
    userId: req.user.id,
    schoolId: req.user.school_id,
    action: 'profile_update',
    entity: 'users',
    entityId: req.user.id,
    details: { updated_fields: updates }
  });
  const updated = await query(
    `SELECT u.id, u.full_name, u.iin, u.teacher_id, u.school_id, u.photo_url, u.is_active, u.created_at, r.name AS role, r.label_kz AS role_label
     FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
    [req.user.id]
  );

  res.json({ success: true, message: 'Профиль жаңартылды', data: updated.rows[0] });
}));

module.exports = router;
