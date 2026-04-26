import { useNavigate } from 'react-router-dom'
import { Search, Users, ArrowRight, Zap, Globe, Target, Mail, BarChart3, Sparkles } from 'lucide-react'

const services = [
    {
        id: 'seo',
        title: 'SEO Services',
        subtitle: 'Local Business Outreach Engine',
        description: 'Discover local businesses, audit their SEO health, and launch personalized outreach campaigns to convert high-potential leads.',
        path: '/seo/leads',
        gradient: 'from-primary-700 via-primary-600 to-accent-400',
        iconBg: 'bg-primary-700/20',
        hoverShadow: 'hover:shadow-[0_20px_60px_-15px_rgba(124,45,66,0.4)]',
        features: [
            { icon: Search, label: 'Lead Discovery' },
            { icon: BarChart3, label: 'SEO Auditing' },
            { icon: Mail, label: 'Email Campaigns' },
            { icon: Target, label: 'CRM Integration' },
        ],
        accentColor: 'text-accent-400',
        borderHover: 'hover:border-primary-700/40',
    },
    {
        id: 'b2b',
        title: 'B2B Services',
        subtitle: 'Lead Generation Wizard',
        description: 'Upload Apollo exports, evaluate lead quality, and generate AI-powered email sequences tailored to each buyer persona.',
        path: '/b2b/leads',
        gradient: 'from-sky-600 via-blue-600 to-indigo-600',
        iconBg: 'bg-sky-600/20',
        hoverShadow: 'hover:shadow-[0_20px_60px_-15px_rgba(14,116,210,0.4)]',
        features: [
            { icon: Users, label: 'CSV Lead Import' },
            { icon: Sparkles, label: 'AI Scoring' },
            { icon: Mail, label: 'Sequence Builder' },
            { icon: Globe, label: 'Multi-Persona' },
        ],
        accentColor: 'text-sky-400',
        borderHover: 'hover:border-sky-500/40',
    },
]

export default function ServiceSelector() {
    const navigate = useNavigate()

    return (
        <div className="service-selector-page">
            {/* Animated background orbs */}
            <div className="selector-bg-orb selector-bg-orb--1" />
            <div className="selector-bg-orb selector-bg-orb--2" />
            <div className="selector-bg-orb selector-bg-orb--3" />

            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
                {/* Header */}
                <div className="text-center mb-14 animate-fade-in">
                    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/80 text-sm font-medium mb-6">
                        <Zap className="w-4 h-4 text-accent-400" />
                        LeadFlow Platform
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-4">
                        Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-amber-300">Service</span>
                    </h1>
                    <p className="text-lg text-white/60 max-w-xl mx-auto leading-relaxed">
                        Select a module to get started with your lead generation and outreach workflow.
                    </p>
                </div>

                {/* Service Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full animate-fade-in-up">
                    {services.map((service) => (
                        <button
                            key={service.id}
                            onClick={() => navigate(service.path)}
                            className={`service-card group relative overflow-hidden rounded-2xl border border-white/10 
                                bg-white/[0.06] backdrop-blur-xl p-8 text-left transition-all duration-500 
                                ${service.hoverShadow} ${service.borderHover}
                                hover:bg-white/[0.1] hover:scale-[1.02] hover:-translate-y-1`}
                        >
                            {/* Gradient glow on hover */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 
                                group-hover:opacity-[0.08] transition-opacity duration-500 rounded-2xl`} />

                            <div className="relative z-10">
                                {/* Title section */}
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-1">
                                            {service.title}
                                        </h2>
                                        <p className={`text-sm font-medium ${service.accentColor}`}>
                                            {service.subtitle}
                                        </p>
                                    </div>
                                    <div className={`w-12 h-12 rounded-xl ${service.iconBg} flex items-center justify-center 
                                        group-hover:scale-110 transition-transform duration-300`}>
                                        {service.id === 'seo' ? (
                                            <Search className="w-6 h-6 text-white/80" />
                                        ) : (
                                            <Users className="w-6 h-6 text-white/80" />
                                        )}
                                    </div>
                                </div>

                                {/* Description */}
                                <p className="text-white/50 text-sm leading-relaxed mb-8">
                                    {service.description}
                                </p>

                                {/* Feature pills */}
                                <div className="flex flex-wrap gap-2 mb-8">
                                    {service.features.map(({ icon: Icon, label }) => (
                                        <span
                                            key={label}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg 
                                                bg-white/[0.07] text-white/70 text-xs font-medium border border-white/[0.08]"
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                            {label}
                                        </span>
                                    ))}
                                </div>

                                {/* CTA */}
                                <div className="flex items-center gap-2 text-white font-medium text-sm group-hover:gap-3 transition-all duration-300">
                                    Get Started
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <p className="text-white/30 text-xs mt-12 animate-fade-in">
                    LeadFlow v2.0 — Enterprise Lead & Outreach Platform
                </p>
            </div>
        </div>
    )
}
