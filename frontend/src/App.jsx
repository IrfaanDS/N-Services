import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import ServiceSelector from './pages/ServiceSelector'
import LeadAcquisition from './pages/LeadAcquisition'
import LeadEvaluation from './pages/LeadEvaluation'
import EmailGeneration from './pages/EmailGeneration'
import EmailSending from './pages/EmailSending'
import Onebox from './pages/Onebox'
import SEODashboard from './pages/SEODashboard'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import { AuthProvider, useAuth } from './components/auth/AuthProvider'
import FloatingAssistant from './components/FloatingAssistant'
import B2BLeadAcquisition from './pages/b2b/B2BLeadAcquisition'
import B2BLeadEvaluation from './pages/b2b/B2BLeadEvaluation'
import B2BEmailGeneration from './pages/b2b/B2BEmailGeneration'
import B2BOutreach from './pages/b2b/B2BOutreach'
import B2BDashboard from './pages/b2b/B2BDashboard'

import ShopifyHomeSelection from './pages/shopify/HomeSelection'
import ShopifyStoreLanding from './pages/shopify/StoreLanding'
import ShopifyStoreChat from './pages/shopify/StoreChat'
import ShopifyAdminDashboard from './pages/shopify/AdminDashboard'
import ShopifyAdminLogin from './pages/shopify/AdminLogin'
import ShopifyLeads from './pages/shopify/Leads'
import ShopifyDashboard from './pages/shopify/ShopifyDashboard'
import ShopifyProtectedRoute from './components/shopify/ProtectedRoute'

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()
    
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
    )
    
    if (!user) return <Navigate to="/login" replace />
    
    return children
}

function AppLayout({ mode }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 1024)

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setSidebarCollapsed(true)
            } else {
                setSidebarCollapsed(false)
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return (
        <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} mode={mode} />
            <div className="main-content">
                <TopBar />
                <main className="p-6 lg:p-8">
                    {mode === 'seo' ? (
                        <Routes>
                            <Route path="dashboard" element={<SEODashboard />} />
                            <Route path="leads" element={<LeadAcquisition />} />
                            <Route path="evaluation" element={<LeadEvaluation />} />
                            <Route path="email-generation" element={<EmailGeneration />} />
                            <Route path="email-sending" element={<EmailSending />} />
                            <Route path="onebox" element={<Onebox />} />
                            <Route path="*" element={<Navigate to="/seo/leads" replace />} />
                        </Routes>
                    ) : (
                        <Routes>
                            <Route path="dashboard" element={<B2BDashboard />} />
                            <Route path="leads" element={<B2BLeadAcquisition />} />
                            <Route path="evaluation" element={<B2BLeadEvaluation />} />
                            <Route path="email-generation" element={<B2BEmailGeneration />} />
                            <Route path="outreach" element={<B2BOutreach />} />
                            <Route path="onebox" element={<Onebox />} />
                            <Route path="*" element={<Navigate to="/b2b/leads" replace />} />
                        </Routes>
                    )}
                </main>
            </div>
            <FloatingAssistant />
        </div>
    )
}

export default function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/" element={<ProtectedRoute><ServiceSelector /></ProtectedRoute>} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                <Route path="/seo/*" element={<ProtectedRoute><AppLayout mode="seo" /></ProtectedRoute>} />
                <Route path="/b2b/*" element={<ProtectedRoute><AppLayout mode="b2b" /></ProtectedRoute>} />
                
                {/* Legacy: redirect old paths to /seo/ */}
                <Route path="/dashboard" element={<Navigate to="/seo/dashboard" replace />} />
                <Route path="/leads" element={<Navigate to="/seo/leads" replace />} />
                <Route path="/evaluation" element={<Navigate to="/seo/evaluation" replace />} />
                <Route path="/email-generation" element={<Navigate to="/seo/email-generation" replace />} />
                <Route path="/email-sending" element={<Navigate to="/seo/email-sending" replace />} />
                <Route path="/onebox" element={<Navigate to="/seo/onebox" replace />} />
                
                {/* Shopify RAG Platform Routes */}
                <Route path="/shopify" element={<ShopifyHomeSelection />} />
                <Route path="/shopify/onboard" element={<ShopifyStoreLanding initialMode="onboard" />} />
                <Route path="/shopify/launch" element={<ShopifyStoreLanding initialMode="lookup" />} />
                <Route path="/shopify/leads" element={<ShopifyLeads />} />
                <Route path="/shopify/dashboard" element={<ShopifyDashboard />} />
                <Route path="/shopify/admin/login" element={<ShopifyAdminLogin />} />
                <Route path="/shopify/admin" element={<ShopifyProtectedRoute><ShopifyAdminDashboard /></ShopifyProtectedRoute>} />
                <Route path="/shopify/chat/:storeId" element={<ShopifyStoreChat />} />
            </Routes>
        </AuthProvider>
    )
}
