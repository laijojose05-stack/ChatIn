import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Users,
  MessageSquare,
  Settings,
  Sun,
  Moon,
  LogOut,
  Bell,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import ConversationItem from './ConversationItem';
import UserSearchModal from './UserSearchModal';
import CreateGroupModal from './CreateGroupModal';
import Avatar from '../common/Avatar';
import LoadingSpinner from '../common/LoadingSpinner';

const Sidebar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    conversations,
    activeConversation,
    selectConversation,
    loadingConversations,
    startPrivateChat,
    fetchConversations,
  } = useChat();
  const { theme, toggleTheme } = useTheme();
  const { isConnected } = useSocket();

  const [filterType, setFilterType] = useState('all'); // 'all' | 'direct' | 'group' | 'unread'
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const handleSelectUser = async (targetUser) => {
    try {
      await startPrivateChat(targetUser._id);
    } catch (err) {
      console.error('Failed to open chat:', err);
    }
  };

  const handleGroupCreated = (newGroup) => {
    fetchConversations();
    selectConversation(newGroup);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Filter conversations by category and text search
  const filteredConversations = conversations.filter((c) => {
    // 1. Category filter
    if (filterType === 'direct' && c.conversationType !== 'private') return false;
    if (filterType === 'group' && c.conversationType !== 'group') return false;
    if (filterType === 'unread' && (!c.unreadCount || c.unreadCount <= 0)) return false;

    // 2. Search query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (c.conversationType === 'group') {
      return c.groupName?.toLowerCase().includes(q);
    }
    const other = c.participants?.find((p) => p._id !== user?._id);
    return other?.username?.toLowerCase().includes(q);
  });

  return (
    <aside className={`sidebar-wrapper ${activeConversation ? 'chat-open' : ''}`}>
      {/* 1. Header with Compact Branding & Actions */}
      <div className="sidebar-header">
        <div className="brand-badge">
          <img src="/logo.svg" alt="ChatIn" width={22} height={22} />
          <span>ChatIn</span>
          <span
            className="avatar-badge-dot"
            style={{
              position: 'static',
              width: '7px',
              height: '7px',
              backgroundColor: isConnected ? 'var(--status-online)' : 'var(--status-warning)',
            }}
            title={isConnected ? 'Connected to Real-time Stream' : 'Connecting...'}
          />
        </div>

        <div className="d-flex align-items-center gap-1">
          <button
            className="btn-icon"
            onClick={() => setShowSearchModal(true)}
            title="New Chat (Direct Message)"
          >
            <Plus size={18} />
          </button>
          <button
            className="btn-icon"
            onClick={() => setShowGroupModal(true)}
            title="Create Group Channel"
          >
            <Users size={17} />
          </button>
        </div>
      </div>

      {/* 2. Search Input */}
      <div className="search-box-wrapper">
        <div className="position-relative d-flex align-items-center">
          <input
            type="text"
            className="form-control"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: '2.35rem',
              height: '34px',
              fontSize: 'var(--text-xs)',
              borderRadius: 'var(--radius-sm)',
            }}
          />
          <Search
            size={14}
            className="position-absolute text-subtle"
            style={{ left: '0.8rem', pointerEvents: 'none' }}
          />
        </div>
      </div>

      {/* 3. Clearly Organized Conversation Filter Pills */}
      <div className="filter-tabs">
        <button
          className={`filter-pill ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          All
        </button>
        <button
          className={`filter-pill ${filterType === 'direct' ? 'active' : ''}`}
          onClick={() => setFilterType('direct')}
        >
          Direct
        </button>
        <button
          className={`filter-pill ${filterType === 'group' ? 'active' : ''}`}
          onClick={() => setFilterType('group')}
        >
          Groups
        </button>
        <button
          className={`filter-pill ${filterType === 'unread' ? 'active' : ''}`}
          onClick={() => setFilterType('unread')}
        >
          Unread
        </button>
      </div>

      {/* 4. Scrollable Conversation List */}
      <div className="conversations-scroll">
        {loadingConversations ? (
          <div className="p-4 text-center">
            <LoadingSpinner size="sm" text="Loading chats..." />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-subtle small my-auto">
            <MessageSquare size={28} className="mb-2 opacity-40 mx-auto d-block" />
            <p className="mb-2">No conversations found</p>
            <button
              className="btn btn-primary-action py-1 px-3 mx-auto"
              style={{ fontSize: 'var(--text-xs)' }}
              onClick={() => setShowSearchModal(true)}
            >
              Start a new chat
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <ConversationItem
              key={conv._id}
              conversation={conv}
              isActive={activeConversation?._id === conv._id}
              onClick={() => selectConversation(conv)}
            />
          ))
        )}
      </div>

      {/* 5. Bottom User Dock (Linear/Slack Style) */}
      <div className="sidebar-dock">
        <div
          className="d-flex align-items-center gap-2 cursor-pointer flex-grow-1 overflow-hidden me-2"
          onClick={() => navigate('/settings')}
          style={{ cursor: 'pointer' }}
          title="Account Settings"
        >
          <Avatar
            src={user?.profilePicture}
            name={user?.username || 'You'}
            size={30}
            isOnline={true}
          />
          <div className="overflow-hidden">
            <div className="fw-medium text-truncate" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
              {user?.username}
            </div>
            <div className="text-subtle text-truncate" style={{ fontSize: 'var(--text-2xs)' }}>
              {isConnected ? 'Online' : 'Reconnecting...'}
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-1">
          <button
            className="btn-icon"
            title="Toggle theme"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            className="btn-icon"
            title="Settings"
            onClick={() => navigate('/settings')}
          >
            <Settings size={16} />
          </button>
          <button
            className="btn-icon"
            title="Sign out"
            onClick={handleLogout}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Modals */}
      <UserSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectUser={handleSelectUser}
      />

      <CreateGroupModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onGroupCreated={handleGroupCreated}
      />
    </aside>
  );
};

export default Sidebar;
