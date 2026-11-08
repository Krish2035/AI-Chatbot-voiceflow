import React, { useState } from 'react';
import { 
  Bot, 
  Database, 
  Cpu, 
  Menu, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Radio,
  Download,
  LogIn,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Layers
} from 'lucide-react';

export const Header = ({
  serverHealth,
  provider,
  setProvider,
  selectedModel,
  setSelectedModel,
  autoSpeakEnabled,
  setAutoSpeakEnabled,
  isSidebarOpen,
  setIsSidebarOpen,
  isSpeaking,
  isListening,
  isInstallable,
  isInstalled,
  promptInstall,
  user,
  onOpenAuthModal,
  onLogout
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const isDbConnected = serverHealth?.services?.database?.connected;
  const groqCount = serverHealth?.services?.groqKeysCount || 0;
  const hfCount = serverHealth?.services?.huggingFaceKeysCount || 0;
  const tierName = serverHealth?.architecture?.tier || 'High Availability';

  return (
    <header className="header-container">
      {/* Left: Brand & Sidebar Toggle */}
      <div className="header-left">
        <button
          className="sidebar-toggle-btn"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title="Toggle Chat Memory Sidebar"
          aria-label="Toggle Sidebar"
        >
          <Menu size={19} />
        </button>

        <div className="header-brand">
          <div className="header-logo-icon">
            <Bot size={18} color="#fff" />
          </div>
          <div className="header-brand-info">
            <div className="header-title-row">
              <h1 className="header-title" title="AI Chatbot Voiceflow Vercel">
                Voiceflow AI
                <span className="sr-only"> - AI Chatbot Voiceflow on Vercel</span>
              </h1>
              <span className="header-badge-memory">
                MEMORY ACTIVE
              </span>
              <span className="header-badge-tier">
                TOP 1% BACKEND
              </span>
            </div>
            <p className="header-subtitle">
              Multi-Turn Conversational AI Assistant
            </p>
          </div>
        </div>
      </div>

      {/* Right: Controls & Badges */}
      <div className="header-right">
        {/* Model Provider Selector */}
        <div className="header-provider-group">
          <button
            onClick={() => {
              setProvider('groq');
              setSelectedModel('llama-3.3-70b-versatile');
            }}
            className={`provider-btn ${provider === 'groq' ? 'active-groq' : ''}`}
            title={`Groq Pool: ${groqCount} Key(s) Configured`}
          >
            <Sparkles size={12} className="provider-icon" />
            <span className="provider-name-desktop">Groq (Llama 3.3)</span>
            <span className="provider-name-mobile">Groq</span>
            {groqCount > 1 && (
              <span className="provider-keys-badge">
                {groqCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setProvider('huggingface');
              setSelectedModel('meta-llama/Llama-3.2-3B-Instruct');
            }}
            className={`provider-btn ${provider === 'huggingface' ? 'active-hf' : ''}`}
            title={`Hugging Face Pool: ${hfCount} Key(s) Configured`}
          >
            <Cpu size={12} className="provider-icon" />
            <span className="provider-name-desktop">Hugging Face</span>
            <span className="provider-name-mobile">HF</span>
            {hfCount > 1 && (
              <span className="provider-keys-badge">
                {hfCount}
              </span>
            )}
          </button>
        </div>

        {/* Auto Speak TTS Toggle */}
        <button
          onClick={() => setAutoSpeakEnabled(!autoSpeakEnabled)}
          className={`header-voice-btn ${autoSpeakEnabled ? 'active' : ''}`}
          title={autoSpeakEnabled ? 'Voice Output ON: AI reads answers aloud' : 'Voice Output Muted'}
          aria-label="Toggle Voice Output"
        >
          {autoSpeakEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          <span className="header-voice-label">
            {autoSpeakEnabled ? 'Voice ON' : 'Voice OFF'}
          </span>
        </button>

        {/* Install PWA Button */}
        {isInstallable && !isInstalled && (
          <button
            onClick={promptInstall}
            className="header-install-btn"
            title="Install App as PWA"
            aria-label="Install App"
          >
            <Download size={14} />
            <span className="install-label-desktop">Install App</span>
          </button>
        )}

        {/* PostgreSQL / Drizzle Memory Status Pill (Desktop only) */}
        <div 
          className="header-db-pill"
          title={isDbConnected ? 'Drizzle ORM & Postgres: Connected (Read Replicas Ready)' : 'In-Memory Engine Active'}
        >
          <Database size={13} color={isDbConnected ? 'var(--accent-emerald)' : 'var(--accent-amber)'} />
          <span>{isDbConnected ? 'Drizzle ORM' : 'Memory Store'}</span>
          <span className={`badge-dot ${isDbConnected ? 'online' : 'warning'}`} />
        </div>

        {/* Live Voice Indicator */}
        {isListening && (
          <div className="header-listening-pill animate-pulse">
            <Radio size={13} />
            <span className="listening-label">Listening...</span>
          </div>
        )}

        {/* Authentication Section (User Profile or Sign In / Sign Up Trigger) */}
        {user ? (
          <div className="header-user-menu-wrapper">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="header-user-btn"
              title={`Logged in as ${user.displayName || user.email}`}
              id="btn-header-profile"
            >
              {user.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.displayName} 
                  className="header-user-avatar-img"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="header-user-avatar-initials">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="header-user-name">
                {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
              </span>
              <ChevronDown size={13} className="header-user-chevron" />
            </button>

            {isProfileMenuOpen && (
              <div className="header-profile-dropdown animate-fade-in">
                <div className="dropdown-user-info">
                  <p className="dropdown-user-name">{user.displayName || 'Voiceflow Member'}</p>
                  <p className="dropdown-user-email">{user.email}</p>
                  <span className="dropdown-user-provider">
                    {user.authProvider === 'google' ? 'Google Account' : 'Voiceflow Account'}
                  </span>
                </div>
                <div className="dropdown-divider" />
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onLogout();
                  }}
                  className="dropdown-logout-btn"
                  id="btn-dropdown-logout"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => onOpenAuthModal('signin')}
            className="header-signin-btn"
            title="Sign In or Register with Google / Email"
            id="btn-header-signin"
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
