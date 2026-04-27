/**
 * Intent badge component — shows the detected intent category.
 */
function IntentBadge({ intent }) {
  const map = {
    PRODUCT: { emoji: '🛍️', color: '#e85d3a' },
    DETAILS: { emoji: '🔍', color: '#7b68ae' },
    FABRIC: { emoji: '🧵', color: '#7b68ae' },
    POLICY: { emoji: '📋', color: '#5b8fb9' },
    GREETING: { emoji: '👋', color: '#6db5a0' },
    About_brand: { emoji: '💡', color: '#e8a93a' },
    OFF_TOPIC: { emoji: '🔄', color: '#8a8a8a' },
  }
  const info = map[intent] || { emoji: '💬', color: '#8a8a8a' }

  return (
    <span className="intent-badge" style={{ '--badge-color': info.color }}>
      {info.emoji} {intent}
    </span>
  )
}

function ProductCard({ product }) {
  return (
    <div className="product-card">
      <div className="product-card__header">
        <h4 className="product-card__name">{product.name}</h4>
        <span className="product-card__price">{product.price}</span>
      </div>
      <p className="product-card__reason">{product.reason}</p>
      <div className="product-card__actions">
        {product.url && (
          <a href={product.url} target="_blank" rel="noopener noreferrer" className="product-card__btn">
            View Details
          </a>
        )}
      </div>
    </div>
  )
}

/**
 * Single chat message bubble.
 */
export default function ChatMessage({ message, avatarText = 'AI', domain = '', brandName = '' }) {
  const isUser = message.role === 'user'

  let contentText = message.content
  let products = []

  if (!isUser) {
    try {
      const parsed = JSON.parse(message.content)
      contentText = parsed.text || message.content
      products = Array.isArray(parsed.products) ? parsed.products : []
    } catch (e) {
      // Fallback if not valid JSON
    }
  }

  return (
    <div className={`message-wrapper ${isUser ? 'user-wrapper' : 'assistant-wrapper'}`}>
      <div className={`message ${isUser ? 'user-message' : 'assistant-message'}`}>
        {!isUser && (
          <div className="message-avatar">
            <span className="avatar-icon">{avatarText}</span>
          </div>
        )}
        <div className="message-content">
          {!isUser && (
            <div className="message-meta-inline">
              <span className="assistant-name">{brandName} Agent</span>
              <span className="verified-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
              </span>
            </div>
          )}
          {!isUser && message.intent && <IntentBadge intent={message.intent} />}
          <div className="message-text">
            {contentText}
          </div>
          {!isUser && products.length > 0 && (
            <div className="message-products">
              {products.map((p, i) => (
                <ProductCard key={i} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
