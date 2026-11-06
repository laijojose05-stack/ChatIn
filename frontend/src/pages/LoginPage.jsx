import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailOrUsername.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(emailOrUsername.trim(), password);
      navigate('/chat');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100 p-3"
      style={{ backgroundColor: 'var(--bg-app)' }}
    >
      <div
        className="w-100 p-4 p-sm-5"
        style={{
          maxWidth: '400px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Logo and Brand */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center mb-2">
            <img src="/logo.svg" alt="ChatIn" width={52} height={52} />
          </div>
          <h4 className="fw-semibold mb-1" style={{ letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Sign in to ChatIn
          </h4>
          <p className="text-secondary small mb-0">
            Real-time messaging platform
          </p>
        </div>

        {error && (
          <div
            className="p-2.5 mb-3 rounded-2 text-danger small"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              fontSize: 'var(--text-xs)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email or Username */}
          <div className="mb-3">
            <label className="form-label text-subtle small fw-medium">
              Email or Username
            </label>
            <div className="position-relative">
              <input
                type="text"
                className="form-control"
                placeholder="handle or name@example.com"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                required
                disabled={loading}
                style={{
                  height: '38px',
                  fontSize: 'var(--text-sm)',
                  paddingLeft: '2.25rem',
                }}
              />
              <Mail
                size={15}
                className="position-absolute text-subtle"
                style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-1">
              <label className="form-label text-subtle small fw-medium mb-0">
                Password
              </label>
            </div>
            <div className="position-relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{
                  height: '38px',
                  fontSize: 'var(--text-sm)',
                  paddingLeft: '2.25rem',
                  paddingRight: '2.25rem',
                }}
              />
              <Lock
                size={15}
                className="position-absolute text-subtle"
                style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <button
                type="button"
                className="btn-icon position-absolute"
                style={{
                  right: '0.35rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '28px',
                  height: '28px',
                }}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary-action w-100 py-2 d-flex align-items-center justify-content-center gap-2 mb-3"
            disabled={loading}
            style={{ height: '38px' }}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>

          {/* Switch to Register */}
          <div className="text-center text-subtle" style={{ fontSize: 'var(--text-xs)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="text-primary fw-medium text-decoration-none">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
