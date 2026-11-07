const express = require('express');
const router = express.Router();
const {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markAsRead,
  uploadAttachments,
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { messageLimiter, sanitizeMessage } = require('../middleware/securityMiddleware');

router.get('/:conversationId', protect, getMessages);
router.post('/', protect, messageLimiter, sanitizeMessage, sendMessage);
router.put('/:id', protect, sanitizeMessage, editMessage);
router.delete('/:id', protect, deleteMessage);
router.post('/:conversationId/read', protect, markAsRead);
router.post('/upload', protect, upload.any(), uploadAttachments);

module.exports = router;
