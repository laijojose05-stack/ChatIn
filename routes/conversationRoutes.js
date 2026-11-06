const express = require('express');
const router = express.Router();
const {
  getUserConversations,
  getOrCreatePrivateConversation,
  createGroupConversation,
  getConversationById,
  updateGroup,
  addParticipants,
  removeParticipant,
  toggleAdmin,
} = require('../controllers/conversationController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', protect, getUserConversations);
router.post('/', protect, getOrCreatePrivateConversation);
router.post('/group', protect, upload.single('groupPicture'), createGroupConversation);
router.get('/:id', protect, getConversationById);
router.put('/:id/group', protect, upload.single('groupPicture'), updateGroup);
router.post('/:id/participants', protect, addParticipants);
router.delete('/:id/participants/:userId', protect, removeParticipant);
router.put('/:id/admins', protect, toggleAdmin);

module.exports = router;
