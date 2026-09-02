import { 
  Bot, 
  Database, 
  Cpu, 
  Menu, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Radio,
  Download
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
  promptInstall
}) => {
  const isDbConnected = serverHealth?.services?.database?.connected;
  const groqCount = serverHealth?.services?.groqKeysCount || 0;
  const hfCount = serverHealth?.services?.huggingFaceKeysCount || 0;

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
              <h1 className="header-title">
                Voiceflow AI
              </h1>
              <span className="header-badge-memory">
                MEMORY ACTIVE
              </span>
            </div>
            <p className="header-subtitle">
              Multi-Turn Conversational Assistant
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

        {/* PostgreSQL / Memory Status Pill (Desktop only) */}
        <div 
          className="header-db-pill"
          title={isDbConnected ? 'PostgreSQL Database: Connected' : 'In-Memory Store Active'}
        >
          <Database size={13} color={isDbConnected ? 'var(--accent-emerald)' : 'var(--accent-amber)'} />
          <span>{isDbConnected ? 'Postgres DB' : 'Memory Store'}</span>
          <span className={`badge-dot ${isDbConnected ? 'online' : 'warning'}`} />
        </div>

        {/* Live Voice Indicator */}
        {isListening && (
          <div className="header-listening-pill animate-pulse">
            <Radio size={13} />
            <span className="listening-label">Listening...</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
