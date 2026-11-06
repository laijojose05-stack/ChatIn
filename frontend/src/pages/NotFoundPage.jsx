import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div
      className="min-vh-100 d-flex flex-column align-items-center justify-content-center p-3 text-center"
      style={{ backgroundColor: 'var(--bg-app)' }}
    >
      <h1 className="fw-bold display-1 text-primary mb-2">404</h1>
      <h4 className="fw-semibold mb-2">Page Not Found</h4>
      <p className="text-muted small mb-4" style={{ maxWidth: '340px' }}>
        The page you are looking for doesn't exist or has been moved.
      </p>
      <button
        className="btn btn-primary rounded-pill px-4 py-2 d-flex align-items-center gap-2"
        onClick={() => navigate('/')}
      >
        <Home size={18} />
        <span>Return Home</span>
      </button>
    </div>
  );
};

export default NotFoundPage;
