const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getTokenFromRequest = (req) => {
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
};

// Protect for API endpoints (returns JSON 401)
const protectApi = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, please sign in' });
    }

    const secret = process.env.JWT_SECRET || 'chatin_super_secure_jwt_secret_key_2026';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found or account removed' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

// Protect for Page routes (redirects to /login if unauthenticated)
const protectPage = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.redirect('/login');
    }

    const secret = process.env.JWT_SECRET || 'chatin_super_secure_jwt_secret_key_2026';
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      res.clearCookie('token');
      return res.redirect('/login');
    }

    req.user = user;
    res.locals.user = user;
    next();
  } catch (error) {
    res.clearCookie('token');
    return res.redirect('/login');
  }
};

// Optional user lookup (sets res.locals.user if logged in, but doesn't block)
const optionalUser = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (token) {
      const secret = process.env.JWT_SECRET || 'chatin_super_secure_jwt_secret_key_2026';
      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.id).select('-passwordHash');
      if (user) {
        req.user = user;
        res.locals.user = user;
      }
    }
  } catch (e) {
    // Ignore invalid tokens for optional auth
  }
  next();
};

module.exports = { protectApi, protectPage, optionalUser, protect: protectApi };
