/**
 * Typing indicator — shown while waiting for assistant response.
 */
export default function TypingIndicator({ avatarText = 'AI' }) {
  return (
    <div className="message-wrapper assistant-wrapper" style={{ animation: 'fadeInUp 0.3s ease' }}>
      <div className="message assistant-message">
        <div className="message-avatar">
          <span className="avatar-icon">{avatarText}</span>
        </div>
        <div className="message-content">
          <div className="typing-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        </div>
      </div>
    </div>
  )
}

