const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');

// @desc    Get messages for a conversation with pagination
// @route   GET /api/messages/:conversationId
// @access  Private
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { limit = 40, before, after } = req.query;
    const currentUserId = req.user._id;

    // Verify user is in conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === currentUserId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const query = { conversationId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    } else if (after) {
      query.createdAt = { $gt: new Date(after) };
    }

    const pageSize = Math.min(parseInt(limit, 10) || 40, 100);

    // If querying 'after' for incremental updates, sort ascending so newest append in order
    const sortOrder = after ? { createdAt: 1 } : { createdAt: -1 };

    const messages = await Message.find(query)
      .sort(sortOrder)
      .limit(pageSize)
      .populate('senderId', 'username email profilePicture')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderId', select: 'username' },
      });

    // For standard history fetch, reverse so client receives in chronological order
    const ordered = after ? messages : messages.reverse();

    // Check if there are older messages
    const oldestMessage = ordered.length > 0 ? ordered[0] : null;
    let hasMore = false;
    if (oldestMessage && !after) {
      const olderCount = await Message.countDocuments({
        conversationId,
        createdAt: { $lt: oldestMessage.createdAt },
      });
      hasMore = olderCount > 0;
    }

    res.json({
      success: true,
      count: ordered.length,
      hasMore,
      data: ordered,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a new message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const { conversationId, content, replyTo, attachments, messageType } = req.body;
    const currentUserId = req.user._id;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'conversationId is required' });
    }

    // Normalize attachments: handle flattened array if nested
    let normalizedAttachments = [];
    if (Array.isArray(attachments)) {
      normalizedAttachments = attachments.flat().map((att) => ({
        url: att.url || att.fileUrl || '',
        originalName: att.originalName || att.fileName || 'attachment',
        mimeType: att.mimeType || att.fileType || 'application/octet-stream',
        size: att.size || 0,
      }));
    }

    if (!content && normalizedAttachments.length === 0) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === currentUserId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const newMessage = await Message.create({
      conversationId,
      senderId: currentUserId,
      content: content || '',
      replyTo: replyTo || null,
      attachments: normalizedAttachments,
      messageType: messageType || (normalizedAttachments.length > 0 ? 'image' : 'text'),
      readBy: [{ user: currentUserId, readAt: new Date() }],
      deliveredTo: [{ user: currentUserId, deliveredAt: new Date() }],
    });

    // Update conversation lastMessage and timestamp
    conversation.lastMessage = newMessage._id;
    conversation.updatedAt = new Date();
    await conversation.save();

    const populated = await Message.findById(newMessage._id)
      .populate('senderId', 'username email profilePicture')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderId', select: 'username' },
      });

    // Create notifications for other participants
    for (const pId of conversation.participants) {
      if (pId.toString() !== currentUserId.toString()) {
        await Notification.create({
          recipientId: pId,
          senderId: currentUserId,
          type: 'message',
          message:
            conversation.conversationType === 'group'
              ? `${req.user.username} sent a message in "${conversation.groupName}"`
              : `${req.user.username} sent you a message`,
          conversationId: conversation._id,
        });
      }
    }

    // Real-Time Socket Broadcast to Active Conversation & User Rooms
    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${conversationId}`).emit('receive_message', {
        conversationId,
        message: populated,
      });
      io.to(`conv:${conversationId}`).emit('new_message', populated);

      for (const pId of conversation.participants) {
        const pIdStr = pId.toString();
        if (pIdStr !== currentUserId.toString()) {
          io.to(`user:${pIdStr}`).emit('receive_message', {
            conversationId,
            message: populated,
          });
          io.to(`user:${pIdStr}`).emit('new_message', populated);
          io.to(`user:${pIdStr}`).emit('new_message_notification', {
            conversationId,
            message: populated,
          });
        }
      }
    }

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Edit a message
// @route   PUT /api/messages/:id
// @access  Private (Sender only)
const editMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const currentUserId = req.user._id.toString();

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.senderId.toString() !== currentUserId) {
      return res.status(403).json({ success: false, message: 'Only sender can edit message' });
    }

    if (message.deletedAt) {
      return res.status(400).json({ success: false, message: 'Cannot edit deleted message' });
    }

    message.content = content.trim();
    message.editedAt = new Date();
    await message.save();

    const populated = await Message.findById(id)
      .populate('senderId', 'username email profilePicture')
      .populate({
        path: 'replyTo',
        populate: { path: 'senderId', select: 'username' },
      });

    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${message.conversationId}`).emit('message_edited', {
        conversationId: message.conversationId,
        message: populated,
      });
    }

    res.json({ success: true, message: 'Message updated', data: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a message (soft delete)
// @route   DELETE /api/messages/:id
// @access  Private (Sender or Group Admin)
const deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id.toString();

    const message = await Message.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const conversation = await Conversation.findById(message.conversationId);
    const isSender = message.senderId.toString() === currentUserId;
    const isGroupAdmin =
      conversation &&
      conversation.conversationType === 'group' &&
      conversation.admins.some((a) => a.toString() === currentUserId);

    if (!isSender && !isGroupAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this message' });
    }

    message.deletedAt = new Date();
    message.content = 'This message was deleted';
    message.attachments = [];
    await message.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${message.conversationId}`).emit('message_deleted', {
        conversationId: message.conversationId,
        messageId: message._id,
      });
    }

    res.json({
      success: true,
      message: 'Message deleted',
      data: {
        _id: message._id,
        conversationId: message.conversationId,
        deletedAt: message.deletedAt,
        content: message.content,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark conversation messages as read
// @route   POST /api/messages/:conversationId/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user._id;

    // Update all unread messages in conversation where user is not the sender
    const result = await Message.updateMany(
      {
        conversationId,
        senderId: { $ne: currentUserId },
        'readBy.user': { $ne: currentUserId },
      },
      {
        $addToSet: {
          readBy: { user: currentUserId, readAt: new Date() },
          deliveredTo: { user: currentUserId, deliveredAt: new Date() },
        },
      }
    );

    // Also mark notifications for this conversation as read
    await Notification.updateMany(
      {
        recipientId: currentUserId,
        conversationId,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    // Broadcast read receipt event via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${conversationId}`).emit('message_read', {
        conversationId,
        readByUserId: currentUserId.toString(),
        readAt: new Date(),
      });
    }

    res.json({ success: true, updatedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload message attachments
// @route   POST /api/messages/upload
// @access  Private
const uploadAttachments = async (req, res, next) => {
  try {
    let rawFiles = [];
    if (Array.isArray(req.files)) {
      rawFiles = req.files;
    } else if (req.files && typeof req.files === 'object') {
      rawFiles = Object.values(req.files).flat();
    } else if (req.file) {
      rawFiles = [req.file];
    }

    if (!rawFiles || rawFiles.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const attachments = rawFiles.map((file) => {
      let fileUrl;
      if (file.buffer) {
        fileUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      } else {
        fileUrl = `/uploads/${file.filename}`;
      }
      return {
        url: fileUrl,
        fileUrl, // for frontend compatibility
        originalName: file.originalname,
        fileName: file.originalname, // for frontend compatibility
        mimeType: file.mimetype,
        fileType: file.mimetype, // for frontend compatibility
        size: file.size,
      };
    });

    res.json({ success: true, data: attachments });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markAsRead,
  uploadAttachments,
};
