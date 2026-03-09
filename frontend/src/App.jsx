import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import LeadAcquisition from './pages/LeadAcquisition'
import LeadEvaluation from './pages/LeadEvaluation'
import EmailGeneration from './pages/EmailGeneration'
import EmailSending from './pages/EmailSending'
import Onebox from './pages/Onebox'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'

function AppLayout() {
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
            <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
            <div className="main-content">
                <TopBar />
                <main className="p-6 lg:p-8">
                    <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/leads" element={<LeadAcquisition />} />
                        <Route path="/evaluation" element={<LeadEvaluation />} />
                        <Route path="/email-generation" element={<EmailGeneration />} />
                        <Route path="/email-sending" element={<EmailSending />} />
                        <Route path="/onebox" element={<Onebox />} />
                        <Route path="*" element={<Navigate to="/leads" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    )
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<AppLayout />} />
        </Routes>
    )
}
