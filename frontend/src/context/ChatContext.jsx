import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { conversationApi } from '../api/conversationApi';
import { messageApi } from '../api/messageApi';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState({}); // conversationId -> Array of usernames
  const typingTimeoutRef = useRef(null);

  // Load all user conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingConversations(true);
      const res = await conversationApi.getConversations();
      if (res.success && res.data) {
        setConversations(res.data);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err.message);
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load messages for a conversation
  const loadMessages = async (conversationId) => {
    try {
      setLoadingMessages(true);
      const res = await messageApi.getMessages(conversationId, 40);
      if (res.success && res.data) {
        setMessages(res.data);
        setHasMoreMessages(res.hasMore || false);

        // Mark as read immediately on load
        await messageApi.markAsRead(conversationId);
        if (socket) {
          socket.emit('message_read', { conversationId });
        }

        // Decrement local unread count
        setConversations((prev) =>
          prev.map((c) => (c._id === conversationId ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (err) {
      console.error('Failed to load messages:', err.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Load older messages (pagination)
  const loadMoreMessages = async () => {
    if (!activeConversation || loadingMessages || !hasMoreMessages || messages.length === 0) {
      return;
    }

    try {
      const oldestMessage = messages[0];
      const res = await messageApi.getMessages(
        activeConversation._id,
        30,
        oldestMessage.createdAt
      );

      if (res.success && res.data) {
        setMessages((prev) => [...res.data, ...prev]);
        setHasMoreMessages(res.hasMore || false);
      }
    } catch (err) {
      console.error('Failed to load more messages:', err.message);
    }
  };

  // Select active conversation
  const selectConversation = (conv) => {
    if (activeConversation && socket) {
      socket.emit('leave_conversation', activeConversation._id);
    }

    setActiveConversation(conv);
    if (conv) {
      loadMessages(conv._id);
      if (socket) {
        socket.emit('join_conversation', conv._id);
      }
    } else {
      setMessages([]);
    }
  };

  // Send message
  const sendMessage = async ({ content, attachments = [], replyTo = null, messageType = 'text' }) => {
    if (!activeConversation) return;

    try {
      const res = await messageApi.sendMessage({
        conversationId: activeConversation._id,
        content,
        attachments,
        replyTo,
        messageType,
      });

      if (res.success && res.data) {
        const sentMessage = res.data;

        // Append to local messages if not already added by socket
        setMessages((prev) => {
          if (prev.some((m) => m._id === sentMessage._id)) return prev;
          return [...prev, sentMessage];
        });

        // Update conversation lastMessage
        setConversations((prev) => {
          const updated = prev.map((c) => {
            if (c._id === activeConversation._id) {
              return { ...c, lastMessage: sentMessage, updatedAt: new Date().toISOString() };
            }
            return c;
          });
          // Sort to move conversation to top
          return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        });

        // Emit through socket for real-time delivery
        if (socket) {
          socket.emit('send_message', {
            conversationId: activeConversation._id,
            message: sentMessage,
          });
        }

        return sentMessage;
      }
    } catch (err) {
      console.error('Failed to send message:', err.message);
      throw err;
    }
  };

  // Edit message
  const editMessage = async (messageId, content) => {
    try {
      const res = await messageApi.editMessage(messageId, content);
      if (res.success && res.data) {
        const updated = res.data;
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? updated : m))
        );

        if (socket && activeConversation) {
          socket.emit('message_edited', {
            conversationId: activeConversation._id,
            message: updated,
          });
        }
      }
    } catch (err) {
      console.error('Failed to edit message:', err.message);
      throw err;
    }
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    try {
      const res = await messageApi.deleteMessage(messageId);
      if (res.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? { ...m, deletedAt: new Date().toISOString(), content: 'This message was deleted', attachments: [] }
              : m
          )
        );

        if (socket && activeConversation) {
          socket.emit('message_deleted', {
            conversationId: activeConversation._id,
            messageId,
          });
        }
      }
    } catch (err) {
      console.error('Failed to delete message:', err.message);
      throw err;
    }
  };

  // Typing status sender
  const sendTypingStatus = (isTyping) => {
    if (!socket || !activeConversation) return;

    if (isTyping) {
      socket.emit('typing_start', { conversationId: activeConversation._id });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', { conversationId: activeConversation._id });
      }, 3000);
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit('typing_stop', { conversationId: activeConversation._id });
    }
  };

  // Start new private chat or open existing
  const startPrivateChat = async (recipientId) => {
    try {
      const res = await conversationApi.getOrCreatePrivate(recipientId);
      if (res.success && res.data) {
        const conv = res.data;
        setConversations((prev) => {
          const exists = prev.some((c) => c._id === conv._id);
          if (exists) {
            return prev.map((c) => (c._id === conv._id ? conv : c));
          }
          return [conv, ...prev];
        });
        selectConversation(conv);
        return conv;
      }
    } catch (err) {
      console.error('Failed to start chat:', err.message);
      throw err;
    }
  };

  // Socket listeners for incoming chat events
  useEffect(() => {
    if (!socket) return;

    // Incoming message
    const handleReceiveMessage = ({ conversationId, message }) => {
      // If active conversation matches, append message
      if (activeConversation && activeConversation._id === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });

        // Mark as read
        messageApi.markAsRead(conversationId).catch(() => {});
        socket.emit('message_read', { conversationId });
      }

      // Update conversations list last message and unread count
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv._id === conversationId) {
            const isCurrent = activeConversation && activeConversation._id === conversationId;
            return {
              ...conv,
              lastMessage: message,
              updatedAt: new Date().toISOString(),
              unreadCount: isCurrent ? 0 : (conv.unreadCount || 0) + 1,
            };
          }
          return conv;
        });

        return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    // Message edited
    const handleMessageEdited = ({ conversationId, message }) => {
      if (activeConversation && activeConversation._id === conversationId) {
        setMessages((prev) =>
          prev.map((m) => (m._id === message._id ? message : m))
        );
      }
    };

    // Message deleted
    const handleMessageDeleted = ({ conversationId, messageId }) => {
      if (activeConversation && activeConversation._id === conversationId) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? { ...m, deletedAt: new Date().toISOString(), content: 'This message was deleted', attachments: [] }
              : m
          )
        );
      }
    };

    // Typing start
    const handleTypingStart = ({ conversationId, username }) => {
      setTypingUsers((prev) => {
        const list = prev[conversationId] || [];
        if (!list.includes(username)) {
          return { ...prev, [conversationId]: [...list, username] };
        }
        return prev;
      });
    };

    // Typing stop
    const handleTypingStop = ({ conversationId, username }) => {
      setTypingUsers((prev) => {
        const list = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: list.filter((u) => u !== username),
        };
      });
    };

    // New conversation / group created
    const handleConversationCreated = (conversation) => {
      setConversations((prev) => {
        if (prev.some((c) => c._id === conversation._id)) return prev;
        return [conversation, ...prev];
      });
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('new_message_notification', handleReceiveMessage);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('typing_start', handleTypingStart);
    socket.on('typing_stop', handleTypingStop);
    socket.on('conversation_created', handleConversationCreated);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('new_message_notification', handleReceiveMessage);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('typing_start', handleTypingStart);
      socket.off('typing_stop', handleTypingStop);
      socket.off('conversation_created', handleConversationCreated);
    };
  }, [socket, activeConversation]);

  // Serverless Auto-Sync Polling Fallback (For 100% Vercel hosting)
  useEffect(() => {
    if (!activeConversation) return;

    const syncInterval = setInterval(async () => {
      try {
        const res = await messageApi.getMessages(activeConversation._id, 30);
        if (res.success && res.data) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m._id));
            const newMsgs = res.data.filter((m) => !existingIds.has(m._id));
            if (newMsgs.length > 0) {
              return [...prev, ...newMsgs];
            }
            return prev;
          });
        }
      } catch (e) {
        // Silent catch for background sync
      }
    }, 3000);

    return () => clearInterval(syncInterval);
  }, [activeConversation?._id]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        loadingConversations,
        loadingMessages,
        hasMoreMessages,
        typingUsers,
        fetchConversations,
        selectConversation,
        loadMoreMessages,
        sendMessage,
        editMessage,
        deleteMessage,
        sendTypingStatus,
        startPrivateChat,
        setActiveConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
