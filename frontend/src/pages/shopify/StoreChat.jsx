import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import './App.css'
import ChatMessage from '../../components/shopify/ChatMessage'
import TypingIndicator from '../../components/shopify/TypingIndicator'
import CartPanel from '../../components/shopify/CartPanel'
const API_BASE = 'http://localhost:8000/api/shopify';

// Default suggestions if store config doesn't provide any
const DEFAULT_SUGGESTIONS = [
  { label: '🛍️ Browse products', query: 'What products do you have?' },
  { label: '📦 Return policy', query: 'What is your return policy?' },
  { label: '🚚 Shipping info', query: 'How does shipping work?' },
]

export default function StoreChat() {
  const { storeId } = useParams()

  const [storeConfig, setStoreConfig] = useState(null)
  const [configError, setConfigError] = useState(null)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)

  // ── Cart State ─────────────────────────────────────────────────────────────
  // cartItems are tracked in React state (source of truth for our UI).
  // Each item: { variant_id, name, price, price_num, image, url, quantity }
  const [cartItems, setCartItems] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [cartAnimation, setCartAnimation] = useState(false)   // trigger badge pop

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // ── Load store config on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/store/${storeId}/config`)
      .then(res => {
        if (!res.ok) throw new Error(`Store '${storeId}' not found`)
        return res.json()
      })
      .then(config => {
        setStoreConfig(config)
        document.documentElement.style.setProperty('--brand-primary', config.primary_color || '#1a1a1a')
        document.documentElement.style.setProperty('--brand-accent', config.accent_color || '#e85d3a')
        document.title = `${config.brand_name} — AI Shopping Assistant`
      })
      .catch(err => setConfigError(err.message))

    return () => {
      document.documentElement.style.setProperty('--brand-primary', '#1a1a1a')
      document.documentElement.style.setProperty('--brand-accent', '#e85d3a')
    }
  }, [storeId])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input
  useEffect(() => {
    if (storeConfig) inputRef.current?.focus()
  }, [storeConfig])

  // ── Shopify Action Executor ─────────────────────────────────────────────────
  /**
   * executeShopifyAction(action)
   *
   * This is THE key function. The backend sends an `action` object when the
   * LLM decides to call a cart tool. We execute it here, in the browser,
   * using the Shopify AJAX API — so it hits the user's REAL Shopify cart.
   *
   * Why here and not on the backend?
   *   The Shopify AJAX Cart API (/cart/add.js) requires the user's browser
   *   session cookie. Our backend server doesn't have that cookie — the user's
   *   browser does. So we make the call from the frontend.
   *
   * action.type === 'add_to_cart':
   *   POST to https://{domain}/cart/add.js with { items: [{ id, quantity }] }
   *   This adds the item to the user's real Shopify cart.
   *
   * action.type === 'checkout':
   *   Simply open the store's checkout URL in a new tab.
   */
  const executeShopifyAction = async (action, domain) => {
    if (!action) return

    if (action.type === 'add_to_cart') {
      const { variant_id, quantity, product_name, price, image, url } = action

      // ── Step 1: Add to live Shopify cart via AJAX API ──────────────────────
      // This works when our chat widget is embedded on the store's domain.
      // When running in dev (different domain), Shopify will reject the CORS
      // request — that's expected. In production (embedded), it will succeed.
      try {
        await fetch(`https://${domain}/cart/add.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',   // sends the Shopify session cookie
          body: JSON.stringify({
            items: [{ id: variant_id, quantity }]
          }),
        })
        console.log(`✅ Added variant ${variant_id} to live Shopify cart`)
      } catch (err) {
        // In dev this will fail due to CORS — that's fine.
        // In production (embedded on store domain) it will succeed.
        console.warn('Shopify AJAX cart call failed (expected in dev):', err.message)
      }

      // ── Step 2: Always update our local cart state for UI feedback ─────────
      // This mirrors the live cart so the user sees instant feedback.
      const priceNum = parseFloat(price?.replace(/[^0-9.]/g, '') || '0')

      setCartItems(prev => {
        const existing = prev.findIndex(i => i.variant_id === variant_id)
        if (existing !== -1) {
          // Increment quantity if already in cart
          return prev.map((item, idx) =>
            idx === existing
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        }
        return [...prev, { variant_id, name: product_name, price, price_num: priceNum, image, url, quantity }]
      })

      // Trigger badge animation
      setCartAnimation(true)
      setTimeout(() => setCartAnimation(false), 600)

    } else if (action.type === 'checkout') {
      // Open the store's checkout in a new tab
      window.open(action.url, '_blank')
    }
  }

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = async (text) => {
    const query = text || input.trim()
    if (!query || isLoading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: query }])
    setIsLoading(true)

    try {
      const body = { message: query }
      if (sessionId) body.session_id = sessionId

      const res = await fetch(`${API_BASE}/chat/${storeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error (${res.status})`)
      }

      const data = await res.json()
      if (data.session_id) setSessionId(data.session_id)

      // Execute any cart action the agent decided on — hits live Shopify
      if (data.action && storeConfig) {
        await executeShopifyAction(data.action, storeConfig.domain)
      }

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.response, intent: data.intent },
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Sorry, I couldn\'t connect to the server. Please make sure the backend is running.',
          intent: 'ERROR',
        },
      ])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleNewChat = () => {
    setMessages([])
    setSessionId(null)
    inputRef.current?.focus()
  }

  const cartItemCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)

  // ── Error state ─────────────────────────────────────────────────────────────
  if (configError) {
    return (
      <div className="error-screen">
        <div className="error-content">
          <h2>😕 Access Denied</h2>
          <p>{configError}</p>
          <Link to="/" className="error-back-btn">← Back to Login</Link>
        </div>
      </div>
    )
  }

  // ── Loading state ───────────────────────────────────────────────────────────
  if (!storeConfig) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    )
  }

  // ── Main UI ─────────────────────────────────────────────────────────────────
  const brandName = storeConfig.brand_name || storeId
  const avatarText = storeConfig.avatar_text || storeId.slice(0, 2).toUpperCase()
  const suggestions = storeConfig.suggestions?.length ? storeConfig.suggestions : DEFAULT_SUGGESTIONS
  const domain = storeConfig.domain || `${storeId}.com`
  const isEmpty = messages.length === 0

  return (
    <div className="chat-app">
      {/* ── Header ──────────────────────────────────── */}
      <header className="header">
        <div className="header-left">
          <div className="store-logo-wrapper">
            <span className="store-logo">{avatarText}</span>
          </div>
          <div className="header-info">
            <h1 className="logo">{brandName}</h1>
            <div className="status-row">
              <span className="status-dot"></span>
              <span className="status-text">Smart Shopping Concierge</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <button className="new-chat-btn" onClick={handleNewChat} title="Clear current session">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Reset
          </button>

          {/* Cart button — only shows if items in cart */}
          <button
            id="cart-toggle-btn"
            className={`cart-btn ${cartItemCount > 0 ? 'cart-btn--has-items' : ''}`}
            onClick={() => setIsCartOpen(true)}
            aria-label={`Open cart (${cartItemCount} items)`}
            title="View cart"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cartItemCount > 0 && (
              <span className={`cart-btn__badge ${cartAnimation ? 'cart-btn__badge--pop' : ''}`}>
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* ── Cart Drawer ──────────────────────────────── */}
      <CartPanel
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        domain={domain}
        brandName={brandName}
      />

      {/* ── Chat Area ───────────────────────────────── */}
      <main className="chat-area">
        {isEmpty ? (
          <div className="welcome">
            <div className="welcome-content">
              <div className="welcome-header">
                <div className="welcome-logo-glitter">{avatarText}</div>
                <h2 className="welcome-title">Personalized for you.</h2>
                <p className="welcome-subtitle">
                  Explore {brandName} with our AI-powered shopping expert.
                  Ask about specific styles, materials, or order details.
                </p>
              </div>

              <div className="suggestions-grid">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="suggestion-tile"
                    onClick={() => sendMessage(s.query)}
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="suggestion-content">
                      <span className="suggestion-label">{s.label}</span>
                      <span className="suggestion-subtext">Find out more</span>
                    </div>
                    <span className="suggestion-arrow">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-7-7l7 7-7 7" /></svg>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="messages">
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} avatarText={avatarText} domain={domain} brandName={brandName} />
            ))}
            {isLoading && <TypingIndicator avatarText={avatarText} />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* ── Input Bar ───────────────────────────────── */}
      <footer className="input-bar">
        <div className="input-outer">
          <div className="input-container">
            <input
              ref={inputRef}
              id="chat-input"
              type="text"
              className="chat-input"
              placeholder={`Type your question here...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoComplete="off"
            />
            <button
              className="send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              aria-label="Submit"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="branding-footer">
          <div className="brand-pill">
            <span className="brand-dot"></span>
            <span>Secure Enterprise AI by <strong>ShopGPT</strong></span>
          </div>
        </div>
      </footer>

    </div>
  )
}
