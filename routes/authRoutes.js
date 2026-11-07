const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protectApi } = require('../middleware/authMiddleware');
const { registerLimiter, loginLimiter, botHoneypot } = require('../middleware/securityMiddleware');

router.post('/register', registerLimiter, botHoneypot, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', protectApi, authController.getMe);

module.exports = router;
