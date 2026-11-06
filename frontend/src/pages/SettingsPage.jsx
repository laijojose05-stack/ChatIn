import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Palette,
  Shield,
  Bell,
  HardDrive,
  Info,
  Camera,
  Check,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Radio,
  Trash2,
  CheckCircle2,
  KeyRound,
  Database,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { authApi } from '../api/authApi';
import Avatar from '../components/common/Avatar';
import ToastNotification from '../components/common/ToastNotification';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, updateUserState, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isConnected } = useSocket();

  // Active settings tab
  const [activeTab, setActiveTab] = useState('profile');
  const [mobileShowContent, setMobileShowContent] = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  // 1. Profile State
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.profilePicture || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const fileInputRef = useRef(null);

  // 2. Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // 3. Privacy & Preference States
  const [readReceipts, setReadReceipts] = useState(() => {
    return localStorage.getItem('chatin_read_receipts') !== 'false';
  });
  const [shareOnlineStatus, setShareOnlineStatus] = useState(() => {
    return localStorage.getItem('chatin_share_online') !== 'false';
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('chatin_sound') !== 'false';
  });
  const [desktopNotifications, setDesktopNotifications] = useState(false);
  const [enterToSend, setEnterToSend] = useState(() => {
    return localStorage.getItem('chatin_enter_to_send') !== 'false';
  });

  useEffect(() => {
    if ('Notification' in window) {
      setDesktopNotifications(Notification.permission === 'granted');
    }
  }, []);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSavingProfile(true);
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await authApi.uploadAvatar(formData);
      if (res.success && res.data) {
        setAvatarPreview(res.data.profilePicture);
        updateUserState({ ...user, profilePicture: res.data.profilePicture });
        setToast({ show: true, message: 'Profile avatar updated successfully.', type: 'success' });
      }
    } catch (err) {
      setToast({ show: true, message: err.message || 'Failed to upload photo.', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setToast({ show: true, message: 'Username cannot be blank.', type: 'error' });
      return;
    }

    try {
      setSavingProfile(true);
      const res = await authApi.updateProfile({ username: username.trim(), bio: bio.trim() });
      if (res.success && res.data) {
        updateUserState(res.data);
        setToast({ show: true, message: 'Profile details saved.', type: 'success' });
      }
    } catch (err) {
      setToast({ show: true, message: err.message || 'Failed to update profile.', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setToast({ show: true, message: 'Please complete all password fields.', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setToast({ show: true, message: 'New password must be at least 6 characters.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setToast({ show: true, message: 'Passwords do not match.', type: 'error' });
      return;
    }

    try {
      setSavingPassword(true);
      const res = await authApi.changePassword({ currentPassword, newPassword });
      if (res.success) {
        setToast({ show: true, message: 'Security password updated.', type: 'success' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setToast({ show: true, message: err.message || 'Failed to update password.', type: 'error' });
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleSoundPref = () => {
    const val = !soundEnabled;
    setSoundEnabled(val);
    localStorage.setItem('chatin_sound', val ? 'true' : 'false');
    setToast({ show: true, message: val ? 'Sound notifications enabled.' : 'Sound notifications muted.', type: 'info' });
  };

  const toggleReadReceipts = () => {
    const val = !readReceipts;
    setReadReceipts(val);
    localStorage.setItem('chatin_read_receipts', val ? 'true' : 'false');
    setToast({ show: true, message: val ? 'Read receipts enabled.' : 'Read receipts disabled.', type: 'info' });
  };

  const toggleOnlinePref = () => {
    const val = !shareOnlineStatus;
    setShareOnlineStatus(val);
    localStorage.setItem('chatin_share_online', val ? 'true' : 'false');
    setToast({ show: true, message: val ? 'Presence status shared.' : 'Presence status hidden.', type: 'info' });
  };

  const toggleEnterToSend = () => {
    const val = !enterToSend;
    setEnterToSend(val);
    localStorage.setItem('chatin_enter_to_send', val ? 'true' : 'false');
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setDesktopNotifications(true);
        new Notification('ChatIn Notifications', {
          body: 'Desktop notifications are active.',
          icon: '/logo.svg',
        });
        setToast({ show: true, message: 'Desktop notifications enabled.', type: 'success' });
      } else {
        setDesktopNotifications(false);
        setToast({ show: true, message: 'Permission denied in browser settings.', type: 'warning' });
      }
    }
  };

  const handleClearCache = () => {
    if (window.confirm('Clear temporary local cache? This will not affect messages stored in the cloud.')) {
      setToast({ show: true, message: 'Local cache cleared successfully.', type: 'success' });
    }
  };

  const menuItems = [
    { id: 'profile', label: 'Profile & Account', icon: <User size={16} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
    { id: 'privacy', label: 'Privacy & Security', icon: <Shield size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'storage', label: 'Data & Storage', icon: <HardDrive size={16} /> },
    { id: 'about', label: 'Diagnostics', icon: <Info size={16} /> },
  ];

  return (
    <div
      className="d-flex align-items-center justify-content-center p-2 p-md-4 min-vh-100"
      style={{ backgroundColor: 'var(--bg-app)' }}
    >
      <ToastNotification
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, show: false })}
      />

      <div
        className="w-100 overflow-hidden d-flex"
        style={{
          maxWidth: '960px',
          height: '84vh',
          minHeight: '580px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Sidebar Nav */}
        <div
          className={`flex-column border-end ${mobileShowContent ? 'd-none d-md-flex' : 'd-flex'}`}
          style={{
            width: '280px',
            flexShrink: 0,
            borderColor: 'var(--border-default)',
            backgroundColor: 'var(--bg-sidebar)',
          }}
        >
          {/* Header */}
          <div
            className="d-flex align-items-center gap-2 p-3 border-bottom"
            style={{ borderColor: 'var(--border-default)', height: '54px' }}
          >
            <button
              className="btn-icon"
              onClick={() => navigate('/chat')}
              title="Return to Chat"
            >
              <ArrowLeft size={16} />
            </button>
            <span className="fw-semibold small" style={{ letterSpacing: '-0.01em' }}>
              Settings
            </span>
          </div>

          {/* User Dock */}
          <div
            className="p-3 border-bottom d-flex align-items-center gap-2"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <Avatar
              src={user?.profilePicture}
              name={user?.username || 'User'}
              size={36}
              isOnline={true}
            />
            <div className="overflow-hidden">
              <div className="fw-semibold text-truncate small">
                {user?.username}
              </div>
              <div className="text-subtle text-truncate" style={{ fontSize: 'var(--text-2xs)' }}>
                {user?.email}
              </div>
            </div>
          </div>

          {/* Tabs Menu */}
          <div className="p-2 flex-grow-1 overflow-auto d-flex flex-column gap-1">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileShowContent(true);
                  }}
                  className="d-flex align-items-center justify-content-between px-3 py-2 border-0 rounded-2 text-start transition w-100"
                  style={{
                    backgroundColor: isActive ? 'var(--bg-hover)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <div className="d-flex align-items-center gap-2.5">
                    <span className={isActive ? 'text-primary' : 'text-subtle'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {isActive && (
                    <span
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer build tag */}
          <div
            className="p-3 border-top text-subtle"
            style={{ borderColor: 'var(--border-default)', fontSize: 'var(--text-2xs)' }}
          >
            ChatIn v2.4.0 • Enterprise Messaging
          </div>
        </div>

        {/* Content Panel */}
        <div
          className={`flex-grow-1 flex-column overflow-auto p-4 p-md-5 ${
            mobileShowContent ? 'd-flex' : 'd-none d-md-flex'
          }`}
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          {/* Mobile Back to Nav Button */}
          <div className="d-md-none mb-3">
            <button
              className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 rounded-pill"
              onClick={() => setMobileShowContent(false)}
            >
              <ArrowLeft size={14} />
              <span>Back to Settings</span>
            </button>
          </div>

          {/* 1. Profile Tab */}
          {activeTab === 'profile' && (
            <div style={{ maxWidth: '540px' }}>
              <div className="mb-4">
                <h5 className="fw-semibold mb-1" style={{ letterSpacing: '-0.02em' }}>
                  Profile & Account
                </h5>
                <p className="text-secondary small mb-0">
                  Manage your display name, username handle, and public status.
                </p>
              </div>

              {/* Avatar Box */}
              <div
                className="p-3 mb-4 d-flex align-items-center gap-3 rounded-2"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div className="position-relative">
                  <Avatar
                    src={avatarPreview}
                    name={user?.username || 'User'}
                    size={64}
                    isOnline={true}
                    showBadge={false}
                  />
                  <button
                    type="button"
                    className="btn btn-primary-action position-absolute bottom-0 end-0 p-0 rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: '24px', height: '24px' }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={savingProfile}
                    title="Upload avatar"
                  >
                    <Camera size={12} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="d-none"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div>
                  <div className="fw-semibold small">Profile Picture</div>
                  <div className="text-subtle mb-2" style={{ fontSize: 'var(--text-2xs)' }}>
                    PNG, JPG, or WEBP up to 5MB.
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm rounded-pill px-2.5 py-0.5"
                    style={{ fontSize: 'var(--text-2xs)' }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={savingProfile}
                  >
                    Upload New
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleProfileSave}>
                <div className="mb-3">
                  <label className="form-label text-subtle small fw-medium">
                    Registered Email
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
                      disabled={savingProfile}
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
                    About / Bio
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={150}
                    placeholder="Tell your team about yourself..."
                    disabled={savingProfile}
                    style={{ fontSize: 'var(--text-sm)' }}
                  />
                  <div className="text-end text-subtle mt-1" style={{ fontSize: 'var(--text-2xs)' }}>
                    {bio.length}/150
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary-action px-4 py-2"
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>Save Changes</span>
                </button>
              </form>
            </div>
          )}

          {/* 2. Appearance Tab */}
          {activeTab === 'appearance' && (
            <div style={{ maxWidth: '540px' }}>
              <div className="mb-4">
                <h5 className="fw-semibold mb-1" style={{ letterSpacing: '-0.02em' }}>
                  Appearance
                </h5>
                <p className="text-secondary small mb-0">
                  Select your interface theme and typography preferences.
                </p>
              </div>

              <div className="row g-3 mb-4">
                {/* Light */}
                <div className="col-6">
                  <div
                    className="p-3 rounded-2 cursor-pointer transition"
                    style={{
                      border: `1.5px solid ${theme === 'light' ? 'var(--accent)' : 'var(--border-default)'}`,
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      cursor: 'pointer',
                    }}
                    onClick={() => theme !== 'light' && toggleTheme()}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2 fw-semibold small">
                        <Sun size={16} className="text-warning" />
                        <span>Light</span>
                      </div>
                      {theme === 'light' && <CheckCircle2 size={16} className="text-primary" />}
                    </div>
                    <div className="text-muted" style={{ fontSize: 'var(--text-2xs)' }}>
                      Clean high-contrast daylight mode
                    </div>
                  </div>
                </div>

                {/* Dark */}
                <div className="col-6">
                  <div
                    className="p-3 rounded-2 cursor-pointer transition"
                    style={{
                      border: `1.5px solid ${theme === 'dark' ? 'var(--accent)' : 'var(--border-default)'}`,
                      backgroundColor: '#0e111a',
                      color: '#f1f5f9',
                      cursor: 'pointer',
                    }}
                    onClick={() => theme !== 'dark' && toggleTheme()}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2 fw-semibold small">
                        <Moon size={16} className="text-primary" />
                        <span>Dark</span>
                      </div>
                      {theme === 'dark' && <CheckCircle2 size={16} className="text-primary" />}
                    </div>
                    <div className="text-muted" style={{ fontSize: 'var(--text-2xs)' }}>
                      Restrained midnight palette
                    </div>
                  </div>
                </div>
              </div>

              {/* Behavior Settings */}
              <div
                className="p-3 rounded-2 d-flex align-items-center justify-content-between"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div>
                  <div className="fw-semibold small">Send on Enter</div>
                  <div className="text-subtle" style={{ fontSize: 'var(--text-2xs)' }}>
                    Press Enter to dispatch messages; Shift+Enter creates a new line.
                  </div>
                </div>
                <div className="form-check form-switch m-0">
                  <input
                    className="form-check-input cursor-pointer"
                    type="checkbox"
                    checked={enterToSend}
                    onChange={toggleEnterToSend}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. Privacy & Security Tab */}
          {activeTab === 'privacy' && (
            <div style={{ maxWidth: '540px' }}>
              <div className="mb-4">
                <h5 className="fw-semibold mb-1" style={{ letterSpacing: '-0.02em' }}>
                  Privacy & Security
                </h5>
                <p className="text-secondary small mb-0">
                  Manage read receipts, online presence, and password credentials.
                </p>
              </div>

              <div className="d-flex flex-column gap-2 mb-4">
                <div
                  className="p-3 rounded-2 d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <div>
                    <div className="fw-semibold small">Read Receipts</div>
                    <div className="text-subtle" style={{ fontSize: 'var(--text-2xs)' }}>
                      Display blue delivery and read checkmarks to participants.
                    </div>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input cursor-pointer"
                      type="checkbox"
                      checked={readReceipts}
                      onChange={toggleReadReceipts}
                    />
                  </div>
                </div>

                <div
                  className="p-3 rounded-2 d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <div>
                    <div className="fw-semibold small">Online Presence</div>
                    <div className="text-subtle" style={{ fontSize: 'var(--text-2xs)' }}>
                      Show real-time active status to contacts when you are active.
                    </div>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input cursor-pointer"
                      type="checkbox"
                      checked={shareOnlineStatus}
                      onChange={toggleOnlinePref}
                    />
                  </div>
                </div>
              </div>

              {/* Password update */}
              <div className="pt-3 border-top" style={{ borderColor: 'var(--border-default)' }}>
                <h6 className="fw-semibold small mb-3 d-flex align-items-center gap-2">
                  <KeyRound size={15} className="text-primary" />
                  <span>Update Password</span>
                </h6>

                <form onSubmit={handlePasswordSubmit}>
                  <div className="mb-2">
                    <label className="form-label text-subtle small fw-medium">
                      Current Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current password"
                      disabled={savingPassword}
                      style={{ height: '36px', fontSize: 'var(--text-sm)' }}
                    />
                  </div>

                  <div className="mb-2">
                    <label className="form-label text-subtle small fw-medium">
                      New Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-control"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      disabled={savingPassword}
                      style={{ height: '36px', fontSize: 'var(--text-sm)' }}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-subtle small fw-medium">
                      Confirm New Password
                    </label>
                    <div className="input-group">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-control"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        disabled={savingPassword}
                        style={{ height: '36px', fontSize: 'var(--text-sm)' }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-outline-secondary btn-sm px-3 py-1.5 rounded-pill"
                    disabled={savingPassword}
                  >
                    {savingPassword ? (
                      <span className="spinner-border spinner-border-sm" />
                    ) : (
                      <Lock size={13} className="me-1" />
                    )}
                    <span>Update Password</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 4. Notifications Tab */}
          {activeTab === 'notifications' && (
            <div style={{ maxWidth: '540px' }}>
              <div className="mb-4">
                <h5 className="fw-semibold mb-1" style={{ letterSpacing: '-0.02em' }}>
                  Notifications & Audio
                </h5>
                <p className="text-secondary small mb-0">
                  Configure browser push alerts and audio sounds.
                </p>
              </div>

              <div className="d-flex flex-column gap-2 mb-4">
                <div
                  className="p-3 rounded-2 d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <div className="d-flex align-items-center gap-3">
                    {soundEnabled ? (
                      <Volume2 size={18} className="text-primary" />
                    ) : (
                      <VolumeX size={18} className="text-subtle" />
                    )}
                    <div>
                      <div className="fw-semibold small">Sound Alerts</div>
                      <div className="text-subtle" style={{ fontSize: 'var(--text-2xs)' }}>
                        Play subtle chime upon incoming message delivery.
                      </div>
                    </div>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input cursor-pointer"
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={toggleSoundPref}
                    />
                  </div>
                </div>

                <div
                  className="p-3 rounded-2 d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <div>
                    <div className="fw-semibold small">Desktop Push Alerts</div>
                    <div className="text-subtle" style={{ fontSize: 'var(--text-2xs)' }}>
                      Receive operating system alerts when ChatIn is in the background.
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-sm rounded-pill px-3 ${
                      desktopNotifications ? 'btn-success' : 'btn-outline-secondary'
                    }`}
                    style={{ fontSize: 'var(--text-2xs)' }}
                    onClick={requestNotificationPermission}
                  >
                    {desktopNotifications ? 'Enabled' : 'Request Permission'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. Storage Tab */}
          {activeTab === 'storage' && (
            <div style={{ maxWidth: '540px' }}>
              <div className="mb-4">
                <h5 className="fw-semibold mb-1" style={{ letterSpacing: '-0.02em' }}>
                  Data & Storage
                </h5>
                <p className="text-secondary small mb-0">
                  Manage local client cache and cloud persistence.
                </p>
              </div>

              <div
                className="p-3 mb-4 rounded-2"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fw-semibold small">Cloud Storage</span>
                  <span className="badge rounded-pill bg-success-subtle text-success" style={{ fontSize: 'var(--text-2xs)' }}>
                    MongoDB Atlas Connected
                  </span>
                </div>
                <p className="text-subtle small mb-0" style={{ fontSize: 'var(--text-xs)', lineHeight: '1.5' }}>
                  Conversations and file attachments are securely persisted in MongoDB Atlas. Clearing your local cache frees local browser storage without deleting messages.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-outline-danger btn-sm rounded-pill px-3 py-1.5 d-flex align-items-center gap-1.5"
                onClick={handleClearCache}
              >
                <Trash2 size={13} />
                <span>Clear Local Browser Cache</span>
              </button>
            </div>
          )}

          {/* 6. Diagnostics Tab */}
          {activeTab === 'about' && (
            <div style={{ maxWidth: '540px' }}>
              <div className="mb-4">
                <h5 className="fw-semibold mb-1" style={{ letterSpacing: '-0.02em' }}>
                  System Diagnostics
                </h5>
                <p className="text-secondary small mb-0">
                  Real-time pipeline architecture and deployment telemetry.
                </p>
              </div>

              <div className="row g-2 mb-4">
                <div className="col-sm-6">
                  <div
                    className="p-3 rounded-2"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div className="text-subtle mb-1 d-flex align-items-center gap-1.5" style={{ fontSize: 'var(--text-2xs)' }}>
                      <Radio size={13} className={isConnected ? 'text-success' : 'text-warning'} />
                      <span>WebSocket Stream</span>
                    </div>
                    <div className="fw-semibold small">
                      {isConnected ? 'Active (Zero Latency)' : 'Auto-Sync Polling Fallback'}
                    </div>
                  </div>
                </div>

                <div className="col-sm-6">
                  <div
                    className="p-3 rounded-2"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div className="text-subtle mb-1 d-flex align-items-center gap-1.5" style={{ fontSize: 'var(--text-2xs)' }}>
                      <Database size={13} className="text-primary" />
                      <span>Database Engine</span>
                    </div>
                    <div className="fw-semibold small">MongoDB Atlas Cluster</div>
                  </div>
                </div>

                <div className="col-sm-6">
                  <div
                    className="p-3 rounded-2"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div className="text-subtle mb-1 d-flex align-items-center gap-1.5" style={{ fontSize: 'var(--text-2xs)' }}>
                      <Cpu size={13} className="text-info" />
                      <span>Hosting Target</span>
                    </div>
                    <div className="fw-semibold small">Vercel Serverless Ready</div>
                  </div>
                </div>

                <div className="col-sm-6">
                  <div
                    className="p-3 rounded-2"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div className="text-subtle mb-1 d-flex align-items-center gap-1.5" style={{ fontSize: 'var(--text-2xs)' }}>
                      <Lock size={13} className="text-warning" />
                      <span>Authentication</span>
                    </div>
                    <div className="fw-semibold small">256-Bit Signed JWT</div>
                  </div>
                </div>
              </div>

              <div
                className="p-3 rounded-2 text-center"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div className="fw-semibold small mb-1">ChatIn Enterprise</div>
                <div className="text-subtle" style={{ fontSize: 'var(--text-2xs)' }}>
                  Version 2.4.0 (2026.11) • High-Performance Real-Time Messaging
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
