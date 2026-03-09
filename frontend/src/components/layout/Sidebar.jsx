import { NavLink, useLocation } from 'react-router-dom'
import {
    LayoutDashboard,
    Search,
    BarChart3,
    MessageSquare,
    Send,
    FileText,
    Settings,
    Zap,
    Mail
} from 'lucide-react'

const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/leads', label: 'Lead Acquisition', icon: Search },
    { to: '/evaluation', label: 'Lead Evaluation', icon: BarChart3 },
    { to: '/email-generation', label: 'Email Generation', icon: Mail },
    { to: '/email-sending', label: 'Email Sending', icon: Send },
    { to: '/onebox', label: 'Onebox (Inbox)', icon: MessageSquare },
]

const bottomItems = [
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ collapsed, onToggle }) {
    const location = useLocation()

    return (
        <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
            {/* ── Logo (click to toggle) ── */}
            <div
                className="flex items-center gap-3 px-4 py-6 cursor-pointer select-none"
                onClick={onToggle}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                <div className="w-9 h-9 min-w-[36px] rounded-lg bg-gradient-to-br from-accent-400 to-primary-700 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                {!collapsed && <span className="text-xl font-bold text-primary-700 whitespace-nowrap">LeadFlow</span>}
            </div>

            {/* ── Main nav ── */}
            <nav className="flex-1 px-3 mt-2">
                <ul className="space-y-1">
                    {navItems.map(({ to, label, icon: Icon }) => {
                        const isActive = location.pathname === to ||
                            (to === '/leads' && location.pathname === '/')
                        return (
                            <li key={to}>
                                <NavLink
                                    to={to}
                                    title={collapsed ? label : undefined}
                                    className={`
                                        flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
                                        transition-all duration-200
                                        ${collapsed ? 'justify-center' : ''}
                                        ${isActive
                                            ? 'sidebar-active'
                                            : 'text-gray-600 hover:bg-surface-50 hover:text-gray-900'
                                        }
                                    `}
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
                <ul className="space-y-1 border-t border-surface-200 pt-4">
                    {bottomItems.map(({ to, label, icon: Icon }) => {
                        const isActive = location.pathname === to
                        return (
                            <li key={to}>
                                <NavLink
                                    to={to}
                                    title={collapsed ? label : undefined}
                                    className={`
                                        flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
                                        transition-all duration-200
                                        ${collapsed ? 'justify-center' : ''}
                                        ${isActive
                                            ? 'sidebar-active'
                                            : 'text-gray-600 hover:bg-surface-50 hover:text-gray-900'
                                        }
                                    `}
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
