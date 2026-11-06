const User = require('../models/User');

// @desc    Search user by exact username or email
// @route   GET /api/users?search=username
// @access  Private
const searchUsers = async (req, res, next) => {
  try {
    // Strip leading @ and whitespace
    const search = (req.query.search || '').trim().replace(/^@/, '');

    // Do not return all users if search query is empty
    if (!search) {
      return res.json({ success: true, count: 0, data: [] });
    }

    // Escape regex characters for safe query
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // STRICT EXACT MATCH ONLY: Must match full username from start (^) to end ($)
    const users = await User.find({
      _id: { $ne: req.user._id }, // exclude current logged-in user
      $or: [
        { username: { $regex: `^${escaped}$`, $options: 'i' } },
        { email: search.toLowerCase() },
      ],
    })
      .select('username email profilePicture bio isOnline lastSeen')
      .limit(1);

    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select(
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
  getUserById,
};
