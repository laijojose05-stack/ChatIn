const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');

const formatConv = (conv, currentUserId) => {
  const convObj = conv.toObject ? conv.toObject() : { ...conv };
  convObj.isGroup = convObj.conversationType === 'group';
  return convObj;
};

// @desc    Get all conversations for current user
// @route   GET /api/conversations
// @access  Private
const getUserConversations = async (req, res, next) => {
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
      .sort({ updatedAt: -1 });

    // Calculate unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          senderId: { $ne: currentUserId },
          'readBy.user': { $ne: currentUserId },
        });

        const convObj = formatConv(conv, currentUserId);
        convObj.unreadCount = unreadCount;
        return convObj;
      })
    );

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    res.json({ success: true, count: conversationsWithUnread.length, data: conversationsWithUnread });
  } catch (error) {
    next(error);
  }
};

// @desc    Get or create 1-to-1 private conversation
// @route   POST /api/conversations
// @access  Private
const getOrCreatePrivateConversation = async (req, res, next) => {
  try {
    const { recipientId } = req.body;
    const currentUserId = req.user._id;

    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'recipientId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ success: false, message: 'Invalid recipientId format' });
    }

    if (recipientId === currentUserId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot start conversation with yourself' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      conversationType: 'private',
      participants: { $all: [currentUserId, recipientId], $size: 2 },
    })
      .populate('participants', 'username email profilePicture bio isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', select: 'username profilePicture' },
      });

    if (!conversation) {
      conversation = await Conversation.create({
        conversationType: 'private',
        participants: [currentUserId, recipientId],
      });

      conversation = await Conversation.findById(conversation._id).populate(
        'participants',
        'username email profilePicture bio isOnline lastSeen'
      );
    }

    const convData = formatConv(conversation, currentUserId);

    // Notify recipient via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${recipientId}`).emit('conversation_created', convData);
    }

    res.status(200).json({ success: true, data: convData });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new group conversation
// @route   POST /api/conversations/group
// @access  Private
const createGroupConversation = async (req, res, next) => {
  try {
    const { groupName, groupDescription, description, participants, participantIds } = req.body;
    const currentUserId = req.user._id;

    if (!groupName || !groupName.trim()) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    const rawMembers = Array.isArray(participants) ? participants : (Array.isArray(participantIds) ? participantIds : []);
    let members = [...new Set(rawMembers.map((m) => m.toString()))];

    // Ensure creator is in participants
    if (!members.includes(currentUserId.toString())) {
      members.push(currentUserId.toString());
    }

    if (members.length < 2) {
      return res.status(400).json({ success: false, message: 'A group must have at least 2 members' });
    }

    let groupPicture = '';
    if (req.file) {
      if (req.file.buffer) {
        groupPicture = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      } else {
        groupPicture = `/uploads/${req.file.filename}`;
      }
    }

    const finalDescription = (groupDescription || description || '').trim();

    const conversation = await Conversation.create({
      conversationType: 'group',
      groupName: groupName.trim(),
      groupDescription: finalDescription,
      groupPicture,
      participants: members,
      admins: [currentUserId],
    });

    // Create system message
    const systemMsg = await Message.create({
      conversationId: conversation._id,
      senderId: currentUserId,
      content: `${req.user.username} created the group "${conversation.groupName}"`,
      messageType: 'system',
    });

    conversation.lastMessage = systemMsg._id;
    await conversation.save();

    // Create notifications for invited members
    for (const memberId of members) {
      if (memberId !== currentUserId.toString()) {
        await Notification.create({
          recipientId: memberId,
          senderId: currentUserId,
          type: 'group_invite',
          message: `You were added to the group "${conversation.groupName}" by ${req.user.username}`,
          conversationId: conversation._id,
        });
      }
    }

    const populated = await Conversation.findById(conversation._id)
      .populate('participants', 'username email profilePicture bio isOnline lastSeen')
      .populate('admins', 'username email profilePicture')
      .populate('lastMessage');

    const convData = formatConv(populated, currentUserId);

    // Notify all participants in real time
    const io = req.app.get('io');
    if (io) {
      members.forEach((pId) => {
        io.to(`user:${pId}`).emit('conversation_created', convData);
      });
    }

    res.status(201).json({ success: true, data: convData });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single conversation
// @route   GET /api/conversations/:id
// @access  Private
const getConversationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
    }

    const conversation = await Conversation.findById(id)
      .populate('participants', 'username email profilePicture bio isOnline lastSeen')
      .populate('admins', 'username email profilePicture')
      .populate({
        path: 'lastMessage',
        populate: { path: 'senderId', select: 'username profilePicture' },
      });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Security check: must be participant
    const isParticipant = conversation.participants.some(
      (p) => p._id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Access denied to this conversation' });
    }

    res.json({ success: true, data: formatConv(conversation, req.user._id) });
  } catch (error) {
    next(error);
  }
};

