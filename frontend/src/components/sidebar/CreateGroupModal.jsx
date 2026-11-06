import React, { useState, useEffect } from 'react';
import { Users, Camera, X, Check, Search, UserPlus } from 'lucide-react';
import { userApi } from '../../api/userApi';
import { conversationApi } from '../../api/conversationApi';
import Avatar from '../common/Avatar';
import LoadingSpinner from '../common/LoadingSpinner';
import { useSocket } from '../../context/SocketContext';

const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupPicture, setGroupPicture] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { socket } = useSocket();

  useEffect(() => {
    if (!isOpen) {
      setGroupName('');
      setGroupDescription('');
      setGroupPicture(null);
      setPreviewUrl('');
      setSelectedUserIds([]);
      setSearchFilter('');
      setError('');
      return;
    }
  }, [isOpen]);

  // Search users dynamically by username
  useEffect(() => {
    const query = searchFilter.trim();
    if (!query) return;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await userApi.searchUsers(query);
        if (res.success && res.data) {
          setAvailableUsers((prev) => {
            const existingIds = new Set(prev.map((u) => u._id));
            const fresh = res.data.filter((u) => !existingIds.has(u._id));
            return [...prev, ...fresh];
          });
        }
      } catch (err) {
        console.error('Failed to search user for group:', err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchFilter]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setGroupPicture(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const toggleSelectUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uId) => uId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError('Please provide a group name');
      return;
    }

    if (selectedUserIds.length === 0) {
      setError('Please select at least one member to add');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const formData = new FormData();
      formData.append('groupName', groupName.trim());
      formData.append('groupDescription', groupDescription.trim());
      selectedUserIds.forEach((uid) => formData.append('participants[]', uid));
      if (groupPicture) {
        formData.append('groupPicture', groupPicture);
      }

      const res = await conversationApi.createGroup(formData);
      if (res.success && res.data) {
        if (socket) {
          socket.emit('conversation_created', {
            conversation: res.data,
            participantIds: selectedUserIds,
          });
        }
        onGroupCreated(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom" style={{ borderColor: 'var(--border-default)' }}>
          <span className="fw-semibold small">Create Group Channel</span>
          <button className="btn-icon" onClick={onClose} disabled={submitting}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="d-flex flex-column flex-grow-1 overflow-hidden">
          <div className="p-3 overflow-auto flex-grow-1">
            {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

            {/* Picture & Group Name */}
            <div className="d-flex gap-3 align-items-center mb-3">
              <label
                className="position-relative d-flex align-items-center justify-content-center cursor-pointer border flex-shrink-0"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-default)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                }}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Group" className="w-100 h-100 object-fit-cover" />
                ) : (
                  <Camera size={18} className="text-subtle" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="d-none"
                  onChange={handleImageChange}
                  disabled={submitting}
                />
              </label>

              <div className="flex-grow-1">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Group Name (e.g. Design Team)"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  disabled={submitting}
                  style={{ height: '36px', fontSize: 'var(--text-sm)' }}
                />
              </div>
            </div>

            {/* Description */}
            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Description or topic (optional)"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                disabled={submitting}
                style={{ height: '34px', fontSize: 'var(--text-xs)' }}
              />
            </div>

            {/* Member Search Header */}
            <div className="mb-2">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <span className="form-label mb-0">Add Members ({selectedUserIds.length} selected)</span>
              </div>
              <div className="position-relative">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Type username to find..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{ height: '34px', fontSize: 'var(--text-xs)', paddingLeft: '1.85rem' }}
                />
                <Search size={13} className="position-absolute text-subtle" style={{ left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            {/* Member List */}
            <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
              {loading ? (
                <div className="p-3 text-center">
                  <LoadingSpinner size="sm" />
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="text-subtle small text-center p-3">
                  Type a username above to find and add members.
                </div>
              ) : (
                availableUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u._id);
                  return (
                    <div
                      key={u._id}
                      onClick={() => toggleSelectUser(u._id)}
                      className="d-flex align-items-center justify-content-between p-2 rounded-2 mb-1 cursor-pointer transition"
                      style={{
                        backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <Avatar src={u.profilePicture} name={u.username} size={28} showBadge={false} />
                        <span className="small fw-medium" style={{ fontSize: 'var(--text-sm)' }}>@{u.username}</span>
                      </div>
                      <div
                        className={`rounded-circle border d-flex align-items-center justify-content-center ${
                          isSelected ? 'bg-primary border-primary text-white' : 'border-secondary'
                        }`}
                        style={{ width: '18px', height: '18px' }}
                      >
                        {isSelected && <Check size={11} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-top d-flex justify-content-end gap-2" style={{ borderColor: 'var(--border-default)' }}>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary px-3"
              onClick={onClose}
              disabled={submitting}
              style={{ fontSize: 'var(--text-xs)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary-action px-3"
              disabled={submitting || !groupName.trim() || selectedUserIds.length === 0}
            >
              {submitting ? <span className="spinner-border spinner-border-sm" /> : <UserPlus size={14} />}
              <span>Create Channel</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
