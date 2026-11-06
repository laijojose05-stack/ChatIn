// ChatIn Real-Time Chat Engine
(function () {
  const currentUser = window.CURRENT_USER || {};
  let socket = null;
  let activeConversation = null;
  let conversations = [];
  let pendingAttachment = null;
  let typingTimeout = null;

  // DOM Elements
  const statusDot = document.getElementById('socketStatusDot');
  const conversationsList = document.getElementById('conversationsList');
  const conversationsLoading = document.getElementById('conversationsLoading');
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

  // 1. Initialize Socket.IO
  function initSocket() {
    const token = localStorage.getItem('chatin_token');
    socket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
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

    // Incoming new message
    socket.on('new_message', (message) => {
      handleIncomingMessage(message);
    });

    // Message read receipts
    socket.on('message_read', ({ messageId, readBy, conversationId }) => {
      if (activeConversation && activeConversation._id === conversationId) {
        const tick = document.getElementById(`tick-${messageId}`);
        if (tick) {
          tick.className = 'bi bi-check2-all text-info';
        }
      }
    });

    // Typing indicators
    socket.on('user_typing', ({ userId, username, conversationId }) => {
      if (activeConversation && activeConversation._id === conversationId && userId !== currentUser._id) {
        typingIndicator.classList.remove('d-none');
        typingIndicator.querySelector('.typing-text').textContent = `${username} is typing...`;
      }
    });

    socket.on('user_stop_typing', ({ conversationId }) => {
      if (activeConversation && activeConversation._id === conversationId) {
        typingIndicator.classList.add('d-none');
      }
    });

    // Online status updates
    socket.on('user_online', ({ userId }) => {
      updateUserOnlineBadge(userId, true);
    });

    socket.on('user_offline', ({ userId }) => {
      updateUserOnlineBadge(userId, false);
    });
  }

  // 2. Fetch and Render Conversations
  async function loadConversations() {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (data.success) {
        conversations = data.data || [];
        renderConversations(conversations);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      if (conversationsLoading) conversationsLoading.classList.add('d-none');
    }
  }

  function renderConversations(list) {
    if (!conversationsList) return;
    conversationsList.innerHTML = '';

    if (list.length === 0) {
      conversationsList.innerHTML = `
        <div class="text-center text-muted small py-5 px-3">
          No conversations yet.<br>Click <strong>+</strong> above to start messaging!
        </div>
      `;
      return;
    }

    list.forEach((conv) => {
      const otherUser = getOtherParticipant(conv);
      const title = conv.isGroup ? conv.groupName : (otherUser ? otherUser.username : 'Unknown');
      const isOnline = !conv.isGroup && otherUser && otherUser.isOnline;
      const initials = title.substring(0, 2).toUpperCase();
      const lastMsg = conv.lastMessage ? (conv.lastMessage.isDeleted ? 'This message was deleted' : conv.lastMessage.content) : 'No messages yet';
      const time = conv.lastMessage ? formatTimestamp(conv.lastMessage.createdAt) : '';
      const unread = conv.unreadCount || 0;
      const isActive = activeConversation && activeConversation._id === conv._id;

      const item = document.createElement('div');
      item.className = `conv-item ${isActive ? 'active' : ''}`;
      item.dataset.id = conv._id;
      item.innerHTML = `
        <div class="conv-avatar-box">
          <div class="conv-avatar">${initials}</div>
          ${isOnline ? '<span class="conv-online-badge"></span>' : ''}
        </div>
        <div class="flex-grow-1 overflow-hidden">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <span class="conv-title text-truncate">${escapeHtml(title)}</span>
            <span class="conv-time">${time}</span>
          </div>
          <div class="d-flex justify-content-between align-items-center">
            <span class="conv-snippet text-truncate">${escapeHtml(lastMsg)}</span>
            ${unread > 0 ? `<span class="unread-pill">${unread}</span>` : ''}
          </div>
        </div>
      `;

      item.addEventListener('click', () => selectConversation(conv));
      conversationsList.appendChild(item);
    });
  }

  // 3. Select Conversation & Load Messages
  async function selectConversation(conv) {
    activeConversation = conv;
    chatApp.classList.add('chat-active');

    // Update active highlight in sidebar
    document.querySelectorAll('.conv-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.id === conv._id);
    });

    // Clear unread badge in DOM
    const unreadEl = document.querySelector(`.conv-item[data-id="${conv._id}"] .unread-pill`);
    if (unreadEl) unreadEl.remove();

    // Show active chat wrapper
    emptyChatState.classList.add('d-none');
    activeChatWrapper.classList.remove('d-none');
    activeChatWrapper.classList.add('d-flex');

    // Update Header
    const otherUser = getOtherParticipant(conv);
    const title = conv.isGroup ? conv.groupName : (otherUser ? otherUser.username : 'Unknown');
    activeChatName.textContent = title;
    activeChatAvatar.textContent = title.substring(0, 2).toUpperCase();

    if (conv.isGroup) {
      activeChatStatus.textContent = `${conv.participants?.length || 0} members`;
    } else if (otherUser) {
      activeChatStatus.textContent = otherUser.isOnline ? 'Active now' : 'Offline';
    }

    // Join room
    socket.emit('join_conversation', conv._id);

    // Fetch messages
    messagesStream.innerHTML = '<div class="text-center py-4 text-muted small">Loading messages...</div>';
    try {
      const res = await fetch(`/api/messages/${conv._id}`);
      const data = await res.json();
      if (data.success) {
        renderMessages(data.data || []);
        // Emit read receipt
        socket.emit('read_message', { conversationId: conv._id });
      }
    } catch (err) {
      messagesStream.innerHTML = '<div class="text-center py-4 text-danger small">Failed to load messages</div>';
    }
  }

  function renderMessages(messages) {
    messagesStream.innerHTML = '';
    messages.forEach((msg) => {
      appendMessageToView(msg);
    });
    scrollToBottom();
  }

  function appendMessageToView(msg) {
    const isMine = msg.sender?._id === currentUser._id || msg.sender === currentUser._id;
    const time = formatTimestamp(msg.createdAt);
    const senderName = !isMine && activeConversation.isGroup && msg.sender?.username ? msg.sender.username : '';

    const row = document.createElement('div');
    row.className = `message-row ${isMine ? 'sent' : 'received'}`;
    row.dataset.id = msg._id;

    let attachmentHtml = '';
    if (msg.attachments && msg.attachments.length > 0) {
      const att = msg.attachments[0];
      const isImg = att.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.fileUrl);
      if (isImg) {
        attachmentHtml = `<img src="${att.fileUrl}" class="msg-img-attachment" alt="Photo" onclick="window.open('${att.fileUrl}', '_blank')">`;
      } else {
        attachmentHtml = `
          <a href="${att.fileUrl}" target="_blank" class="attachment-file-box d-flex align-items-center gap-2 p-2 mb-2 rounded bg-black-50 text-white text-decoration-none">
            <i class="bi bi-file-earmark-arrow-down fs-5"></i>
            <span class="small text-truncate">${escapeHtml(att.fileName || 'Download attachment')}</span>
          </a>
        `;
      }
    }

    // Read tick
    let tickHtml = '';
    if (isMine) {
      const isRead = msg.readBy && msg.readBy.length > 1;
      tickHtml = `<i id="tick-${msg._id}" class="bi ${isRead ? 'bi-check2-all text-info' : 'bi-check2'}"></i>`;
    }

    row.innerHTML = `
      <div class="message-bubble">
        ${senderName ? `<div class="msg-sender-name">${escapeHtml(senderName)}</div>` : ''}
        ${attachmentHtml}
        <div class="msg-text">${escapeHtml(msg.content)}</div>
        <div class="msg-meta">
          <span>${time}</span>
          ${tickHtml}
        </div>
      </div>
    `;

    messagesStream.appendChild(row);
  }

  // 4. Send Message Handler
  if (messageForm) {
    messageForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = messageInput.value.trim();
      if (!text && !pendingAttachment) return;
      if (!activeConversation) return;

      const payload = {
        conversationId: activeConversation._id,
        content: text || 'Sent an attachment',
        attachments: pendingAttachment ? [pendingAttachment] : [],
      };

      // Clear input & pending
      messageInput.value = '';
      clearPendingAttachment();
      socket.emit('stop_typing', { conversationId: activeConversation._id });

      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success) {
          appendMessageToView(data.data);
          scrollToBottom();
          updateSidebarSnippet(activeConversation._id, data.data.content);
        }
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    });
  }

  // Handle Incoming Message
  function handleIncomingMessage(msg) {
    if (activeConversation && activeConversation._id === msg.conversationId) {
      appendMessageToView(msg);
      scrollToBottom();
      socket.emit('read_message', { conversationId: activeConversation._id });
    }
    updateSidebarSnippet(msg.conversationId, msg.content);
  }

  function updateSidebarSnippet(convId, content) {
    const item = document.querySelector(`.conv-item[data-id="${convId}"]`);
    if (item) {
      const snippet = item.querySelector('.conv-snippet');
      if (snippet) snippet.textContent = content;
      // Bump to top
      item.parentElement.prepend(item);
    } else {
      loadConversations();
    }
  }

  // 5. Typing Indicators
  if (messageInput) {
    messageInput.addEventListener('input', () => {
      if (!activeConversation) return;
      socket.emit('typing', { conversationId: activeConversation._id });
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        socket.emit('stop_typing', { conversationId: activeConversation._id });
      }, 2000);
    });
  }

  // 6. Mobile Back Button
  if (mobileBackBtn) {
    mobileBackBtn.addEventListener('click', () => {
      chatApp.classList.remove('chat-active');
      activeConversation = null;
    });
  }

  // 7. Attachments Upload
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/messages/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          pendingAttachment = data.data;
          attachmentName.textContent = file.name;
          attachmentPreview.classList.remove('d-none');
          attachmentPreview.classList.add('d-flex');
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

  // 8. Emoji Picker Setup
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
        messageInput.value += emoji;
        messageInput.focus();
      });
      emojiGrid.appendChild(span);
    });
  }

  if (emojiToggleBtn && emojiPopover) {
    emojiToggleBtn.addEventListener('click', () => {
      emojiPopover.classList.toggle('d-none');
      if (!emojiPopover.classList.contains('d-none')) {
        renderEmojis('smileys');
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

  // 9. Modals: New Chat & User Search
  if (openNewChatBtn && newChatModalEl) {
    const modal = new bootstrap.Modal(newChatModalEl);
    openNewChatBtn.addEventListener('click', () => modal.show());
    if (emptyNewChatBtn) emptyNewChatBtn.addEventListener('click', () => modal.show());

    let searchTimeout;
    userSearchModalInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const q = e.target.value.trim();
      if (!q) {
        userSearchResults.innerHTML = '<div class="text-center text-muted small py-4">Search by username to begin chatting.</div>';
        return;
      }

      searchTimeout = setTimeout(async () => {
        userSearchResults.innerHTML = '<div class="text-center text-muted small py-4">Searching...</div>';
        try {
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
          const data = await res.json();
          if (data.success && data.data.length > 0) {
            userSearchResults.innerHTML = '';
            data.data.forEach((u) => {
              if (u._id === currentUser._id) return;
              const row = document.createElement('div');
              row.className = 'd-flex align-items-center justify-content-between p-2 rounded hover-bg cursor-pointer';
              row.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                  <div class="user-avatar-circle" style="width:32px;height:32px;font-size:0.75rem;">
                    ${u.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div class="fw-semibold small">${escapeHtml(u.username)}</div>
                    <div class="text-muted extra-small">${escapeHtml(u.email)}</div>
                  </div>
                </div>
                <button class="btn btn-sm btn-primary rounded-pill px-3">Chat</button>
              `;

              row.addEventListener('click', async () => {
                modal.hide();
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
          } else {
            userSearchResults.innerHTML = '<div class="text-center text-muted small py-4">No users found.</div>';
          }
        } catch (err) {
          userSearchResults.innerHTML = '<div class="text-center text-danger small py-4">Search failed.</div>';
        }
      }, 300);
    });
  }

  // 10. Modals: Create Group
  if (openNewGroupBtn && newGroupModalEl) {
    const modal = new bootstrap.Modal(newGroupModalEl);
    openNewGroupBtn.addEventListener('click', async () => {
      modal.show();
      // Load user list for group
      try {
        const res = await fetch('/api/users/search?q=');
        const data = await res.json();
        if (data.success && groupMemberList) {
          groupMemberList.innerHTML = '';
          data.data.forEach((u) => {
            if (u._id === currentUser._id) return;
            const label = document.createElement('label');
            label.className = 'd-flex align-items-center gap-2 p-1 small cursor-pointer';
            label.innerHTML = `
              <input type="checkbox" name="members" value="${u._id}" class="form-check-input mt-0">
              <span>${escapeHtml(u.username)}</span>
            `;
            groupMemberList.appendChild(label);
          });
        }
      } catch (e) {}
    });

    if (createGroupForm) {
      createGroupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('groupNameInput').value.trim();
        const desc = document.getElementById('groupDescInput').value.trim();
        const checked = Array.from(document.querySelectorAll('input[name="members"]:checked')).map((i) => i.value);

        if (!name) return;

        try {
          const res = await fetch('/api/conversations/group', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupName: name, description: desc, participantIds: checked }),
          });
          const data = await res.json();
          if (data.success) {
            modal.hide();
            await loadConversations();
            selectConversation(data.data);
          }
        } catch (err) {
          alert('Failed to create group');
        }
      });
    }
  }

  // Utilities
  function getOtherParticipant(conv) {
    if (!conv.participants) return null;
    return conv.participants.find((p) => (p._id || p) !== currentUser._id);
  }

  function updateUserOnlineBadge(userId, isOnline) {
    const badge = document.querySelector(`.conv-item[data-user-id="${userId}"] .conv-online-badge`);
    if (badge) {
      badge.style.display = isOnline ? 'block' : 'none';
    }
    if (activeConversation && !activeConversation.isGroup) {
      const other = getOtherParticipant(activeConversation);
      if (other && (other._id || other) === userId) {
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

  // Kickoff
  initSocket();
  loadConversations();
})();
