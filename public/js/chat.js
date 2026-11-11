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
    window.chatinSocket = socket;

    // Register Socket.IO instance with WebRTC Call Manager
    if (window.ChatInCall && typeof window.ChatInCall.registerSocketSignaling === 'function') {
      window.ChatInCall.registerSocketSignaling(socket);
    }

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

    // Message reaction updated
    socket.on('message_reaction', ({ conversationId, messageId, reactions }) => {
      if (activeConversation && activeConversation._id === conversationId) {
        updateMessageReactionsDom(messageId, reactions);
      }
    });

    // Conversation cleared
    socket.on('conversation_cleared', ({ conversationId }) => {
      if (activeConversation && activeConversation._id === conversationId) {
        loadMessages(activeConversation);
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
      let snippetTick = '';
      if (lastMsgObj) {
        if (lastMsgObj.deletedAt || lastMsgObj.isDeleted) {
          lastMsgText = 'This message was deleted';
        } else if (lastMsgObj.content) {
          lastMsgText = lastMsgObj.content;
        } else if (lastMsgObj.attachments && lastMsgObj.attachments.length > 0) {
          lastMsgText = 'Sent an attachment';
        }

        const lastSenderId = (lastMsgObj.senderId?._id || lastMsgObj.senderId || '').toString();
        const currentId = (currentUser._id || '').toString();
        if (lastSenderId === currentId) {
          const isRead = lastMsgObj.readBy && lastMsgObj.readBy.length > 1;
          const isDelivered = lastMsgObj.deliveredTo && lastMsgObj.deliveredTo.length > 1;
          if (isRead) {
            snippetTick = '<i class="bi bi-check2-all text-info me-1" title="Read"></i>';
          } else if (isDelivered) {
            snippetTick = '<i class="bi bi-check2-all text-secondary me-1" title="Delivered"></i>';
          } else {
            snippetTick = '<i class="bi bi-check2 text-secondary me-1" title="Sent"></i>';
          }
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
            <span class="conv-snippet text-truncate">${snippetTick}${escapeHtml(lastMsgText)}</span>
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

    // Reset P2P search, reply, audio, and scroll state for new conversation
    if (typeof closeInChatSearch === 'function') closeInChatSearch();
    if (typeof cancelReply === 'function') cancelReply();
    if (typeof cancelAudioRecording === 'function') cancelAudioRecording();
    if (typeof resetScrollToBottom === 'function') resetScrollToBottom();

    // Show active chat wrapper
    if (emptyChatState) emptyChatState.classList.add('d-none');
    if (activeChatWrapper) {
      activeChatWrapper.classList.remove('d-none');
      activeChatWrapper.classList.add('d-flex');
    }

    // Load pinned message and chat wallpaper for this conversation
    if (typeof loadPinnedMessage === 'function') loadPinnedMessage(conv._id);
    if (typeof applyWallpaper === 'function') applyWallpaper();
    if (charCounter && messageInput) charCounter.textContent = messageInput.value.length;

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

    // Call buttons status
    const headerAudioCallBtn = document.getElementById('headerAudioCallBtn');
    const headerVideoCallBtn = document.getElementById('headerVideoCallBtn');
    if (headerAudioCallBtn && headerVideoCallBtn) {
      if (isGrp) {
        headerAudioCallBtn.classList.add('opacity-50');
        headerAudioCallBtn.title = 'Group voice calls coming soon (1:1 supported)';
        headerVideoCallBtn.classList.add('opacity-50');
        headerVideoCallBtn.title = 'Group video calls coming soon (1:1 supported)';
      } else {
        headerAudioCallBtn.classList.remove('opacity-50');
        headerAudioCallBtn.title = `Start voice call with ${otherUser ? otherUser.username : 'contact'}`;
        headerVideoCallBtn.classList.remove('opacity-50');
        headerVideoCallBtn.title = `Start video call with ${otherUser ? otherUser.username : 'contact'}`;
      }
    }

    // Join socket room
    if (socket && socket.connected) {
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

  // Human-readable date separator ("Today", "Yesterday", "Mon, May 12")
  function formatDateSeparator(dateInput) {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (d1, d2) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    if (isSameDay(d, today)) return 'Today';
    if (isSameDay(d, yesterday)) return 'Yesterday';

    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  }

  // Safe Rich Text Formatter (Code Blocks with Copy Button, Inline Code, WhatsApp Bold/Italic/Strike, Quotes, URLs)
  function formatRichMessage(rawText) {
    if (!rawText) return '';
    let text = escapeHtml(rawText);
    const codeBlocks = [];
    const inlineCodes = [];

    // 1. Code blocks ```(lang)\n(code)```
    text = text.replace(/```(?:([a-zA-Z0-9_+-]+)?\n)?([\s\S]*?)```/g, (match, lang, code) => {
      const idx = codeBlocks.length;
      const cleanLang = (lang || 'code').trim();
      const cleanCode = code ? code.replace(/^\n+|\n+$/g, '') : '';
      codeBlocks.push(
        `<div class="code-block-container">` +
          `<div class="code-block-header">` +
            `<span>${escapeHtml(cleanLang)}</span>` +
            `<button type="button" class="code-copy-btn" onclick="window.copyCodeSnippet(this)">` +
              `<i class="bi bi-clipboard me-1"></i>Copy` +
            `</button>` +
          `</div>` +
          `<pre><code>${cleanCode}</code></pre>` +
        `</div>`
      );
      return `___CODE_BLOCK_${idx}___`;
    });

    // 2. Inline code `code`
    text = text.replace(/`([^`\n]+)`/g, (match, code) => {
      const idx = inlineCodes.length;
      inlineCodes.push(`<code class="inline-code">${code}</code>`);
      return `___INLINE_CODE_${idx}___`;
    });

    // 3. Blockquotes: lines starting with &gt;
    text = text.replace(/(?:^|\n)&gt;\s*([^\n]+)/g, (match, quote) => {
      return `<blockquote>${quote}</blockquote>`;
    });

    // 4. Auto-link URLs (excluding trailing punctuation)
    text = text.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-link">${url}</a>`;
    });

    // 5. WhatsApp Markdown: Bold *text*
    text = text.replace(/(^|[\s.,!?;:(])\*([^*\n\r]+)\*(?=$|[\s.,!?;:)]|\b)/g, '$1<b>$2</b>');

    // 6. WhatsApp Markdown: Italic _text_
    text = text.replace(/(^|[\s.,!?;:(])_([^_\n\r]+)_(?=$|[\s.,!?;:)]|\b)/g, '$1<i>$2</i>');

    // 7. WhatsApp Markdown: Strikethrough ~text~
    text = text.replace(/(^|[\s.,!?;:(])~([^~\n\r]+)~(?=$|[\s.,!?;:)]|\b)/g, '$1<s>$2</s>');

    // 8. Newlines to <br>
    text = text.replace(/\n/g, '<br>');

    // 9. Restore Placeholders
    inlineCodes.forEach((codeHtml, idx) => {
      text = text.replace(`___INLINE_CODE_${idx}___`, codeHtml);
    });
    codeBlocks.forEach((blockHtml, idx) => {
      text = text.replace(`___CODE_BLOCK_${idx}___`, blockHtml);
    });

    return text;
  }

  // Copy code snippet helper
  window.copyCodeSnippet = async (btn) => {
    try {
      const pre = btn.closest('.code-block-container')?.querySelector('pre code');
      if (!pre) return;
      const text = pre.innerText || pre.textContent;
      await navigator.clipboard.writeText(text);
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.classList.remove('copied');
      }, 2000);
    } catch (e) {
      showToast('Copied code snippet');
    }
  };

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

    let lastDateStr = null;
    messages.forEach((msg) => {
      const msgDate = new Date(msg.createdAt || Date.now());
      const dateStr = msgDate.toDateString();
      if (dateStr !== lastDateStr) {
        lastDateStr = dateStr;
        const sep = document.createElement('div');
        sep.className = 'chat-date-separator';
        sep.innerHTML = `<span class="date-badge">${formatDateSeparator(msg.createdAt || Date.now())}</span>`;
        messagesStream.appendChild(sep);
      }
      appendMessageToView(msg, false);
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

  // ==========================================================================
  // P2P Advanced Features: Toasts, Replies, Reactions, Audio & Actions
  // ==========================================================================

  function showToast(msg) {
    let toast = document.getElementById('chatinToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'chatinToast';
      toast.className = 'position-fixed bottom-0 start-50 translate-middle-x mb-4 py-2 px-3 rounded-pill bg-dark text-white shadow-lg extra-small fw-semibold border border-secondary';
      toast.style.zIndex = '9999';
      toast.style.transition = 'opacity 0.2s ease';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      toast.style.opacity = '0';
    }, 2000);
  }
  window.showToast = showToast;

  // Global ChatIn Interface for Submodules (like WebRTC Calling)
  window.ChatInApp = {
    getActiveConversation: () => activeConversation,
    getOtherUser: (conv) => getOtherParticipant(conv || activeConversation),
    showToast,
  };

  // Reply State
  let pendingReplyTo = null;
  const replyBar = document.getElementById('replyBar');
  const replySenderName = document.getElementById('replySenderName');
  const replyTextPreview = document.getElementById('replyTextPreview');
  const cancelReplyBtn = document.getElementById('cancelReplyBtn');

  window.startReplyToMessage = (msgId, sender, text) => {
    pendingReplyTo = { id: msgId, sender, text };
    if (replySenderName) replySenderName.textContent = `Replying to ${sender}`;
    if (replyTextPreview) replyTextPreview.textContent = text || 'Attachment';
    if (replyBar) {
      replyBar.classList.remove('d-none');
      replyBar.classList.add('d-flex');
    }
    if (messageInput) messageInput.focus();
  };

  function cancelReply() {
    pendingReplyTo = null;
    if (replyBar) {
      replyBar.classList.add('d-none');
      replyBar.classList.remove('d-flex');
    }
  }

  if (cancelReplyBtn) cancelReplyBtn.addEventListener('click', cancelReply);

  // 1. Scroll To Message & Highlight
  window.scrollToMessage = (msgId) => {
    if (!msgId) return;
    const targetRow = document.querySelector(`.message-row[data-id="${msgId}"]`);
    if (targetRow) {
      targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetRow.classList.add('highlighted');
      setTimeout(() => targetRow.classList.remove('highlighted'), 2000);
    }
  };

  // 2. Copy Message Text
  window.copyMessageText = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard');
    } catch (e) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('Copied to clipboard');
    }
  };

  // 3. Delete Message
  window.deleteMessageById = async (msgId) => {
    if (!msgId) return;
    if (!confirm('Delete this message for everyone?')) return;
    try {
      const res = await fetch(`/api/messages/${msgId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        const row = document.querySelector(`.message-row[data-id="${msgId}"]`);
        if (row) {
          const textEl = row.querySelector('.msg-text');
          if (textEl) {
            textEl.textContent = 'This message was deleted';
            textEl.classList.add('fst-italic');
          }
          const attachEl = row.querySelector('.msg-img-attachment, .msg-file-attachment, .audio-msg-player');
          if (attachEl) attachEl.remove();
          const actionsBar = row.querySelector('.msg-actions-bar');
          if (actionsBar) actionsBar.remove();
        }
      }
    } catch (e) {
      alert('Failed to delete message');
    }
  };

  // 4. Toggle Emoji Reaction
  window.toggleReaction = async (msgId, emoji) => {
    if (!msgId || !emoji) return;
    try {
      const res = await fetch(`/api/messages/${msgId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        updateMessageReactionsDom(data.data.messageId, data.data.reactions);
        if (socket && socket.connected && activeConversation) {
          socket.emit('message_reaction', {
            conversationId: activeConversation._id,
            messageId: data.data.messageId,
            reactions: data.data.reactions,
          });
        }
      }
    } catch (e) {}
  };

  function updateMessageReactionsDom(msgId, reactions) {
    const row = document.querySelector(`.message-row[data-id="${msgId}"]`);
    if (!row) return;
    const bubble = row.querySelector('.message-bubble');
    if (!bubble) return;

    let rowReactions = row.querySelector('.msg-reactions-row');
    if (!Array.isArray(reactions) || reactions.length === 0) {
      if (rowReactions) rowReactions.remove();
      return;
    }

    const currentUserIdStr = (currentUser._id || '').toString();
    const counts = {};
    const myReactions = new Set();
    reactions.forEach((r) => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
      const rUserId = (r.user?._id || r.user || '').toString();
      if (rUserId === currentUserIdStr) myReactions.add(r.emoji);
    });

    const pills = Object.entries(counts).map(([emoji, count]) => {
      const hasReacted = myReactions.has(emoji);
      return `<span class="msg-reaction-pill ${hasReacted ? 'reacted' : ''}" onclick="window.toggleReaction('${msgId}', '${emoji}')">${emoji} <span class="extra-small fw-bold">${count}</span></span>`;
    }).join('');

    if (!rowReactions) {
      rowReactions = document.createElement('div');
      rowReactions.className = 'msg-reactions-row';
      rowReactions.id = `reactions-${msgId}`;
      const meta = bubble.querySelector('.msg-meta');
      if (meta) {
        bubble.insertBefore(rowReactions, meta);
      } else {
        bubble.appendChild(rowReactions);
      }
    }
    rowReactions.innerHTML = pills;
  }

  // 5. Toggle Audio Playback
  window.toggleAudioPlay = (msgId) => {
    const audio = document.getElementById(`audio-${msgId}`);
    const btn = document.getElementById(`audioBtn-${msgId}`);
    const timer = document.getElementById(`audioTime-${msgId}`);
    if (!audio || !btn) return;

    if (audio.paused) {
      document.querySelectorAll('audio').forEach(a => { if (a !== audio) a.pause(); });
      document.querySelectorAll('.audio-play-btn i').forEach(i => i.className = 'bi bi-play-fill fs-5');
      audio.play();
      btn.innerHTML = '<i class="bi bi-pause-fill fs-5"></i>';
    } else {
      audio.pause();
      btn.innerHTML = '<i class="bi bi-play-fill fs-5"></i>';
    }

    audio.ontimeupdate = () => {
      if (timer) {
        const mins = Math.floor(audio.currentTime / 60);
        const secs = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
        timer.textContent = `${mins}:${secs}`;
      }
    };

    audio.onended = () => {
      btn.innerHTML = '<i class="bi bi-play-fill fs-5"></i>';
    };
  };

  // ==========================================================================
  // Starred Messages Engine (Saved to Local Storage & Visual Star Badge)
  // ==========================================================================
  function getStarredMessages() {
    try {
      const raw = localStorage.getItem('chatin_starred_messages');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) {
      return new Set();
    }
  }

  function isMessageStarred(msgId) {
    if (!msgId) return false;
    return getStarredMessages().has(msgId.toString());
  }

  window.toggleStarMessage = (msgId) => {
    if (!msgId) return;
    const idStr = msgId.toString();
    const starred = getStarredMessages();
    let isNowStarred = false;

    if (starred.has(idStr)) {
      starred.delete(idStr);
      showToast('Message unstarred');
    } else {
      starred.add(idStr);
      isNowStarred = true;
      showToast('Message starred ⭐');
    }

    try {
      localStorage.setItem('chatin_starred_messages', JSON.stringify([...starred]));
    } catch (e) {}

    // Update DOM in active stream
    const row = document.querySelector(`.message-row[data-id="${msgId}"]`);
    if (row) {
      const meta = row.querySelector('.msg-meta');
      if (meta) {
        let starBadge = meta.querySelector('.msg-star-badge');
        if (isNowStarred) {
          if (!starBadge) {
            starBadge = document.createElement('i');
            starBadge.className = 'bi bi-star-fill text-warning extra-small ms-1 msg-star-badge';
            starBadge.title = 'Starred message';
            meta.appendChild(starBadge);
          }
        } else if (starBadge) {
          starBadge.remove();
        }
      }
      const starActionBtn = row.querySelector('.action-icon-btn[title="Star message"]');
      if (starActionBtn) {
        starActionBtn.classList.toggle('text-warning', isNowStarred);
        const icon = starActionBtn.querySelector('i');
        if (icon) icon.className = `bi bi-star${isNowStarred ? '-fill' : ''}`;
      }
    }
  };

  // ==========================================================================
  // Pinned Message Engine (Pinned Banner, Jump-to-Message & Unpin)
  // ==========================================================================
  const pinnedMessageBanner = document.getElementById('pinnedMessageBanner');
  const pinnedMessageTrigger = document.getElementById('pinnedMessageTrigger');
  const pinnedSenderName = document.getElementById('pinnedSenderName');
  const pinnedSnippetText = document.getElementById('pinnedSnippetText');
  const unpinMessageBtn = document.getElementById('unpinMessageBtn');

  function loadPinnedMessage(convId) {
    if (!pinnedMessageBanner || !convId) return;
    try {
      const raw = localStorage.getItem(`chatin_pinned_${convId}`);
      if (!raw) {
        pinnedMessageBanner.classList.add('d-none');
        pinnedMessageBanner.classList.remove('d-flex');
        return;
      }
      const pinned = JSON.parse(raw);
      if (pinned && pinned.id) {
        if (pinnedSenderName) pinnedSenderName.textContent = pinned.sender || 'Pinned Message';
        if (pinnedSnippetText) pinnedSnippetText.textContent = pinned.text || 'Message attachment';
        pinnedMessageBanner.dataset.pinnedId = pinned.id;
        pinnedMessageBanner.classList.remove('d-none');
        pinnedMessageBanner.classList.add('d-flex');
      } else {
        pinnedMessageBanner.classList.add('d-none');
        pinnedMessageBanner.classList.remove('d-flex');
      }
    } catch (e) {
      pinnedMessageBanner.classList.add('d-none');
      pinnedMessageBanner.classList.remove('d-flex');
    }
  }

  window.pinMessage = (msgId, sender, text) => {
    if (!activeConversation || !msgId) return;
    const cleanSnippet = (text || 'Message attachment').replace(/[\r\n]+/g, ' ').substring(0, 100);
    const pinnedData = {
      id: msgId,
      sender: sender || 'Pinned Message',
      text: cleanSnippet,
      pinnedAt: Date.now(),
    };

    try {
      localStorage.setItem(`chatin_pinned_${activeConversation._id}`, JSON.stringify(pinnedData));
    } catch (e) {}

    loadPinnedMessage(activeConversation._id);
    showToast('Message pinned to top 📌');
  };

  window.unpinMessage = () => {
    if (!activeConversation) return;
    try {
      localStorage.removeItem(`chatin_pinned_${activeConversation._id}`);
    } catch (e) {}
    if (pinnedMessageBanner) {
      pinnedMessageBanner.classList.add('d-none');
      pinnedMessageBanner.classList.remove('d-flex');
    }
    showToast('Message unpinned');
  };

  if (unpinMessageBtn) {
    unpinMessageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.unpinMessage();
    });
  }

  if (pinnedMessageTrigger) {
    pinnedMessageTrigger.addEventListener('click', () => {
      const pinnedId = pinnedMessageBanner?.dataset.pinnedId;
      if (pinnedId) {
        window.scrollToMessage(pinnedId);
      }
    });
  }

  // ==========================================================================
  // Quick Text Formatting Toolbar & Character Counter
  // ==========================================================================
  const formatToggleBtn = document.getElementById('formatToggleBtn');
  const formattingToolbar = document.getElementById('formattingToolbar');
  const charCounter = document.getElementById('charCounter');

  if (formatToggleBtn && formattingToolbar) {
    formatToggleBtn.addEventListener('click', () => {
      const isHidden = formattingToolbar.classList.contains('d-none');
      if (isHidden) {
        formattingToolbar.classList.remove('d-none');
        formattingToolbar.classList.add('d-flex');
        formatToggleBtn.classList.add('text-primary');
        formatToggleBtn.classList.remove('text-muted');
      } else {
        formattingToolbar.classList.add('d-none');
        formattingToolbar.classList.remove('d-flex');
        formatToggleBtn.classList.remove('text-primary');
        formatToggleBtn.classList.add('text-muted');
      }
    });

    document.querySelectorAll('.fmt-btn[data-fmt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!messageInput) return;
        const fmt = btn.dataset.fmt;
        const start = messageInput.selectionStart || 0;
        const end = messageInput.selectionEnd || 0;
        const val = messageInput.value;
        const selected = val.substring(start, end);

        let before = '';
        let after = '';
        let placeholder = '';

        switch (fmt) {
          case 'bold':
            before = '*';
            after = '*';
            placeholder = 'bold';
            break;
          case 'italic':
            before = '_';
            after = '_';
            placeholder = 'italic';
            break;
          case 'strike':
            before = '~';
            after = '~';
            placeholder = 'strike';
            break;
          case 'code':
            before = '`';
            after = '`';
            placeholder = 'code';
            break;
          case 'codeblock':
            before = '```\n';
            after = '\n```';
            placeholder = 'code block';
            break;
          case 'quote':
            before = '> ';
            after = '';
            placeholder = 'quote';
            break;
          case 'bullet':
            before = '• ';
            after = '';
            placeholder = 'bullet item';
            break;
        }

        const insertText = selected || placeholder;
        const replacement = before + insertText + after;
        messageInput.value = val.substring(0, start) + replacement + val.substring(end);
        messageInput.focus();
        messageInput.setSelectionRange(start + before.length, start + before.length + insertText.length);
        updateCharCounter();
      });
    });
  }

  function syncComposerButtons() {
    const hasText = messageInput && messageInput.value.trim().length > 0;
    const hasAttach = !!pendingAttachment;
    const micBtn = document.getElementById('micBtn');
    const sendBtn = document.getElementById('sendBtn');
    if (micBtn && sendBtn) {
      if (hasText || hasAttach) {
        micBtn.classList.add('d-none');
        sendBtn.classList.remove('d-none');
      } else {
        micBtn.classList.remove('d-none');
        sendBtn.classList.add('d-none');
      }
    }
  }

  function updateCharCounter() {
    if (charCounter && messageInput) {
      charCounter.textContent = messageInput.value.length;
    }
    syncComposerButtons();
  }

  if (messageInput) {
    messageInput.addEventListener('input', updateCharCounter);
    syncComposerButtons();
  }

  // ==========================================================================
  // Chat Wallpaper Customizer (Doodle, Emerald, Obsidian, Midnight)
  // ==========================================================================
  const wallpaperChips = document.getElementById('wallpaperChips');
  function applyWallpaper(wallpaperName) {
    if (!messagesViewport) return;
    const name = wallpaperName || localStorage.getItem('chatin_wallpaper') || 'doodle';
    messagesViewport.classList.remove('wallpaper-doodle', 'wallpaper-emerald', 'wallpaper-obsidian', 'wallpaper-midnight');
    messagesViewport.classList.add(`wallpaper-${name}`);

    if (wallpaperChips) {
      wallpaperChips.querySelectorAll('button[data-wallpaper]').forEach((b) => {
        b.classList.toggle('active', b.dataset.wallpaper === name);
      });
    }
  }

  if (wallpaperChips) {
    wallpaperChips.querySelectorAll('button[data-wallpaper]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const wp = btn.dataset.wallpaper;
        try {
          localStorage.setItem('chatin_wallpaper', wp);
        } catch (e) {}
        applyWallpaper(wp);
        showToast(`Wallpaper set to ${wp.charAt(0).toUpperCase() + wp.slice(1)}`);
      });
    });
  }
  applyWallpaper();

  // ==========================================================================
  // Export Chat History Handler (.txt Download)
  // ==========================================================================
  const contactExportChatBtn = document.getElementById('contactExportChatBtn');
  if (contactExportChatBtn) {
    contactExportChatBtn.addEventListener('click', () => {
      if (!activeConversation) {
        showToast('Open a conversation first');
        return;
      }
      const isGrp = isGroupConv(activeConversation);
      const otherUser = getOtherParticipant(activeConversation);
      const title = isGrp ? (activeConversation.groupName || 'Group') : (otherUser ? otherUser.username : 'Chat');

      const rows = document.querySelectorAll('#messagesStream .message-row');
      if (rows.length === 0) {
        showToast('No messages to export');
        return;
      }

      let exportText = `====================================================\n`;
      exportText += ` ChatIn Conversation Export: ${title}\n`;
      exportText += ` Exported on: ${new Date().toLocaleString()}\n`;
      exportText += ` Total Messages: ${rows.length}\n`;
      exportText += `====================================================\n\n`;

      rows.forEach((row) => {
        const isMine = row.classList.contains('sent');
        const senderName = isMine ? 'You' : (row.querySelector('.msg-sender-name')?.textContent || title);
        const time = row.querySelector('.msg-meta span')?.textContent || '';
        const msgText = row.querySelector('.msg-text')?.innerText || '';
        const hasMedia = row.querySelector('.msg-img-attachment') ? '[Image]' :
                         row.querySelector('.audio-msg-player') ? '[Voice Note]' :
                         row.querySelector('.msg-file-attachment') ? '[File Attachment]' : '';
        const content = [msgText, hasMedia].filter(Boolean).join(' ');
        exportText += `[${time}] ${senderName}: ${content}\n`;
      });

      exportText += `\n----------------------------------------------------\nEnd of export (ChatIn Web)\n`;

      const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ChatIn_${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Chat history exported successfully! 📁');
    });
  }

  // ==========================================================================
  // In-Chat Message Search Engine
  // ==========================================================================
  const chatSearchToggleBtn = document.getElementById('chatSearchToggleBtn');
  const inChatSearchBar = document.getElementById('inChatSearchBar');
  const inChatSearchInput = document.getElementById('inChatSearchInput');
  const searchMatchCount = document.getElementById('searchMatchCount');
  const searchPrevBtn = document.getElementById('searchPrevBtn');
  const searchNextBtn = document.getElementById('searchNextBtn');
  const closeSearchBtn = document.getElementById('closeSearchBtn');

  let currentSearchMatches = [];
  let currentSearchIndex = -1;

  function clearSearchHighlights() {
    document.querySelectorAll('.message-row.highlighted').forEach((el) => el.classList.remove('highlighted'));
  }

  function closeInChatSearch() {
    if (inChatSearchBar) {
      inChatSearchBar.classList.add('d-none');
      inChatSearchBar.classList.remove('d-flex');
    }
    if (inChatSearchInput) inChatSearchInput.value = '';
    if (searchMatchCount) searchMatchCount.textContent = '0 matches';
    currentSearchMatches = [];
    currentSearchIndex = -1;
    clearSearchHighlights();
  }

  function performInChatSearch() {
    clearSearchHighlights();
    const query = inChatSearchInput ? inChatSearchInput.value.trim().toLowerCase() : '';
    if (!query) {
      currentSearchMatches = [];
      currentSearchIndex = -1;
      if (searchMatchCount) searchMatchCount.textContent = '0 matches';
      return;
    }

    const rows = Array.from(document.querySelectorAll('#messagesStream .message-row'));
    currentSearchMatches = rows.filter((row) => {
      const textEl = row.querySelector('.msg-text');
      if (!textEl) return false;
      return textEl.textContent.toLowerCase().includes(query);
    });

    if (currentSearchMatches.length > 0) {
      currentSearchIndex = currentSearchMatches.length - 1; // Start with the most recent match
      highlightMatch(currentSearchIndex);
    } else {
      currentSearchIndex = -1;
      if (searchMatchCount) searchMatchCount.textContent = '0 matches';
    }
  }

  function highlightMatch(index) {
    if (currentSearchMatches.length === 0) return;
    clearSearchHighlights();
    const target = currentSearchMatches[index];
    if (target) {
      target.classList.add('highlighted');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (searchMatchCount) {
        searchMatchCount.textContent = `${index + 1} of ${currentSearchMatches.length}`;
      }
    }
  }

  function stepSearchMatch(delta) {
    if (currentSearchMatches.length === 0) return;
    currentSearchIndex = (currentSearchIndex + delta + currentSearchMatches.length) % currentSearchMatches.length;
    highlightMatch(currentSearchIndex);
  }

  if (chatSearchToggleBtn) {
    chatSearchToggleBtn.addEventListener('click', () => {
      if (!inChatSearchBar) return;
      const isOpen = !inChatSearchBar.classList.contains('d-none');
      if (isOpen) {
        closeInChatSearch();
      } else {
        inChatSearchBar.classList.remove('d-none');
        inChatSearchBar.classList.add('d-flex');
        if (inChatSearchInput) {
          inChatSearchInput.focus();
          if (inChatSearchInput.value) performInChatSearch();
        }
      }
    });
  }

  if (closeSearchBtn) closeSearchBtn.addEventListener('click', closeInChatSearch);

  if (inChatSearchInput) {
    inChatSearchInput.addEventListener('input', performInChatSearch);
    inChatSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          stepSearchMatch(-1);
        } else {
          stepSearchMatch(1);
        }
      } else if (e.key === 'Escape') {
        closeInChatSearch();
      }
    });
  }

  if (searchNextBtn) searchNextBtn.addEventListener('click', () => stepSearchMatch(1));
  if (searchPrevBtn) searchPrevBtn.addEventListener('click', () => stepSearchMatch(-1));

  // ==========================================================================
  // Scroll-to-Bottom Floating Button & Unread Badge
  // ==========================================================================
  const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
  const unreadScrollBadge = document.getElementById('unreadScrollBadge');
  let unreadScrollCount = 0;

  function resetScrollToBottom() {
    unreadScrollCount = 0;
    if (unreadScrollBadge) {
      unreadScrollBadge.classList.add('d-none');
      unreadScrollBadge.textContent = '0';
    }
    if (scrollToBottomBtn) {
      scrollToBottomBtn.classList.add('d-none');
      scrollToBottomBtn.classList.remove('d-flex');
    }
  }

  function updateScrollToBottomVisibility() {
    if (!messagesViewport || !scrollToBottomBtn) return;
    const distanceToBottom = messagesViewport.scrollHeight - messagesViewport.scrollTop - messagesViewport.clientHeight;
    if (distanceToBottom > 160) {
      scrollToBottomBtn.classList.remove('d-none');
      scrollToBottomBtn.classList.add('d-flex');
    } else {
      resetScrollToBottom();
    }
  }

  function incrementUnreadScrollBadge() {
    unreadScrollCount += 1;
    if (unreadScrollBadge && scrollToBottomBtn) {
      unreadScrollBadge.textContent = unreadScrollCount > 99 ? '99+' : unreadScrollCount;
      unreadScrollBadge.classList.remove('d-none');
      scrollToBottomBtn.classList.remove('d-none');
      scrollToBottomBtn.classList.add('d-flex');
    }
  }

  if (messagesViewport) {
    messagesViewport.addEventListener('scroll', updateScrollToBottomVisibility);
  }

  if (scrollToBottomBtn) {
    scrollToBottomBtn.addEventListener('click', () => {
      if (messagesViewport) {
        messagesViewport.scrollTo({ top: messagesViewport.scrollHeight, behavior: 'smooth' });
      }
      unreadScrollCount = 0;
      if (unreadScrollBadge) {
        unreadScrollBadge.classList.add('d-none');
        unreadScrollBadge.textContent = '0';
      }
    });
  }

  // ==========================================================================
  // Audio Voice Note Recorder & Sender (MediaRecorder API)
  // ==========================================================================
  const micBtn = document.getElementById('micBtn');
  const audioRecordBar = document.getElementById('audioRecordBar');
  const recordTimer = document.getElementById('recordTimer');
  const cancelRecordBtn = document.getElementById('cancelRecordBtn');
  const sendRecordBtn = document.getElementById('sendRecordBtn');

  let mediaRecorder = null;
  let audioStream = null;
  let audioChunks = [];
  let recordTimerInterval = null;
  let recordStartTime = 0;

  async function startAudioRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Microphone access is not supported on this browser.');
      return;
    }

    try {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      const options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = MediaRecorder.isTypeSupported('audio/ogg') ? 'audio/ogg' : '';
      }

      mediaRecorder = options.mimeType ? new MediaRecorder(audioStream, options) : new MediaRecorder(audioStream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };

      mediaRecorder.start(100);
      recordStartTime = Date.now();

      if (audioRecordBar) {
        audioRecordBar.classList.remove('d-none');
        audioRecordBar.classList.add('d-flex');
      }

      if (recordTimer) recordTimer.textContent = '0:00';
      clearInterval(recordTimerInterval);
      recordTimerInterval = setInterval(() => {
        const elapsedSecs = Math.floor((Date.now() - recordStartTime) / 1000);
        const mins = Math.floor(elapsedSecs / 60);
        const secs = (elapsedSecs % 60).toString().padStart(2, '0');
        if (recordTimer) recordTimer.textContent = `${mins}:${secs}`;
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      showToast('Microphone permission denied or not available');
    }
  }

  function stopAudioTracks() {
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      audioStream = null;
    }
  }

  function cancelAudioRecording() {
    clearInterval(recordTimerInterval);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    stopAudioTracks();
    audioChunks = [];
    if (audioRecordBar) {
      audioRecordBar.classList.add('d-none');
      audioRecordBar.classList.remove('d-flex');
    }
  }

  async function finishAndSendAudioRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

    clearInterval(recordTimerInterval);
    mediaRecorder.onstop = async () => {
      stopAudioTracks();
      if (audioRecordBar) {
        audioRecordBar.classList.add('d-none');
        audioRecordBar.classList.remove('d-flex');
      }

      if (audioChunks.length === 0) return;
      const mimeType = mediaRecorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
      const audioFile = new File([audioBlob], `voice-note-${Date.now()}.${ext}`, { type: mimeType });

      // Upload audio file
      showToast('Sending voice note...');
      const formData = new FormData();
      formData.append('attachments', audioFile);
      formData.append('file', audioFile);

      try {
        const uploadRes = await fetch('/api/messages/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success || !uploadData.data) {
          showToast('Failed to upload voice note');
          return;
        }

        const attachData = uploadData.data;
        // Optimistic UI for Audio Note
        const tempId = 'temp_' + Date.now();
        const optimisticMsg = {
          _id: tempId,
          conversationId: activeConversation._id,
          senderId: currentUser,
          content: '',
          attachments: [attachData],
          createdAt: new Date().toISOString(),
          isPending: true,
        };

        const emptyPlaceholder = messagesStream?.querySelector('.text-muted.small.py-5');
        if (emptyPlaceholder) messagesStream.innerHTML = '';

        appendMessageToView(optimisticMsg);
        scrollToBottom();
        updateSidebarSnippet(activeConversation._id, '🎤 Voice note');

        // Post message to server
        const sendRes = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: activeConversation._id,
            content: '',
            attachments: attachData,
          }),
        });

        const sendData = await sendRes.json();
        if (sendData.success && sendData.data) {
          const tempRow = document.querySelector(`.message-row[data-id="${tempId}"]`);
          if (tempRow) {
            tempRow.dataset.id = sendData.data._id;
            const oldTick = tempRow.querySelector(`#tick-${tempId}`);
            if (oldTick) {
              oldTick.id = `tick-${sendData.data._id}`;
              oldTick.outerHTML = getTickHtml(sendData.data, true);
            }
          }
          if (socket && socket.connected) {
            socket.emit('send_message', { conversationId: activeConversation._id, message: sendData.data });
          }
        }
      } catch (err) {
        console.error('Failed to send voice note:', err);
        showToast('Error sending voice note');
      }
    };

    mediaRecorder.stop();
  }

  if (micBtn) micBtn.addEventListener('click', startAudioRecording);
  if (cancelRecordBtn) cancelRecordBtn.addEventListener('click', cancelAudioRecording);
  if (sendRecordBtn) sendRecordBtn.addEventListener('click', finishAndSendAudioRecording);

  // ==========================================================================
  // Contact Info & Shared Media Drawer
  // ==========================================================================
  const contactInfoModalEl = document.getElementById('contactInfoModal');
  const contactInfoAvatar = document.getElementById('contactInfoAvatar');
  const contactInfoName = document.getElementById('contactInfoName');
  const contactInfoEmail = document.getElementById('contactInfoEmail');
  const contactInfoStatus = document.getElementById('contactInfoStatus');
  const contactInfoStatusDot = document.getElementById('contactInfoStatusDot');
  const contactInfoBio = document.getElementById('contactInfoBio');
  const sharedMediaGrid = document.getElementById('sharedMediaGrid');
  const sharedMediaCount = document.getElementById('sharedMediaCount');
  const contactCopyUsernameBtn = document.getElementById('contactCopyUsernameBtn');
  const contactClearChatBtn = document.getElementById('contactClearChatBtn');

  function openContactInfoModal() {
    if (!activeConversation) return;
    const isGrp = isGroupConv(activeConversation);
    const otherUser = getOtherParticipant(activeConversation);

    if (isGrp) {
      if (contactInfoAvatar) contactInfoAvatar.textContent = (activeConversation.groupName || 'GH').substring(0, 2).toUpperCase();
      if (contactInfoName) contactInfoName.textContent = activeConversation.groupName || 'Group Hub';
      if (contactInfoEmail) contactInfoEmail.textContent = `${activeConversation.participants?.length || 0} participants`;
      if (contactInfoStatus) contactInfoStatus.textContent = 'Group Hub';
      if (contactInfoStatusDot) contactInfoStatusDot.className = 'status-dot connected position-absolute bottom-0 end-0 p-2 border border-2 border-dark';
      if (contactInfoBio) contactInfoBio.textContent = activeConversation.groupDescription || 'Collaboration group hub on ChatIn.';
    } else {
      const username = otherUser?.username || 'Contact';
      const email = otherUser?.email || '';
      const isOnline = !!otherUser?.isOnline;
      if (contactInfoAvatar) contactInfoAvatar.textContent = username.substring(0, 2).toUpperCase();
      if (contactInfoName) contactInfoName.textContent = username;
      if (contactInfoEmail) contactInfoEmail.textContent = email;
      if (contactInfoStatus) contactInfoStatus.textContent = isOnline ? 'Active Now' : 'Offline';
      if (contactInfoStatusDot) {
        contactInfoStatusDot.className = `status-dot ${isOnline ? 'connected' : 'offline'} position-absolute bottom-0 end-0 p-2 border border-2 border-dark`;
        contactInfoStatusDot.style.background = isOnline ? '#22c55e' : '#6b7280';
      }
      if (contactInfoBio) contactInfoBio.textContent = otherUser?.bio || 'Hey there! I am using ChatIn.';
    }

    // Populate Shared Media from loaded DOM messages
    if (sharedMediaGrid) {
      sharedMediaGrid.innerHTML = '';
      const imgs = Array.from(document.querySelectorAll('#messagesStream img.msg-img-attachment'));
      if (imgs.length > 0) {
        if (sharedMediaCount) sharedMediaCount.textContent = `${imgs.length} photo${imgs.length > 1 ? 's' : ''}`;
        imgs.forEach((img) => {
          const thumb = document.createElement('img');
          thumb.src = img.src;
          thumb.className = 'shared-media-thumb';
          thumb.alt = 'Shared media';
          thumb.onclick = () => window.open(img.src, '_blank');
          sharedMediaGrid.appendChild(thumb);
        });
      } else {
        if (sharedMediaCount) sharedMediaCount.textContent = '0 files';
        sharedMediaGrid.innerHTML = '<div class="text-muted extra-small py-2 text-center w-100">No photos or files shared yet.</div>';
      }
    }

    const modal = getModal(contactInfoModalEl);
    if (modal) modal.show();
  }

  if (chatInfoBtn) chatInfoBtn.addEventListener('click', openContactInfoModal);

  if (contactCopyUsernameBtn) {
    contactCopyUsernameBtn.addEventListener('click', () => {
      if (!activeConversation) return;
      const otherUser = getOtherParticipant(activeConversation);
      const name = isGroupConv(activeConversation) ? activeConversation.groupName : (otherUser?.username || '');
      if (name) {
        navigator.clipboard.writeText(name).then(() => {
          showToast(`Copied ${name} to clipboard`);
        }).catch(() => {
          showToast(`Copied ${name}`);
        });
      }
    });
  }

  if (contactClearChatBtn) {
    contactClearChatBtn.addEventListener('click', async () => {
      if (!activeConversation) return;
      if (!confirm('Clear all messages in this conversation for everyone? This cannot be undone.')) return;

      try {
        const res = await fetch(`/api/messages/${activeConversation._id}/clear`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          if (messagesStream) {
            messagesStream.innerHTML = `
              <div class="text-center text-muted small py-5">
                <div class="fw-semibold mb-1">Chat history cleared</div>
                <div class="extra-small">Send a message below to restart the conversation.</div>
              </div>
            `;
          }
          localStorage.removeItem(`chatin_cached_messages_${activeConversation._id}`);
          const modal = getModal(contactInfoModalEl);
          if (modal) modal.hide();
          showToast('Chat history cleared');
          if (socket && socket.connected) {
            socket.emit('conversation_cleared', { conversationId: activeConversation._id });
          }
        } else {
          alert(data.message || 'Failed to clear chat.');
        }
      } catch (err) {
        console.error('Failed to clear chat:', err);
        alert('Network error while clearing chat.');
      }
    });
  }

  // ==========================================================================
  // Mobile Message Gestures: Swipe Left-to-Right Reply & Press-and-Hold Sheet
  // ==========================================================================
  const mobileMsgSheetBackdrop = document.getElementById('mobileMsgSheetBackdrop');
  const sheetReplyBtn = document.getElementById('sheetReplyBtn');
  const sheetCopyBtn = document.getElementById('sheetCopyBtn');
  const sheetMediaBtn = document.getElementById('sheetMediaBtn');
  const sheetDeleteBtn = document.getElementById('sheetDeleteBtn');
  const sheetCancelBtn = document.getElementById('sheetCancelBtn');
  let currentSheetMessage = null;

  function openMobileMessageActionSheet(data) {
    currentSheetMessage = data;
    if (!mobileMsgSheetBackdrop) return;

    if (sheetDeleteBtn) {
      if (data.isMine && !data.isDeleted) {
        sheetDeleteBtn.classList.remove('d-none');
      } else {
        sheetDeleteBtn.classList.add('d-none');
      }
    }

    if (sheetMediaBtn) {
      if (data.hasMedia && data.mediaUrl) {
        sheetMediaBtn.classList.remove('d-none');
      } else {
        sheetMediaBtn.classList.add('d-none');
      }
    }

    mobileMsgSheetBackdrop.classList.remove('d-none');
    void mobileMsgSheetBackdrop.offsetWidth; // Reflow for transition
    mobileMsgSheetBackdrop.classList.add('show');
  }

  function closeMobileMessageActionSheet() {
    if (!mobileMsgSheetBackdrop) return;
    mobileMsgSheetBackdrop.classList.remove('show');
    setTimeout(() => {
      mobileMsgSheetBackdrop.classList.add('d-none');
      currentSheetMessage = null;
    }, 220);
  }

  if (mobileMsgSheetBackdrop) {
    mobileMsgSheetBackdrop.addEventListener('click', (e) => {
      if (e.target === mobileMsgSheetBackdrop) {
        closeMobileMessageActionSheet();
      }
    });
  }

  if (sheetCancelBtn) {
    sheetCancelBtn.addEventListener('click', closeMobileMessageActionSheet);
  }

  // Quick reactions inside mobile action sheet
  document.querySelectorAll('.mobile-sheet-reaction-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const emoji = btn.dataset.emoji;
      if (currentSheetMessage && currentSheetMessage.id && emoji) {
        window.toggleReaction(currentSheetMessage.id, emoji);
      }
      closeMobileMessageActionSheet();
    });
  });

  if (sheetReplyBtn) {
    sheetReplyBtn.addEventListener('click', () => {
      if (currentSheetMessage) {
        window.startReplyToMessage(currentSheetMessage.id, currentSheetMessage.sender, currentSheetMessage.text);
      }
      closeMobileMessageActionSheet();
    });
  }

  if (sheetCopyBtn) {
    sheetCopyBtn.addEventListener('click', () => {
      if (currentSheetMessage && currentSheetMessage.text) {
        window.copyMessageText(currentSheetMessage.text);
      }
      closeMobileMessageActionSheet();
    });
  }

  const sheetStarBtn = document.getElementById('sheetStarBtn');
  if (sheetStarBtn) {
    sheetStarBtn.addEventListener('click', () => {
      if (currentSheetMessage && currentSheetMessage.id) {
        window.toggleStarMessage(currentSheetMessage.id);
      }
      closeMobileMessageActionSheet();
    });
  }

  const sheetPinBtn = document.getElementById('sheetPinBtn');
  if (sheetPinBtn) {
    sheetPinBtn.addEventListener('click', () => {
      if (currentSheetMessage && currentSheetMessage.id) {
        window.pinMessage(currentSheetMessage.id, currentSheetMessage.sender, currentSheetMessage.text);
      }
      closeMobileMessageActionSheet();
    });
  }

  if (sheetMediaBtn) {
    sheetMediaBtn.addEventListener('click', () => {
      if (currentSheetMessage && currentSheetMessage.mediaUrl) {
        window.open(currentSheetMessage.mediaUrl, '_blank');
      }
      closeMobileMessageActionSheet();
    });
  }

  if (sheetDeleteBtn) {
    sheetDeleteBtn.addEventListener('click', () => {
      if (currentSheetMessage && currentSheetMessage.id) {
        window.deleteMessageById(currentSheetMessage.id);
      }
      closeMobileMessageActionSheet();
    });
  }

  // Attach touch listeners to message row (Swipe Right + Long Press)
  function attachMobileMessageGestures(row, msg, senderName, contentText, isMine, isDeleted) {
    const bubble = row.querySelector('.message-bubble');
    const swipeIcon = row.querySelector('.msg-swipe-reply-icon');
    if (!bubble) return;

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isHorizontalSwipe = false;
    let isLongPressTriggered = false;
    let longPressTimer = null;
    const SWIPE_THRESHOLD = 40; // px threshold to trigger reply
    const MAX_DRAG = 55; // maximum visual drag px

    const cleanSender = escapeHtml(senderName || (isMine ? 'You' : 'User'));
    const cleanText = escapeHtml((contentText || '').replace(/['"]/g, ''));

    function onLongPress() {
      isLongPressTriggered = true;
      if (navigator.vibrate) {
        try { navigator.vibrate(25); } catch (e) {}
      }
      openMobileMessageActionSheet({
        id: msg._id,
        sender: cleanSender,
        text: cleanText,
        isMine,
        isDeleted,
        hasMedia: !!row.querySelector('.msg-img-attachment'),
        mediaUrl: row.querySelector('.msg-img-attachment')?.src || '',
      });
    }

    bubble.addEventListener('touchstart', (e) => {
      if (isDeleted || !msg._id || msg._id.toString().startsWith('temp_')) return;
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      currentX = startX;
      currentY = startY;
      isHorizontalSwipe = false;
      isLongPressTriggered = false;

      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(onLongPress, 420);

      bubble.classList.remove('snap-back');
    }, { passive: true });

    bubble.addEventListener('touchmove', (e) => {
      if (isDeleted || !msg._id) return;
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      currentX = touch.clientX;
      currentY = touch.clientY;
      const diffX = currentX - startX;
      const diffY = currentY - startY;

      // Cancel long press if finger moved
      if (Math.hypot(diffX, diffY) > 8) {
        clearTimeout(longPressTimer);
      }

      if (isLongPressTriggered) return;

      // Determine swipe direction: swipe from left to right (diffX > 0)
      if (!isHorizontalSwipe) {
        if (diffX > 10 && Math.abs(diffX) > Math.abs(diffY)) {
          isHorizontalSwipe = true;
        }
      }

      if (isHorizontalSwipe && diffX > 0) {
        if (e.cancelable) e.preventDefault();

        bubble.classList.add('swiping');
        const dragDist = Math.min(diffX * 0.55, MAX_DRAG);
        bubble.style.transform = `translateX(${dragDist}px)`;

        if (swipeIcon) {
          if (dragDist >= SWIPE_THRESHOLD) {
            swipeIcon.classList.add('ready');
            swipeIcon.style.opacity = '1';
          } else {
            swipeIcon.classList.remove('ready');
            swipeIcon.style.opacity = `${Math.min(dragDist / SWIPE_THRESHOLD, 0.9)}`;
          }
        }
      }
    }, { passive: false });

    const handleTouchEnd = () => {
      clearTimeout(longPressTimer);
      if (isLongPressTriggered) return;

      const diffX = currentX - startX;
      bubble.classList.remove('swiping');
      bubble.classList.add('snap-back');
      bubble.style.transform = 'translateX(0px)';

      if (swipeIcon) {
        swipeIcon.classList.remove('ready');
        swipeIcon.style.opacity = '0';
      }

      // If user swiped past threshold from left to right, trigger reply!
      if (isHorizontalSwipe && diffX >= SWIPE_THRESHOLD && !isDeleted) {
        if (navigator.vibrate) {
          try { navigator.vibrate(15); } catch (e) {}
        }
        window.startReplyToMessage(msg._id, cleanSender, cleanText);
      }

      isHorizontalSwipe = false;
    };

    bubble.addEventListener('touchend', handleTouchEnd);
    bubble.addEventListener('touchcancel', handleTouchEnd);
  }

  function appendMessageToView(msg, checkDate = true) {
    if (!messagesStream) return;

    // Deduplication check: if message already rendered, don't append again
    if (msg._id && document.querySelector(`.message-row[data-id="${msg._id}"]`)) {
      return;
    }

    if (checkDate) {
      const msgDate = new Date(msg.createdAt || Date.now());
      const msgDateStr = msgDate.toDateString();
      const lastRow = messagesStream.querySelector('.message-row:last-of-type');
      const lastTime = lastRow ? lastRow.dataset.time : null;
      const lastDateStr = lastTime ? new Date(lastTime).toDateString() : null;
      if (!lastDateStr || lastDateStr !== msgDateStr) {
        const sep = document.createElement('div');
        sep.className = 'chat-date-separator';
        sep.innerHTML = `<span class="date-badge">${formatDateSeparator(msg.createdAt || Date.now())}</span>`;
        messagesStream.appendChild(sep);
      }
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

    // Handle attachments (images, audio notes, docs)
    let attachmentHtml = '';
    const rawAttachments = msg.attachments ? (Array.isArray(msg.attachments) ? msg.attachments.flat() : [msg.attachments]) : [];
    if (rawAttachments.length > 0) {
      const att = rawAttachments[0];
      const fileUrl = att.url || att.fileUrl || '';
      const fileName = att.originalName || att.fileName || 'Attachment';
      const mimeType = att.mimeType || att.fileType || '';
      const isImg = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileUrl);
      const isAudio = mimeType.startsWith('audio/') || /\.(webm|mp3|wav|ogg|m4a)$/i.test(fileUrl);

      if (fileUrl) {
        if (isImg) {
          attachmentHtml = `<img src="${fileUrl}" class="msg-img-attachment" alt="${escapeHtml(fileName)}" onclick="window.open('${fileUrl}', '_blank')">`;
        } else if (isAudio) {
          attachmentHtml = `
            <div class="audio-msg-player my-1 p-2 rounded-3 bg-black bg-opacity-20 d-flex align-items-center gap-2">
              <audio src="${fileUrl}" preload="metadata" id="audio-${msg._id}"></audio>
              <button type="button" class="audio-play-btn" onclick="window.toggleAudioPlay('${msg._id}')" id="audioBtn-${msg._id}">
                <i class="bi bi-play-fill fs-5"></i>
              </button>
              <div class="flex-grow-1 overflow-hidden min-w-0">
                <div class="extra-small fw-semibold text-truncate"><i class="bi bi-mic-fill me-1"></i>Voice Note</div>
                <div class="extra-small opacity-75 font-monospace" id="audioTime-${msg._id}">0:00</div>
              </div>
            </div>
          `;
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
    const formattedHtml = isDeleted ? 'This message was deleted' : formatRichMessage(contentText);

    // Starred status
    const isStarred = typeof isMessageStarred === 'function' ? isMessageStarred(msg._id) : false;
    const starHtml = isStarred
      ? `<i class="bi bi-star-fill text-warning extra-small ms-1 msg-star-badge" title="Starred message"></i>`
      : '';

    // Quoted Reply Preview
    let replyQuoteHtml = '';
    if (msg.replyTo && typeof msg.replyTo === 'object' && !isDeleted) {
      const repSender = msg.replyTo.senderId?.username || 'User';
      const repContent = msg.replyTo.content || (msg.replyTo.attachments?.length ? 'Attachment' : 'Message');
      const repId = msg.replyTo._id ? msg.replyTo._id.toString() : '';
      replyQuoteHtml = `
        <div class="msg-reply-quote" onclick="window.scrollToMessage('${repId}')">
          <div class="quote-sender"><i class="bi bi-reply-fill me-1"></i>${escapeHtml(repSender)}</div>
          <div class="quote-text">${escapeHtml(repContent)}</div>
        </div>
      `;
    }

    // Reactions Pill Row
    let reactionsHtml = '';
    if (Array.isArray(msg.reactions) && msg.reactions.length > 0 && !isDeleted) {
      const counts = {};
      const myReactions = new Set();
      msg.reactions.forEach((r) => {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1;
        const rUserId = (r.user?._id || r.user || '').toString();
        if (rUserId === currentUserIdStr) myReactions.add(r.emoji);
      });
      const pills = Object.entries(counts).map(([emoji, count]) => {
        const hasReacted = myReactions.has(emoji);
        return `<span class="msg-reaction-pill ${hasReacted ? 'reacted' : ''}" onclick="window.toggleReaction('${msg._id}', '${emoji}')">${emoji} <span class="extra-small fw-bold">${count}</span></span>`;
      }).join('');
      reactionsHtml = `<div class="msg-reactions-row" id="reactions-${msg._id}">${pills}</div>`;
    }

    // Action Bar (Quick Reactions, Star, Pin, Reply, Copy, Delete)
    let actionsHtml = '';
    if (!isDeleted && msg._id && !msg._id.toString().startsWith('temp_')) {
      const escapedCleanText = escapeHtml((contentText || '').replace(/['"]/g, ''));
      const escapedSender = escapeHtml(senderUsername || (isMine ? 'You' : 'User'));
      actionsHtml = `
        <div class="msg-actions-bar">
          <button type="button" class="reaction-quick-btn" onclick="window.toggleReaction('${msg._id}', '👍')" title="Thumbs up"><i class="bi bi-hand-thumbs-up-fill text-warning"></i></button>
          <button type="button" class="reaction-quick-btn" onclick="window.toggleReaction('${msg._id}', '❤️')" title="Heart"><i class="bi bi-heart-fill text-danger"></i></button>
          <button type="button" class="action-icon-btn" onclick="window.startReplyToMessage('${msg._id}', '${escapedSender}', '${escapedCleanText}')" title="Reply">
            <i class="bi bi-reply-fill"></i>
          </button>
          <button type="button" class="action-icon-btn ${isStarred ? 'text-warning' : ''}" onclick="window.toggleStarMessage('${msg._id}')" title="Star message">
            <i class="bi bi-star${isStarred ? '-fill' : ''}"></i>
          </button>
          <button type="button" class="action-icon-btn" onclick="window.pinMessage('${msg._id}', '${escapedSender}', '${escapedCleanText}')" title="Pin message to top">
            <i class="bi bi-pin-angle"></i>
          </button>
          <button type="button" class="action-icon-btn" onclick="window.copyMessageText('${escapedCleanText}')" title="Copy text">
            <i class="bi bi-clipboard"></i>
          </button>
          ${isMine ? `
            <button type="button" class="action-icon-btn text-danger" onclick="window.deleteMessageById('${msg._id}')" title="Delete message">
              <i class="bi bi-trash3"></i>
            </button>
          ` : ''}
        </div>
      `;
    }

    row.innerHTML = `
      <div class="message-bubble-wrapper">
        <div class="message-bubble ${isDeleted ? 'opacity-75' : ''}">
          ${replyQuoteHtml}
          ${senderName ? `<div class="msg-sender-name">${escapeHtml(senderName)}</div>` : ''}
          ${!isDeleted ? attachmentHtml : ''}
          <span class="msg-text ${isDeleted ? 'fst-italic' : ''}">${formattedHtml}</span>
          <span class="msg-meta">
            <span class="msg-time">${time}</span>
            ${starHtml}
            ${tickHtml}
          </span>
          ${reactionsHtml}
          ${actionsHtml}
        </div>
      </div>
    `;

    // Attach mobile swipe-to-reply and press-and-hold options
    attachMobileMessageGestures(row, msg, senderName, contentText, isMine, isDeleted);

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

      // Clear input and reply bar immediately so user can continue typing without delay
      if (messageInput) messageInput.value = '';
      clearPendingAttachment();

      const replyToPayload = pendingReplyTo ? pendingReplyTo.id : null;
      cancelReply();

      if (socket && socket.connected) {
        socket.emit('stop_typing', { conversationId: activeConversation._id });
        socket.emit('typing_stop', { conversationId: activeConversation._id });
      }

      const payload = {
        conversationId: activeConversation._id,
        content: text,
        attachments: currentAttach,
        replyTo: replyToPayload,
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
      const isNearBottom = messagesViewport
        ? messagesViewport.scrollHeight - messagesViewport.scrollTop - messagesViewport.clientHeight < 160
        : true;
      if (isNearBottom) {
        scrollToBottom();
      } else {
        incrementUnreadScrollBadge();
      }
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
          syncComposerButtons();
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
    syncComposerButtons();
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

  // Native Mobile Drilldown Navigation for Settings (WhatsApp / iOS Pattern)
  const settingsModalBody = document.querySelector('.settings-modal-body');
  const settingsMobileBackBtn = document.getElementById('settingsMobileBackBtn');
  const settingsModalLabel = document.getElementById('settingsModalLabel');
  const settingsModalSub = document.getElementById('settingsModalSub');

  const resetMobileSettingsView = () => {
    if (settingsModalBody) settingsModalBody.classList.remove('mobile-in-detail');
    if (settingsMobileBackBtn) settingsMobileBackBtn.classList.add('d-none');
    if (settingsModalLabel) settingsModalLabel.textContent = 'Settings';
    if (settingsModalSub) settingsModalSub.textContent = 'Manage your account and preferences';
  };

  if (settingsMobileBackBtn) {
    settingsMobileBackBtn.addEventListener('click', resetMobileSettingsView);
  }

  if (settingsModalEl) {
    settingsModalEl.addEventListener('show.bs.modal', resetMobileSettingsView);
  }

  // Master-Detail & Mobile Drilldown Tab Switching
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

      // Native Mobile Approach: Drilldown into full detail screen with back button
      if (window.innerWidth <= 768) {
        if (settingsModalBody) settingsModalBody.classList.add('mobile-in-detail');
        if (settingsMobileBackBtn) settingsMobileBackBtn.classList.remove('d-none');
        const title = btn.getAttribute('data-settings-title') || btn.querySelector('span')?.textContent || 'Settings';
        if (settingsModalLabel) settingsModalLabel.textContent = title;
        if (settingsModalSub) settingsModalSub.textContent = 'Tap ‹ Settings to return';
      }
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
          const isNearBottom = messagesViewport
            ? messagesViewport.scrollHeight - messagesViewport.scrollTop - messagesViewport.clientHeight < 160
            : true;
          if (isNearBottom) {
            scrollToBottom();
          } else {
            incrementUnreadScrollBadge();
          }
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
