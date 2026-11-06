import React from 'react';

const Avatar = ({
  src,
  name = 'User',
  size = 38,
  isOnline = false,
  showBadge = true,
  className = '',
}) => {
  // Balanced palette for initial backgrounds (Linear/Slack aesthetic)
  const getGradient = (str) => {
    const palettes = [
      'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
      'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
      'linear-gradient(135deg, #059669 0%, #047857 100%)',
      'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
      'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
      'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palettes[Math.abs(hash) % palettes.length];
  };

  const initials = (name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'U';

  const backendUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  const fullSrc = src ? (src.startsWith('http') || src.startsWith('data:') ? src : `${backendUrl}${src}`) : null;

  return (
    <div
      className={`avatar-root ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
      }}
    >
      {fullSrc ? (
        <img
          src={fullSrc}
          alt={name}
          className="w-100 h-100 object-fit-cover"
          style={{ borderRadius: 'inherit' }}
          onError={(e) => {
            e.target.style.display = 'none';
            if (e.target.nextSibling) {
              e.target.nextSibling.style.display = 'flex';
            }
          }}
        />
      ) : null}
      <div
        className="d-flex align-items-center justify-content-center w-100 h-100"
        style={{
          display: fullSrc ? 'none' : 'flex',
          background: getGradient(name),
          fontSize: size * 0.38,
          borderRadius: 'inherit',
          letterSpacing: '-0.02em',
        }}
      >
        {initials}
      </div>

      {showBadge && (
        <span
          className={`avatar-badge-dot ${isOnline ? 'online' : 'offline'}`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};

export default Avatar;
