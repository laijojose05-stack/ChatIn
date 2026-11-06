const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protectApi } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/me', protectApi, authController.getMe);

module.exports = router;
