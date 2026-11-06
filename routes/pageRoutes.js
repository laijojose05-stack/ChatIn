const express = require('express');
const router = express.Router();
const { protectPage, optionalUser } = require('../middleware/authMiddleware');

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

// Main Chat dashboard
router.get('/chat', protectPage, (req, res) => {
  res.render('chat', {
    title: 'ChatIn — Messages',
    user: req.user,
  });
});

// Logout page redirect
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

module.exports = router;
