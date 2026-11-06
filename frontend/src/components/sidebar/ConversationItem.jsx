import React from 'react';
import { isToday, format } from 'date-fns';
import { Image, FileText } from 'lucide-react';
import Avatar from '../common/Avatar';
import Badge from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const ConversationItem = ({ conversation, isActive, onClick }) => {
  const { user } = useAuth();
  const { isUserOnline } = useSocket();

  const isGroup = conversation.conversationType === 'group';

  // Determine other participant in private chat
  const otherUser = isGroup
    ? null
    : conversation.participants?.find((p) => p._id !== user?._id) || conversation.participants?.[0];

  const displayName = isGroup
    ? conversation.groupName || 'Unnamed Group'
    : otherUser?.username || 'User';

  const avatarSrc = isGroup ? conversation.groupPicture : otherUser?.profilePicture;
  const isOnline = isGroup ? false : otherUser ? isUserOnline(otherUser._id) : false;

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isToday(date)) {
        return format(date, 'h:mm a');
      }
      return format(date, 'MMM d');
    } catch {
      return '';
    }
  };

  const lastMessage = conversation.lastMessage;
  const lastMessageTime = lastMessage?.createdAt || conversation.updatedAt;

  const renderLastMessage = () => {
    if (!lastMessage) return <span className="text-subtle">No messages yet</span>;

    const isOwn = lastMessage.senderId?._id === user?._id || lastMessage.senderId === user?._id;
    const prefix = isOwn ? 'You: ' : isGroup && lastMessage.senderId?.username ? `${lastMessage.senderId.username}: ` : '';

    if (lastMessage.deletedAt) {
      return <span className="fst-italic opacity-75">Message was deleted</span>;
    }

    if (lastMessage.messageType === 'system') {
      return <span className="fst-italic opacity-75">{lastMessage.content}</span>;
    }

    if (lastMessage.attachments && lastMessage.attachments.length > 0) {
      const isImg = lastMessage.attachments[0].mimeType?.startsWith('image');
      return (
        <span className="d-inline-flex align-items-center gap-1">
          {prefix}
          {isImg ? <Image size={12} className="text-primary" /> : <FileText size={12} className="text-info" />}
          <span>{isImg ? 'Photo' : 'Document'}</span>
        </span>
      );
    }

    return `${prefix}${lastMessage.content}`;
  };

  const hasUnread = conversation.unreadCount > 0;

  return (
    <div
      onClick={onClick}
      className={`conv-item ${isActive ? 'active' : ''}`}
    >
      <Avatar
        src={avatarSrc}
        name={displayName}
        size={36}
        isOnline={isOnline}
        showBadge={!isGroup}
      />

      <div className="flex-grow-1 overflow-hidden">
        <div className="d-flex align-items-baseline justify-content-between mb-0">
          <span
            className={`text-truncate ${hasUnread ? 'conv-item-unread' : 'fw-medium'}`}
            style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}
          >
            {displayName}
          </span>
          <span
            className="flex-shrink-0 ms-2 text-subtle"
            style={{ fontSize: 'var(--text-2xs)' }}
          >
            {formatTime(lastMessageTime)}
          </span>
        </div>

        <div className="d-flex align-items-center justify-content-between mt-0">
          <div
            className={`text-truncate small ${hasUnread ? 'conv-item-unread' : 'text-subtle'}`}
            style={{ fontSize: 'var(--text-xs)', maxWidth: '190px' }}
          >
            {renderLastMessage()}
          </div>
          <Badge count={conversation.unreadCount} />
        </div>
      </div>
    </div>
  );
};

export default ConversationItem;
