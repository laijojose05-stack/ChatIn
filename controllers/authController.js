const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'chatin_super_secure_jwt_secret_key_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// Register
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }],
    });

    if (existingUser) {
      const message =
        existingUser.username === cleanUsername
          ? 'Username is already taken'
          : 'Email address is already registered';
      return res.status(400).json({ success: false, message });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      isOnline: true,
    });

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Server error during registration' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email/username and password' });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: cleanIdentifier }, { username: cleanIdentifier }],
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(user._id);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Server error during login' });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { isOnline: false, lastSeen: new Date() });
    }
    res.clearCookie('token');
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.clearCookie('token');
    return res.status(200).json({ success: true, message: 'Logged out' });
  }
};

// Get current user profile
exports.getMe = async (req, res) => {
  return res.status(200).json({ success: true, user: req.user });
};
