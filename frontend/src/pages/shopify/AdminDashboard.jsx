import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
const API_BASE = 'http://localhost:8000/api/shopify';

export default function AdminDashboard() {
  const [stores, setStores] = useState([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [limit] = useState(8)
  const [loading, setLoading] = useState(false)
  
  const [newDomain, setNewDomain] = useState('')
  const [newBrand, setNewBrand] = useState('')
  const [onboarding, setOnboarding] = useState(false)
  const [onboardResult, setOnboardResult] = useState(null)
  
  const navigate = useNavigate()
  const password = sessionStorage.getItem('admin_password')

  useEffect(() => {
    fetchStores()
  }, [skip])

  const fetchStores = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/admin/stores?skip=${skip}&limit=${limit}`, {
        headers: { 'X-Admin-Password': password }
      })
      const data = await res.json()
      if (res.ok) {
        setStores(data.stores)
        setTotal(data.total)
      } else if (res.status === 401) {
        sessionStorage.removeItem('admin_password')
        navigate('/shopify/admin/login')
      }
    } catch (err) {
      console.error("Failed to fetch stores", err)
    } finally {
      setLoading(false)
    }
  }

  const handleOnboard = async (e) => {
    e.preventDefault()
    if (!newDomain) return
    
    setOnboarding(true)
    setOnboardResult(null)
    try {
      const res = await fetch(`${API_BASE}/admin/onboard`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Password': password
        },
        body: JSON.stringify({ domain: newDomain, brand_name: newBrand || undefined })
      })
      const data = await res.json()
      if (res.ok) {
        setOnboardResult({ success: true, ...data })
        fetchStores()
        setNewDomain('')
        setNewBrand('')
      } else {
        setOnboardResult({ success: false, detail: data.detail })
      }
    } catch (err) {
      setOnboardResult({ success: false, detail: "Connection failed" })
    } finally {
      setOnboarding(false)
    }
  }

  const handleDelete = async (storeId) => {
    if (!window.confirm(`Delete store ${storeId}? This action is irreversible.`)) return
    
    try {
      const res = await fetch(`${API_BASE}/admin/stores/${storeId}`, { 
        method: 'DELETE',
        headers: { 'X-Admin-Password': password }
      })
      if (res.ok) {
        fetchStores()
      }
    } catch (err) {
      alert("Delete failed")
    }
  }

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied!`);
  }

  const handleLogout = () => {
    sessionStorage.removeItem('admin_password')
    navigate('/shopify/admin/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>Store Central</h1>
            <p style={{ color: '#64748b', fontWeight: '500' }}>Platform Administration & Multi-Tenant Management</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => navigate('/shopify/leads')}
              style={{ 
                  padding: '12px 24px', 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0', 
                  background: 'white', 
                  color: '#64748b', 
                  fontWeight: '600', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              Leads Dashboard
            </button>
            <button 
              onClick={handleLogout}
              style={{ 
                  padding: '12px 24px', 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0', 
                  background: 'white', 
                  color: '#64748b', 
                  fontWeight: '600', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#ef4444';
                  e.currentTarget.style.color = '#ef4444';
              }}
              onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.color = '#64748b';
              }}
            >
              Logout
            </button>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '32px' }}>
          
          {/* Left Column: Stats & Add Store */}
          <aside>
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '32px', border: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></span>
                Onboard New Store
              </h2>
              <form onSubmit={handleOnboard}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', marginLeft: '4px' }}>Shopify Domain</label>
                  <input 
                    type="text" 
                    placeholder="example.com" 
                    value={newDomain}
                    onChange={e => setNewDomain(e.target.value)}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', marginLeft: '4px' }}>Brand Name (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Luxury Store" 
                    value={newBrand}
                    onChange={e => setNewBrand(e.target.value)}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={onboarding}
                  style={{ 
                    width: '100%', 
                    padding: '16px', 
                    borderRadius: '12px', 
                    background: '#0f172a', 
                    color: 'white', 
                    border: 'none', 
                    fontWeight: '700', 
                    cursor: onboarding ? 'not-allowed' : 'pointer', 
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  {onboarding ? 'Processing Scrape...' : 'Launch Onboarding'}
                </button>
              </form>

              {onboardResult && (
                <div style={{ marginTop: '24px', padding: '20px', borderRadius: '16px', background: onboardResult.success ? '#ecfdf5' : '#fef2f2', border: `1px solid ${onboardResult.success ? '#10b98120' : '#ef444420'}` }}>
                  {onboardResult.success ? (
                    <div>
                      <p style={{ color: '#065f46', fontWeight: '700', fontSize: '14px', marginBottom: '12px' }}>✅ Deployment Successful</p>
                      <div style={{ background: 'white', padding: '12px', borderRadius: '10px', fontSize: '12px', border: '1px solid #10b98120' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#64748b', fontWeight: '600' }}>ID: {onboardResult.store_id}</span>
                          <button onClick={() => copyToClipboard(onboardResult.store_id, 'ID')} style={{ background: '#f1f5f9', border: 'none', color: '#0f172a', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Copy</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: '#991b1b', fontSize: '14px', fontWeight: '600' }}>❌ {onboardResult.detail}</p>
                  )}
                </div>
              )}
            </div>
            
            <div style={{ background: '#0f172a', padding: '32px', borderRadius: '24px', color: 'white', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
              <p style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>Platform Status</p>
              <h3 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '4px' }}>{total}</h3>
              <p style={{ color: '#64748b', fontSize: '14px' }}>Active Tenant Agents</p>
            </div>
          </aside>

          {/* Right Column: Store Grid */}
          <main>
            <div style={{ background: 'white', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
              <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Active Managed Stores</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                   <button 
                    disabled={skip === 0}
                    onClick={() => setSkip(Math.max(0, skip - limit))}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600', opacity: skip === 0 ? 0.5 : 1 }}
                  >
                    ←
                  </button>
                  <button 
                    disabled={skip + limit >= total}
                    onClick={() => setSkip(skip + limit)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600', opacity: skip + limit >= total ? 0.5 : 1 }}
                  >
                    →
                  </button>
                </div>
              </div>

              <div style={{ padding: '16px' }}>
                {loading ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: '500' }}>Refreshing catalog...</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    {stores.map(store => (
                      <div key={store._id} style={{ padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s ease', cursor: 'default' }} onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#f1f5f9'; }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{store.username}</span>
                            <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{store._id}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                           <a 
                            href={`/shopify/chat/${store._id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ padding: '12px 20px', borderRadius: '12px', background: 'white', color: '#0f172a', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#0f172a'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                          >
                             Launch
                          </a>
                          <button 
                            onClick={() => handleDelete(store._id)}
                            style={{ padding: '12px 20px', borderRadius: '12px', background: 'white', color: '#ef4444', border: '1px solid #fee2e2', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#ef4444'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#fee2e2'; }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {stores.length === 0 && <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: '500' }}>No stores found in this sector.</div>}
                  </div>
                )}
              </div>
            </div>
          </main>

        </div>
      </div>
    </div>
  )
}
