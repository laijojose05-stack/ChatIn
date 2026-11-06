import React, { useEffect, useRef } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import MessageItem from './MessageItem';
import LoadingSpinner from '../common/LoadingSpinner';

const MessageList = ({
  messages = [],
  conversation,
  loading,
  hasMore,
  onLoadMore,
  typingUsers = [],
  onReply,
  onEdit,
  onDelete,
}) => {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const isGroup = conversation?.conversationType === 'group';

  // Scroll to bottom on initial load or new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const formatDateDivider = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isToday(date)) return 'Today';
      if (isYesterday(date)) return 'Yesterday';
      return format(date, 'MMMM d, yyyy');
    } catch {
      return '';
    }
  };

  return (
    <div className="chat-messages-viewport" ref={containerRef}>
      {/* Load More Button */}
      {hasMore && (
        <div className="text-center my-3">
          <button
            className="btn btn-outline-secondary btn-sm px-3 py-1 rounded-pill"
            style={{ fontSize: 'var(--text-2xs)' }}
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? 'Loading older messages...' : 'Load previous messages'}
          </button>
        </div>
      )}

      {loading && messages.length === 0 && (
        <LoadingSpinner size="md" text="Loading messages..." />
      )}

      {messages.length === 0 && !loading && (
        <div className="text-center text-subtle my-auto py-5">
          <p className="mb-1 fw-medium" style={{ fontSize: 'var(--text-sm)' }}>
            No messages yet
          </p>
          <small style={{ fontSize: 'var(--text-xs)' }}>
            Send a message to start this conversation.
          </small>
        </div>
      )}

      {messages.map((message, index) => {
        // Date divider check
        const prevMessage = index > 0 ? messages[index - 1] : null;
        let showDateDivider = false;
        let dateDividerText = '';

        if (message.createdAt) {
          const currentDateStr = new Date(message.createdAt).toDateString();
          const prevDateStr = prevMessage?.createdAt
            ? new Date(prevMessage.createdAt).toDateString()
            : null;

          if (currentDateStr !== prevDateStr) {
            showDateDivider = true;
            dateDividerText = formatDateDivider(message.createdAt);
          }
        }

        // Message grouping: check if sender is same and sent within 5 minutes
        let isFirstInGroup = true;
        if (prevMessage && !showDateDivider) {
          const prevSenderId = prevMessage.senderId?._id || prevMessage.senderId;
          const currentSenderId = message.senderId?._id || message.senderId;
          const sameSender = prevSenderId === currentSenderId;

          const timeDiff =
            Math.abs(new Date(message.createdAt) - new Date(prevMessage.createdAt)) / 1000 / 60;
          if (sameSender && timeDiff < 5) {
            isFirstInGroup = false;
          }
        }

        return (
          <React.Fragment key={message._id || index}>
            {showDateDivider && dateDividerText && (
              <div className="date-separator">
                <span className="date-separator-badge">{dateDividerText}</span>
              </div>
            )}
            <MessageItem
              message={message}
              isGroup={isGroup}
              isFirstInGroup={isFirstInGroup}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </React.Fragment>
        );
      })}

      {/* Typing Indicator */}
      {typingUsers && typingUsers.length > 0 && (
        <div className="message-row incoming mt-2">
          <div
            className="message-bubble incoming py-2 px-3 d-flex align-items-center gap-2"
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            <span
              className="spinner-grow spinner-grow-sm text-primary"
              style={{ width: '6px', height: '6px' }}
            />
            <span className="text-subtle" style={{ fontSize: 'var(--text-2xs)' }}>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
