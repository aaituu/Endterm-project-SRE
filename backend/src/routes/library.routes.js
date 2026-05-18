const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { requireTeacher, requireLibrary } = require('../middleware/rbac');
const { asyncHandler } = require('../utils/helpers');

// GET /api/library/books
router.get('/books', asyncHandler(async (req, res) => {
  const { search } = req.query;
  let q = 'SELECT * FROM books';
  const params = [];
  if (search) {
    q += ' WHERE title ILIKE $1';
    params.push(`%${search}%`);
  }
  q += ' ORDER BY title';
  const result = await query(q, params);
  res.json({ success: true, data: result.rows });
}));

// POST /api/library/books
router.post('/books', authenticate, requireLibrary, asyncHandler(async (req, res) => {
  const { title, author, total_copies, quantity } = req.body;
  if (!title || !String(title).trim()) {
    return res.status(400).json({ success: false, message: 'Атауы міндетті' });
  }
  const copies = Number(total_copies || quantity || 1) || 1;
  const result = await query(
    `INSERT INTO books (title, author, quantity, available)
     VALUES ($1, $2, $3, $3) RETURNING *`,
    [title.trim(), (author || '').trim() || null, copies]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
}));

// PUT /api/library/books/:id
router.put('/books/:id', authenticate, requireLibrary, asyncHandler(async (req, res) => {
  const { title, author, quantity } = req.body;
  const result = await query(
    `UPDATE books SET
      title = COALESCE(NULLIF(TRIM($1), ''), title),
      author = COALESCE($2, author),
      quantity = COALESCE($3, quantity)
     WHERE id = $4 RETURNING *`,
    [title || null, author ?? null, quantity ?? null, req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Кітап табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

// DELETE /api/library/books/:id
router.delete('/books/:id', authenticate, requireLibrary, asyncHandler(async (req, res) => {
  await query('DELETE FROM books WHERE id = $1', [req.params.id]);
  res.json({ success: true, message: 'Жойылды' });
}));

// GET /api/library/reservations
router.get('/reservations', authenticate, requireLibrary, asyncHandler(async (req, res) => {
  const { search } = req.query;
  const params = [];
  let where = '';
  if (search && String(search).trim()) {
    params.push(`%${search.trim()}%`);
    where = `WHERE b.title ILIKE $1 OR u.full_name ILIKE $1 OR u.iin ILIKE $1`;
  }
  const result = await query(
    `SELECT r.*, b.title as book_title, u.full_name as user_name, u.iin as user_iin
     FROM book_reservations r
     JOIN books b ON r.book_id = b.id
     JOIN users u ON r.user_id = u.id
     ${where}
     ORDER BY r.created_at DESC`,
    params
  );
  res.json({ success: true, data: result.rows });
}));

// POST /api/library/reservations
router.post('/reservations', authenticate, requireLibrary, asyncHandler(async (req, res) => {
  const {
    book_id, user_id, return_date, due_date, borrow_date, borrowDate, status
  } = req.body;
  const ret = return_date || due_date || null;
  const bor = borrow_date || borrowDate || null;
  const st = status || 'issued';
  if (!book_id || !user_id) {
    return res.status(400).json({ success: false, message: 'Кітап пен пайдаланушы міндетті' });
  }
  const result = await query(
    `INSERT INTO book_reservations (book_id, user_id, borrow_date, return_date, status)
     VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4::date, $5) RETURNING *`,
    [book_id, user_id, bor, ret, st]
  );
  res.json({ success: true, data: result.rows[0] });
}));

// PUT /api/library/reservations/:id/return
router.put('/reservations/:id/return', authenticate, requireLibrary, asyncHandler(async (req, res) => {
  const result = await query(
    `UPDATE book_reservations SET status = 'returned', actual_return_date = CURRENT_DATE
     WHERE id = $1 RETURNING *`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Табылмады' });
  res.json({ success: true, data: result.rows[0] });
}));

// GET /api/library/users-search
router.get('/users-search', authenticate, requireLibrary, asyncHandler(async (req, res) => {
  const { search } = req.query;
  if (!search) return res.json({ success: true, data: [] });
  const result = await query(
    `SELECT id, full_name, iin FROM users WHERE full_name ILIKE $1 OR iin ILIKE $1 LIMIT 10`,
    [`%${search}%`]
  );
  res.json({ success: true, data: result.rows });
}));

module.exports = router;
