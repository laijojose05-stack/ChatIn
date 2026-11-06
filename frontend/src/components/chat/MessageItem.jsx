import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Check,
  CheckCheck,
  Reply,
  Edit2,
  Trash2,
  FileText,
  Download,
  Image as ImageIcon,
} from 'lucide-react';
import Avatar from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';

const MessageItem = ({
  message,
  isGroup,
  isFirstInGroup = true,
  onReply,
  onEdit,
  onDelete,
}) => {
  const { user } = useAuth();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isOwn = message.senderId?._id === user?._id || message.senderId === user?._id;
  const isDeleted = !!message.deletedAt;
  const isSystem = message.messageType === 'system';

  const backendUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

  if (isSystem) {
    return (
      <div className="d-flex justify-content-center my-2">
        <span
          className="px-3 py-1 rounded-pill text-subtle small"
          style={{
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            fontSize: 'var(--text-2xs)',
          }}
        >
          {message.content}
        </span>
      </div>
    );
  }

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (editContent.trim()) {
      onEdit(message._id, editContent);
      setIsEditing(false);
    }
  };

  const formattedTime = message.createdAt
    ? format(new Date(message.createdAt), 'h:mm a')
    : '';

  const isRead = message.readBy && message.readBy.length > 1;
  const isDelivered = message.deliveredTo && message.deliveredTo.length > 1;

  return (
    <div
      className={`message-row ${isOwn ? 'outgoing' : 'incoming'} ${isFirstInGroup ? 'mt-2' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Sender avatar in incoming group messages (only if first in consecutive sequence) */}
      {!isOwn && (
        <div style={{ width: '28px', flexShrink: 0 }}>
          {isFirstInGroup ? (
            <Avatar
              src={message.senderId?.profilePicture}
              name={message.senderId?.username || 'User'}
              size={28}
              showBadge={false}
            />
          ) : null}
        </div>
      )}

      {/* Hover Action Toolbar (Linear Style) */}
      {showActions && !isDeleted && (
        <div className="message-action-toolbar">
          <button
            className="action-tool-btn"
            title="Reply"
            onClick={() => onReply(message)}
          >
            <Reply size={13} />
          </button>

          {isOwn && (
            <button
              className="action-tool-btn"
              title="Edit"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 size={13} />
            </button>
          )}

          {isOwn && (
            <button
              className="action-tool-btn text-danger"
              title="Delete"
              onClick={() => onDelete(message._id)}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}

      {/* Bubble Container */}
      <div className={`message-bubble ${isOwn ? 'outgoing' : 'incoming'}`}>
        {/* Sender handle in group */}
        {!isOwn && isGroup && isFirstInGroup && (
          <div
            className="fw-semibold mb-1"
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--accent)',
            }}
          >
            @{message.senderId?.username}
          </div>
        )}

        {/* Quoted Reply Preview */}
        {message.replyTo && (
          <div className="message-reply-quote">
            <span className="fw-semibold text-primary d-block" style={{ fontSize: 'var(--text-2xs)' }}>
              @{message.replyTo.senderId?.username || 'User'}
            </span>
            <span className="text-truncate d-block opacity-85" style={{ fontSize: 'var(--text-2xs)' }}>
              {message.replyTo.deletedAt ? 'Message was deleted' : message.replyTo.content || 'Attachment'}
            </span>
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="d-flex flex-column gap-1 mb-2">
            {message.attachments.map((att, idx) => {
              const fullUrl = att.url.startsWith('http') || att.url.startsWith('data:') ? att.url : `${backendUrl}${att.url}`;
              const isImage = att.mimeType?.startsWith('image');

              if (isImage) {
                return (
                  <a
                    key={idx}
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="d-block overflow-hidden"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  >
                    <img
                      src={fullUrl}
                      alt={att.originalName}
                      className="w-100 object-fit-cover"
                      style={{ maxHeight: '220px', maxWidth: '280px', borderRadius: 'inherit' }}
                    />
                  </a>
                );
              }

              return (
                <a
                  key={idx}
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={att.originalName}
                  className="attachment-preview-card"
                >
                  <FileText size={18} className="text-info flex-shrink-0" />
                  <div className="overflow-hidden flex-grow-1">
                    <div className="text-truncate fw-medium" style={{ fontSize: 'var(--text-xs)' }}>
                      {att.originalName}
                    </div>
                    <div className="opacity-75" style={{ fontSize: 'var(--text-2xs)' }}>
                      {(att.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <Download size={14} className="opacity-75 flex-shrink-0" />
                </a>
              );
            })}
          </div>
        )}

        {/* Message Content or Edit Form */}
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="mt-1">
            <input
              type="text"
              className="form-control form-control-sm mb-1 py-1 px-2"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              autoFocus
              style={{ fontSize: 'var(--text-xs)' }}
            />
            <div className="d-flex justify-content-end gap-1">
              <button
                type="button"
                className="btn btn-xs btn-outline-secondary py-0 px-2"
                style={{ fontSize: 'var(--text-2xs)' }}
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-xs btn-primary-action py-0 px-2"
                style={{ fontSize: 'var(--text-2xs)' }}
              >
                Save
              </button>
            </div>
          </form>
        ) : (
          <div
            style={{
              fontStyle: isDeleted ? 'italic' : 'normal',
              opacity: isDeleted ? 0.7 : 1,
            }}
          >
            {message.content}
          </div>
        )}

        {/* Meta: Edited, Time, Read Status */}
        <div className="message-meta">
          {message.editedAt && !isDeleted && (
            <span style={{ fontSize: '0.625rem' }}>edited</span>
          )}
          <span>{formattedTime}</span>

          {isOwn && !isDeleted && (
            <span className="d-inline-flex align-items-center">
              {isRead ? (
                <CheckCheck size={13} style={{ color: '#53bdeb' }} title="Read" />
              ) : isDelivered ? (
                <CheckCheck size={13} className="opacity-75" title="Delivered" />
              ) : (
                <Check size={13} className="opacity-75" title="Sent" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
