import React from 'react';

const Badge = ({ count, max = 99, className = '' }) => {
  if (!count || count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count;

  return (
    <span
      className={`badge rounded-pill ${className}`}
      style={{
        backgroundColor: 'var(--accent)',
        color: '#ffffff',
        fontSize: '0.6875rem',
        fontWeight: 600,
        padding: '0.2em 0.55em',
        minWidth: '18px',
        lineHeight: 1.2,
      }}
    >
      {displayCount}
    </span>
  );
};

export default Badge;
