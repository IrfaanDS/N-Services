import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
const API_BASE = 'http://localhost:8000/api/shopify';

const ProtectedRoute = ({ children }) => {
    const [status, setStatus] = useState('loading'); // loading, authenticated, unauthenticated

    useEffect(() => {
        const verify = async () => {
            const pass = sessionStorage.getItem('admin_password');
            if (!pass) {
                setStatus('unauthenticated');
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/admin/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: pass })
                });

                if (res.ok) {
                    setStatus('authenticated');
                } else {
                    sessionStorage.removeItem('admin_password');
                    setStatus('unauthenticated');
                }
            } catch (err) {
                setStatus('unauthenticated');
            }
        };

        verify();
    }, []);

    if (status === 'loading') {
        return (
            <div style={{ 
                minHeight: '100vh', 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                background: '#f8fafc',
                color: '#64748b',
                fontFamily: 'Inter, sans-serif'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid #e2e8f0',
                    borderTop: '3px solid #0f172a',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '16px'
                }}></div>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
                <p style={{ fontWeight: '500' }}>Verifying session...</p>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        return <Navigate to="/shopify/admin/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
