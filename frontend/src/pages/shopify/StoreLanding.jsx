import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
const API_BASE = 'http://localhost:8000/api/shopify';
import './StoreLanding.css'

export default function StoreLanding({ initialMode = 'onboard' }) {
  const location = useLocation()
  const navigate = useNavigate()

  const [url, setUrl] = useState(location.state?.url || '')
  const [brandName, setBrandName] = useState(location.state?.brandName || '')
  const [lookupId, setLookupId] = useState('')
  const [mode, setMode] = useState(initialMode) // 'onboard' or 'lookup'
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [successData, setSuccessData] = useState(null)

  // Use a ref or simple state to track if we should auto-start onboarding
  const [autoStart, setAutoStart] = useState(!!(location.state?.url && location.state?.brandName))

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      try {
          new URL('https://' + string);
          return true;
      } catch (_) {
          return false;
      }
    }
  }

  const handleOnboard = async (e) => {
    if (e) e.preventDefault()
    if (!url) return
    if (!isValidUrl(url)) {
      setError("Please enter a valid website URL.")
      return
    }

    setLoading(true)
    setError(null)
    setSuccessData(null)
    
    try {
      const response = await fetch(`${API_BASE}/store/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, brand_name: brandName || null })
      })

      if (response.ok) {
        const body = await response.json()
        setSuccessData(body)
      } else {
        const body = await response.json()
        const detail = body.detail
        if (detail === 'NOT_A_SHOPIFY_STORE') {
           setError("We couldn't find a Shopify product catalog for this URL. Please ensure the store is built on Shopify and public.")
        } else if (detail === 'NO_PRODUCTS_FOUND') {
           setError('This store is empty. No products were found.')
        } else if (detail === 'DOMAIN_UNREACHABLE') {
           setError('We could not reach this domain. Please check the URL.')
        } else {
           setError(detail || 'An unexpected error occurred.')
        }
      }
    } catch (err) {
      setError('A network error occurred connecting to the service.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (autoStart && url) {
      handleOnboard();
      setAutoStart(false);
    }
  }, [autoStart, url]);

  const handleLookup = (e) => {
    e.preventDefault()
    if (!lookupId) return
    navigate(`/shopify/chat/${lookupId}`)
  }

  const handleLaunch = () => {
      if (successData && successData.store_id) {
          navigate(`/shopify/chat/${successData.store_id}`)
      }
  }

  return (
    <div className="login-container">
      <div className="login-glass-panel">
        <div className="login-header">
          <div className="login-icon flex justify-center text-black mb-4"><ShoppingBag className="w-10 h-10" /></div>
          <h1 className="login-title">Agent Portal</h1>
          <p className="login-subtitle">Unlock your Shopify AI Assistant</p>
        </div>

        {mode === 'onboard' ? (
            successData ? (
                <div className="success-state">
                    <h3 style={{color: 'white', marginBottom: '0.5rem'}}>{successData.already_exists ? 'Agent Already Exists' : 'Agent Ready'}</h3>
                    <p style={{color: '#abaebc', marginBottom: '1.5rem', lineHeight: '1.5'}}>
                        {successData.already_exists 
                        ? `An assistant for ${successData.brand_name} is already active.`
                        : `We have successfully mapped ${successData.brand_name}. Your AI Assistant is ready.`}
                    </p>
                    <button onClick={handleLaunch} className="login-submit" style={{width: '100%'}}>
                        Launch Assistant
                    </button>
                    <button onClick={() => setSuccessData(null)} style={{background: 'transparent', color: '#888', border: 'none', cursor: 'pointer', marginTop: '1rem', width: '100%'}}>
                        Start Over
                    </button>
                </div>
            ) : (
                <form className="login-form" onSubmit={handleOnboard}>
                    <div className="input-group">
                        <label htmlFor="url">Brand URL</label>
                        <input 
                            id="url"
                            type="text" 
                            placeholder="e.g. yourstore.com" 
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            required 
                        />
                    </div>
                    
                    <div className="input-group">
                        <label htmlFor="brandName">Brand Name (Optional)</label>
                        <input 
                            id="brandName"
                            type="text" 
                            placeholder="e.g. My Awesome Store" 
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                        />
                    </div>
        
                    {error && <div className="login-error">{error}</div>}
        
                    <button 
                        type="submit" 
                        className={`login-submit ${loading ? 'loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? 'Building your Assistant...' : 'Build Assistant'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                        <button 
                            type="button" 
                            onClick={() => { setMode('lookup'); setError(null); }} 
                            style={{ background: 'none', border: 'none', color: '#abaebc', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            Already have an agent? Search by Name/ID
                        </button>
                    </div>
                </form>
            )
        ) : (
             <form className="login-form" onSubmit={handleLookup}>
                <div className="input-group">
                    <label htmlFor="lookupId">Store Name / ID</label>
                    <input 
                        id="lookupId"
                        type="text" 
                        placeholder="e.g. outdoorvoices" 
                        value={lookupId}
                        onChange={(e) => setLookupId(e.target.value)}
                        required 
                    />
                </div>
    
                <button 
                    type="submit" 
                    className="login-submit"
                >
                    Launch Assistant
                </button>

                <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                    <button 
                        type="button" 
                        onClick={() => { setMode('onboard'); setError(null); }} 
                        style={{ background: 'none', border: 'none', color: '#abaebc', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        Want to build a new agent? Go back
                    </button>
                </div>
            </form>
        )}
      </div>

      {/* Decorative blurred background elements */}
      <div className="login-blob blob-1"></div>
      <div className="login-blob blob-2"></div>
    </div>
  )
}
