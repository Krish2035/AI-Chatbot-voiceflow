import React, { useState } from 'react';
import { 
  Bot, 
  User, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check
} from 'lucide-react';

export const ChatMessage = ({
  message,
  onSpeak,
  isSpeakingThisMessage,
  onStopSpeaking
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.sender === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple clean markdown formatter for safe presentation
  const renderFormattedContent = (content) => {
    if (!content) return null;

    // Split by code blocks first
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const language = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : '';
        const code = language ? lines.slice(1).join('\n') : lines.join('\n');

        return (
          <div key={index} className="chat-code-block">
            {language && (
              <div className="chat-code-header">
                {language}
              </div>
            )}
            <pre className="chat-code-pre">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Format bold, code, and line breaks
      const formattedLines = part.split('\n').map((line, lineIdx) => {
        // Bullet points
        const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
        const cleanLine = isBullet ? line.trim().slice(2) : line;

        // Process bold and inline code
        const formattedLine = cleanLine
          .split(/(\*\*.*?\*\*|`.*?`)/g)
          .map((subPart, subIdx) => {
            if (subPart.startsWith('**') && subPart.endsWith('**')) {
              return <strong key={subIdx} style={{ color: '#fff', fontWeight: 600 }}>{subPart.slice(2, -2)}</strong>;
            }
            if (subPart.startsWith('`') && subPart.endsWith('`')) {
              return (
                <code key={subIdx} className="chat-inline-code">
                  {subPart.slice(1, -1)}
                </code>
              );
            }
            return subPart;
          });

        if (isBullet) {
          return (
            <li key={lineIdx} style={{ marginLeft: '16px', marginBottom: '4px' }}>
              {formattedLine}
            </li>
          );
        }

        return (
          <React.Fragment key={lineIdx}>
            {formattedLine}
            {lineIdx < part.split('\n').length - 1 && <br />}
          </React.Fragment>
        );
      });

      return <span key={index}>{formattedLines}</span>;
    });
  };

  return (
    <div className={`chat-message-row fade-in ${isUser ? 'user-row' : 'assistant-row'}`}>
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="message-avatar assistant-avatar">
          <Bot size={17} color="#fff" />
        </div>
      )}

      {/* Message Bubble Container */}
      <div className={`message-bubble-wrapper ${isUser ? 'user-wrapper' : 'assistant-wrapper'}`}>
        {/* Bubble */}
        <div className={`message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'} ${message.isError ? 'error-bubble' : ''}`}>
          {renderFormattedContent(message.content)}
        </div>

        {/* Action Toolbar for AI responses */}
        {!isUser && (
          <div className="message-actions-toolbar">
            {/* Speak / Read Aloud Button */}
            <button
              onClick={() => {
                if (isSpeakingThisMessage) {
                  onStopSpeaking();
                } else {
                  onSpeak(message.content);
                }
              }}
              className={`message-action-btn ${isSpeakingThisMessage ? 'speaking' : ''}`}
              title={isSpeakingThisMessage ? 'Stop speaking' : 'Read aloud with AI voice'}
            >
              {isSpeakingThisMessage ? <VolumeX size={12} /> : <Volume2 size={12} />}
              <span>{isSpeakingThisMessage ? 'Stop' : 'Read Aloud'}</span>
            </button>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="message-action-btn"
              title="Copy text"
            >
              {copied ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Model Badge */}
            {message.model && (
              <span className="message-model-tag">
                {message.model}
              </span>
            )}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="message-avatar user-avatar">
          <User size={17} color="#fff" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
