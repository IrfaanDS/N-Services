import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Sparkles, Download, Eye, Mail, Loader2, Building2, ChevronDown, ChevronUp, Settings2,
    Users, Clock, AlertCircle
} from 'lucide-react'
import { b2bEmailsAPI } from '../../services/api'

const TONE_OPTIONS = [
    { value: 'professional', label: 'Professional', desc: 'Polished and business-appropriate' },
    { value: 'casual', label: 'Casual', desc: 'Friendly and conversational' },
    { value: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
    { value: 'formal', label: 'Formal', desc: 'Traditional and structured' },
]

export default function B2BEmailGeneration() {
    const navigate = useNavigate()
    
    // ── Leads from evaluation ──
    const [leads, setLeads] = useState([])

    // ── Company profile ──
    const [company, setCompany] = useState({
        name: 'Nexus Core',
        industry: 'IT Consulting & Software Development',
        description: 'A custom software development and IT consulting agency specializing in modernizing business operations and legacy systems.',
        what_do_you_sell: 'A $29.99/month self-serve SaaS ERP solution designed for rapid deployment.',
        who_do_you_sell_to: 'CTOs, VPs of Engineering, and IT Directors in the manufacturing and logistics industries within the United States.',
        what_are_the_benefits: 'Affordable legacy system upgrades, easy self-serve setup, and specialized workflows for logistics and manufacturing.',
        website_url: 'https://nexuscore.io',
    })

    // ── Buyer personas ──
    const [personas, setPersonas] = useState([])

    // ── Generation settings ──
    const [tone, setTone] = useState('professional')
    const [numSequences, setNumSequences] = useState(3)
    const [showCompanyForm, setShowCompanyForm] = useState(true)

    // ── State for Generation ──
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [results, setResults] = useState(null)
    const [previewGroup, setPreviewGroup] = useState(null)
    const [previewEmailIdx, setPreviewEmailIdx] = useState(0)

    // ── Load leads and profile from session ──
    useEffect(() => {
        const storedLeads = sessionStorage.getItem('b2b_scored_leads')
        const storedProfile = sessionStorage.getItem('b2b_company_profile')

        if (storedProfile) {
            try {
                setCompany(JSON.parse(storedProfile))
            } catch (e) {
                console.error('Failed to parse b2b_company_profile', e)
            }
        }

        if (storedLeads) {
            try {
                const parsed = JSON.parse(storedLeads)
                const withEmail = parsed.filter(l => l.email)
                setLeads(withEmail)

                // Auto-generate personas from lead titles
                const titleGroups = {}
                for (const lead of withEmail) {
                    const title = lead.title || 'Business Professional'
                    if (!titleGroups[title]) titleGroups[title] = 0
                    titleGroups[title]++
                }

                const autoPersonas = Object.entries(titleGroups).map(([title, count]) => {
                    const titleLower = title.toLowerCase()
                    let role = 'Business Leadership'
                    if (/ceo|founder|owner|president/.test(titleLower)) role = 'Executive Leadership'
                    else if (/cto|engineer|tech/.test(titleLower)) role = 'Technical Leadership'
                    else if (/cmo|market|growth/.test(titleLower)) role = 'Marketing Leadership'
                    else if (/sales|revenue/.test(titleLower)) role = 'Sales Leadership'
                    else if (/hr|people|talent/.test(titleLower)) role = 'People & HR Leadership'

                    return {
                        title,
                        role,
                        count,
                        responsibilities: [
                            `Oversee ${role.toLowerCase()} functions`,
                            'Drive strategic initiatives',
                            'Manage team performance',
                        ],
                        primary_goal: 'Improve operational efficiency and drive business results',
                        pain_points: [
                            'Time-consuming manual processes',
                            'Difficulty finding reliable service providers',
                            'Need to demonstrate clear ROI',
                        ],
                        desired_outcomes: [
                            'Streamlined operations',
                            'Measurable business impact',
                            'Trusted partnership with proven experts',
                        ],
                        problems_we_solve: [
                            'End-to-end service delivery with measurable outcomes',
                            'Dedicated support and transparent reporting',
                            'Industry-specific expertise and best practices',
                        ],
                    }
                })
                setPersonas(autoPersonas)
            } catch (e) {
                console.error('Failed to parse b2b_scored_leads', e)
            }
        }
    }, [])

    // ── Generate emails ──
    const handleGenerate = async () => {
        if (!company.name || !company.industry || !company.description ||
            !company.what_do_you_sell || !company.who_do_you_sell_to || !company.what_are_the_benefits) {
            setError('Please fill in all company profile fields before generating emails.')
            setShowCompanyForm(true)
            return
        }

        if (personas.length === 0) {
            setError('No buyer personas available. Upload leads with job titles first.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const payload = {
                company,
                buyer_personas: personas.map(p => ({
                    title: p.title,
                    role: p.role,
                    responsibilities: p.responsibilities,
                    primary_goal: p.primary_goal,
                    pain_points: p.pain_points,
                    desired_outcomes: p.desired_outcomes,
                    problems_we_solve: p.problems_we_solve,
                })),
                num_sequences: numSequences,
                tone,
                leads: leads.map(l => ({
                    id: l.id,
                    email: l.email,
                    first_name: l.first_name,
                    last_name: l.last_name,
                    title: l.title,
                    company: l.company || l.business_name,
                    website: l.website || l.website_url
                }))
            }

            const res = await b2bEmailsAPI.generate(payload)
            setResults(res.data)
            if (res.data.total_emails === 0) {
                setError(res.data.message || 'Generation returned no emails.')
            }
        } catch (err) {
            console.error('Email generation failed:', err)
            setError(err.response?.data?.detail || 'Failed to generate email sequences. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // ── Export results ──
    const handleExport = () => {
        if (!results?.data || leads.length === 0) return
        const header = ['First Name', 'Last Name', 'Email', 'Job Title', 'Persona Role']
        for (let i = 1; i <= numSequences; i++) header.push(`Seq ${i} Subject`, `Seq ${i} Body`)
        const rows = [header.join(',')]
        for (const lead of leads) {
            const persona = results.data.find(p => p.persona_title === (lead.title || 'Business Professional'))
            if (!persona) continue
            const row = [`"${lead.first_name || ''}"`, `"${lead.last_name || ''}"`, `"${lead.email || ''}"`, `"${lead.title || ''}"`, `"${persona.persona_title || ''}"`]
            for (let i = 0; i < numSequences; i++) {
                const email = persona.emails?.[i]
                if (email) row.push(`"${email.subject || ''}"`, `"${email.body || ''}"`)
                else row.push('""', '""')
            }
            rows.push(row.join(','))
        }
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `b2b_outreach_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
    }

    return (
        <div className="page-enter space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">B2B Email Generation</h1>
                    <p className="text-sm text-gray-500 mt-1">Generate AI-powered email sequences tailored to each buyer persona</p>
                </div>
                <div className="flex items-center gap-3">
                    {results && (
                        <button className="btn btn-outline border-sky-500 text-sky-600 hover:bg-sky-50" onClick={() => navigate('/b2b/outreach')}>
                            <Mail className="w-4 h-4" /> Review in Outreach
                        </button>
                    )}
                    {results && (
                        <button className="btn btn-outline" onClick={handleExport}>
                            <Download className="w-4 h-4" /> Export Sequences
                        </button>
                    )}
                    <button className="btn btn-b2b" onClick={handleGenerate} disabled={loading || leads.length === 0}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {loading ? 'Generating...' : 'Generate Sequences'}
                    </button>
                </div>
            </div>
            
            {/* ── Error Banner ── */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 animate-fade-in shadow-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-bold">Generation Failed</p>
                        <p className="opacity-80">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold p-1">&times;</button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <StatCard label="Leads with Email" value={leads.length} icon={Mail} color="text-sky-600 bg-sky-50" />
                <StatCard label="Personas Detected" value={personas.length} icon={Users} color="text-indigo-600 bg-indigo-50" />
                <StatCard label="Sequences" value={numSequences} icon={Settings2} color="text-amber-600 bg-amber-50" />
                <StatCard label="Emails Generated" value={results?.total_emails || 0} icon={Sparkles} color="text-emerald-600 bg-emerald-50" />
            </div>

            <div className="card mb-6">
                <button className="flex items-center justify-between w-full text-left" onClick={() => setShowCompanyForm(!showCompanyForm)}>
                    <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-sky-600" />
                        <h3 className="text-sm font-semibold text-gray-700">Company Profile</h3>
                    </div>
                    {showCompanyForm ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {showCompanyForm && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-5 border-t border-surface-200">
                        <InputField label="Company Name" value={company.name} onChange={(v) => setCompany({ ...company, name: v })} />
                        <InputField label="Industry" value={company.industry} onChange={(v) => setCompany({ ...company, industry: v })} />
                        <div className="md:col-span-2"><InputField label="Description" value={company.description} onChange={(v) => setCompany({ ...company, description: v })} textarea /></div>
                        <InputField label="What do you sell?" value={company.what_do_you_sell} onChange={(v) => setCompany({ ...company, what_do_you_sell: v })} textarea />
                        <InputField label="Who do you sell to?" value={company.who_do_you_sell_to} onChange={(v) => setCompany({ ...company, who_do_you_sell_to: v })} textarea />
                        <InputField label="Key Benefits" value={company.what_are_the_benefits} onChange={(v) => setCompany({ ...company, what_are_the_benefits: v })} textarea />
                        <InputField label="Website URL" value={company.website_url} onChange={(v) => setCompany({ ...company, website_url: v })} />
                    </div>
                )}
            </div>

            {results && (
                <div className="card p-0 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <h3 className="text-sm font-bold">Preview Generated Sequences</h3>
                        <span className="text-xs text-gray-400 font-medium">{results.elapsed_seconds}s generation time</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {results.data.map((group, idx) => (
                            <div key={idx} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{group.persona_title}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{group.emails.length} Step Sequence</p>
                                    </div>
                                    <button onClick={() => { setPreviewGroup(group); setPreviewEmailIdx(0) }} className="text-xs text-sky-600 font-bold hover:underline flex items-center gap-1">
                                        <Eye className="w-3 h-3" /> Preview Full Cadence
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    {group.emails.map((_, eIdx) => (
                                        <div key={eIdx} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-400">{eIdx + 1}</div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Preview Modal ── */}
            {previewGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold flex items-center gap-2"><Mail className="w-5 h-5 text-sky-600" /> Sequence Preview</h3>
                            <button onClick={() => setPreviewGroup(null)}><Clock className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="flex gap-2 p-4 bg-gray-50 overflow-x-auto">
                            {previewGroup.emails.map((_, i) => (
                                <button key={i} onClick={() => setPreviewEmailIdx(i)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${previewEmailIdx === i ? 'bg-sky-600 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-200 hover:border-sky-200'}`}>Step {i + 1}</button>
                            ))}
                        </div>
                        <div className="p-8 overflow-y-auto flex-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Subject</p>
                            <p className="text-sm font-bold text-gray-900 mb-6">{previewGroup.emails[previewEmailIdx]?.subject}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Body</p>
                            <div className="bg-gray-50 p-6 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap border border-gray-100 font-sans">{previewGroup.emails[previewEmailIdx]?.body}</div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end"><button className="btn btn-primary" onClick={() => setPreviewGroup(null)}>Close Preview</button></div>
                    </div>
                </div>
            )}
        </div>
    )
}

function StatCard({ label, value, icon: Icon, color }) {
    return (
        <div className="card flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
            <div><p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{label}</p><p className="text-xl font-black text-gray-900">{value}</p></div>
        </div>
    )
}

function InputField({ label, value, onChange, placeholder, textarea, type = "text" }) {
    const classes = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/30 transition-all outline-none"
    return (
        <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wide">{label}</label>
            {textarea ? (
                <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${classes} h-24 resize-none`} />
            ) : (
                <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={classes} />
            )}
        </div>
    )
}
