import React from 'react';
import { ArrowLeft, PanelRight, Info, Users, Phone, Video } from 'lucide-react';
import Avatar from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { formatDistanceToNow } from 'date-fns';

const ChatHeader = ({ conversation, onBack, onToggleInfo, isInfoOpen }) => {
  const { user } = useAuth();
  const { isUserOnline } = useSocket();

  if (!conversation) return null;

  const isGroup = conversation.conversationType === 'group';
  const otherUser = isGroup
    ? null
    : conversation.participants?.find((p) => p._id !== user?._id) || conversation.participants?.[0];

  const displayName = isGroup
    ? conversation.groupName || 'Unnamed Group'
    : otherUser?.username || 'User';

  const avatarSrc = isGroup ? conversation.groupPicture : otherUser?.profilePicture;
  const isOnline = isGroup ? false : otherUser ? isUserOnline(otherUser._id) : false;

  const getSubtitle = () => {
    if (isGroup) {
      return `${conversation.participants?.length || 0} members`;
    }
    if (isOnline) {
      return <span className="text-success fw-medium">Active now</span>;
    }
    if (otherUser?.lastSeen) {
      try {
        return `Last seen ${formatDistanceToNow(new Date(otherUser.lastSeen), { addSuffix: true })}`;
      } catch {
        return 'Offline';
      }
    }
    return 'Offline';
  };

  return (
    <div className="chat-header">
      <div className="d-flex align-items-center gap-3 overflow-hidden">
        {/* Mobile Back to List Button */}
        <button
          className="btn-icon d-md-none me-1 flex-shrink-0"
          onClick={onBack}
          title="Back to conversations"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Avatar & Title */}
        <div
          className="d-flex align-items-center gap-2 overflow-hidden cursor-pointer"
          onClick={onToggleInfo}
          style={{ cursor: 'pointer' }}
          title="View conversation info"
        >
          <Avatar
            src={avatarSrc}
            name={displayName}
            size={34}
            isOnline={isOnline}
            showBadge={!isGroup}
          />

          <div className="overflow-hidden">
            <h6 className="mb-0 fw-semibold text-truncate" style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
              {displayName}
            </h6>
            <div className="text-subtle text-truncate" style={{ fontSize: 'var(--text-2xs)' }}>
              {getSubtitle()}
            </div>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="d-flex align-items-center gap-1">
        <button
          className={`btn-icon ${isInfoOpen ? 'active' : ''}`}
          onClick={onToggleInfo}
          title="Toggle Details Panel"
        >
          <PanelRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