// @desc    Update group details (name, description, picture)
// @route   PUT /api/conversations/:id/group
// @access  Private (Admins only)
const updateGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID' });
    }

    const { groupName, groupDescription, description } = req.body;
    const currentUserId = req.user._id.toString();

    const conversation = await Conversation.findById(id);
    if (!conversation || conversation.conversationType !== 'group') {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isAdmin = conversation.admins.some((a) => a.toString() === currentUserId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only group admins can update group details' });
    }

    if (groupName) conversation.groupName = groupName.trim();
    const newDesc = groupDescription !== undefined ? groupDescription : description;
    if (newDesc !== undefined) conversation.groupDescription = newDesc.trim();
    if (req.file) {
      conversation.groupPicture = `/uploads/${req.file.filename}`;
    }

    await conversation.save();

    // Create system message
    await Message.create({
      conversationId: conversation._id,
      senderId: req.user._id,
      content: `${req.user.username} updated the group settings`,
      messageType: 'system',
    });

    const populated = await Conversation.findById(id)
      .populate('participants', 'username email profilePicture bio isOnline lastSeen')
      .populate('admins', 'username email profilePicture')
      .populate('lastMessage');

    const convData = formatConv(populated, currentUserId);

    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${id}`).emit('group_updated', convData);
    }

    res.json({ success: true, message: 'Group updated successfully', data: convData });
  } catch (error) {
    next(error);
  }
};

// @desc    Add participants to group
// @route   POST /api/conversations/:id/participants
// @access  Private (Admin only)
const addParticipants = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID' });
    }

    const { participantIds, participants } = req.body;
    const currentUserId = req.user._id.toString();

    const conversation = await Conversation.findById(id);
    if (!conversation || conversation.conversationType !== 'group') {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isAdmin = conversation.admins.some((a) => a.toString() === currentUserId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only group admins can add members' });
    }

    const rawList = Array.isArray(participantIds) ? participantIds : (Array.isArray(participants) ? participants : [participantIds || participants]);
    const toAdd = rawList.filter(Boolean);
    const newMembers = toAdd.filter(
      (uid) => !conversation.participants.some((p) => p.toString() === uid.toString())
    );

    if (newMembers.length === 0) {
      return res.status(400).json({ success: false, message: 'Selected users are already members' });
    }

    conversation.participants.push(...newMembers);
    await conversation.save();

    // Create system message
    const addedUsers = await User.find({ _id: { $in: newMembers } }).select('username');
    const addedNames = addedUsers.map((u) => u.username).join(', ');
    await Message.create({
      conversationId: conversation._id,
      senderId: req.user._id,
      content: `${req.user.username} added ${addedNames} to the group`,
      messageType: 'system',
    });

    const populated = await Conversation.findById(id)
      .populate('participants', 'username email profilePicture bio isOnline lastSeen')
      .populate('admins', 'username email profilePicture');

    const convData = formatConv(populated, currentUserId);

    const io = req.app.get('io');
    if (io) {
      newMembers.forEach((mId) => {
        io.to(`user:${mId}`).emit('conversation_created', convData);
      });
      io.to(`conv:${id}`).emit('group_updated', convData);
    }

    res.json({ success: true, message: 'Members added successfully', data: convData });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove participant or leave group
// @route   DELETE /api/conversations/:id/participants/:userId
// @access  Private (Admin or Self)
const removeParticipant = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID' });
    }

    const currentUserId = req.user._id.toString();

    const conversation = await Conversation.findById(id);
    if (!conversation || conversation.conversationType !== 'group') {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isSelf = currentUserId === userId;
    const isAdmin = conversation.admins.some((a) => a.toString() === currentUserId);

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Permission denied' });
    }

    // Remove user
    conversation.participants = conversation.participants.filter(
      (p) => p.toString() !== userId
    );
    // Also remove from admins if admin
    conversation.admins = conversation.admins.filter(
      (a) => a.toString() !== userId
    );

    // If no participants left, delete conversation
    if (conversation.participants.length === 0) {
      await Conversation.findByIdAndDelete(id);
      await Message.deleteMany({ conversationId: id });
      return res.json({ success: true, message: 'Group removed as last member left' });
    }

    // If no admins left, appoint first remaining participant as admin
    if (conversation.admins.length === 0 && conversation.participants.length > 0) {
      conversation.admins.push(conversation.participants[0]);
    }

    await conversation.save();

    const targetUser = await User.findById(userId).select('username');
    const systemNotice = isSelf
      ? `${targetUser?.username || 'A member'} left the group`
      : `${req.user.username} removed ${targetUser?.username || 'a member'} from the group`;

    await Message.create({
      conversationId: conversation._id,
      senderId: req.user._id,
      content: systemNotice,
      messageType: 'system',
    });

    const populated = await Conversation.findById(id)
      .populate('participants', 'username email profilePicture bio isOnline lastSeen')
      .populate('admins', 'username email profilePicture');

    const convData = formatConv(populated, currentUserId);

    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${id}`).emit('group_updated', convData);
      io.to(`user:${userId}`).emit('group_removed', { conversationId: id });
    }

    res.json({ success: true, message: systemNotice, data: convData });
  } catch (error) {
    next(error);
  }
};

// @desc    Promote or demote group admin
// @route   PUT /api/conversations/:id/admins
// @access  Private (Admin only)
const toggleAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID' });
    }

    const { targetUserId, action } = req.body; // action: 'promote' | 'demote'
    const currentUserId = req.user._id.toString();

    const conversation = await Conversation.findById(id);
    if (!conversation || conversation.conversationType !== 'group') {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    const isAdmin = conversation.admins.some((a) => a.toString() === currentUserId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only admins can manage roles' });
    }

    if (action === 'promote') {
      if (!conversation.admins.some((a) => a.toString() === targetUserId)) {
        conversation.admins.push(targetUserId);
      }
    } else if (action === 'demote') {
      if (conversation.admins.length <= 1) {
        return res.status(400).json({ success: false, message: 'Group must have at least one admin' });
      }
      conversation.admins = conversation.admins.filter((a) => a.toString() !== targetUserId);
    }

    await conversation.save();

    const populated = await Conversation.findById(id)
      .populate('participants', 'username email profilePicture bio isOnline lastSeen')
      .populate('admins', 'username email profilePicture');

    const convData = formatConv(populated, currentUserId);

    res.json({ success: true, message: `Role updated successfully`, data: convData });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserConversations,
  getOrCreatePrivateConversation,
  createGroupConversation,
  getConversationById,
  updateGroup,
  addParticipants,
  removeParticipant,
  toggleAdmin,
};
