const express = require('express');
const router = express.Router();
const {
  searchUsers,
  updateProfile,
  updatePassword,
  getUserById,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/search', protect, searchUsers);
router.get('/', protect, searchUsers);
router.put('/profile', protect, upload.single('profilePicture'), updateProfile);
router.put('/password', protect, updatePassword);
router.get('/:id', protect, getUserById);

module.exports = router;
