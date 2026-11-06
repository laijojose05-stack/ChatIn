import React, { useState, useEffect } from 'react';
import { Search, X, MessageSquare, UserX } from 'lucide-react';
import { userApi } from '../../api/userApi';
import Avatar from '../common/Avatar';
import LoadingSpinner from '../common/LoadingSpinner';
import { useSocket } from '../../context/SocketContext';

const UserSearchModal = ({ isOpen, onClose, onSelectUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const { isUserOnline } = useSocket();

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setUsers([]);
      setError('');
      setSearchedQuery('');
      setLoading(false);
    }
  }, [isOpen]);

  const handleSearchSubmit = async (e) => {
    if (e) e.preventDefault();
    const query = searchTerm.trim().replace(/^@/, '');
    if (!query) return;

    try {
      setLoading(true);
      setError('');
      setSearchedQuery(query);
      setUsers([]);

      const res = await userApi.searchUsers(query);
      if (res.success && Array.isArray(res.data)) {
        const normalizedQuery = query.toLowerCase();
        const exactMatches = res.data.filter((u) => {
          const matchUsername = (u.username || '').toLowerCase() === normalizedQuery;
          const matchEmail = (u.email || '').toLowerCase() === normalizedQuery;
          return matchUsername || matchEmail;
        });
        setUsers(exactMatches);
      } else {
        setUsers([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to search user');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between p-3 border-bottom" style={{ borderColor: 'var(--border-default)' }}>
          <span className="fw-semibold small" style={{ letterSpacing: '-0.01em' }}>
            Start a Direct Message
          </span>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="p-3 border-bottom" style={{ borderColor: 'var(--border-default)' }}>
          <div className="d-flex gap-2">
            <div className="position-relative flex-grow-1">
              <input
                type="text"
                className="form-control"
                placeholder="Enter exact username..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (!e.target.value.trim()) {
                    setUsers([]);
                    setSearchedQuery('');
                  }
                }}
                autoFocus
                style={{ height: '36px', fontSize: 'var(--text-sm)', paddingLeft: '2rem' }}
              />
              <span className="position-absolute text-subtle" style={{ left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: 'var(--text-sm)' }}>
                @
              </span>
            </div>
            <button
              type="submit"
              className="btn btn-primary-action px-3"
              disabled={!searchTerm.trim() || loading}
            >
              <Search size={14} />
              <span>Find</span>
            </button>
          </div>
          <div className="text-subtle mt-1 ps-1" style={{ fontSize: 'var(--text-2xs)' }}>
            Enter the user's exact username to open a conversation.
          </div>
        </form>

        {/* Results Area */}
        <div className="p-3 overflow-auto" style={{ minHeight: '160px', maxHeight: '280px' }}>
          {loading ? (
            <div className="py-4 text-center">
              <LoadingSpinner size="sm" text={`Searching for exact user @${searchedQuery}...`} />
            </div>
          ) : error ? (
            <div className="text-danger small text-center p-3">{error}</div>
          ) : !searchedQuery ? (
            <div className="text-center p-4 text-subtle small">
              <Search size={24} className="mb-2 opacity-40 mx-auto d-block" />
              <p className="mb-0">Type an exact username and press Find</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center p-4 text-subtle small">
              <UserX size={24} className="mb-2 opacity-60 mx-auto d-block text-warning" />
              <p className="mb-0">No user found matching exact handle "@{searchedQuery}"</p>
            </div>
          ) : (
            users.map((targetUser) => {
              const online = isUserOnline(targetUser._id);
              return (
                <div
                  key={targetUser._id}
                  className="d-flex align-items-center justify-content-between p-2 rounded-2"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
                    <Avatar
                      src={targetUser.profilePicture}
                      name={targetUser.username}
                      size={36}
                      isOnline={online}
                    />
                    <div className="overflow-hidden">
                      <div className="fw-semibold text-truncate small">
                        @{targetUser.username}
                      </div>
                      <div className="text-subtle text-truncate" style={{ fontSize: 'var(--text-2xs)' }}>
                        {targetUser.bio || 'Available on ChatIn'}
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary-action py-1 px-3"
                    onClick={() => {
                      onSelectUser(targetUser);
                      onClose();
                    }}
                  >
                    <MessageSquare size={13} />
                    <span>Chat</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSearchModal;
