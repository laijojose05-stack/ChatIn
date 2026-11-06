const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'fallback_dev_secret_change_in_production_12345';
  return jwt.sign({ id: userId }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

module.exports = generateToken;
