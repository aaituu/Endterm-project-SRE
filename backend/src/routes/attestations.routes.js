const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireAdmin, requireTeacher } = require('../middleware/rbac');
const { asyncHandler } = require('../utils/helpers');

// GET /api/attestations/types
router.get('/types', asyncHandler(async (req, res) => {
  const result = await query('SELECT * FROM attestation_types ORDER BY id');
  res.json({ success: true, data: result.rows });
}));

router.post('/types', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name_kz } = req.body;
  if (!name_kz || !String(name_kz).trim()) {
    return res.status(400).json({ success: false, message: 'Атауы міндетті' });
  }
  const result = await query(
    'INSERT INTO attestation_types (name_kz) VALUES ($1) RETURNING *',
    [name_kz.trim()]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

router.put('/types/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name_kz } = req.body;
  const result = await query(
    'UPDATE attestation_types SET name_kz = COALESCE($1, name_kz) WHERE id = $2 RETURNING *',
    [name_kz ? name_kz.trim() : null, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

router.delete('/types/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const used = await query('SELECT 1 FROM attestations WHERE type_id = $1 LIMIT 1', [req.params.id]);
  if (used.rows[0]) {
    return res.status(400).json({ success: false, message: 'Бұл түр қолданылуда' });
  }
  await query('DELETE FROM attestation_types WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Жойылды' });
}));

// GET /api/attestations/my
router.get('/my', authenticate, requireTeacher, asyncHandler(async (req, res) => {
  if (!req.user.teacher_id) {
    return res.status(400).json({ success: false, message: 'Мұғалім профилі байланыспаған' });
  }
  const result = await query(
    `SELECT a.*, tp.name_kz AS type_name
     FROM attestations a
     LEFT JOIN attestation_types tp ON a.type_id = tp.id
     WHERE a.teacher_id = $1 ORDER BY a.issued_at DESC`,
    [req.user.teacher_id]
  );
  res.json({ success: true, data: result.rows });
}));

// GET /api/attestations
router.get('/', asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT a.*, t.full_name AS teacher_name, tp.name_kz AS type_name
     FROM attestations a
     LEFT JOIN teachers t ON a.teacher_id = t.id
     LEFT JOIN attestation_types tp ON a.type_id = tp.id
     ORDER BY a.issued_at DESC`
  );
  res.json({ success: true, data: result.rows });
}));

// POST /api/attestations
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { teacher_id, category, type_id, issued_at, document_url, certificate_url } = req.body;

  if (req.user.role === 'teacher') {
    if (req.user.teacher_id !== parseInt(teacher_id, 10)) {
      return res.status(403).json({ success: false, message: 'Басқа мұғалімге қоса алмайсыз' });
    }
  } else if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Рұқсат жоқ' });
  }

  if (!teacher_id || !issued_at) {
    return res.status(400).json({ success: false, message: 'Мұғалім мен күн міндетті' });
  }

  let tid = type_id ? parseInt(type_id, 10) : null;
  let cat = category || null;
  if (tid) {
    const tr = await query('SELECT name_kz FROM attestation_types WHERE id = $1', [tid]);
    if (tr.rows[0]) cat = tr.rows[0].name_kz;
  } else if (!cat) {
    return res.status(400).json({ success: false, message: 'Аттестация түрі міндетті' });
  }

  const expiresAtObj = new Date(issued_at);
  expiresAtObj.setFullYear(expiresAtObj.getFullYear() + 5);
  const expires_at = expiresAtObj.toISOString().split('T')[0];

  const result = await query(
    `INSERT INTO attestations (teacher_id, category, type_id, issued_at, expires_at, document_url, certificate_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [teacher_id, cat, tid, issued_at, expires_at, document_url || null, certificate_url || null]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

// PUT /api/attestations/:id
router.put('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { teacher_id, category, type_id, issued_at, document_url, certificate_url } = req.body;

  const expiresAtObj = new Date(issued_at);
  expiresAtObj.setFullYear(expiresAtObj.getFullYear() + 5);
  const expires_at = expiresAtObj.toISOString().split('T')[0];

  let tid = type_id != null ? parseInt(type_id, 10) : null;
  let cat = category;
  if (tid) {
    const tr = await query('SELECT name_kz FROM attestation_types WHERE id = $1', [tid]);
    if (tr.rows[0]) cat = tr.rows[0].name_kz;
  }
  const doc = document_url || certificate_url || null;

  const result = await query(
    `UPDATE attestations SET teacher_id=$1, category=$2, type_id=$3, issued_at=$4, expires_at=$5,
     document_url=COALESCE($6, document_url), certificate_url=COALESCE($6, certificate_url)
     WHERE id=$7 RETURNING *`,
    [teacher_id, cat, tid, issued_at, expires_at, doc, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

// DELETE /api/attestations/:id
router.delete('/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM attestations WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, message: 'Жойылды' });
}));

module.exports = router;
