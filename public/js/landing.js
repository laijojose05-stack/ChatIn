// ChatIn Interactive Sandbox Engine
document.addEventListener('DOMContentLoaded', () => {
  const sandboxForm = document.getElementById('sandboxForm');
  const sandboxInput = document.getElementById('sandboxInput');
  const sandboxStream = document.getElementById('sandboxStream');
  const dynamicContainer = document.getElementById('dynamicSandboxMessages');
  const typingRow = document.getElementById('sandboxTypingRow');
  const typingText = document.getElementById('sandboxTypingText');
  const emojiBtn = document.getElementById('sandboxEmojiBtn');

  const simulatedResponses = [
    {
      sender: 'Kira (Design Lead)',
      avatar: 'KD',
      color: 'linear-gradient(135deg, #6366f1, #a855f7)',
      text: 'Sub-40ms round-trip confirmed! The Socket.IO pipeline delivered your message smoothly.',
    },
    {
      sender: 'Alex (Backend)',
      avatar: 'AR',
      color: 'linear-gradient(135deg, #10b981, #06b6d4)',
      text: 'Message received loud and clear! Real-time bidirectional socket stream is 100% operational.',
    },
    {
      sender: 'Kira (Design Lead)',
      avatar: 'KD',
      color: 'linear-gradient(135deg, #6366f1, #a855f7)',
      text: 'Instant delivery receipt triggered. Notice the double checkmarks update in real time!',
    },
    {
      sender: 'Alex (Backend)',
      avatar: 'AR',
      color: 'linear-gradient(135deg, #10b981, #06b6d4)',
      text: 'Ready to experience the real thing? Click "Start Messaging — It\'s Free" to launch your workspace!',
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

      // 1. Append User Message
      const userMsg = document.createElement('div');
      userMsg.className = 'sandbox-msg-row mb-3 d-flex justify-content-end';
      userMsg.innerHTML = `
        <div class="sandbox-bubble sandbox-bubble-me rounded-3 p-3 text-white">
          <div class="d-flex justify-content-between align-items-center mb-1 gap-3">
            <span class="small fw-bold opacity-75">You</span>
            <div class="d-flex align-items-center gap-1 extra-small opacity-75">
              <span>${time}</span>
              <i class="bi bi-check2-all text-info"></i>
            </div>
          </div>
          <div class="small">${escapeHtml(text)}</div>
        </div>
      `;
      dynamicContainer.appendChild(userMsg);
      sandboxInput.value = '';
      scrollSandbox();

      // 2. Show Typing Indicator
      const nextResp = simulatedResponses[responseIdx % simulatedResponses.length];
      responseIdx++;

      if (typingRow && typingText) {
        typingText.textContent = `${nextResp.sender.split(' ')[0]} is typing...`;
        typingRow.classList.remove('d-none');
        typingRow.classList.add('d-flex');
        scrollSandbox();
      }

      // 3. Delayed Simulated Reply
      setTimeout(() => {
        if (typingRow) {
          typingRow.classList.add('d-none');
          typingRow.classList.remove('d-flex');
        }

        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const replyMsg = document.createElement('div');
        replyMsg.className = 'sandbox-msg-row mb-3';
        replyMsg.innerHTML = `
          <div class="d-flex align-items-start gap-2">
            <div class="sandbox-avatar" style="background: ${nextResp.color};">${nextResp.avatar}</div>
            <div class="sandbox-bubble sandbox-bubble-other rounded-3 p-3">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="small fw-bold text-primary">${nextResp.sender}</span>
                <span class="extra-small text-muted">${replyTime}</span>
              </div>
              <div class="small">${escapeHtml(nextResp.text)}</div>
            </div>
          </div>
        `;
        dynamicContainer.appendChild(replyMsg);
        scrollSandbox();
      }, 1100);
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
