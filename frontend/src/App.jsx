import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ChatContainer from './components/ChatContainer';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import useVoiceflow from './hooks/useVoiceflow';
import useChat from './hooks/useChat';
import usePWA from './hooks/usePWA';
import './App.css';

export function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initialize Progressive Web App Hook
  const pwaHook = usePWA();

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
    clearAllHistory
  } = useChat({
    onNewAssistantMessage: handleNewAssistantMessage
  });

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

      {/* Sidebar for Persistent Memory Sessions */}
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
      />

      {/* Main Chat Interface */}
      <main className="main-content">
        {/* Top Header */}
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
        />

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
