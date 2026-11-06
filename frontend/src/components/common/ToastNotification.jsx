import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

const ToastNotification = ({ show, message, type = 'info', onClose }) => {
  if (!show || !message) return null;

  const typeConfig = {
    success: { icon: <CheckCircle size={16} className="text-success" />, border: 'var(--status-online)' },
    error: { icon: <AlertCircle size={16} className="text-danger" />, border: 'var(--status-danger)' },
    info: { icon: <Info size={16} className="text-primary" />, border: 'var(--accent)' },
    warning: { icon: <AlertCircle size={16} className="text-warning" />, border: 'var(--status-warning)' },
  };

  const current = typeConfig[type] || typeConfig.info;

  return (
    <div
      className="position-fixed top-0 end-0 p-3"
      style={{ zIndex: 9999, animation: 'fadeIn 0.15s var(--ease-out)' }}
    >
      <div
        className="d-flex align-items-center gap-2 p-3 shadow-lg"
        style={{
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
          borderLeft: `3px solid ${current.border}`,
          borderRadius: 'var(--radius-md)',
          minWidth: '280px',
          maxWidth: '380px',
        }}
        role="alert"
      >
        <span className="flex-shrink-0">{current.icon}</span>
        <div className="flex-grow-1 small fw-medium" style={{ fontSize: '0.8125rem' }}>
          {message}
        </div>
        <button
          type="button"
          className="btn-icon p-1 flex-shrink-0"
          style={{ width: '22px', height: '22px' }}
          onClick={onClose}
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default ToastNotification;
