const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getNotifications);
router.put('/read-all', protect, markAllNotificationsRead);
router.put('/:id/read', protect, markNotificationRead);
router.delete('/:id', protect, deleteNotification);

module.exports = router;
