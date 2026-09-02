import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Mic, 
  Sparkles, 
  Brain, 
  Radio
} from 'lucide-react';
import ChatMessage from './ChatMessage';
import VoiceVisualizer from './VoiceVisualizer';
import VoiceController from './VoiceController';

export const ChatContainer = ({
  messages,
  isLoading,
  onSendMessage,
  voiceHook,
  provider,
  selectedModel
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const {
    isListening,
    transcript,
    interimTranscript,
    voiceMode,
    setVoiceMode,
    startListening,
    stopListening,
    toggleListening,
    isSpeaking,
    speakText,
    stopSpeaking,
    audioLevel,
    frequencyData
  } = voiceHook;

  // Auto scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, interimTranscript]);

  // If transcript comes from voice hook, populate or auto-send in continuous mode
  useEffect(() => {
    if (transcript && transcript.trim()) {
      if (voiceMode === 'continuous') {
        onSendMessage(transcript, true);
      } else {
        setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    }
  }, [transcript, voiceMode, onSendMessage]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isLoading) return;
    onSendMessage(inputMessage.trim(), false);
    setInputMessage('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="chat-and-voice-area">
      {/* Scrollable Messages Feed */}
      <div className="messages-scroll-area">
        {messages.length === 0 ? (
          <div className="empty-chat-hero">
            <div className="empty-hero-icon-box">
              <Brain size={28} color="var(--accent-cyan)" />
            </div>

            <h2 className="empty-hero-title">
              How can I assist you today?
            </h2>
            <p className="empty-hero-sub">
              Speak using your microphone or type below. All conversation turns are stored in memory so you can ask natural follow-ups.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onSpeak={speakText}
              isSpeakingThisMessage={isSpeaking}
              onStopSpeaking={stopSpeaking}
            />
          ))
        )}

        {/* Live Interim Speech Bubble */}
        {isListening && interimTranscript && (
          <div className="chat-message-row user-row fade-in">
            <div className="message-bubble-wrapper user-wrapper">
              <div className="message-bubble user-bubble interim-bubble">
                <span className="interim-text">"{interimTranscript}"</span>
                <span className="interim-indicator">
                  <span className="badge-dot listening" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Loading / Thinking Indicator */}
        {isLoading && (
          <div className="chat-message-row assistant-row fade-in">
            <div className="message-avatar assistant-avatar">
              <Sparkles size={16} color="#fff" className="animate-spin" />
            </div>
            <div className="thinking-bubble">
              <span className="thinking-text">
                AI is thinking...
              </span>
              <span className="thinking-dots">
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span className="thinking-dot" />
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Control Dock: Voice Visualizer + Input Bar + Voice Controls */}
      <div className="bottom-control-dock">
        {/* Dynamic Voiceflow Visualizer */}
        <VoiceVisualizer
          isListening={isListening}
          isSpeaking={isSpeaking}
          isLoading={isLoading}
          audioLevel={audioLevel}
          frequencyData={frequencyData}
          interimTranscript={interimTranscript}
          onMicClick={toggleListening}
        />

        {/* Text Input & Mic Trigger Bar */}
        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? 'Listening to speech...'
                : 'Type or speak your thoughts...'
            }
            disabled={isLoading}
            className="chat-text-input"
          />

          {/* Microphone Trigger (Push to Talk / Toggle) */}
          <button
            type="button"
            onClick={toggleListening}
            className={`chat-mic-btn ${isListening ? 'active-listening' : ''}`}
            title={isListening ? 'Stop listening' : 'Speak to Voiceflow AI'}
            aria-label="Toggle Microphone"
          >
            {isListening ? <Radio size={18} /> : <Mic size={18} />}
          </button>

          {/* Send Message Button */}
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className={`chat-send-btn ${inputMessage.trim() && !isLoading ? 'can-send' : ''}`}
            title="Send Message (Enter)"
            aria-label="Send Message"
          >
            <Send size={18} />
          </button>
        </form>

        {/* Voice Mode Toolbar */}
        <VoiceController
          voiceMode={voiceMode}
          setVoiceMode={setVoiceMode}
        />
      </div>
    </div>
  );
};

export default ChatContainer;
