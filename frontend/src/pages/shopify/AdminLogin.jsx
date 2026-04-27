import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
const API_BASE = 'http://localhost:8000/api/shopify';

export default function AdminLogin() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!password) return;
        
        setLoading(true);
        setError('');
        
        try {
            const res = await fetch(`${API_BASE}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            
            if (res.ok) {
                sessionStorage.setItem('admin_password', password);
                navigate('/shopify/admin');
            } else {
                setError('Invalid credentials');
            }
        } catch (err) {
            setError('Connection failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ 
            minHeight: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: '#f8fafc',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{ 
                maxWidth: '400px', 
                width: '100%', 
                padding: '48px 40px', 
                background: 'white', 
                borderRadius: '32px', 
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.08)' 
            }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{ 
                        width: '64px', 
                        height: '64px', 
                        background: '#0f172a', 
                        borderRadius: '20px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        margin: '0 auto 24px',
                        boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.3)'
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>Admin Access</h1>
                    <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.5' }}>
                        Enter your master credentials to access the store management dashboard.
                    </p>
                </div>

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px', marginLeft: '4px' }}>
                            Password
                        </label>
                        <input 
                            type="password" 
                            placeholder="••••••••" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            disabled={loading}
                            style={{ 
                                width: '100%', 
                                padding: '16px 20px', 
                                borderRadius: '16px', 
                                border: '2px solid #f1f5f9', 
                                background: '#f8fafc',
                                fontSize: '16px', 
                                outline: 'none',
                                transition: 'all 0.2s ease',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#0f172a';
                                e.target.style.background = 'white';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#f1f5f9';
                                e.target.style.background = '#f8fafc';
                            }}
                        />
                    </div>
                    
                    {error && (
                        <div style={{ 
                            background: '#fef2f2', 
                            color: '#ef4444', 
                            padding: '12px', 
                            borderRadius: '12px', 
                            fontSize: '14px', 
                            fontWeight: '500', 
                            marginBottom: '24px', 
                            textAlign: 'center',
                            border: '1px solid #fee2e2'
                        }}>
                            {error}
                        </div>
                    )}
                    
                    <button 
                        type="submit" 
                        disabled={loading}
                        style={{ 
                            width: '100%', 
                            padding: '16px', 
                            borderRadius: '16px', 
                            background: '#0f172a', 
                            color: 'white', 
                            border: 'none', 
                            fontWeight: '700', 
                            fontSize: '16px', 
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            opacity: loading ? 0.7 : 1,
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                        }}
                    >
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: '32px', textAlign: 'center' }}>
                    <a href="/" style={{ color: '#64748b', fontSize: '14px', textDecoration: 'none', fontWeight: '500' }}>
                        ← Back to storefront
                    </a>
                </div>
            </div>
        </div>
    );
}
