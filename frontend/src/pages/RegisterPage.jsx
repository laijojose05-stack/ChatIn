import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await register(username.trim(), email.trim(), password);
      navigate('/chat');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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
          maxWidth: '420px',
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
            Create an Account
          </h4>
          <p className="text-secondary small mb-0">
            Get started with real-time messaging
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
          {/* Username */}
          <div className="mb-3">
            <label className="form-label text-subtle small fw-medium">
              Username Handle
            </label>
            <div className="position-relative">
              <input
                type="text"
                className="form-control"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                style={{
                  height: '38px',
                  fontSize: 'var(--text-sm)',
                  paddingLeft: '2.25rem',
                }}
              />
              <User
                size={15}
                className="position-absolute text-subtle"
                style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>

          {/* Email */}
          <div className="mb-3">
            <label className="form-label text-subtle small fw-medium">
              Email Address
            </label>
            <div className="position-relative">
              <input
                type="email"
                className="form-control"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
          <div className="mb-3">
            <label className="form-label text-subtle small fw-medium">
              Password
            </label>
            <div className="position-relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="At least 6 characters"
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

          {/* Confirm Password */}
          <div className="mb-4">
            <label className="form-label text-subtle small fw-medium">
              Confirm Password
            </label>
            <div className="position-relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                style={{
                  height: '38px',
                  fontSize: 'var(--text-sm)',
                  paddingLeft: '2.25rem',
                }}
              />
              <Lock
                size={15}
                className="position-absolute text-subtle"
                style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
              />
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
                <span>Create Account</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>

          {/* Switch to Login */}
          <div className="text-center text-subtle" style={{ fontSize: 'var(--text-xs)' }}>
            Already have an account?{' '}
            <Link to="/login" className="text-primary fw-medium text-decoration-none">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
