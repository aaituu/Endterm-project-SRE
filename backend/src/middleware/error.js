/**
 * Global error handler middleware
 */
const error = (err, req, res, next) => {
  console.error('❌ Error:', err.message);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'Файл өлшемі тым үлкен (макс. 10MB)' });
  }

  // Postgres unique violation
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Бұл деректер жүйеде бар' });
  }

  // Postgres foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ success: false, message: 'Байланысты жазба табылмады' });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Сервер қатесі орын алды',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = error;
