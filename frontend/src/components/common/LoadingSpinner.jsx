import React from 'react';

const LoadingSpinner = ({ size = 'md', text = '' }) => {
  const sizeMap = {
    sm: { width: '1.25rem', height: '1.25rem' },
    md: { width: '2rem', height: '2rem' },
    lg: { width: '3rem', height: '3rem' },
  };

  return (
    <div className="d-flex flex-column align-items-center justify-content-center p-3">
      <div
        className="spinner-border text-primary"
        role="status"
        style={sizeMap[size] || sizeMap.md}
      >
        <span className="visually-hidden">Loading...</span>
      </div>
      {text && <p className="mt-2 text-muted small">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
