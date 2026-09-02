import React from 'react';
import { Mic, Volume2, Sparkles, Radio } from 'lucide-react';

export const VoiceVisualizer = ({
  isListening,
  isSpeaking,
  isLoading,
  audioLevel = 0,
  frequencyData = [],
  interimTranscript,
  onMicClick
}) => {
  let stateLabel = 'Ready to talk';
  let stateColor = 'var(--accent-cyan)';
  let glowShadow = 'var(--shadow-glow-cyan)';

  if (isListening) {
    stateLabel = 'Listening to your voice...';
    stateColor = 'var(--accent-rose)';
    glowShadow = 'var(--shadow-glow-pulse)';
  } else if (isLoading) {
    stateLabel = 'AI Assistant is thinking...';
    stateColor = 'var(--accent-indigo)';
    glowShadow = 'var(--shadow-glow-purple)';
  } else if (isSpeaking) {
    stateLabel = 'AI Assistant is speaking...';
    stateColor = 'var(--accent-emerald)';
    glowShadow = '0 0 35px rgba(16, 185, 129, 0.5)';
  }

  const orbScale = isListening
    ? 1 + Math.min(audioLevel * 0.7, 0.35)
    : isSpeaking
    ? 1.06
    : 1;

  return (
    <div className={`voice-visualizer-container ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}>
      {/* Waveform & Central Orb */}
      <div className="visualizer-orb-row">
        {/* Left Waveform Bars */}
        <div className="visualizer-wave-group">
          {frequencyData.slice(0, 6).map((height, i) => (
            <div
              key={`left-${i}`}
              className="sound-wave-bar"
              style={{
                height: isListening ? `${Math.max(4, height * 0.85)}px` : isSpeaking ? `${(i % 3 + 1) * 7}px` : '5px',
                background: isListening 
                  ? 'linear-gradient(180deg, #f43f5e, #fb7185)' 
                  : isSpeaking
                  ? 'linear-gradient(180deg, #10b981, #34d399)'
                  : 'rgba(255, 255, 255, 0.15)'
              }}
            />
          ))}
        </div>

        {/* Center Reactive Orb */}
        <div
          onClick={onMicClick}
          className={`visualizer-center-orb ${isListening ? 'orb-listening' : isSpeaking ? 'orb-speaking' : isLoading ? 'orb-loading' : 'orb-ready'}`}
          style={{
            transform: `scale(${orbScale})`
          }}
          title={isListening ? 'Click to Stop Listening' : 'Click to Speak'}
          aria-label="Microphone Control"
        >
          {isListening ? (
            <Radio size={22} color="#fff" />
          ) : isSpeaking ? (
            <Volume2 size={22} color="#fff" />
          ) : isLoading ? (
            <Sparkles size={22} color="#fff" className="animate-spin" />
          ) : (
            <Mic size={22} color="#fff" />
          )}
        </div>

        {/* Right Waveform Bars */}
        <div className="visualizer-wave-group">
          {frequencyData.slice(6, 12).map((height, i) => (
            <div
              key={`right-${i}`}
              className="sound-wave-bar"
              style={{
                height: isListening ? `${Math.max(4, height * 0.85)}px` : isSpeaking ? `${((5 - i) % 3 + 1) * 7}px` : '5px',
                background: isListening 
                  ? 'linear-gradient(180deg, #f43f5e, #fb7185)' 
                  : isSpeaking
                  ? 'linear-gradient(180deg, #10b981, #34d399)'
                  : 'rgba(255, 255, 255, 0.15)'
              }}
            />
          ))}
        </div>
      </div>

      {/* State Text & Live Voice Transcript */}
      <div className="visualizer-status-wrapper">
        <div className="visualizer-status-label" style={{ color: stateColor }}>
          {stateLabel}
        </div>

        {interimTranscript && (
          <p className="visualizer-transcript-text">
            "{interimTranscript}"
          </p>
        )}
      </div>
    </div>
  );
};

export default VoiceVisualizer;
