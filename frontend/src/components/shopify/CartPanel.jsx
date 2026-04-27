/**
 * CartPanel — Sliding cart drawer.
 *
 * Architecture note:
 *   This component does NOT own cart state. It receives `cartItems` from
 *   StoreChat (which maintains them in React state) and displays them.
 *   All actual Shopify mutations happen in StoreChat via executeShopifyAction().
 */

export default function CartPanel({ isOpen, onClose, cartItems, domain, brandName }) {
  const total = cartItems.reduce((sum, item) => sum + item.price_num * item.quantity, 0)
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  const handleCheckout = () => {
    window.open(`https://${domain}/checkout`, '_blank')
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`cart-overlay ${isOpen ? 'cart-overlay--open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside className={`cart-drawer ${isOpen ? 'cart-drawer--open' : ''}`} role="dialog" aria-label="Shopping cart">
        {/* Header */}
        <div className="cart-drawer__header">
          <div className="cart-drawer__title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span>Your Cart</span>
            {itemCount > 0 && (
              <span className="cart-drawer__count">{itemCount}</span>
            )}
          </div>
          <button className="cart-drawer__close" onClick={onClose} aria-label="Close cart">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="cart-drawer__body">
          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty__icon">🛒</div>
              <p className="cart-empty__text">Your cart is empty.</p>
              <p className="cart-empty__sub">Ask the assistant for recommendations!</p>
            </div>
          ) : (
            <ul className="cart-items-list">
              {cartItems.map((item, i) => (
                <li key={`${item.variant_id}-${i}`} className="cart-item">
                  {item.image && (
                    <div className="cart-item__img-wrap">
                      <img src={item.image} alt={item.name} className="cart-item__img" />
                    </div>
                  )}
                  <div className="cart-item__details">
                    <p className="cart-item__name">{item.name}</p>
                    <p className="cart-item__meta">Qty: {item.quantity}</p>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cart-item__link"
                    >
                      View on site ↗
                    </a>
                  </div>
                  <p className="cart-item__price">{item.price}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="cart-drawer__footer">
            <div className="cart-subtotal">
              <span>Subtotal</span>
              <span className="cart-subtotal__amount">${total.toFixed(2)}</span>
            </div>
            <button className="cart-checkout-btn" onClick={handleCheckout}>
              Checkout on {brandName} ↗
            </button>
            <p className="cart-secure-note">
              🔒 Secure checkout powered by Shopify
            </p>
          </div>
        )}
      </aside>
    </>
  )
}
