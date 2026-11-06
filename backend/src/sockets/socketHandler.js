const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// In-memory mapping of active user sockets (per instance, backed by DB status & Redis adapter)
const onlineUsers = new Map(); // userId -> Set of socketIds

const registerSocketHandlers = (io) => {
  // Socket.IO Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const secret = process.env.JWT_SECRET || 'fallback_dev_secret_change_in_production_12345';
      const decoded = jwt.verify(token, secret);

      const user = await User.findById(decoded.id).select('-passwordHash');
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.warn('Socket authentication failed:', err.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 User connected: ${socket.user.username} (${userId}) - Socket: ${socket.id}`);

    // Track online user
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Update DB status to online
    try {
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
    } catch (e) {
      console.error('Error updating user online status:', e.message);
    }

    // Join personal user room for direct user-targeted events (invitations, calls, alerts)
    socket.join(`user:${userId}`);

    // Broadcast user online event to everyone
    io.emit('user_online', {
      userId,
      username: socket.user.username,
      isOnline: true,
      lastSeen: new Date(),
    });

    // Send the current list of online user IDs to the connected client
    socket.emit('active_users', Array.from(onlineUsers.keys()));

    // 1. Join conversation room
    socket.on('join_conversation', (conversationId) => {
      if (!conversationId) return;
      socket.join(`conv:${conversationId}`);
      console.log(`Socket ${socket.id} (${socket.user.username}) joined room conv:${conversationId}`);
    });

    // 2. Leave conversation room
    socket.on('leave_conversation', (conversationId) => {
      if (!conversationId) return;
      socket.leave(`conv:${conversationId}`);
      console.log(`Socket ${socket.id} left room conv:${conversationId}`);
    });

    // 3. Typing indicators
    socket.on('typing_start', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conv:${conversationId}`).emit('typing_start', {
        conversationId,
        userId,
        username: socket.user.username,
      });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conv:${conversationId}`).emit('typing_stop', {
        conversationId,
        userId,
        username: socket.user.username,
      });
    });

    // 4. Real-time message sent broadcast
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, message } = data;
        if (!conversationId || !message) return;

        // Emit to room (everyone in conversation room except sender, or including sender)
        io.to(`conv:${conversationId}`).emit('receive_message', {
          conversationId,
          message,
        });

        // Also notify participants who might be outside the room
        const conversation = await Conversation.findById(conversationId).select('participants');
        if (conversation) {
          conversation.participants.forEach((pId) => {
            const pIdStr = pId.toString();
            if (pIdStr !== userId) {
              io.to(`user:${pIdStr}`).emit('new_message_notification', {
                conversationId,
                message,
              });
            }
          });
        }
      } catch (err) {
        console.error('Error handling socket send_message:', err.message);
      }
    });

    // 5. Read receipt event
    socket.on('message_read', ({ conversationId, messageIds, readByUserId }) => {
      if (!conversationId) return;
      io.to(`conv:${conversationId}`).emit('message_read', {
        conversationId,
        messageIds,
        readByUserId: readByUserId || userId,
        readAt: new Date(),
      });
    });

    // 6. Delivery receipt event
    socket.on('message_delivered', ({ conversationId, messageId }) => {
      if (!conversationId || !messageId) return;
      io.to(`conv:${conversationId}`).emit('message_delivered', {
        conversationId,
        messageId,
        deliveredToUserId: userId,
        deliveredAt: new Date(),
      });
    });

    // 7. Message edited
    socket.on('message_edited', ({ conversationId, message }) => {
      if (!conversationId || !message) return;
      io.to(`conv:${conversationId}`).emit('message_edited', {
        conversationId,
        message,
      });
    });

    // 8. Message deleted
    socket.on('message_deleted', ({ conversationId, messageId }) => {
      if (!conversationId || !messageId) return;
      io.to(`conv:${conversationId}`).emit('message_deleted', {
        conversationId,
        messageId,
      });
    });

    // 9. Conversation or group created / updated
    socket.on('conversation_created', ({ conversation, participantIds }) => {
      if (Array.isArray(participantIds)) {
        participantIds.forEach((pId) => {
          io.to(`user:${pId}`).emit('conversation_created', conversation);
        });
      }
    });

    // 10. Disconnect handler
    socket.on('disconnect', async () => {
      console.log(`❌ Socket disconnected: ${socket.id} (${socket.user.username})`);

      if (onlineUsers.has(userId)) {
        onlineUsers.get(userId).delete(socket.id);
        if (onlineUsers.get(userId).size === 0) {
          onlineUsers.delete(userId);

          // Update MongoDB status to offline with lastSeen
          try {
            await User.findByIdAndUpdate(userId, {
              isOnline: false,
              lastSeen: new Date(),
            });
          } catch (e) {
            console.error('Error updating user offline status:', e.message);
          }

          // Broadcast offline event to all
          io.emit('user_offline', {
            userId,
            username: socket.user.username,
            isOnline: false,
            lastSeen: new Date(),
          });
        }
      }
    });
  });
};

module.exports = {
  registerSocketHandlers,
  onlineUsers,
};
