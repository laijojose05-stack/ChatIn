import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCheck, Trash2 } from 'lucide-react';
import { notificationApi } from '../api/notificationApi';
import { useChat } from '../context/ChatContext';
import Avatar from '../components/common/Avatar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { selectConversation, conversations } = useChat();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getNotifications();
      if (res.success) {
        setNotifications(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.isRead) {
        await notificationApi.markAsRead(notif._id);
      }
      if (notif.conversationId) {
        const convId = notif.conversationId._id || notif.conversationId;
        const found = conversations.find((c) => c._id === convId);
        if (found) {
          selectConversation(found);
        }
        navigate('/chat');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex flex-column align-items-center justify-content-center p-3"
      style={{ backgroundColor: 'var(--bg-app)' }}
    >
      <div
        className="w-100 p-4 d-flex flex-column"
        style={{
          maxWidth: '520px',
          maxHeight: '84vh',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Header */}
        <div
          className="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom"
          style={{ borderColor: 'var(--border-default)' }}
        >
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn-icon"
              onClick={() => navigate('/chat')}
              title="Return to Chat"
            >
              <ArrowLeft size={16} />
            </button>
            <span className="fw-semibold small" style={{ letterSpacing: '-0.01em' }}>
              Notifications
            </span>
          </div>

          {notifications.some((n) => !n.isRead) && (
            <button
              className="btn btn-sm btn-outline-secondary rounded-pill py-1 px-2.5 d-flex align-items-center gap-1.5"
              style={{ fontSize: 'var(--text-2xs)' }}
              onClick={handleMarkAllRead}
            >
              <CheckCheck size={12} />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="overflow-auto flex-grow-1 pe-1">
          {loading ? (
            <div className="py-5 text-center">
              <LoadingSpinner size="md" text="Loading notifications..." />
            </div>
          ) : error ? (
            <div className="text-danger small text-center p-4">{error}</div>
          ) : notifications.length === 0 ? (
            <div className="text-center text-subtle p-5 small">
              <Bell size={28} className="mb-2 opacity-40 mx-auto d-block" />
              <p className="mb-0 fw-medium">You're all caught up</p>
              <span style={{ fontSize: 'var(--text-2xs)' }}>No pending notifications.</span>
            </div>
          ) : (
            notifications.map((notif) => {
              const formattedTime = notif.createdAt
                ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })
                : '';

              return (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className="d-flex align-items-center justify-content-between p-3 rounded-2 mb-2 transition"
                  style={{
                    backgroundColor: notif.isRead ? 'transparent' : 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                    cursor: 'pointer',
                  }}
                >
                  <div className="d-flex align-items-center gap-3 overflow-hidden">
                    <Avatar
                      src={notif.senderId?.profilePicture}
                      name={notif.senderId?.username || 'ChatIn'}
                      size={36}
                      showBadge={false}
                    />
                    <div className="overflow-hidden">
                      <div className="small fw-semibold text-truncate" style={{ maxWidth: '300px' }}>
                        {notif.message}
                      </div>
                      <div className="text-subtle" style={{ fontSize: 'var(--text-2xs)' }}>
                        {formattedTime}
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn-icon text-danger ms-2"
                    style={{ width: '26px', height: '26px' }}
                    onClick={(e) => handleDelete(notif._id, e)}
                    title="Dismiss"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Return */}
        <div className="pt-3 border-top mt-2" style={{ borderColor: 'var(--border-default)' }}>
          <button
            className="btn btn-outline-secondary w-100 py-1.5 rounded-pill"
            style={{ fontSize: 'var(--text-xs)' }}
            onClick={() => navigate('/chat')}
          >
            Back to Messages
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
