import React from 'react';
import { Headphones } from 'lucide-react';

export const VoiceController = ({
  voiceMode,
  setVoiceMode
}) => {
  return (
    <div className="voice-controller-bar">
      {/* Voice Mode Selector */}
      <div className="voice-mode-wrapper">
        <span className="voice-mode-label">
          Voice Mode:
        </span>
        <div className="voice-mode-toggle">
          <button
            onClick={() => setVoiceMode('push-to-talk')}
            className={`voice-mode-btn ${voiceMode === 'push-to-talk' ? 'active-ptt' : ''}`}
          >
            Push to Talk
          </button>
          <button
            onClick={() => setVoiceMode('continuous')}
            className={`voice-mode-btn ${voiceMode === 'continuous' ? 'active-cont' : ''}`}
          >
            Continuous
          </button>
        </div>
      </div>

      {/* Voice Status / Instructions Hint */}
      <div className="voice-hint-text hidden-mobile">
        {voiceMode === 'push-to-talk' ? (
          <span>Hold or click mic to speak</span>
        ) : (
          <span>Continuous dialogue enabled</span>
        )}
      </div>

      {/* Quick Status */}
      <div className="voice-tech-badge">
        <Headphones size={13} color="var(--accent-cyan)" />
        <span>Voiceflow STT/TTS</span>
      </div>
    </div>
  );
};

export default VoiceController;
