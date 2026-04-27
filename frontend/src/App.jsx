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
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import FloatingAssistant from './components/FloatingAssistant'
import B2BLeadAcquisition from './pages/b2b/B2BLeadAcquisition'
import B2BLeadEvaluation from './pages/b2b/B2BLeadEvaluation'
import B2BEmailGeneration from './pages/b2b/B2BEmailGeneration'
import B2BOutreach from './pages/b2b/B2BOutreach'

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
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="leads" element={<LeadAcquisition />} />
                            <Route path="evaluation" element={<LeadEvaluation />} />
                            <Route path="email-generation" element={<EmailGeneration />} />
                            <Route path="email-sending" element={<EmailSending />} />
                            <Route path="onebox" element={<Onebox />} />
                            <Route path="*" element={<Navigate to="/seo/leads" replace />} />
                        </Routes>
                    ) : (
                        <Routes>
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
        <Routes>
            <Route path="/" element={<ServiceSelector />} />
            <Route path="/login" element={<Login />} />
            <Route path="/seo/*" element={<AppLayout mode="seo" />} />
            <Route path="/b2b/*" element={<AppLayout mode="b2b" />} />
            {/* Legacy: redirect old paths to /seo/ */}
            <Route path="/dashboard" element={<Navigate to="/seo/dashboard" replace />} />
            <Route path="/leads" element={<Navigate to="/seo/leads" replace />} />
            <Route path="/evaluation" element={<Navigate to="/seo/evaluation" replace />} />
            <Route path="/email-generation" element={<Navigate to="/seo/email-generation" replace />} />
            <Route path="/email-sending" element={<Navigate to="/seo/email-sending" replace />} />
            <Route path="/onebox" element={<Navigate to="/seo/onebox" replace />} />
        </Routes>
    )
}
