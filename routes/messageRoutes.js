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

router.get('/:conversationId', protect, getMessages);
router.post('/', protect, sendMessage);
router.put('/:id', protect, editMessage);
router.delete('/:id', protect, deleteMessage);
router.post('/:conversationId/read', protect, markAsRead);
router.post('/upload', protect, upload.array('attachments', 5), uploadAttachments);

module.exports = router;
