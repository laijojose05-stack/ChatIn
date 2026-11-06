import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  UserMinus,
  UserPlus,
  LogOut,
  X,
  ShieldCheck,
  Check,
} from 'lucide-react';
import Avatar from '../common/Avatar';
import { conversationApi } from '../../api/conversationApi';
import { userApi } from '../../api/userApi';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import LoadingSpinner from '../common/LoadingSpinner';

const GroupInfoModal = ({
  isOpen,
  onClose,
  conversation,
  onConversationUpdated,
  onLeaveGroup,
}) => {
  const { user } = useAuth();
  const { isUserOnline } = useSocket();

  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'add'
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedToAdd, setSelectedToAdd] = useState([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = conversation?.admins?.some(
    (a) => (a._id || a).toString() === user?._id.toString()
  );

  useEffect(() => {
    if (!isOpen || activeTab !== 'add') return;
    const query = searchUserQuery.trim();
    if (!query) {
      setAvailableUsers([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await userApi.searchUsers(query);
        if (res.success && res.data) {
          const memberIds = (conversation?.participants || []).map((p) => p._id.toString());
          const nonMembers = res.data.filter((u) => !memberIds.includes(u._id.toString()));
          setAvailableUsers(nonMembers);
        }
      } catch (err) {
        setError(err.message || 'Failed to search users');
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [isOpen, activeTab, searchUserQuery, conversation]);

  if (!isOpen || !conversation) return null;

  const handleAddMembers = async () => {
    if (selectedToAdd.length === 0) return;
    try {
      setActionLoading(true);
      setError('');
      const res = await conversationApi.addParticipants(conversation._id, selectedToAdd);
      if (res.success) {
        onConversationUpdated(res.data);
        setActiveTab('members');
        setSelectedToAdd([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to add members');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      setActionLoading(true);
      const res = await conversationApi.removeParticipant(conversation._id, memberId);
      if (res.success) {
        onConversationUpdated(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to remove member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAdmin = async (targetUserId, action) => {
    try {
      setActionLoading(true);
      const res = await conversationApi.toggleAdmin(conversation._id, targetUserId, action);
      if (res.success) {
        onConversationUpdated(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to update admin role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = () => {
    if (window.confirm('Are you sure you want to leave this group?')) {
      onLeaveGroup(conversation._id);
      onClose();
    }
  };

  return (
    <div className="modal-backdrop-custom" onClick={onClose}>
      <div
        className="modal-content-custom"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div
          className="d-flex justify-content-between align-items-center p-3 border-bottom"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
            <Users size={20} className="text-primary" />
            <span>Group Info</span>
          </h5>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Group Info Profile */}
        <div className="p-3 text-center border-bottom" style={{ borderColor: 'var(--border-color)' }}>
          <Avatar
            src={conversation.groupPicture}
            name={conversation.groupName || 'Group'}
            size={72}
            showBadge={false}
            className="mb-2"
          />
          <h5 className="mb-1 fw-bold">{conversation.groupName}</h5>
          {conversation.groupDescription && (
            <p className="text-muted small mb-1">{conversation.groupDescription}</p>
          )}
          <span className="badge bg-secondary-subtle text-secondary small">
            {conversation.participants?.length || 0} Members
          </span>
        </div>

        {/* Tab Controls (Members / Add Members) */}
        {isAdmin && (
          <div className="d-flex border-bottom" style={{ borderColor: 'var(--border-color)' }}>
            <button
              className={`flex-grow-1 btn btn-sm py-2 rounded-0 border-0 ${
                activeTab === 'members' ? 'btn-primary' : 'btn-light'
              }`}
              onClick={() => setActiveTab('members')}
            >
              Members ({conversation.participants?.length || 0})
            </button>
            <button
              className={`flex-grow-1 btn btn-sm py-2 rounded-0 border-0 ${
                activeTab === 'add' ? 'btn-primary' : 'btn-light'
              }`}
              onClick={() => setActiveTab('add')}
            >
              + Add Members
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-3 overflow-auto flex-grow-1" style={{ minHeight: '220px' }}>
          {error && <div className="alert alert-danger py-1 small mb-2">{error}</div>}

          {activeTab === 'members' ? (
            <div className="d-flex flex-column gap-2">
              {conversation.participants?.map((member) => {
                const memberIsAdmin = conversation.admins?.some(
                  (a) => (a._id || a).toString() === member._id.toString()
                );
                const isCurrent = member._id.toString() === user?._id.toString();
                const isOnline = isUserOnline(member._id);

                return (
                  <div
                    key={member._id}
                    className="d-flex align-items-center justify-content-between p-2 rounded-3"
                    style={{ backgroundColor: 'var(--bg-input)' }}
                  >
                    <div className="d-flex align-items-center gap-2 overflow-hidden">
                      <Avatar
                        src={member.profilePicture}
                        name={member.username}
                        size={36}
                        isOnline={isOnline}
                      />
                      <div className="overflow-hidden">
                        <div className="d-flex align-items-center gap-1">
                          <span className="small fw-semibold text-truncate">
                            {member.username} {isCurrent && '(You)'}
                          </span>
                          {memberIsAdmin && (
                            <span className="badge bg-primary-subtle text-primary" style={{ fontSize: '0.65rem' }}>
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-muted small" style={{ fontSize: '0.72rem' }}>
                          {isOnline ? 'Online' : 'Offline'}
                        </div>
                      </div>
                    </div>

                    {/* Admin Actions on other members */}
                    {isAdmin && !isCurrent && (
                      <div className="d-flex align-items-center gap-1">
                        <button
                          className="btn btn-sm btn-outline-secondary py-0 px-2"
                          style={{ fontSize: '0.7rem' }}
                          title={memberIsAdmin ? 'Demote Admin' : 'Make Admin'}
                          onClick={() =>
                            handleToggleAdmin(
                              member._id,
                              memberIsAdmin ? 'demote' : 'promote'
                            )
                          }
                          disabled={actionLoading}
                        >
                          {memberIsAdmin ? 'Demote' : 'Make Admin'}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger py-0 px-1"
                          style={{ fontSize: '0.7rem' }}
                          title="Remove from group"
                          onClick={() => handleRemoveMember(member._id)}
                          disabled={actionLoading}
                        >
                          <UserMinus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Enter exact username to find..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  autoFocus
                />
              </div>

              {loading ? (
                <LoadingSpinner size="sm" text="Searching users..." />
              ) : !searchUserQuery.trim() ? (
                <div className="text-muted small text-center p-3">Type an exact username to find members</div>
              ) : availableUsers.length === 0 ? (
                <div className="text-muted small text-center p-3">No user found matching "{searchUserQuery}"</div>
              ) : (
                <div className="d-flex flex-column gap-1">
                  {availableUsers.map((u) => {
                    const isSelected = selectedToAdd.includes(u._id);
                    return (
                      <div
                        key={u._id}
                        onClick={() =>
                          setSelectedToAdd((prev) =>
                            isSelected ? prev.filter((id) => id !== u._id) : [...prev, u._id]
                          )
                        }
                        className="d-flex align-items-center justify-content-between p-2 rounded-3 cursor-pointer"
                        style={{
                          backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                          color: isSelected ? '#1e1b4b' : 'inherit',
                          cursor: 'pointer',
                        }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <Avatar src={u.profilePicture} name={u.username} size={32} showBadge={false} />
                          <span className="small fw-medium">{u.username}</span>
                        </div>
                        <div
                          className={`rounded-circle border d-flex align-items-center justify-content-center ${
                            isSelected ? 'bg-primary border-primary text-white' : 'border-secondary'
                          }`}
                          style={{ width: '18px', height: '18px' }}
                        >
                          {isSelected && <Check size={12} />}
                        </div>
                      </div>
                    );
                  })}
                  <button
                    className="btn btn-primary btn-sm rounded-pill mt-3 w-100"
                    onClick={handleAddMembers}
                    disabled={selectedToAdd.length === 0 || actionLoading}
                  >
                    Add Selected ({selectedToAdd.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Leave Group Button */}
        <div className="p-3 border-top" style={{ borderColor: 'var(--border-color)' }}>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm w-100 rounded-pill d-flex align-items-center justify-content-center gap-2"
            onClick={handleLeave}
          >
            <LogOut size={16} />
            <span>Leave Group</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupInfoModal;
