// ChatIn Real-Time Chat Engine (Robust, Fully Synchronized & Safe)
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = window.CURRENT_USER || {};
  let socket = null;
  let activeConversation = null;
  let conversations = [];
  let currentFilter = 'all';
  let pendingAttachment = null;
  let typingTimeout = null;

  // WhatsApp style: Immediate instant initialization from preloaded server state or localStorage cache (0ms delay, no loading spinner!)
  const preloaded = Array.isArray(window.INITIAL_CONVERSATIONS) && window.INITIAL_CONVERSATIONS.length > 0
    ? window.INITIAL_CONVERSATIONS
    : null;

  if (preloaded) {
    conversations = preloaded;
    try {
      localStorage.setItem('chatin_cached_conversations', JSON.stringify(conversations));
    } catch (e) {}
  } else {
    try {
      const cached = localStorage.getItem('chatin_cached_conversations');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          conversations = parsed;
        }
      }
    } catch (e) {}
  }

  // DOM Elements
  const statusDot = document.getElementById('socketStatusDot');
  const conversationsList = document.getElementById('conversationsList');
  const emptyChatState = document.getElementById('emptyChatState');
  const activeChatWrapper = document.getElementById('activeChatWrapper');
  const messagesViewport = document.getElementById('messagesViewport');
  const messagesStream = document.getElementById('messagesStream');
  const messageInput = document.getElementById('messageInput');
  const messageForm = document.getElementById('messageForm');
  const activeChatName = document.getElementById('activeChatName');
  const activeChatStatus = document.getElementById('activeChatStatus');
  const activeChatAvatar = document.getElementById('activeChatAvatar');
  const typingIndicator = document.getElementById('typingIndicator');
  const mobileBackBtn = document.getElementById('mobileBackBtn');
  const chatApp = document.getElementById('chatApp');
  const conversationSearchInput = document.getElementById('conversationSearchInput');
  const chatInfoBtn = document.getElementById('chatInfoBtn');

  // WhatsApp style: Render conversations immediately upon page parse (0ms!)
  if (Array.isArray(conversations) && conversations.length > 0) {
    renderFilteredConversations();
  }

  // Modals & Popovers
  const openNewChatBtn = document.getElementById('openNewChatBtn');
  const emptyNewChatBtn = document.getElementById('emptyNewChatBtn');
  const openNewGroupBtn = document.getElementById('openNewGroupBtn');
  const newChatModalEl = document.getElementById('newChatModal');
  const newGroupModalEl = document.getElementById('newGroupModal');
  const userSearchModalInput = document.getElementById('userSearchModalInput');
  const userSearchResults = document.getElementById('userSearchResults');
  const createGroupForm = document.getElementById('createGroupForm');
  const groupMemberSearch = document.getElementById('groupMemberSearch');
  const groupMemberList = document.getElementById('groupMemberList');
  const emojiToggleBtn = document.getElementById('emojiToggleBtn');
  const emojiPopover = document.getElementById('emojiPopover');
  const emojiGrid = document.getElementById('emojiGrid');
  const fileInput = document.getElementById('fileInput');
  const attachmentPreview = document.getElementById('attachmentPreview');
  const attachmentName = document.getElementById('attachmentName');
  const removeAttachmentBtn = document.getElementById('removeAttachmentBtn');

  // Safe Bootstrap Modal Helper
  function getModal(el) {
    if (!el || typeof bootstrap === 'undefined') return null;
    return bootstrap.Modal.getOrCreateInstance
      ? bootstrap.Modal.getOrCreateInstance(el)
      : new bootstrap.Modal(el);
  }

  // 1. Initialize Socket.IO
  function initSocket() {
    if (typeof io === 'undefined') {
      console.warn('Socket.IO library not loaded');
      return;
    }

    const token = localStorage.getItem('chatin_token');
    socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('⚡ Socket connected:', socket.id);
      if (statusDot) {
        statusDot.classList.add('connected');
        statusDot.title = 'Connected to real-time stream';
      }
      if (activeConversation) {
        socket.emit('join_conversation', activeConversation._id);
      }
    });

    socket.on('disconnect', () => {
      if (statusDot) {
        statusDot.classList.remove('connected');
        statusDot.title = 'Reconnecting...';
      }
    });

    // Active users list on initial connection
    socket.on('active_users', (userIds) => {
      if (Array.isArray(userIds)) {
        userIds.forEach((uid) => updateUserOnlineBadge(uid, true));
      }
    });

    // Incoming new messages (support both 'receive_message' and 'new_message')
    socket.on('receive_message', (data) => {
      const msg = data.message || data;
      handleIncomingMessage(msg);
    });

    socket.on('new_message', (msg) => {
      handleIncomingMessage(msg);
    });

    // Notification of messages outside active room
    socket.on('new_message_notification', (data) => {
      const msg = data.message || data;
      handleIncomingMessage(msg);
    });

    // WhatsApp Delivery Receipt (turns Single Tick into Double Gray Ticks)
    socket.on('message_delivered', ({ conversationId, messageId }) => {
      if (activeConversation && activeConversation._id === conversationId) {
        if (messageId) {
          const tick = document.getElementById(`tick-${messageId}`);
          if (tick && !tick.classList.contains('text-info')) {
            tick.className = 'bi bi-check2-all text-secondary';
            tick.title = 'Delivered';
          }
        } else {
          document.querySelectorAll('.message-row.sent .bi-check2').forEach((tick) => {
            tick.className = 'bi bi-check2-all text-secondary';
            tick.title = 'Delivered';
          });
        }
      }
    });

    // WhatsApp Read Receipt (turns Ticks into Double Blue Ticks)
    socket.on('message_read', ({ conversationId, messageIds, messageId }) => {
      if (activeConversation && activeConversation._id === conversationId) {
        const ids = messageIds || (messageId ? [messageId] : []);
        if (ids.length > 0) {
          ids.forEach((mId) => {
            const tick = document.getElementById(`tick-${mId}`);
            if (tick) {
              tick.className = 'bi bi-check2-all text-info';
              tick.title = 'Read';
            }
          });
        } else {
          document.querySelectorAll('.message-row.sent .bi-check2, .message-row.sent .bi-check2-all').forEach((tick) => {
            tick.className = 'bi bi-check2-all text-info';
            tick.title = 'Read';
          });
        }
      }
    });

    // Message edited & deleted
    socket.on('message_edited', ({ conversationId, message }) => {
      if (activeConversation && activeConversation._id === conversationId && message) {
        const row = document.querySelector(`.message-row[data-id="${message._id}"]`);
        if (row) {
          const textEl = row.querySelector('.msg-text');
          if (textEl) textEl.textContent = message.content;
        }
      }
    });

    socket.on('message_deleted', ({ conversationId, messageId }) => {
      if (activeConversation && activeConversation._id === conversationId && messageId) {
        const row = document.querySelector(`.message-row[data-id="${messageId}"]`);
        if (row) {
          const textEl = row.querySelector('.msg-text');
          if (textEl) {
            textEl.textContent = 'This message was deleted';
            textEl.classList.add('fst-italic', 'opacity-75');
          }
          const att = row.querySelector('.msg-img-attachment, a');
          if (att) att.remove();
        }
      }
    });

    // New conversation / group created
    socket.on('conversation_created', () => {
      loadConversations();
    });

    // Typing indicators (handle user_typing / typing_start)
    const handleTypingEvent = ({ userId, username, conversationId }) => {
      const curId = (currentUser._id || '').toString();
      if (activeConversation && activeConversation._id === conversationId && userId !== curId) {
        if (typingIndicator) {
          typingIndicator.classList.remove('d-none');
          const tText = typingIndicator.querySelector('.typing-text');
          if (tText) tText.textContent = `${username || 'Someone'} is typing...`;
        }
      }
    };

    const handleStopTypingEvent = ({ conversationId }) => {
      if (activeConversation && activeConversation._id === conversationId) {
        if (typingIndicator) typingIndicator.classList.add('d-none');
      }
    };

    socket.on('user_typing', handleTypingEvent);
    socket.on('typing_start', handleTypingEvent);
    socket.on('user_stop_typing', handleStopTypingEvent);
    socket.on('typing_stop', handleStopTypingEvent);

    // Online status updates
    socket.on('user_online', ({ userId }) => {
      updateUserOnlineBadge(userId, true);
    });

    socket.on('user_offline', ({ userId }) => {
      updateUserOnlineBadge(userId, false);
    });
  }

  // 2. Fetch and Render Conversations (WhatsApp style: silent background sync without loading flash)
  async function loadConversations() {
    try {
      const res = await fetch(`/api/conversations?_t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        conversations = data.data;
        try {
          localStorage.setItem('chatin_cached_conversations', JSON.stringify(conversations));
        } catch (e) {}
        renderFilteredConversations();
        if (activeConversation) {
          document.querySelectorAll('.conv-item').forEach((el) => {
            el.classList.toggle('active', el.dataset.id === activeConversation._id);
          });
        }
      } else if (!conversations || conversations.length === 0) {
        renderEmptyConversations();
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
      if (!conversations || conversations.length === 0) {
        renderEmptyConversations();
      }
    }
  }

  function renderEmptyConversations() {
    if (!conversationsList) return;
    conversationsList.innerHTML = `
      <div class="text-center text-muted small py-5 px-3">
        <i class="bi bi-chat-square-text fs-2 d-block mb-2 text-secondary opacity-50"></i>
        No conversations yet.<br>Click <strong>+</strong> above to start messaging!
      </div>
    `;
  }

  function isGroupConv(c) {
    return c.conversationType === 'group' || Boolean(c.isGroup);
  }

  function renderFilteredConversations() {
    if (!conversationsList) return;

    let list = [...conversations];
    const searchQuery = conversationSearchInput ? conversationSearchInput.value.trim().toLowerCase() : '';

    // Apply Filter Tab
    if (currentFilter === 'direct') {
      list = list.filter((c) => !isGroupConv(c));
    } else if (currentFilter === 'group') {
      list = list.filter((c) => isGroupConv(c));
    } else if (currentFilter === 'unread') {
      list = list.filter((c) => (c.unreadCount || 0) > 0);
    }

    // Apply Search Query
    if (searchQuery) {
      list = list.filter((c) => {
        const isGrp = isGroupConv(c);
        const otherUser = getOtherParticipant(c);
        const title = isGrp ? c.groupName : (otherUser ? otherUser.username : '');
        return title ? title.toLowerCase().includes(searchQuery) : false;
      });
    }

    conversationsList.innerHTML = '';

    if (list.length === 0) {
      conversationsList.innerHTML = `
        <div class="text-center text-muted small py-4 px-3">
          ${searchQuery ? 'No matching conversations.' : 'No conversations in this section.'}
        </div>
      `;
      return;
    }

    list.forEach((conv) => {
      const isGrp = isGroupConv(conv);
      const otherUser = getOtherParticipant(conv);
      const title = isGrp ? (conv.groupName || 'Group Hub') : (otherUser ? otherUser.username : 'Unknown');
      const isOnline = !isGrp && otherUser && otherUser.isOnline;
      const initials = (title || 'CI').substring(0, 2).toUpperCase();

      const lastMsgObj = conv.lastMessage;
      let lastMsgText = 'No messages yet';
      if (lastMsgObj) {
        if (lastMsgObj.deletedAt || lastMsgObj.isDeleted) {
          lastMsgText = 'This message was deleted';
        } else if (lastMsgObj.content) {
          lastMsgText = lastMsgObj.content;
        } else if (lastMsgObj.attachments && lastMsgObj.attachments.length > 0) {
          lastMsgText = 'Sent an attachment';
        }
      }

      const time = lastMsgObj ? formatTimestamp(lastMsgObj.createdAt) : '';
      const unread = conv.unreadCount || 0;
      const isActive = activeConversation && activeConversation._id === conv._id;

      const item = document.createElement('div');
      item.className = `conv-item ${isActive ? 'active' : ''}`;
      item.dataset.id = conv._id;
      if (otherUser && !isGrp) {
        item.dataset.userId = otherUser._id || otherUser;
      }

      item.innerHTML = `
        <div class="conv-avatar-box">
          <div class="conv-avatar">${initials}</div>
          <span class="conv-online-badge" style="display: ${isOnline ? 'block' : 'none'};"></span>
        </div>
        <div class="flex-grow-1 overflow-hidden">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="conv-title text-truncate">${escapeHtml(title)}</span>
            <span class="conv-time">${time}</span>
          </div>
          <div class="d-flex justify-content-between align-items-center">
            <span class="conv-snippet text-truncate">${escapeHtml(lastMsgText)}</span>
            ${unread > 0 ? `<span class="unread-pill">${unread}</span>` : ''}
          </div>
        </div>
      `;

      item.addEventListener('click', () => selectConversation(conv));
      conversationsList.appendChild(item);
    });
  }

  // 3. Filter Tabs Listener
  document.querySelectorAll('.filter-pill').forEach((pill) => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter || 'all';
      renderFilteredConversations();
    });
  });

  // Search Conversations Input
  if (conversationSearchInput) {
    conversationSearchInput.addEventListener('input', () => {
      renderFilteredConversations();
    });
  }

  // 4. Select Conversation & Load Messages
  async function selectConversation(conv) {
    activeConversation = conv;
    if (chatApp) chatApp.classList.add('chat-active');

    // Update active highlight in sidebar
    document.querySelectorAll('.conv-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.id === conv._id);
    });

    // Clear unread badge in DOM & locally
    const unreadEl = document.querySelector(`.conv-item[data-id="${conv._id}"] .unread-pill`);
    if (unreadEl) unreadEl.remove();
    conv.unreadCount = 0;

    // Show active chat wrapper
    if (emptyChatState) emptyChatState.classList.add('d-none');
    if (activeChatWrapper) {
      activeChatWrapper.classList.remove('d-none');
      activeChatWrapper.classList.add('d-flex');
    }

    // Update Header
    const isGrp = isGroupConv(conv);
    const otherUser = getOtherParticipant(conv);
    const title = isGrp ? (conv.groupName || 'Group Hub') : (otherUser ? otherUser.username : 'Unknown');
    if (activeChatName) activeChatName.textContent = title;
    if (activeChatAvatar) activeChatAvatar.textContent = (title || 'CI').substring(0, 2).toUpperCase();

    if (activeChatStatus) {
      if (isGrp) {
        activeChatStatus.textContent = `${conv.participants?.length || 0} members`;
      } else if (otherUser) {
        activeChatStatus.textContent = otherUser.isOnline ? 'Active now' : 'Offline';
      }
    }

    // Join socket room
    if (socket) {
      socket.emit('join_conversation', conv._id);
    }

    // WhatsApp style instant message loading from local cache (0ms latency, zero screen wipe!)
    let renderedFromCache = false;
    try {
      const cached = localStorage.getItem(`chatin_cached_messages_${conv._id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          renderMessages(parsed);
          renderedFromCache = true;
        }
      }
    } catch (e) {}

    if (!renderedFromCache && messagesStream) {
      messagesStream.innerHTML = '';
    }

    try {
      const res = await fetch(`/api/messages/${conv._id}?limit=40&_t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        renderMessages(data.data || []);
        startActiveSync();
        try {
          localStorage.setItem(`chatin_cached_messages_${conv._id}`, JSON.stringify(data.data || []));
        } catch (e) {}
        // WhatsApp ACK: Mark as read and delivered immediately upon viewing
        fetch(`/api/messages/${conv._id}/delivered?_t=${Date.now()}`, { method: 'POST', cache: 'no-store' }).catch(() => {});
        fetch(`/api/messages/${conv._id}/read?_t=${Date.now()}`, { method: 'POST', cache: 'no-store' }).catch(() => {});
        if (socket && socket.connected) {
          socket.emit('message_delivered', { conversationId: conv._id });
          socket.emit('message_read', { conversationId: conv._id });
        }
      }
    } catch (err) {
      if (!renderedFromCache && messagesStream) {
        messagesStream.innerHTML = '<div class="text-center py-4 text-danger small">Failed to load messages</div>';
      }
    }
  }

  function renderMessages(messages) {
    if (!messagesStream) return;
    messagesStream.innerHTML = '';

    if (messages.length === 0) {
      messagesStream.innerHTML = `
        <div class="text-center text-muted small py-5">
          <div class="fw-semibold mb-1">No messages yet.</div>
          <div class="extra-small">Send a message below to start the conversation!</div>
        </div>
      `;
      return;
    }

    messages.forEach((msg) => {
      appendMessageToView(msg);
    });
    scrollToBottom();
  }

  // WhatsApp Algorithm: 4-State Receipt Ticks (Clock -> Sent ✓ -> Delivered ✓✓ -> Read ✓✓)
  function getTickHtml(msg, isMine) {
    if (!isMine) return '';
    if (msg.status === 'pending' || (typeof msg._id === 'string' && msg._id.startsWith('temp_'))) {
      return `<i id="tick-${msg._id}" class="bi bi-clock opacity-75" title="Sending..."></i>`;
    }
    const isRead = msg.readBy && msg.readBy.length > 1;
    if (isRead) {
      return `<i id="tick-${msg._id}" class="bi bi-check2-all text-info" title="Read"></i>`;
    }
    const isDelivered = msg.deliveredTo && msg.deliveredTo.length > 1;
    if (isDelivered) {
      return `<i id="tick-${msg._id}" class="bi bi-check2-all text-secondary" title="Delivered"></i>`;
    }
    return `<i id="tick-${msg._id}" class="bi bi-check2 text-secondary" title="Sent to server"></i>`;
  }

  function appendMessageToView(msg) {
    if (!messagesStream) return;

    // Deduplication check: if message already rendered, don't append again
    if (msg._id && document.querySelector(`.message-row[data-id="${msg._id}"]`)) {
      return;
    }

    const senderId = msg.senderId?._id || msg.senderId || msg.sender?._id || msg.sender;
    const senderIdStr = senderId ? senderId.toString() : '';
    const currentUserIdStr = (currentUser._id || '').toString();
    const isMine = senderIdStr === currentUserIdStr;

    const time = formatTimestamp(msg.createdAt);
    const isGrp = activeConversation && isGroupConv(activeConversation);
    const senderUsername = msg.senderId?.username || msg.sender?.username;
    const senderName = !isMine && isGrp && senderUsername ? senderUsername : '';

    const row = document.createElement('div');
    row.className = `message-row ${isMine ? 'sent' : 'received'}`;
    if (msg._id) row.dataset.id = msg._id;
    if (msg.createdAt) row.dataset.time = msg.createdAt;

    // Handle attachments
    let attachmentHtml = '';
    const rawAttachments = msg.attachments ? (Array.isArray(msg.attachments) ? msg.attachments.flat() : [msg.attachments]) : [];
    if (rawAttachments.length > 0) {
      const att = rawAttachments[0];
      const fileUrl = att.url || att.fileUrl || '';
      const fileName = att.originalName || att.fileName || 'Attachment';
      const mimeType = att.mimeType || att.fileType || '';
      const isImg = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileUrl);

      if (fileUrl) {
        if (isImg) {
          attachmentHtml = `<img src="${fileUrl}" class="msg-img-attachment" alt="${escapeHtml(fileName)}" onclick="window.open('${fileUrl}', '_blank')">`;
        } else {
          attachmentHtml = `
            <a href="${fileUrl}" target="_blank" download="${escapeHtml(fileName)}" class="msg-file-attachment d-flex align-items-center gap-2 p-2 rounded-2 text-decoration-none">
              <i class="bi bi-file-earmark-arrow-down fs-4"></i>
              <div class="overflow-hidden">
                <div class="text-truncate fw-semibold small">${escapeHtml(fileName)}</div>
                <div class="extra-small opacity-75">Click to download</div>
              </div>
            </a>
          `;
        }
      }
    }

    // Read tick for sender
    const tickHtml = getTickHtml(msg, isMine);

    const isDeleted = Boolean(msg.deletedAt || msg.isDeleted);
    const contentText = isDeleted ? 'This message was deleted' : (msg.content || '');

    row.innerHTML = `
      <div class="message-bubble ${isDeleted ? 'opacity-75' : ''}">
        ${senderName ? `<div class="msg-sender-name">${escapeHtml(senderName)}</div>` : ''}
        ${!isDeleted ? attachmentHtml : ''}
        <div class="msg-text ${isDeleted ? 'fst-italic' : ''}">${escapeHtml(contentText)}</div>
        <div class="msg-meta">
          <span>${time}</span>
          ${tickHtml}
        </div>
      </div>
    `;

    messagesStream.appendChild(row);
  }

  // 5. WhatsApp Algorithm: Optimistic UI Send Message Handler
  if (messageForm) {
    messageForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = messageInput ? messageInput.value.trim() : '';
      if (!text && !pendingAttachment) return;
      if (!activeConversation) return;

      const currentAttach = pendingAttachment
        ? (Array.isArray(pendingAttachment) ? pendingAttachment : [pendingAttachment])
        : [];

      // 1. WhatsApp Instant UI: Append message immediately in 0ms with pending clock icon
      const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      const optimisticMsg = {
        _id: tempId,
        conversationId: activeConversation._id,
        senderId: currentUser,
        content: text,
        attachments: currentAttach,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };

      const emptyStatePlaceholder = messagesStream?.querySelector('.text-muted.small.py-5');
      if (emptyStatePlaceholder) {
        messagesStream.innerHTML = '';
      }

      appendMessageToView(optimisticMsg);
      scrollToBottom();
      updateSidebarSnippet(activeConversation._id, text || 'Sent an attachment');

      // Clear input immediately so user can continue typing without delay
      if (messageInput) messageInput.value = '';
      clearPendingAttachment();

      if (socket && socket.connected) {
        socket.emit('stop_typing', { conversationId: activeConversation._id });
        socket.emit('typing_stop', { conversationId: activeConversation._id });
      }

      const payload = {
        conversationId: activeConversation._id,
        content: text,
        attachments: currentAttach,
      };

      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success && data.data) {
          // WhatsApp Delivery Algorithm: Swap temp ID to permanent server ID & update tick to single checkmark
          const tempRow = document.querySelector(`.message-row[data-id="${tempId}"]`);
          if (tempRow) {
            tempRow.dataset.id = data.data._id;
            tempRow.dataset.time = data.data.createdAt;
            const oldTick = tempRow.querySelector(`#tick-${tempId}`);
            if (oldTick) {
              oldTick.id = `tick-${data.data._id}`;
              oldTick.outerHTML = getTickHtml(data.data, true);
            }
          }

          if (socket && socket.connected) {
            socket.emit('send_message', { conversationId: activeConversation._id, message: data.data });
          }
        } else {
          // Delivery failed: show retry icon
          const tempRow = document.querySelector(`.message-row[data-id="${tempId}"]`);
          if (tempRow) {
            const tick = tempRow.querySelector(`#tick-${tempId}`);
            if (tick) tick.className = 'bi bi-exclamation-circle text-danger';
          }
        }
      } catch (err) {
        console.error('Failed to send message:', err);
        const tempRow = document.querySelector(`.message-row[data-id="${tempId}"]`);
        if (tempRow) {
          const tick = tempRow.querySelector(`#tick-${tempId}`);
          if (tick) tick.className = 'bi bi-exclamation-circle text-danger';
        }
      }
    });
  }

  // Handle Incoming Message
  function handleIncomingMessage(msg) {
    if (!msg) return;
    const convId = msg.conversationId?._id
      ? msg.conversationId._id.toString()
      : (msg.conversationId ? msg.conversationId.toString() : '');

    if (activeConversation && activeConversation._id.toString() === convId) {
      // Clear placeholder empty state if present
      const emptyStatePlaceholder = messagesStream?.querySelector('.text-muted.small.py-5');
      if (emptyStatePlaceholder) {
        messagesStream.innerHTML = '';
      }

      appendMessageToView(msg);
      scrollToBottom();
      fetch(`/api/messages/${convId}/read`, { method: 'POST' }).catch(() => {});
      if (socket && socket.connected) {
        socket.emit('message_read', { conversationId: convId, messageId: msg._id });
        socket.emit('read_message', { conversationId: convId, messageId: msg._id });
      }
    } else {
      // Increment unread count in sidebar item
      const item = document.querySelector(`.conv-item[data-id="${convId}"]`);
      if (item) {
        let unreadBadge = item.querySelector('.unread-pill');
        if (!unreadBadge) {
          unreadBadge = document.createElement('span');
          unreadBadge.className = 'unread-pill';
          unreadBadge.textContent = '1';
          const container = item.querySelector('.conv-snippet')?.parentElement;
          if (container) container.appendChild(unreadBadge);
        } else {
          const count = (parseInt(unreadBadge.textContent, 10) || 0) + 1;
          unreadBadge.textContent = count;
        }
      }
    }

    updateSidebarSnippet(convId, msg.content || 'Sent an attachment');

    // Notification chime for incoming messages from other users
    const senderIdStr = (msg.senderId?._id || msg.senderId || '').toString();
    const currentIdStr = (currentUser._id || '').toString();
    if (senderIdStr && senderIdStr !== currentIdStr) {
      playNotificationChime();
    }
  }

  function updateSidebarSnippet(convId, content) {
    const item = document.querySelector(`.conv-item[data-id="${convId}"]`);
    if (item) {
      const snippet = item.querySelector('.conv-snippet');
      if (snippet) snippet.textContent = content;
      if (item.parentElement) item.parentElement.prepend(item);
    } else {
      loadConversations();
    }
  }

  // 6. Typing Indicators
  if (messageInput) {
    messageInput.addEventListener('input', () => {
      if (!activeConversation || !socket || !socket.connected) return;
      socket.emit('typing', { conversationId: activeConversation._id });
      socket.emit('typing_start', { conversationId: activeConversation._id });
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        socket.emit('stop_typing', { conversationId: activeConversation._id });
        socket.emit('typing_stop', { conversationId: activeConversation._id });
      }, 2000);
    });
  }

  // 7. Mobile Back Button
  if (mobileBackBtn) {
    mobileBackBtn.addEventListener('click', () => {
      if (chatApp) chatApp.classList.remove('chat-active');
      activeConversation = null;
      stopActiveSync();
    });
  }

  // 8. Attachments Upload
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('attachments', file);
      formData.append('file', file);

      try {
        const res = await fetch('/api/messages/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          pendingAttachment = data.data;
          if (attachmentName) attachmentName.textContent = file.name;
          if (attachmentPreview) {
            attachmentPreview.classList.remove('d-none');
            attachmentPreview.classList.add('d-flex');
          }
        } else {
          alert(data.message || 'File upload failed.');
        }
      } catch (err) {
        alert('File upload failed.');
      }
    });
  }

  if (removeAttachmentBtn) {
    removeAttachmentBtn.addEventListener('click', clearPendingAttachment);
  }

  function clearPendingAttachment() {
    pendingAttachment = null;
    if (fileInput) fileInput.value = '';
    if (attachmentPreview) {
      attachmentPreview.classList.add('d-none');
      attachmentPreview.classList.remove('d-flex');
    }
  }

  // 9. Emoji Picker Setup
  const emojis = {
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😋', '😜', '😎', '🥳'],
    gestures: ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '👊', '👋', '🤙', '🙏', '💪', '👌', '👈', '👉', '👆', '👇'],
    hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '💘', '💝', '💗', '💓', '💞', '💕', '💌'],
    objects: ['🔥', '✨', '🎉', '💡', '🚀', '⭐', '🌟', '⚡', '☕', '🎯', '💯', '🎈', '🎁', '🏆'],
  };

  function renderEmojis(category) {
    if (!emojiGrid) return;
    emojiGrid.innerHTML = '';
    (emojis[category] || []).forEach((emoji) => {
      const span = document.createElement('span');
      span.className = 'emoji-item';
      span.textContent = emoji;
      span.addEventListener('click', () => {
        if (messageInput) {
          messageInput.value += emoji;
          messageInput.focus();
        }
      });
      emojiGrid.appendChild(span);
    });
  }

  if (emojiToggleBtn && emojiPopover) {
    emojiToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      emojiPopover.classList.toggle('d-none');
      if (!emojiPopover.classList.contains('d-none')) {
        renderEmojis('smileys');
      }
    });

    // Close emoji popover when clicking outside
    document.addEventListener('click', (e) => {
      if (!emojiPopover.contains(e.target) && e.target !== emojiToggleBtn && !emojiToggleBtn.contains(e.target)) {
        emojiPopover.classList.add('d-none');
      }
    });

    document.querySelectorAll('.emoji-tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.emoji-tab-btn').forEach((b) => b.classList.remove('active'));
        e.target.classList.add('active');
        renderEmojis(e.target.dataset.category);
      });
    });
  }

  // 10. Modals: New Chat & User Search (Exact Username Only)
  if (openNewChatBtn && newChatModalEl) {
    const showChatModal = () => {
      const modal = getModal(newChatModalEl);
      if (modal) modal.show();
      if (userSearchModalInput) {
        userSearchModalInput.value = '';
      }
      if (userSearchResults) {
        userSearchResults.innerHTML = `
          <div class="text-center text-muted small py-4">
            <i class="bi bi-person-search fs-3 d-block mb-2 text-secondary"></i>
            Enter an exact username to find a user.
          </div>
        `;
      }
      setTimeout(() => {
        if (userSearchModalInput) userSearchModalInput.focus();
      }, 150);
    };

    openNewChatBtn.addEventListener('click', showChatModal);
    if (emptyNewChatBtn) emptyNewChatBtn.addEventListener('click', showChatModal);

    let searchTimeout;
    const triggerUserSearch = async (q) => {
      if (!q) {
        if (userSearchResults) {
          userSearchResults.innerHTML = `
            <div class="text-center text-muted small py-4">
              <i class="bi bi-person-search fs-3 d-block mb-2 text-secondary"></i>
              Enter an exact username to find a user.
            </div>
          `;
        }
        return;
      }

      if (userSearchResults) {
        userSearchResults.innerHTML = `
          <div class="text-center text-muted small py-4">
            <span class="spinner-border spinner-border-sm me-2 text-primary" role="status"></span>
            Checking exact username...
          </div>
        `;
      }

      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0 && userSearchResults) {
          userSearchResults.innerHTML = '';
          data.data.forEach((u) => {
            if (u._id === currentUser._id) return;
            const row = document.createElement('div');
            row.className = 'd-flex align-items-center justify-content-between p-2 rounded hover-bg cursor-pointer';
            row.innerHTML = `
              <div class="d-flex align-items-center gap-2 overflow-hidden min-w-0" style="min-width:0;">
                <div class="user-avatar-circle flex-shrink-0" style="width:36px;height:36px;font-size:0.85rem;">
                  ${(u.username || 'CI').substring(0, 2).toUpperCase()}
                </div>
                <div class="overflow-hidden min-w-0" style="min-width:0;">
                  <div class="fw-semibold small text-truncate">${escapeHtml(u.username)}</div>
                  <div class="text-muted extra-small text-truncate">${escapeHtml(u.email)}</div>
                </div>
              </div>
              <button class="btn btn-sm chatin-btn-gradient rounded-pill px-3 flex-shrink-0 ms-2">Chat</button>
            `;

            row.addEventListener('click', async () => {
              const modal = getModal(newChatModalEl);
              if (modal) modal.hide();

              const createRes = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipientId: u._id }),
              });
              const createData = await createRes.json();
              if (createData.success) {
                await loadConversations();
                selectConversation(createData.data);
              }
            });
            userSearchResults.appendChild(row);
          });
        } else if (userSearchResults) {
          userSearchResults.innerHTML = `
            <div class="text-center text-muted small py-4">
              <i class="bi bi-person-x fs-3 d-block mb-2 text-secondary"></i>
              No user found with exact username <strong>"${escapeHtml(q)}"</strong>.<br>
              <span class="extra-small text-muted">Make sure the username is typed completely and correctly.</span>
            </div>
          `;
        }
      } catch (err) {
        if (userSearchResults) {
          userSearchResults.innerHTML = '<div class="text-center text-danger small py-4">Search failed.</div>';
        }
      }
    };

    if (userSearchModalInput) {
      userSearchModalInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const q = e.target.value.trim();
        searchTimeout = setTimeout(() => triggerUserSearch(q), 300);
      });
    }
  }

  // 11. Modals: Create Group
  if (openNewGroupBtn && newGroupModalEl) {
    openNewGroupBtn.addEventListener('click', () => {
      const modal = getModal(newGroupModalEl);
      if (modal) modal.show();

      if (groupMemberList) {
        groupMemberList.innerHTML = '';
        const contactMap = new Map();
        (conversations || []).forEach((c) => {
          (c.participants || []).forEach((p) => {
            if (p && p._id && p._id !== currentUser._id) {
              contactMap.set(p._id, p);
            }
          });
        });
        const users = Array.from(contactMap.values());
        if (users.length === 0) {
          groupMemberList.innerHTML = '<div class="text-muted small text-center py-2">No active contacts found. Start a direct chat first.</div>';
        } else {
          users.forEach((u) => {
            const label = document.createElement('label');
            label.className = 'd-flex align-items-center gap-2 p-1 small cursor-pointer member-item';
            label.dataset.name = (u.username || '').toLowerCase();
            label.innerHTML = `
              <input type="checkbox" name="members" value="${u._id}" class="form-check-input mt-0">
              <span>${escapeHtml(u.username)}</span>
            `;
            groupMemberList.appendChild(label);
          });
        }
      }
    });

    // Group member filter search inside modal
    if (groupMemberSearch && groupMemberList) {
      groupMemberSearch.addEventListener('input', (e) => {
        const term = e.target.value.trim().toLowerCase();
        groupMemberList.querySelectorAll('.member-item').forEach((item) => {
          const name = item.dataset.name || '';
          item.style.display = name.includes(term) ? 'flex' : 'none';
        });
      });
    }

    if (createGroupForm) {
      createGroupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('groupNameInput');
        const descInput = document.getElementById('groupDescInput');
        const name = nameInput ? nameInput.value.trim() : '';
        const desc = descInput ? descInput.value.trim() : '';
        const checked = Array.from(document.querySelectorAll('input[name="members"]:checked')).map((i) => i.value);

        if (!name) return;

        try {
          const res = await fetch('/api/conversations/group', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              groupName: name,
              groupDescription: desc,
              description: desc,
              participants: checked,
              participantIds: checked,
            }),
          });
          const data = await res.json();
          if (data.success) {
            const modal = getModal(newGroupModalEl);
            if (modal) modal.hide();
            createGroupForm.reset();
            await loadConversations();
            selectConversation(data.data);
          } else {
            alert(data.message || 'Failed to create group');
          }
        } catch (err) {
          alert('Failed to create group');
        }
      });
    }
  }

  // 12. Chat Details Info Button Handler
  if (chatInfoBtn) {
    chatInfoBtn.addEventListener('click', () => {
      if (!activeConversation) return;
      const isGrp = isGroupConv(activeConversation);
      const otherUser = getOtherParticipant(activeConversation);
      const title = isGrp ? activeConversation.groupName : (otherUser ? otherUser.username : 'Chat');
      const desc = isGrp
        ? (activeConversation.groupDescription || 'No description provided.')
        : (otherUser?.bio || 'Hey there! I am using ChatIn.');
      const membersCount = activeConversation.participants?.length || 1;

      alert(`ℹ️ ${title}\n\n${desc}\n\n${isGrp ? `Members: ${membersCount}` : `Status: ${otherUser?.isOnline ? 'Online' : 'Offline'}`}`);
    });
  }

  // 13. Workspace Settings Modal & Preferences Handlers
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const userProfilePill = document.getElementById('userProfilePill');
  const settingsModalEl = document.getElementById('settingsModal');
  const profileForm = document.getElementById('profileForm');
  const changePasswordForm = document.getElementById('changePasswordForm');
  const settingsAvatarInput = document.getElementById('settingsAvatarInput');
  const settingsAvatarInputBtn = document.getElementById('settingsAvatarInputBtn');
  const settingsAvatarPreview = document.getElementById('settingsAvatarPreview');
  const profileAlert = document.getElementById('profileAlert');
  const passwordAlert = document.getElementById('passwordAlert');
  const settingsThemeDark = document.getElementById('settingsThemeDark');
  const settingsThemeLight = document.getElementById('settingsThemeLight');
  const cardThemeDark = document.getElementById('cardThemeDark');
  const cardThemeLight = document.getElementById('cardThemeLight');
  const checkIconDark = document.getElementById('checkIconDark');
  const checkIconLight = document.getElementById('checkIconLight');
  const settingsSoundToggle = document.getElementById('settingsSoundToggle');
  const testChimeBtn = document.getElementById('testChimeBtn');
  const settingsEnterToSendToggle = document.getElementById('settingsEnterToSendToggle');
  const sidebarUsernameDisplay = document.getElementById('sidebarUsernameDisplay');
  const userAvatarCircle = document.getElementById('userAvatarCircle');
  const settingsBio = document.getElementById('settingsBio');
  const bioCharCounter = document.getElementById('bioCharCounter');
  const runLatencyTestBtn = document.getElementById('runLatencyTestBtn');
  const telemetryLatencyVal = document.getElementById('telemetryLatencyVal');
  const requestPushBtn = document.getElementById('requestPushBtn');
  const clearCacheBtn = document.getElementById('clearCacheBtn');
  const settingsDensityToggle = document.getElementById('settingsDensityToggle');
  const chatAppContainer = document.querySelector('.chat-app-container');
  const settingsAvatarDisplay = document.getElementById('settingsAvatarDisplay');

  const showSettings = () => {
    if (settingsModalEl) {
      const modal = getModal(settingsModalEl);
      if (modal) modal.show();
    }
  };

  if (openSettingsBtn) openSettingsBtn.addEventListener('click', showSettings);
  if (userProfilePill) userProfilePill.addEventListener('click', showSettings);

  // Global Keyboard Shortcut: Ctrl+, or Cmd+, to toggle Settings
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault();
      showSettings();
    }
  });

  // Bulletproof Master-Detail Settings Tab Switching
  const settingsNavButtons = document.querySelectorAll('.settings-nav-item[data-settings-tab]');
  const settingsTabPanes = document.querySelectorAll('.settings-content-pane .tab-pane');

  settingsNavButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-settings-tab');
      if (!targetId) return;
      const targetPane = document.querySelector(targetId);
      if (!targetPane) return;

      settingsNavButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      settingsTabPanes.forEach((p) => p.classList.remove('show', 'active'));
      targetPane.classList.add('show', 'active');
    });
  });

  // Bio Character Counter
  if (settingsBio && bioCharCounter) {
    const updateBioCounter = () => {
      bioCharCounter.textContent = `${settingsBio.value.length} / 150`;
    };
    settingsBio.addEventListener('input', updateBioCounter);
    updateBioCounter();
  }

  // Live avatar file selection preview in Settings (non-destructive)
  if (settingsAvatarInput) {
    settingsAvatarInput.addEventListener('change', () => {
      const file = settingsAvatarInput.files && settingsAvatarInput.files[0];
      if (file && settingsAvatarDisplay) {
        const objectUrl = URL.createObjectURL(file);
        settingsAvatarDisplay.innerHTML = `<img src="${objectUrl}" alt="Preview" class="w-100 h-100 object-fit-cover">`;
      }
    });
  }

  // Password Visibility Toggles for Settings
  const setupPwdToggle = (btnId, inputId, iconId) => {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (btn && input && icon) {
      btn.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        icon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
      });
    }
  };
  setupPwdToggle('toggleCurrentPassword', 'currentPasswordInput', 'eyeIconCurrent');
  setupPwdToggle('toggleNewPassword', 'newPasswordInput', 'eyeIconNew');
  setupPwdToggle('toggleConfirmNewPassword', 'confirmNewPasswordInput', 'eyeIconConfirmNew');

  // Profile Form Submission
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveProfileBtn = document.getElementById('saveProfileBtn');
      const saveProfileSpinner = document.getElementById('saveProfileSpinner');
      const settingsUsername = document.getElementById('settingsUsername');

      if (saveProfileBtn) saveProfileBtn.disabled = true;
      if (saveProfileSpinner) saveProfileSpinner.classList.remove('d-none');
      if (profileAlert) profileAlert.className = 'alert d-none';

      try {
        const formData = new FormData();
        if (settingsUsername) formData.append('username', settingsUsername.value.trim());
        if (settingsBio) formData.append('bio', settingsBio.value.trim());
        const selectedFile = settingsAvatarInput?.files && settingsAvatarInput.files[0];
        if (selectedFile) {
          formData.append('profilePicture', selectedFile);
        }

        const res = await fetch('/api/users/profile', {
          method: 'PUT',
          body: formData,
        });
        const data = await res.json();

        if (data.success && data.user) {
          currentUser.username = data.user.username;
          currentUser.bio = data.user.bio;
          if (data.user.profilePicture) currentUser.profilePicture = data.user.profilePicture;

          if (sidebarUsernameDisplay) sidebarUsernameDisplay.textContent = currentUser.username;
          if (userAvatarCircle) {
            if (currentUser.profilePicture) {
              userAvatarCircle.innerHTML = `<img src="${currentUser.profilePicture}" alt="${escapeHtml(currentUser.username)}" class="w-100 h-100 rounded-circle object-fit-cover">`;
            } else {
              userAvatarCircle.textContent = (currentUser.username || 'CI').substring(0, 2).toUpperCase();
            }
          }

          if (profileAlert) {
            profileAlert.className = 'alert alert-success py-2 px-3 small rounded-3 mb-3';
            profileAlert.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i> Profile updated successfully!';
          }
        } else {
          if (profileAlert) {
            profileAlert.className = 'alert alert-danger py-2 px-3 small rounded-3 mb-3';
            profileAlert.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i> ${escapeHtml(data.message || 'Failed to update profile')}`;
          }
        }
      } catch (err) {
        if (profileAlert) {
          profileAlert.className = 'alert alert-danger py-2 px-3 small rounded-3 mb-3';
          profileAlert.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i> Network error updating profile.';
        }
      } finally {
        if (saveProfileBtn) saveProfileBtn.disabled = false;
        if (saveProfileSpinner) saveProfileSpinner.classList.add('d-none');
      }
    });
  }

  // Change Password Form Submission
  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPasswordInput = document.getElementById('currentPasswordInput');
      const newPasswordInput = document.getElementById('newPasswordInput');
      const confirmNewPasswordInput = document.getElementById('confirmNewPasswordInput');
      const updatePasswordBtn = document.getElementById('updatePasswordBtn');
      const updatePasswordSpinner = document.getElementById('updatePasswordSpinner');

      if (passwordAlert) passwordAlert.className = 'alert d-none';

      if (newPasswordInput.value !== confirmNewPasswordInput.value) {
        if (passwordAlert) {
          passwordAlert.className = 'alert alert-danger py-2 px-3 small rounded-3 mb-3';
          passwordAlert.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i> Passwords do not match.';
        }
        return;
      }

      if (updatePasswordBtn) updatePasswordBtn.disabled = true;
      if (updatePasswordSpinner) updatePasswordSpinner.classList.remove('d-none');

      try {
        const res = await fetch('/api/users/password', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPassword: currentPasswordInput.value,
            newPassword: newPasswordInput.value,
          }),
        });
        const data = await res.json();

        if (data.success) {
          changePasswordForm.reset();
          if (passwordAlert) {
            passwordAlert.className = 'alert alert-success py-2 px-3 small rounded-3 mb-3';
            passwordAlert.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i> Password updated successfully!';
          }
        } else {
          if (passwordAlert) {
            passwordAlert.className = 'alert alert-danger py-2 px-3 small rounded-3 mb-3';
            passwordAlert.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i> ${escapeHtml(data.message || 'Failed to update password')}`;
          }
        }
      } catch (err) {
        if (passwordAlert) {
          passwordAlert.className = 'alert alert-danger py-2 px-3 small rounded-3 mb-3';
          passwordAlert.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i> Network error updating password.';
        }
      } finally {
        if (updatePasswordBtn) updatePasswordBtn.disabled = false;
        if (updatePasswordSpinner) updatePasswordSpinner.classList.add('d-none');
      }
    });
  }

  // Preferences: Theme Toggles & Visual Cards
  const updateThemeUI = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('chatin_theme', theme);
    const icon = document.getElementById('themeIcon');
    if (icon) icon.className = theme === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';

    if (cardThemeDark && cardThemeLight) {
      if (theme === 'dark') {
        cardThemeDark.classList.add('active');
        cardThemeLight.classList.remove('active');
        if (checkIconDark) checkIconDark.className = 'bi bi-check-circle-fill text-primary fs-5';
        if (checkIconLight) checkIconLight.className = 'bi bi-circle text-muted fs-5';
      } else {
        cardThemeLight.classList.add('active');
        cardThemeDark.classList.remove('active');
        if (checkIconLight) checkIconLight.className = 'bi bi-check-circle-fill text-primary fs-5';
        if (checkIconDark) checkIconDark.className = 'bi bi-circle text-muted fs-5';
      }
    }
  };

  const initialTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  updateThemeUI(initialTheme);

  if (cardThemeDark) cardThemeDark.addEventListener('click', () => updateThemeUI('dark'));
  if (cardThemeLight) cardThemeLight.addEventListener('click', () => updateThemeUI('light'));
  if (settingsThemeDark) settingsThemeDark.addEventListener('click', () => updateThemeUI('dark'));
  if (settingsThemeLight) settingsThemeLight.addEventListener('click', () => updateThemeUI('light'));

  // Accent Color Palette
  document.querySelectorAll('.accent-color-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.accent-color-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const color = pill.dataset.color;
      if (color) {
        document.documentElement.style.setProperty('--accent-primary', color);
        document.documentElement.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${color} 0%, #8b5cf6 100%)`);
        localStorage.setItem('chatin_accent', color);
      }
    });
  });

  // Initialize Saved Accent Color
  const savedAccent = localStorage.getItem('chatin_accent');
  if (savedAccent) {
    document.documentElement.style.setProperty('--accent-primary', savedAccent);
    document.documentElement.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${savedAccent} 0%, #8b5cf6 100%)`);
    document.querySelectorAll('.accent-color-pill').forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.color === savedAccent);
    });
  }

  // Chat Density Switcher
  if (settingsDensityToggle && chatAppContainer) {
    const isCompact = localStorage.getItem('chatin_compact') === 'true';
    settingsDensityToggle.checked = !isCompact;
    chatAppContainer.classList.toggle('compact-mode', isCompact);

    settingsDensityToggle.addEventListener('change', (e) => {
      const compact = !e.target.checked;
      chatAppContainer.classList.toggle('compact-mode', compact);
      localStorage.setItem('chatin_compact', compact);
    });
  }

  // Preferences: Sound & Enter-to-Send Toggles
  if (settingsSoundToggle) {
    settingsSoundToggle.checked = localStorage.getItem('chatin_sound_enabled') !== 'false';
    settingsSoundToggle.addEventListener('change', (e) => {
      localStorage.setItem('chatin_sound_enabled', e.target.checked);
      if (e.target.checked) playNotificationChime(true);
    });
  }

  if (testChimeBtn) {
    testChimeBtn.addEventListener('click', () => {
      playNotificationChime(true);
    });
  }

  if (settingsEnterToSendToggle) {
    settingsEnterToSendToggle.checked = localStorage.getItem('chatin_enter_to_send') !== 'false';
    settingsEnterToSendToggle.addEventListener('change', (e) => {
      localStorage.setItem('chatin_enter_to_send', e.target.checked);
    });
  }

  // Telemetry: Server Latency Ping Tester
  if (runLatencyTestBtn) {
    runLatencyTestBtn.addEventListener('click', async () => {
      if (telemetryLatencyVal) telemetryLatencyVal.textContent = 'Testing...';
      const start = performance.now();
      try {
        await fetch('/api/health');
        const elapsed = Math.round(performance.now() - start);
        if (telemetryLatencyVal) {
          telemetryLatencyVal.textContent = `${elapsed} ms`;
          telemetryLatencyVal.className = elapsed < 60 ? 'fw-bold small text-success' : 'fw-bold small text-warning';
        }
      } catch (err) {
        if (telemetryLatencyVal) telemetryLatencyVal.textContent = 'Error';
      }
    });
  }

  // Desktop Push Notifications Request
  if (requestPushBtn) {
    if ('Notification' in window && Notification.permission === 'granted') {
      requestPushBtn.textContent = 'Active';
      requestPushBtn.classList.replace('btn-outline-secondary', 'btn-outline-success');
      requestPushBtn.disabled = true;
    }
    requestPushBtn.addEventListener('click', async () => {
      if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          requestPushBtn.textContent = 'Active';
          requestPushBtn.classList.replace('btn-outline-secondary', 'btn-outline-success');
          requestPushBtn.disabled = true;
          new Notification('ChatIn Active', {
            body: 'Desktop notifications successfully enabled.',
            icon: '/logo.png',
          });
        }
      }
    });
  }

  // Clear Local Cache
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', () => {
      if (confirm('Clear local preferences & cached state and refresh?')) {
        const theme = localStorage.getItem('chatin_theme');
        localStorage.clear();
        if (theme) localStorage.setItem('chatin_theme', theme);
        window.location.reload();
      }
    });
  }

  // Keyboard shortcut: Press Enter to send (or Ctrl+Enter if toggled off)
  if (messageInput) {
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const enterToSend = localStorage.getItem('chatin_enter_to_send') !== 'false';
        if (!enterToSend && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
        }
      }
    });
  }

  // Web Audio Synthesizer Notification Chime
  let audioCtx = null;
  function playNotificationChime(forcePlay = false) {
    const soundEnabled = localStorage.getItem('chatin_sound_enabled') !== 'false';
    if (!soundEnabled && !forcePlay) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioCtx) audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    } catch (e) {}
  }

  // Utilities
  function getOtherParticipant(conv) {
    if (!conv.participants || !Array.isArray(conv.participants)) return null;
    const currentIdStr = (currentUser._id || '').toString();
    return conv.participants.find((p) => {
      const pIdStr = (p._id || p).toString();
      return pIdStr !== currentIdStr;
    });
  }

  function updateUserOnlineBadge(userId, isOnline) {
    const badge = document.querySelector(`.conv-item[data-user-id="${userId}"] .conv-online-badge`);
    if (badge) {
      badge.style.display = isOnline ? 'block' : 'none';
    }
    if (activeConversation && !isGroupConv(activeConversation)) {
      const other = getOtherParticipant(activeConversation);
      const otherIdStr = other ? (other._id || other).toString() : '';
      if (otherIdStr === userId.toString() && activeChatStatus) {
        activeChatStatus.textContent = isOnline ? 'Active now' : 'Offline';
      }
    }
  }

  function scrollToBottom() {
    if (messagesViewport) {
      messagesViewport.scrollTop = messagesViewport.scrollHeight;
    }
  }

  function formatTimestamp(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================================
  // Smart Real-Time Synchronization & Polling Fallback
  // Ensures seamless message delivery across WebSockets, serverless hosts, and mobile sleep states
  // ==========================================================================
  let activeSyncInterval = null;
  let isSyncingActive = false;
  let conversationsSyncInterval = null;
  let isSyncingConversations = false;

  function startActiveSync() {
    stopActiveSync();
    activeSyncInterval = setInterval(syncActiveMessages, 1000);
  }

  function stopActiveSync() {
    if (activeSyncInterval) {
      clearInterval(activeSyncInterval);
      activeSyncInterval = null;
    }
  }

  async function syncActiveMessages() {
    if (!activeConversation || isSyncingActive) return;
    isSyncingActive = true;
    try {
      const convId = activeConversation._id;
      // Fetch latest messages directly with anti-cache timestamp — guarantees fresh DB state every second
      const res = await fetch(`/api/messages/${convId}?limit=35&_t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        // Clear placeholder empty state if new messages arrived
        const emptyStatePlaceholder = messagesStream?.querySelector('.text-muted.small.py-5');
        if (emptyStatePlaceholder) {
          messagesStream.innerHTML = '';
        }

        let hasNew = false;
        let hasUnreadIncoming = false;
        const currentId = (currentUser._id || '').toString();

        data.data.forEach((msg) => {
          const existingRow = document.querySelector(`.message-row[data-id="${msg._id}"]`);
          const senderId = (msg.senderId?._id || msg.senderId || '').toString();
          const isMine = senderId === currentId;

          if (!existingRow) {
            appendMessageToView(msg);
            hasNew = true;
            if (!isMine) {
              hasUnreadIncoming = true;
              playNotificationChime();
            }
          } else {
            // Live WhatsApp tick updates for sender (Clock -> Single ✓ -> Double ✓✓ -> Blue ✓✓)
            if (isMine) {
              const tickEl = existingRow.querySelector('.msg-meta i');
              if (tickEl) {
                const freshTickHtml = getTickHtml(msg, true);
                if (tickEl.outerHTML !== freshTickHtml) {
                  tickEl.outerHTML = freshTickHtml;
                }
              }
            } else {
              // Check if recipient has marked this message as read in DB
              const iHaveRead = Array.isArray(msg.readBy) && msg.readBy.some(r => (r.user?._id || r.user || r).toString() === currentId);
              if (!iHaveRead) {
                hasUnreadIncoming = true;
              }
            }

            // Live update for deleted or edited messages
            if (msg.deletedAt || msg.isDeleted) {
              const textEl = existingRow.querySelector('.msg-text');
              if (textEl && !textEl.classList.contains('fst-italic')) {
                textEl.textContent = 'This message was deleted';
                textEl.classList.add('fst-italic', 'opacity-75');
                const att = existingRow.querySelector('.msg-img-attachment, a');
                if (att) att.remove();
              }
            } else if (msg.content) {
              const textEl = existingRow.querySelector('.msg-text');
              if (textEl && textEl.textContent !== msg.content) {
                textEl.textContent = msg.content;
              }
            }
          }
        });

        // WhatsApp 2-way ACK: If new incoming messages arrived, confirm delivery & read status
        if (hasNew) {
          scrollToBottom();
          const latest = data.data[data.data.length - 1];
          updateSidebarSnippet(convId, latest.content || 'Sent an attachment');
        }

        if (hasUnreadIncoming) {
          fetch(`/api/messages/${convId}/delivered?_t=${Date.now()}`, { method: 'POST', cache: 'no-store' }).catch(() => {});
          fetch(`/api/messages/${convId}/read?_t=${Date.now()}`, { method: 'POST', cache: 'no-store' }).catch(() => {});
          if (socket && socket.connected) {
            socket.emit('message_delivered', { conversationId: convId });
            socket.emit('message_read', { conversationId: convId });
          }
        }
      }
    } catch (e) {
      // background polling - ignore transient drops
    } finally {
      isSyncingActive = false;
    }
  }

  function startConversationsSync() {
    if (conversationsSyncInterval) clearInterval(conversationsSyncInterval);
    conversationsSyncInterval = setInterval(async () => {
      if (isSyncingConversations) return;
      isSyncingConversations = true;
      try {
        const res = await fetch(`/api/conversations?_t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const newConvs = data.data;
          let changed = newConvs.length !== conversations.length;
          if (!changed) {
            for (let i = 0; i < newConvs.length; i++) {
              const c = newConvs[i];
              const old = conversations.find((x) => x._id === c._id);
              if (!old || old.unreadCount !== c.unreadCount || old.lastMessage?._id !== c.lastMessage?._id) {
                changed = true;
                break;
              }
            }
          }
          if (changed) {
            conversations = newConvs;
            renderFilteredConversations();
            if (activeConversation) {
              document.querySelectorAll('.conv-item').forEach((el) => {
                el.classList.toggle('active', el.dataset.id === activeConversation._id);
              });
            }
            // WhatsApp Delivery Receipt: Auto-acknowledge delivery for unread messages (turns sender single tick to double tick)
            newConvs.forEach((c) => {
              if (c.unreadCount > 0 && (!activeConversation || activeConversation._id !== c._id)) {
                fetch(`/api/messages/${c._id}/delivered`, { method: 'POST' }).catch(() => {});
              }
            });
          }
        }
      } catch (e) {
        // background sync
      } finally {
        isSyncingConversations = false;
      }
    }, 2500);
  }

  // Start Real-Time Socket, Load Conversations, and Start Sync Timers
  initSocket();
  loadConversations();
  startConversationsSync();

  // Instant re-sync when tab visibility is restored or window regains focus
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (activeConversation) {
        syncActiveMessages();
      }
      loadConversations();
    }
  });

  window.addEventListener('focus', () => {
    if (activeConversation) {
      syncActiveMessages();
    }
    loadConversations();
  });
});
