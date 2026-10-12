import React, { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Clock, 
  Database, 
  X, 
  Layers, 
  Download,
  Search,
  LogIn,
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';

export const Sidebar = ({
  conversationsList = [],
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onClearAll,
  isOpen,
  onClose,
  serverHealth,
  isInstallable,
  isInstalled,
  promptInstall,
  user,
  onOpenAuthModal
}) => {
  const [searchFilter, setSearchFilter] = useState('');

  const isDb = serverHealth?.services?.database?.connected;

  const handleSelect = (id) => {
    onSelectConversation(id);
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

  const handleNew = () => {
    onNewChat();
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

  // Filter conversations by search term
  const filteredConversations = conversationsList.filter((conv) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      (conv.title && conv.title.toLowerCase().includes(term)) ||
      (conv.last_message && conv.last_message.toLowerCase().includes(term))
    );
  });

  return (
    <aside className={`sidebar-container ${isOpen ? 'open' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <Layers size={18} color="var(--accent-cyan)" />
          <h2 className="sidebar-title">
            Chat Memory
          </h2>
        </div>
        
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="sidebar-close-btn"
          title="Close Sidebar"
          aria-label="Close Sidebar"
        >
          <X size={20} />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="sidebar-new-chat-wrapper">
        <button
          onClick={handleNew}
          className="sidebar-new-btn"
        >
          <Plus size={16} />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Search Bar for Indexed Conversations & Messages */}
      <div className="sidebar-search-box">
        <Search size={14} className="sidebar-search-icon" />
        <input
          type="text"
          placeholder="Search chats & memory..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="sidebar-search-input"
          aria-label="Search conversations"
        />
        {searchFilter && (
          <button
            onClick={() => setSearchFilter('')}
            className="sidebar-search-clear"
            title="Clear search"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* User Status Card */}
      <div className="sidebar-auth-card">
        {user ? (
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} referrerPolicy="no-referrer" />
              ) : (
                <span>{(user.displayName || user.email || 'U').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="sidebar-user-details">
              <span className="sidebar-user-name">{user.displayName || 'Member'}</span>
              <span className="sidebar-user-status">Cloud Sync Active</span>
            </div>
          </div>
        ) : (
          <div className="sidebar-guest-prompt" onClick={() => onOpenAuthModal('signin')}>
            <div className="sidebar-guest-icon">
              <LogIn size={15} />
            </div>
            <div className="sidebar-guest-text">
              <span className="sidebar-guest-title">Guest Mode</span>
              <span className="sidebar-guest-subtitle">Sign in to sync memory</span>
            </div>
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="sidebar-sessions-list">
        <div className="sidebar-section-label">
          {searchFilter ? `Search Results (${filteredConversations.length})` : `Saved Sessions (${conversationsList.length})`}
        </div>

        {filteredConversations.length === 0 ? (
          <div className="sidebar-empty-state">
            <Clock size={24} className="sidebar-empty-icon" />
            <p>{searchFilter ? 'No matching conversations.' : 'No saved conversations yet.'}</p>
            <p className="sidebar-empty-sub">Start speaking or typing to save memory.</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            return (
              <div
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                className={`sidebar-session-item ${isActive ? 'active' : ''}`}
              >
                <div className="sidebar-session-main">
                  <MessageSquare
                    size={15}
                    color={isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'}
                    className="sidebar-session-icon"
                  />
                  <div className="sidebar-session-text">
                    <div className="sidebar-session-title">
                      {conv.title || 'Conversation'}
                    </div>
                    {conv.message_count !== undefined && (
                      <div className="sidebar-session-count">
                        {conv.message_count} {conv.message_count === 1 ? 'turn' : 'turns'}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this conversation from memory?')) {
                      onDeleteConversation(conv.id);
                    }
                  }}
                  className="sidebar-delete-btn"
                  title="Delete Conversation"
                  aria-label="Delete Conversation"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        {isInstallable && !isInstalled && (
          <button
            onClick={() => {
              promptInstall();
              if (window.innerWidth <= 768) {
                onClose();
              }
            }}
            className="sidebar-pwa-install-btn"
          >
            <Download size={15} />
            <span>Install Web App</span>
          </button>
        )}

        <div className="sidebar-footer-row">
          <div className="sidebar-db-status">
            <Database size={13} color={isDb ? 'var(--accent-emerald)' : 'var(--accent-amber)'} />
            <span>{isDb ? 'Drizzle & Replicas' : 'Memory Store'}</span>
          </div>
          {conversationsList.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all conversation history?')) {
                  onClearAll();
                }
              }}
              className="sidebar-clear-btn"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
