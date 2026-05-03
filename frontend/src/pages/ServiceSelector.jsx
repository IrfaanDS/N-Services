import { useNavigate, Link } from 'react-router-dom'
import { Search, Users, ArrowRight, Zap, ShoppingBag, LogOut, User as UserIcon } from 'lucide-react'
import { useAuth } from '../components/auth/AuthProvider'

const services = [
    {
        id: 'seo',
        title: 'SEO Services',
        subtitle: 'Local Business Outreach Engine',
        description: 'Discover local businesses, audit their SEO health, and launch personalized outreach campaigns to convert high-potential leads.',
        path: '/seo/leads',
        icon: Search,
    },
    {
        id: 'b2b',
        title: 'B2B Services',
        subtitle: 'Lead Generation Wizard',
        description: 'Upload Apollo exports, evaluate lead quality, and generate AI-powered email sequences tailored to each buyer persona.',
        path: '/b2b/leads',
        icon: Users,
    },
    {
        id: 'shopify',
        title: 'Shopify AI Services',
        subtitle: 'Shopify RAG & Lead Engine',
        description: 'Provision smart AI assistants for Shopify stores and discover ecommerce leads with the specialized RAG-powered engine.',
        path: '/shopify',
        icon: ShoppingBag,
    },
]

export default function ServiceSelector() {
    const navigate = useNavigate()
    const { user, signOut } = useAuth()

    return (
        <div className="service-selector-page">
            {/* Top Navigation */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-end items-center z-50">
                {user ? (
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm text-black/60 font-medium">
                            <UserIcon className="w-4 h-4" />
                            {user.email}
                        </div>
                        <button 
                            onClick={() => signOut()}
                            className="btn btn-outline text-sm py-2 px-4 rounded-full flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Log Out
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <Link to="/login" className="text-sm font-semibold text-black hover:text-black/70 px-4 py-2 transition-colors">
                            Sign In
                        </Link>
                        <Link to="/signup" className="text-sm font-semibold text-white bg-black hover:bg-black/80 px-5 py-2 rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10">
                            Sign Up
                        </Link>
                    </div>
                )}
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
                {/* Header */}
                <div className="text-center mb-16 animate-fade-in">
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/5 border border-black/10 text-black/80 text-sm font-medium mb-6">
                        <Zap className="w-4 h-4 text-black" />
                        LeadFlow Platform
                    </div>
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-black tracking-tight mb-4 lowercase" style={{ letterSpacing: '-0.02em' }}>
                        start with <span className="noise-bg relative inline-block text-black">mix</span>
                    </h1>
                    <p className="text-lg text-black/60 max-w-xl mx-auto leading-relaxed mt-6">
                        Nothing is new. LeadFlow explores new possibilities by mixing and reinterpreting familiar elements.
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
                                className="service-card group relative overflow-hidden rounded-2xl border border-black/10 
                                    bg-transparent p-8 text-left transition-all duration-500 
                                    hover:bg-black/5 hover:border-black/20 hover:scale-[1.02] hover:-translate-y-1"
                            >
                                <div className="relative z-10">
                                    {/* Title section */}
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-black mb-1 lowercase">
                                                {service.title}
                                            </h2>
                                            <p className="text-sm font-medium text-black/60">
                                                {service.subtitle}
                                            </p>
                                        </div>
                                        <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center 
                                            group-hover:scale-110 transition-transform duration-300">
                                            <Icon className="w-6 h-6 text-black" />
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-black/50 text-sm leading-relaxed mb-8">
                                        {service.description}
                                    </p>

                                    {/* CTA */}
                                    <div className="flex items-center gap-2 text-black font-semibold text-sm group-hover:gap-3 transition-all duration-300">
                                        explore
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Footer */}
                <p className="text-black/40 text-xs mt-16 animate-fade-in uppercase tracking-widest">
                    LeadFlow v2.0
                </p>
            </div>
        </div>
    )
}
