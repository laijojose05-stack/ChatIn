import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import Avatar from '../components/common/Avatar';
import ToastNotification from '../components/common/ToastNotification';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateUserState } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.profilePicture || '');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const fileInputRef = useRef(null);

  const handleAvatarFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await authApi.uploadAvatar(formData);
      if (res.success && res.data) {
        setAvatarPreview(res.data.profilePicture);
        updateUserState({ ...user, profilePicture: res.data.profilePicture });
        setToast({ show: true, message: 'Profile picture updated successfully.', type: 'success' });
      }
    } catch (err) {
      setToast({ show: true, message: err.message || 'Failed to upload photo.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setToast({ show: true, message: 'Username cannot be empty.', type: 'error' });
      return;
    }

    try {
      setSaving(true);
      const res = await authApi.updateProfile({ username: username.trim(), bio: bio.trim() });
      if (res.success && res.data) {
        updateUserState(res.data);
        setToast({ show: true, message: 'Profile details saved.', type: 'success' });
      }
    } catch (err) {
      setToast({ show: true, message: err.message || 'Failed to update profile.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex flex-column align-items-center justify-content-center p-3"
      style={{ backgroundColor: 'var(--bg-app)' }}
    >
      <ToastNotification
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />

      <div
        className="w-100 p-4 p-md-5"
        style={{
          maxWidth: '460px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Header */}
        <div className="d-flex align-items-center gap-2 mb-4">
          <button
            className="btn-icon"
            onClick={() => navigate('/chat')}
            title="Back to Chat"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="fw-semibold small" style={{ letterSpacing: '-0.01em' }}>
            My Profile
          </span>
        </div>

        {/* Avatar Upload */}
        <div className="d-flex flex-column align-items-center mb-4">
          <div className="position-relative">
            <Avatar
              src={avatarPreview}
              name={user?.username || 'User'}
              size={76}
              isOnline={true}
              showBadge={false}
            />
            <button
              type="button"
              className="btn btn-primary-action position-absolute bottom-0 end-0 p-0 rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: '26px', height: '26px' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              title="Upload new picture"
            >
              <Camera size={13} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="d-none"
              onChange={handleAvatarFile}
            />
          </div>
          <div className="text-subtle mt-2" style={{ fontSize: 'var(--text-2xs)' }}>
            Click camera to change avatar
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSaveProfile}>
          <div className="mb-3">
            <label className="form-label text-subtle small fw-medium">
              Email Address
            </label>
            <input
              type="text"
              className="form-control"
              value={user?.email || ''}
              disabled
              style={{
                height: '36px',
                fontSize: 'var(--text-sm)',
                backgroundColor: 'var(--bg-card)',
                opacity: 0.65,
              }}
            />
          </div>

          <div className="mb-3">
            <label className="form-label text-subtle small fw-medium">
              Username Handle
            </label>
            <div className="position-relative">
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={saving}
                style={{
                  height: '36px',
                  fontSize: 'var(--text-sm)',
                  paddingLeft: '1.75rem',
                }}
              />
              <span
                className="position-absolute text-subtle"
                style={{
                  left: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                @
              </span>
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label text-subtle small fw-medium">
              About Status
            </label>
            <textarea
              className="form-control"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={150}
              placeholder="What are you working on?"
              disabled={saving}
              style={{ fontSize: 'var(--text-sm)' }}
            />
            <div className="text-end text-subtle mt-1" style={{ fontSize: 'var(--text-2xs)' }}>
              {bio.length}/150
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary-action w-100 py-2 d-flex align-items-center justify-content-center gap-2"
            disabled={saving}
            style={{ height: '36px' }}
          >
            {saving ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              <Check size={14} />
            )}
            <span>Save Profile</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
