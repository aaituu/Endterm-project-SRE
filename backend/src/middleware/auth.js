const jwt = require('jsonwebtoken');

/**
 * Middleware: Verify JWT token
 * Attaches decoded user info to req.user
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Авторизация токені жоқ'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Токен мерзімі өтті' });
    }
    return res.status(403).json({ success: false, message: 'Жарамсыз токен' });
  }
};

/**
 * Middleware: Optional auth (attaches user if token present, continues regardless)
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      req.user = null;
    }
  }
  next();
};

module.exports = { authenticate, optionalAuth };
