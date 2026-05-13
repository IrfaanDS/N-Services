import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Search, Users, ArrowRight, Zap, ShoppingBag, LogOut, User as UserIcon, Check, Mail, Shield } from 'lucide-react'
import { useAuth } from '../components/auth/AuthProvider'
import nServicesLogo from '../assets/n-services-logo.png'

const services = [
    {
        id: 'seo',
        tag: 'Local Business Outreach Engine',
        title: 'SEO Services',
        description: 'Discover local businesses, audit their SEO health, and launch personalized outreach campaigns to convert high-potential leads.',
        points: ['Local discovery & enrichment', 'Automated SEO audits', 'Personalized outreach sequences'],
        path: '/seo/leads',
        icon: Search,
    },
    {
        id: 'b2b',
        tag: 'Lead Generation Wizard',
        title: 'B2B Services',
        description: 'Upload Apollo exports, evaluate lead quality with AI, and generate tailored email sequences for specific buyer personas.',
        points: ['Apollo CSV ingestion', 'AI persona-based scoring', 'Sequence generation & sending'],
        path: '/b2b/leads',
        icon: Users,
    },
    {
        id: 'shopify',
        tag: 'Shopify RAG & Lead Engine',
        title: 'Shopify AI Services',
        description: 'Provision smart AI assistants for Shopify stores and use a RAG-powered engine to discover high-value ecommerce leads.',
        points: ['Store-aware AI assistants', 'RAG-powered lead discovery', 'Ecommerce intent signals'],
        path: '/shopify',
        icon: ShoppingBag,
    },
]

export default function ServiceSelector() {
    const navigate = useNavigate()
    const { user, signOut } = useAuth()
    const [showProfileMenu, setShowProfileMenu] = useState(false)
    const menuRef = useRef(null)

    // Handle clicking outside to close menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowProfileMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="service-selector-page min-h-screen relative overflow-hidden bg-white">
            {/* ── Background Hue ── */}
            <div className="absolute inset-0 pointer-events-none opacity-50">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[140px]" style={{ background: 'rgba(160, 4, 236, 0.12)' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[140px]" style={{ background: 'rgba(160, 4, 236, 0.1)' }} />
                <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] rounded-full blur-[120px]" style={{ background: 'rgba(234, 34, 97, 0.05)' }} />
            </div>

            {/* Top Navigation */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
                <Link to="/welcome" className="flex items-center gap-2.5">
                    <img src={nServicesLogo} alt="N-Services" className="h-7 w-auto" />
                    <span className="text-lg font-bold tracking-tight lp-text-ink">N-Services</span>
                </Link>

                {user ? (
                    <div className="flex items-center gap-4 relative" ref={menuRef}>
                        <div className="flex items-center gap-3">

                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all overflow-hidden relative
                                    ${showProfileMenu ? 'shadow-lg' : 'lp-border-hairline bg-white hover:shadow-md'}`}
                                style={showProfileMenu ? { borderColor: '#a004ec' } : {}}
                            >
                                <UserIcon className="w-5 h-5 transition-colors" style={{ color: showProfileMenu ? '#a004ec' : 'var(--lp-ink)' }} />
                            </button>
                        </div>

                        {/* ── Dropdown Menu ── */}
                        {showProfileMenu && (
                            <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-2xl border lp-border-hairline shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[100]">
                                <div className="p-4 border-b lp-border-hairline bg-canvas-soft">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-primary-subdued flex items-center justify-center">
                                            <UserIcon className="w-5 h-5 lp-text-primary-deep" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-bold lp-text-ink truncate">{user.email?.split('@')[0]}</p>
                                            <p className="text-[11px] lp-text-ink-mute truncate">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border lp-border-hairline">
                                        <Shield className="w-3.5 h-3.5" style={{ color: '#a004ec' }} />
                                        <span className="text-xs font-bold lp-text-ink">Standard Subscription</span>
                                    </div>
                                </div>

                                <div className="p-2">
                                    <button
                                        onClick={() => signOut()}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ruby-600 hover:bg-ruby-50 transition-colors group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-ruby-100/50 flex items-center justify-center group-hover:bg-ruby-100 transition-colors">
                                            <LogOut className="w-4 h-4" />
                                        </div>
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <Link to="/login" className="text-sm font-medium lp-text-ink hover:opacity-70 transition-opacity">
                            Sign In
                        </Link>
                        <Link to="/pricing" className="lp-btn-pill lp-btn-primary px-5 py-1.5 text-sm">
                            Sign Up
                        </Link>
                    </div>
                )}
            </div>

            <div className="relative z-10 flex flex-col items-center min-h-screen px-6 pt-20 pb-5">
                {/* Header */}
                <div className="text-center mb-12 animate-fade-in max-w-2xl">
                    <h1 className="lp-display-xl lp-text-ink mb-6">
                        Select your <span className="lp-text-primary" style={{ color: '#a004ec' }}>domain</span>
                    </h1>
                    <p className="lp-body-lg lp-text-ink-mute">
                        Access our specialized AI engines designed to automate acquisition and expand your service business reach.
                    </p>
                </div>

                {/* Service Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl w-full animate-fade-in-up">
                    {services.map((service) => {
                        const Icon = service.icon
                        return (
                            <button
                                key={service.id}
                                onClick={() => navigate(service.path)}
                                className="group relative bg-white border lp-border-hairline p-8 text-left transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex flex-col h-full"
                                style={{ borderRadius: '24px' }}
                            >
                                {/* Icon */}
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110"
                                    style={{ background: 'rgba(160, 4, 236, 0.05)', border: '1px solid rgba(160, 4, 236, 0.2)', color: '#a004ec' }}>
                                    <Icon className="w-6 h-6" />
                                </div>

                                <h2 className="text-2xl lp-text-ink mb-3 font-bold">
                                    {service.title}
                                </h2>

                                <p className="text-sm lp-text-ink-mute mb-6 leading-relaxed">
                                    {service.description}
                                </p>

                                <ul className="space-y-2 mb-8 mt-auto">
                                    {service.points.map((p) => (
                                        <li key={p} className="flex items-center gap-3 text-sm lp-text-ink-secondary">
                                            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(160, 4, 236, 0.08)' }}>
                                                <Check className="w-3 h-3" style={{ color: '#a004ec' }} />
                                            </div>
                                            {p}
                                        </li>
                                    ))}
                                </ul>

                                <div className="flex items-center gap-2 text-sm font-bold mt-auto pt-6 border-t lp-border-hairline transition-all duration-300"
                                    style={{ color: '#a004ec' }}>
                                    Launch Engine
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
