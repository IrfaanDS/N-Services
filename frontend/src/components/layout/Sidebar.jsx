import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    Search,
    BarChart3,
    MessageSquare,
    Send,
    FileText,
    Settings,
    Mail,
    Bot,
    Upload,
    Sparkles,
    ArrowLeft
} from 'lucide-react'
import nServicesLogo from '../../assets/n-services-logo.png'

const seoNavItems = [
    { to: '/seo/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/seo/leads', label: 'Lead Acquisition', icon: Search },
    { to: '/seo/evaluation', label: 'Lead Evaluation', icon: BarChart3 },
    { to: '/seo/email-generation', label: 'Email Generation', icon: Mail },
    { to: '/seo/email-sending', label: 'Email Sending', icon: Send },
    { to: '/seo/onebox', label: 'Onebox (Inbox)', icon: MessageSquare },
]

const b2bNavItems = [
    { to: '/b2b/agent', label: 'Agent Mode', icon: Bot },
    { to: '/b2b/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/b2b/leads', label: 'B2B Leads', icon: Upload },
    { to: '/b2b/evaluation', label: 'Lead Evaluation', icon: BarChart3 },
    { to: '/b2b/email-generation', label: 'Email Generation', icon: Sparkles },
    { to: '/b2b/outreach', label: 'Outreach', icon: Send },
    { to: '/b2b/onebox', label: 'Onebox (Inbox)', icon: MessageSquare },
]

const bottomItems = [
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ collapsed, onToggle, mode }) {
    const location = useLocation()
    const navigate = useNavigate()

    const navItems = mode === 'b2b' ? b2bNavItems : seoNavItems
    const isB2B = mode === 'b2b'

    return (
        <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
            {/* ── Logo (click to toggle) ── */}
            <div
                className="flex items-center gap-3 px-4 py-6 cursor-pointer select-none"
                onClick={onToggle}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                <div className="w-9 h-9 min-w-[36px] flex items-center justify-center">
                    <img src={nServicesLogo} alt="Logo" className="w-7 h-auto" />
                </div>
                {!collapsed && (
                    <span className="text-xl font-light whitespace-nowrap"
                          style={{ color: '#061b31', letterSpacing: '-0.26px' }}>
                        N-Services
                    </span>
                )}
            </div>

            {/* ── Back to Services ── */}
            <div className="px-3 mb-2">
                <button
                    onClick={() => navigate('/dashboard')}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-normal 
                        transition-all duration-200
                        ${collapsed ? 'justify-center' : ''}`}
                    style={{ color: '#64748d' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#533afd'; e.currentTarget.style.background = 'rgba(83,58,253,0.04)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#64748d'; e.currentTarget.style.background = 'transparent' }}
                    title="Back to Services"
                >
                    <ArrowLeft className="w-4 h-4 min-w-[16px]" />
                    {!collapsed && <span className="whitespace-nowrap text-xs">All Services</span>}
                </button>

                {/* Mode badge */}
                {!collapsed && (
                    <div className="mx-3 mt-2 px-3 py-1.5 rounded-md text-xs font-normal text-center"
                         style={{ background: 'rgba(83,58,253,0.06)', color: '#533afd', border: '1px solid rgba(83,58,253,0.12)' }}>
                        {isB2B ? 'B2B Services' : 'SEO Services'}
                    </div>
                )}
            </div>

            {/* ── Main nav ── */}
            <nav className="flex-1 px-3 mt-2">
                <ul className="space-y-1">
                    {navItems.map(({ to, label, icon: Icon }) => {
                        const isActive = location.pathname === to ||
                            (to === '/seo/leads' && location.pathname === '/seo') ||
                            (to === '/b2b/leads' && location.pathname === '/b2b')
                        return (
                            <li key={to}>
                                <NavLink
                                    to={to}
                                    title={collapsed ? label : undefined}
                                    className={`
                                        flex items-center gap-3 px-3 py-3 rounded-md text-sm
                                        transition-all duration-200
                                        ${collapsed ? 'justify-center' : ''}
                                        ${isActive
                                            ? 'sidebar-active'
                                            : ''
                                        }
                                    `}
                                    style={isActive ? { fontWeight: 400 } : { color: '#64748d', fontWeight: 300 }}
                                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(83,58,253,0.04)'; e.currentTarget.style.color = '#533afd' } }}
                                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748d' } }}
                                >
                                    <Icon className="w-5 h-5 min-w-[20px]" />
                                    {!collapsed && <span className="whitespace-nowrap">{label}</span>}
                                </NavLink>
                            </li>
                        )
                    })}
                </ul>
            </nav>

            {/* ── Bottom nav ── */}
            <nav className="px-3 pb-6">
                <ul className="space-y-1 pt-4" style={{ borderTop: '1px solid #e5edf5' }}>
                    {bottomItems.map(({ to, label, icon: Icon }) => {
                        const isActive = location.pathname === to
                        return (
                            <li key={to}>
                                <NavLink
                                    to={to}
                                    title={collapsed ? label : undefined}
                                    className={`
                                        flex items-center gap-3 px-3 py-3 rounded-md text-sm
                                        transition-all duration-200
                                        ${collapsed ? 'justify-center' : ''}
                                        ${isActive
                                            ? 'sidebar-active'
                                            : ''
                                        }
                                    `}
                                    style={isActive ? { fontWeight: 400 } : { color: '#64748d', fontWeight: 300 }}
                                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(83,58,253,0.04)'; e.currentTarget.style.color = '#533afd' } }}
                                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748d' } }}
                                >
                                    <Icon className="w-5 h-5 min-w-[20px]" />
                                    {!collapsed && <span className="whitespace-nowrap">{label}</span>}
                                </NavLink>
                            </li>
                        )
                    })}
                </ul>
            </nav>
        </aside>
    )
}
