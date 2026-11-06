import React, { useState } from 'react';
import {
  X,
  Users,
  Shield,
  FileText,
  Image as ImageIcon,
  LogOut,
  UserMinus,
  Download,
  Calendar,
  Mail,
  Info,
} from 'lucide-react';
import Avatar from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { conversationApi } from '../../api/conversationApi';
import { format } from 'date-fns';

const ConversationInfoPanel = ({
  conversation,
  messages = [],
  isOpen,
  onClose,
  onConversationUpdated,
  onLeaveGroup,
}) => {
  const { user } = useAuth();
  const { isUserOnline } = useSocket();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'members' | 'media'

  if (!isOpen || !conversation) return null;

  const isGroup = conversation.conversationType === 'group';
  const otherUser = isGroup
    ? null
    : conversation.participants?.find((p) => p._id !== user?._id) || conversation.participants?.[0];

  const displayName = isGroup ? conversation.groupName : otherUser?.username;
  const avatarSrc = isGroup ? conversation.groupPicture : otherUser?.profilePicture;
  const isOnline = isGroup ? false : otherUser ? isUserOnline(otherUser._id) : false;

  const isAdmin = conversation.admins?.some(
    (a) => (a._id || a).toString() === user?._id.toString()
  );

  // Extract all media & document attachments from messages
  const allAttachments = messages.flatMap((m) =>
    (m.attachments || []).map((att) => ({
      ...att,
      sender: m.senderId?.username || 'User',
      createdAt: m.createdAt,
    }))
  );

  const imageAttachments = allAttachments.filter((a) => a.mimeType?.startsWith('image'));
  const docAttachments = allAttachments.filter((a) => !a.mimeType?.startsWith('image'));

  const backendUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member from the group?')) return;
    try {
      const res = await conversationApi.removeParticipant(conversation._id, memberId);
      if (res.success) {
        onConversationUpdated(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAdmin = async (targetUserId, action) => {
    try {
      const res = await conversationApi.toggleAdmin(conversation._id, targetUserId, action);
      if (res.success) {
        onConversationUpdated(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeave = () => {
    if (window.confirm('Are you sure you want to leave this group?')) {
      onLeaveGroup(conversation._id);
      onClose();
    }
  };

  return (
    <aside className="info-panel-wrapper">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between p-3 border-bottom" style={{ borderColor: 'var(--border-default)', height: '54px' }}>
        <span className="fw-semibold small">
          {isGroup ? 'Group Information' : 'Contact Details'}
        </span>
        <button className="btn-icon" onClick={onClose} title="Close panel">
          <X size={16} />
        </button>
      </div>

      {/* Main Info Hero */}
      <div className="p-4 text-center border-bottom" style={{ borderColor: 'var(--border-subtle)' }}>
        <Avatar
          src={avatarSrc}
          name={displayName}
          size={64}
          isOnline={isOnline}
          showBadge={!isGroup}
          className="mx-auto mb-2"
        />
        <h6 className="fw-bold mb-1" style={{ fontSize: 'var(--text-md)' }}>
          {displayName}
        </h6>
        <div className="text-subtle small mb-2" style={{ fontSize: 'var(--text-xs)' }}>
          {isGroup ? `${conversation.participants?.length || 0} members` : (isOnline ? 'Online' : 'Offline')}
        </div>
        {(conversation.groupDescription || otherUser?.bio) && (
          <p className="text-secondary small mb-0 px-2" style={{ fontSize: 'var(--text-xs)' }}>
            {conversation.groupDescription || otherUser?.bio}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="d-flex border-bottom" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          className={`flex-grow-1 py-2 text-center small border-0 transition ${
            activeTab === 'overview' ? 'border-bottom border-2 border-primary fw-semibold text-primary' : 'text-subtle'
          }`}
          style={{ fontSize: 'var(--text-xs)' }}
          onClick={() => setActiveTab('overview')}
        >
          Details
        </button>
        {isGroup && (
          <button
            className={`flex-grow-1 py-2 text-center small border-0 transition ${
              activeTab === 'members' ? 'border-bottom border-2 border-primary fw-semibold text-primary' : 'text-subtle'
            }`}
            style={{ fontSize: 'var(--text-xs)' }}
            onClick={() => setActiveTab('members')}
          >
            Members ({conversation.participants?.length || 0})
          </button>
        )}
        <button
          className={`flex-grow-1 py-2 text-center small border-0 transition ${
            activeTab === 'media' ? 'border-bottom border-2 border-primary fw-semibold text-primary' : 'text-subtle'
          }`}
          style={{ fontSize: 'var(--text-xs)' }}
          onClick={() => setActiveTab('media')}
        >
          Files ({allAttachments.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-grow-1 overflow-auto p-3">
        {/* Tab 1: Details */}
        {activeTab === 'overview' && (
          <div className="d-flex flex-column gap-3 small">
            <div>
              <span className="text-subtle d-block mb-1" style={{ fontSize: 'var(--text-2xs)', textTransform: 'uppercase' }}>
                Channel Type
              </span>
              <div className="fw-medium">
                {isGroup ? 'Group Conversation' : 'Direct Message (1-to-1)'}
              </div>
            </div>

            {conversation.createdAt && (
              <div>
                <span className="text-subtle d-block mb-1" style={{ fontSize: 'var(--text-2xs)', textTransform: 'uppercase' }}>
                  Created
                </span>
                <div className="fw-medium">
                  {format(new Date(conversation.createdAt), 'MMMM d, yyyy')}
                </div>
              </div>
            )}

            {!isGroup && otherUser?.email && (
              <div>
                <span className="text-subtle d-block mb-1" style={{ fontSize: 'var(--text-2xs)', textTransform: 'uppercase' }}>
                  Email
                </span>
                <div className="fw-medium">{otherUser.email}</div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Members (Group only) */}
        {activeTab === 'members' && isGroup && (
          <div className="d-flex flex-column gap-2">
            {conversation.participants?.map((member) => {
              const memberIsAdmin = conversation.admins?.some(
                (a) => (a._id || a).toString() === member._id.toString()
              );
              const isCurrent = member._id.toString() === user?._id.toString();
              const online = isUserOnline(member._id);

              return (
                <div
                  key={member._id}
                  className="d-flex align-items-center justify-content-between p-2 rounded-2"
                  style={{ backgroundColor: 'var(--bg-input)' }}
                >
                  <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
                    <Avatar
                      src={member.profilePicture}
                      name={member.username}
                      size={30}
                      isOnline={online}
                    />
                    <div className="overflow-hidden">
                      <div className="d-flex align-items-center gap-1">
                        <span className="small fw-medium text-truncate">
                          @{member.username}
                        </span>
                        {isCurrent && <span className="text-subtle small">(You)</span>}
                        {memberIsAdmin && (
                          <span className="badge bg-primary-subtle text-primary" style={{ fontSize: '0.6rem' }}>
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isAdmin && !isCurrent && (
                    <div className="d-flex align-items-center gap-1">
                      <button
                        className="btn btn-sm btn-outline-secondary py-0 px-2"
                        style={{ fontSize: '0.65rem' }}
                        onClick={() =>
                          handleToggleAdmin(
                            member._id,
                            memberIsAdmin ? 'demote' : 'promote'
                          )
                        }
                      >
                        {memberIsAdmin ? 'Demote' : 'Admin'}
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger py-0 px-1"
                        style={{ fontSize: '0.65rem' }}
                        title="Remove member"
                        onClick={() => handleRemoveMember(member._id)}
                      >
                        <UserMinus size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Media & Files */}
        {activeTab === 'media' && (
          <div>
            {allAttachments.length === 0 ? (
              <div className="text-center p-4 text-subtle small">
                No attachments shared yet in this conversation.
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {allAttachments.map((att, idx) => {
                  const fullUrl = att.url.startsWith('http') || att.url.startsWith('data:') ? att.url : `${backendUrl}${att.url}`;
                  const isImg = att.mimeType?.startsWith('image');

                  return (
                    <a
                      key={idx}
                      href={fullUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="d-flex align-items-center gap-2 p-2 rounded-2 text-decoration-none transition"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-default)',
                        color: 'inherit',
                      }}
                    >
                      {isImg ? (
                        <ImageIcon size={18} className="text-primary flex-shrink-0" />
                      ) : (
                        <FileText size={18} className="text-info flex-shrink-0" />
                      )}
                      <div className="overflow-hidden flex-grow-1">
                        <div className="text-truncate small fw-medium">{att.originalName}</div>
                        <div className="text-subtle" style={{ fontSize: 'var(--text-2xs)' }}>
                          {(att.size / 1024).toFixed(1)} KB • {att.sender}
                        </div>
                      </div>
                      <Download size={14} className="text-subtle flex-shrink-0" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {isGroup && (
        <div className="p-3 border-top mt-auto" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2 rounded-2"
            onClick={handleLeave}
          >
            <LogOut size={14} />
            <span>Leave Group</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default ConversationInfoPanel;
