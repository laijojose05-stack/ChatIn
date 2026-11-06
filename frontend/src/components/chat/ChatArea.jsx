import React, { useState } from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ConversationInfoPanel from './ConversationInfoPanel';
import { useChat } from '../../context/ChatContext';

const ChatArea = () => {
  const {
    activeConversation,
    selectConversation,
    messages,
    loadingMessages,
    hasMoreMessages,
    loadMoreMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    sendTypingStatus,
    typingUsers,
    fetchConversations,
    setActiveConversation,
  } = useChat();

  const [replyingTo, setReplyingTo] = useState(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // If no conversation is selected
  if (!activeConversation) {
    return (
      <main className="chat-wrapper">
        <div className="empty-chat-state">
          <div className="empty-chat-icon">
            <MessageSquare size={38} />
          </div>
          <h4 className="fw-semibold mb-2" style={{ letterSpacing: '-0.02em' }}>
            Welcome to ChatIn
          </h4>
          <p className="text-secondary small mb-3" style={{ maxWidth: '360px', lineHeight: '1.6' }}>
            Select a conversation from the sidebar or start a new direct message or group channel.
          </p>
          <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', fontSize: 'var(--text-2xs)', color: 'var(--text-subtle)' }}>
            <Sparkles size={13} className="text-primary" />
            <span>Zero-latency real-time workspace</span>
          </div>
        </div>
      </main>
    );
  }

  const currentTypingUsers = typingUsers[activeConversation._id] || [];

  const handleLeaveGroup = async (conversationId) => {
    try {
      await fetchConversations();
      selectConversation(null);
      setIsInfoOpen(false);
    } catch (err) {
      console.error('Failed to leave group:', err);
    }
  };

  return (
    <main className={`chat-wrapper ${activeConversation ? 'chat-open' : ''}`}>
      <div className="d-flex h-100 w-100 overflow-hidden position-relative">
        {/* Main Chat Column */}
        <div className="d-flex flex-column flex-grow-1 overflow-hidden h-100 min-w-0" style={{ minWidth: 0 }}>
          {/* Header */}
          <ChatHeader
            conversation={activeConversation}
            onBack={() => selectConversation(null)}
            onToggleInfo={() => setIsInfoOpen((prev) => !prev)}
            isInfoOpen={isInfoOpen}
          />

          {/* Messages Feed */}
          <MessageList
            messages={messages}
            conversation={activeConversation}
            loading={loadingMessages}
            hasMore={hasMoreMessages}
            onLoadMore={loadMoreMessages}
            typingUsers={currentTypingUsers}
            onReply={(msg) => setReplyingTo(msg)}
            onEdit={editMessage}
            onDelete={deleteMessage}
          />

          {/* Composer */}
          <MessageInput
            onSendMessage={sendMessage}
            onTyping={sendTypingStatus}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
          />
        </div>

        {/* 3rd Pane: Conversation Details & Member Management */}
        {isInfoOpen && (
          <ConversationInfoPanel
            conversation={activeConversation}
            messages={messages}
            isOpen={isInfoOpen}
            onClose={() => setIsInfoOpen(false)}
            onConversationUpdated={(updated) => {
              setActiveConversation(updated);
              fetchConversations();
            }}
            onLeaveGroup={handleLeaveGroup}
          />
        )}
      </div>
    </main>
  );
};

export default ChatArea;
