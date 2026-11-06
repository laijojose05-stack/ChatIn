import React, { useState } from 'react';

const EMOJI_CATEGORIES = {
  Smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
  Gestures: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪'],
  Hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🔥', '✨', '🌟', '💥', '💯'],
  Objects: ['🎉', '🎊', '🎁', '🎈', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '💻', '📱', '📷', '☕', '🍕', '🍔', '🚀', '⭐', '☀️', '🌈', '⚡'],
};

const EmojiPicker = ({ onSelectEmoji, onClose }) => {
  const [activeTab, setActiveTab] = useState('Smileys');

  return (
    <div
      className="card shadow-lg border-0 position-absolute"
      style={{
        bottom: '65px',
        left: '10px',
        width: '320px',
        height: '280px',
        zIndex: 1000,
        backgroundColor: 'var(--bg-card)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
      }}
    >
      {/* Category Tabs */}
      <div
        className="d-flex justify-content-around p-2 border-bottom"
        style={{ borderColor: 'var(--border-color)' }}
      >
        {Object.keys(EMOJI_CATEGORIES).map((cat) => (
          <button
            key={cat}
            className={`btn btn-sm ${
              activeTab === cat ? 'btn-primary' : 'btn-outline-secondary'
            } rounded-pill py-0 px-2`}
            style={{ fontSize: '0.75rem' }}
            onClick={() => setActiveTab(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Emojis Grid */}
      <div
        className="p-2 overflow-auto d-flex flex-wrap gap-2 justify-content-start"
        style={{ height: 'calc(100% - 45px)' }}
      >
        {EMOJI_CATEGORIES[activeTab].map((emoji, idx) => (
          <button
            key={idx}
            className="btn btn-link p-1 text-decoration-none"
            style={{ fontSize: '1.4rem', lineHeight: 1 }}
            onClick={() => onSelectEmoji(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
