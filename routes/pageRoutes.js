const express = require('express');
const router = express.Router();
const { protectPage, optionalUser } = require('../middleware/authMiddleware');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// Landing page
router.get('/', optionalUser, (req, res) => {
  res.render('landing', {
    title: 'ChatIn — Real-Time Messaging Platform',
    user: req.user || null,
  });
});

// Login page
router.get('/login', optionalUser, (req, res) => {
  if (req.user) {
    return res.redirect('/chat');
  }
  res.render('login', {
    title: 'Sign In — ChatIn',
    user: null,
  });
});

// Register page
router.get('/register', optionalUser, (req, res) => {
  if (req.user) {
    return res.redirect('/chat');
  }
  res.render('register', {
    title: 'Create Account — ChatIn',
    user: null,
  });
});

// Main Chat dashboard (WhatsApp style: pre-loads conversations so they are instantly visible with 0ms loading time)
router.get('/chat', protectPage, async (req, res) => {
  let initialConversations = [];
  try {
    const currentUserId = req.user._id;
    const conversations = await Conversation.find({
      participants: currentUserId,
    })
      .populate('participants', 'username email profilePicture bio isOnline lastSeen')
      .populate('admins', 'username email profilePicture')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'senderId',
          select: 'username profilePicture',
        },
      })
      .sort({ updatedAt: -1 })
      .lean();

    initialConversations = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          senderId: { $ne: currentUserId },
          'readBy.user': { $ne: currentUserId },
        });
        conv.isGroup = conv.conversationType === 'group';
        conv.unreadCount = unreadCount;
        return conv;
      })
    );
  } catch (err) {
    console.error('Error pre-loading conversations:', err.message);
  }

  res.render('chat', {
    title: 'ChatIn — Messages',
    user: req.user,
    initialConversations,
  });
});

// Logout page redirect
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

module.exports = router;
