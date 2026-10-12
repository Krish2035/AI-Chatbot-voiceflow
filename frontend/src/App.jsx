import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatContainer from './components/ChatContainer';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import AuthModal from './components/AuthModal';
import useVoiceflow from './hooks/useVoiceflow';
import useChat from './hooks/useChat';
import usePWA from './hooks/usePWA';
import useAuth from './hooks/useAuth';
import './App.css';

export function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initialize Progressive Web App Hook
  const pwaHook = usePWA();

  // Initialize Authentication Hook (JWT + Firebase Google)
  const authHook = useAuth();

  // Initialize Voiceflow Hook (Speech recognition & Text-to-speech)
  const voiceHook = useVoiceflow({
    autoSpeak: true
  });

  // Callback when AI answers: auto speak if enabled
  const handleNewAssistantMessage = useCallback((responseText) => {
    if (voiceHook.autoSpeakEnabled && responseText) {
      voiceHook.speakText(responseText);
    }
  }, [voiceHook.autoSpeakEnabled, voiceHook.speakText]);

  // Initialize Chat & Memory Hook
  const {
    messages,
    conversationId,
    conversationsList,
    isLoading,
    provider,
    setProvider,
    selectedModel,
    setSelectedModel,
    serverHealth,
    sendMessage,
    selectConversation,
    startNewChat,
    deleteConversation,
    clearAllHistory,
    refreshConversations
  } = useChat({
    onNewAssistantMessage: handleNewAssistantMessage
  });

  // Re-fetch conversation history whenever auth state changes
  useEffect(() => {
    refreshConversations();
  }, [authHook.user, refreshConversations]);

  return (
    <div className="app-layout">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsSidebarOpen(false)} 
          aria-hidden="true"
        />
      )}

      {/* Sidebar for Persistent Memory Sessions & Search */}
      <Sidebar
        conversationsList={conversationsList}
        activeConversationId={conversationId}
        onSelectConversation={selectConversation}
        onNewChat={startNewChat}
        onDeleteConversation={deleteConversation}
        onClearAll={clearAllHistory}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        serverHealth={serverHealth}
        isInstallable={pwaHook.isInstallable}
        isInstalled={pwaHook.isInstalled}
        promptInstall={pwaHook.promptInstall}
        user={authHook.user}
        onOpenAuthModal={authHook.openAuthModal}
      />

      {/* Main Chat Interface */}
      <main className="main-content">
        {/* Top Header with Profile & Auth trigger */}
        <Header
          serverHealth={serverHealth}
          provider={provider}
          setProvider={setProvider}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          autoSpeakEnabled={voiceHook.autoSpeakEnabled}
          setAutoSpeakEnabled={voiceHook.setAutoSpeakEnabled}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isSpeaking={voiceHook.isSpeaking}
          isListening={voiceHook.isListening}
          isInstallable={pwaHook.isInstallable}
          isInstalled={pwaHook.isInstalled}
          promptInstall={pwaHook.promptInstall}
          user={authHook.user}
          onOpenAuthModal={authHook.openAuthModal}
          onLogout={authHook.logout}
        />

        {/* Home Page Guest Welcome Banner (When Not Logged In) */}
        {!authHook.user && (
          <div className="home-auth-banner">
            <div className="home-auth-banner-content">
              <div className="home-auth-banner-text">
                <span className="home-auth-pill">Sign In / Sign Up</span>
                <p className="home-auth-heading">Unlock Cloud Memory & Multi-Device Sync</p>
                <p className="home-auth-sub">
                  Continue with Google or use your email to persist multi-turn conversations.
                </p>
              </div>
              <div className="home-auth-banner-actions">
                <button
                  onClick={() => authHook.openAuthModal('signin')}
                  className="home-auth-signin-btn"
                  id="btn-home-signin"
                >
                  Sign In
                </button>
                <button
                  onClick={() => authHook.openAuthModal('signup')}
                  className="home-auth-signup-btn"
                  id="btn-home-signup"
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat & Voice Workspace */}
        <ChatContainer
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
          voiceHook={voiceHook}
          provider={provider}
          selectedModel={selectedModel}
        />
      </main>

      {/* Modern Glassmorphic Auth Modal for Sign In, Sign Up & Continue with Google */}
      <AuthModal
        isOpen={authHook.isAuthModalOpen}
        onClose={authHook.closeAuthModal}
        mode={authHook.authModalMode}
        onModeChange={authHook.setAuthModalMode}
        onLogin={authHook.login}
        onRegister={authHook.register}
        onGoogleSignIn={authHook.signInWithGoogle}
        isLoading={authHook.authActionLoading}
        error={authHook.error}
      />

      {/* PWA Floating Install Prompt & Update Alert */}
      <PWAInstallPrompt
        isInstallable={pwaHook.isInstallable}
        isInstalled={pwaHook.isInstalled}
        isIOS={pwaHook.isIOS}
        showIOSPrompt={pwaHook.showIOSPrompt}
        setShowIOSPrompt={pwaHook.setShowIOSPrompt}
        promptInstall={pwaHook.promptInstall}
        updateAvailable={pwaHook.updateAvailable}
        updateServiceWorker={pwaHook.updateServiceWorker}
      />
    </div>
  );
}

export default App;
