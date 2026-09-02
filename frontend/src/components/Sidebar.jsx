import React from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Clock, 
  Database, 
  X,
  Layers,
  Download
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
  promptInstall
}) => {
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

      {/* Conversations List */}
      <div className="sidebar-sessions-list">
        <div className="sidebar-section-label">
          Saved Sessions ({conversationsList.length})
        </div>

        {conversationsList.length === 0 ? (
          <div className="sidebar-empty-state">
            <Clock size={24} className="sidebar-empty-icon" />
            <p>No saved conversations yet.</p>
            <p className="sidebar-empty-sub">Start speaking or typing to save memory.</p>
          </div>
        ) : (
          conversationsList.map((conv) => {
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
            <span>{isDb ? 'PostgreSQL' : 'In-Memory Store'}</span>
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
