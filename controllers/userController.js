const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// @desc    Search user by username or email
// @route   GET /api/users/search or GET /api/users?search=username
// @access  Private
const searchUsers = async (req, res, next) => {
  try {
    const rawSearch = (req.query.search || req.query.q || '').trim();
    const search = rawSearch.replace(/^@/, '');

    // If query is empty, return a list of recent active users (excluding current user)
    if (!search) {
      const users = await User.find({
        _id: { $ne: req.user._id },
      })
        .select('username email profilePicture bio isOnline lastSeen')
        .sort({ isOnline: -1, lastSeen: -1 })
        .limit(50);

      return res.json({ success: true, count: users.length, data: users });
    }

    // Escape regex characters for safe query
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Case-insensitive substring match
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { username: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ],
    })
      .select('username email profilePicture bio isOnline lastSeen')
      .limit(20);

    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile (username, bio, profile picture)
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { username, bio } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (username) {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        return res.status(400).json({ success: false, message: 'Username must be between 3 and 30 characters' });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
        return res.status(400).json({ success: false, message: 'Username can only contain letters, numbers, and underscores' });
      }

      // Check if username is taken by another user
      const existing = await User.findOne({ username: cleanUsername, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Username is already taken' });
      }

      user.username = cleanUsername;
    }

    if (bio !== undefined) {
      user.bio = bio.trim().substring(0, 150);
    }

    if (req.file) {
      if (req.file.buffer) {
        user.profilePicture = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      } else {
        user.profilePicture = `/uploads/${req.file.filename}`;
      }
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user password
// @route   PUT /api/users/password
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide both current and new passwords' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    const user = await User.findById(id).select(
      'username email profilePicture bio isOnline lastSeen createdAt'
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchUsers,
  updateProfile,
  updatePassword,
  getUserById,
};
