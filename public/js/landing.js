// ChatIn Interactive Engine & Live Performance Monitor
document.addEventListener('DOMContentLoaded', () => {
  const sandboxForm = document.getElementById('sandboxForm');
  const sandboxInput = document.getElementById('sandboxInput');
  const sandboxStream = document.getElementById('sandboxStream');
  const dynamicContainer = document.getElementById('dynamicSandboxMessages');
  const typingRow = document.getElementById('sandboxTypingRow');
  const typingText = document.getElementById('sandboxTypingText');
  const emojiBtn = document.getElementById('sandboxEmojiBtn');
  const livePingBadge = document.getElementById('livePingBadge');

  // 1. Real Live Server Latency Ping Measurement
  async function measureLivePing() {
    if (!livePingBadge) return;
    try {
      const t0 = performance.now();
      const res = await fetch('/api/health', { cache: 'no-store' });
      const elapsed = Math.round(performance.now() - t0);
      if (res.ok) {
        livePingBadge.innerHTML = `
          <span class="badge-pulse-dot"></span>
          <span>Engine Status: Operational • <strong class="text-success">${elapsed}ms</strong> Ping</span>
        `;
      }
    } catch (e) {
      livePingBadge.innerHTML = `
        <span class="badge-pulse-dot"></span>
        <span>Engine Status: Operational</span>
      `;
    }
  }

  measureLivePing();
  setInterval(measureLivePing, 12000);

  // 2. Interactive App Mockup Channel Switching
  document.querySelectorAll('.mockup-channel-item').forEach((item) => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.mockup-channel-item').forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
      const channelName = item.dataset.name || 'Conversation';
      const headerTitle = document.getElementById('mockupActiveTitle');
      if (headerTitle) headerTitle.textContent = channelName;
    });
  });

  // 3. Interactive Sandbox Simulated Responses
  const simulatedResponses = [
    {
      sender: 'Kira Vance (Design Lead)',
      avatar: 'KV',
      color: 'linear-gradient(135deg, #6366f1, #a855f7)',
      text: 'Sub-35ms round-trip confirmed! The WebSocket pipeline synchronized your message instantaneously.',
    },
    {
      sender: 'Alex Rivera (Backend)',
      avatar: 'AR',
      color: 'linear-gradient(135deg, #10b981, #06b6d4)',
      text: 'Message received and stored on MongoDB Atlas with salted JWT session security active.',
    },
    {
      sender: 'Kira Vance (Design Lead)',
      avatar: 'KV',
      color: 'linear-gradient(135deg, #6366f1, #a855f7)',
      text: 'Notice the double checkmarks update in real time. Full read-receipt tracking is fully operational!',
    },
    {
      sender: 'Alex Rivera (Backend)',
      avatar: 'AR',
      color: 'linear-gradient(135deg, #10b981, #06b6d4)',
      text: 'Ready to create your workspace? Click "Start Messaging — Free" to begin chatting in seconds!',
    },
  ];

  let responseIdx = 0;

  if (emojiBtn && sandboxInput) {
    const funEmojis = ['🚀', '⚡', '🔥', '✨', '👍', '❤️'];
    emojiBtn.addEventListener('click', () => {
      const rand = funEmojis[Math.floor(Math.random() * funEmojis.length)];
      sandboxInput.value += rand + ' ';
      sandboxInput.focus();
    });
  }

  if (sandboxForm && sandboxInput && dynamicContainer) {
    sandboxForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = sandboxInput.value.trim();
      if (!text) return;

      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Append User Message
      const userMsg = document.createElement('div');
      userMsg.className = 'd-flex justify-content-end';
      userMsg.innerHTML = `
        <div class="chatin-demo-bubble bubble-me p-3 rounded-4 shadow-sm">
          <div class="d-flex align-items-center justify-content-between gap-3 mb-1">
            <span class="fw-semibold small text-white-50">You</span>
            <div class="d-flex align-items-center gap-1 text-white-50" style="font-size: 0.7rem;">
              <span>${time}</span>
              <i class="bi bi-check2-all text-info"></i>
            </div>
          </div>
          <p class="mb-0 small text-white">${escapeHtml(text)}</p>
        </div>
      `;
      dynamicContainer.appendChild(userMsg);
      sandboxInput.value = '';
      scrollSandbox();

      // Show Typing Indicator
      const nextResp = simulatedResponses[responseIdx % simulatedResponses.length];
      responseIdx++;

      if (typingRow && typingText) {
        typingText.textContent = `${nextResp.sender.split(' ')[0]} is typing...`;
        typingRow.classList.remove('d-none');
        typingRow.classList.add('d-flex');
        scrollSandbox();
      }

      // Delayed Simulated Reply
      setTimeout(() => {
        if (typingRow) {
          typingRow.classList.add('d-none');
          typingRow.classList.remove('d-flex');
        }

        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const replyMsg = document.createElement('div');
        replyMsg.className = 'd-flex justify-content-start';
        replyMsg.innerHTML = `
          <div class="chatin-demo-bubble bubble-other p-3 rounded-4 shadow-sm">
            <div class="d-flex align-items-center justify-content-between gap-3 mb-1">
              <span class="fw-semibold small text-primary">${escapeHtml(nextResp.sender)}</span>
              <span class="text-muted" style="font-size: 0.7rem;">${replyTime}</span>
            </div>
            <p class="mb-0 small">${escapeHtml(nextResp.text)}</p>
          </div>
        `;
        dynamicContainer.appendChild(replyMsg);
        scrollSandbox();
      }, 950);
    });
  }

  function scrollSandbox() {
    if (sandboxStream) {
      sandboxStream.scrollTop = sandboxStream.scrollHeight;
    }
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
});
