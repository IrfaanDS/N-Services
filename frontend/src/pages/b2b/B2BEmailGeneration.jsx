import { useState, useEffect } from 'react'
import {
    Sparkles, Download, Eye, Mail, Loader2, AlertCircle, X,
    Users, Building2, Globe, ChevronDown, ChevronUp, Settings2
} from 'lucide-react'
import { b2bEmailsAPI } from '../../services/api'

const TONE_OPTIONS = [
    { value: 'professional', label: 'Professional', desc: 'Polished and business-appropriate' },
    { value: 'casual', label: 'Casual', desc: 'Friendly and conversational' },
    { value: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
    { value: 'formal', label: 'Formal', desc: 'Traditional and structured' },
]

export default function B2BEmailGeneration() {
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
    const [showPersonas, setShowPersonas] = useState(false)

    // ── State ──
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
        // Validate company profile
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
            }

            const res = await b2bEmailsAPI.generate(payload)
            setResults(res.data)
            if (res.data.total_emails === 0) {
                setError(res.data.message || 'Smythos API returned no emails.')
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

        // Create Header: Lead Info + Sequences
        const header = ['First Name', 'Last Name', 'Email', 'Job Title', 'Persona Role']
        for (let i = 1; i <= numSequences; i++) {
            header.push(`Seq ${i} Subject`, `Seq ${i} Body`)
        }
        const rows = [header.join(',')]

        // For each lead, find their persona's sequence
        for (const lead of leads) {
            const persona = results.data.find(p => p.persona_title === (lead.title || 'Business Professional'))
            if (!persona) continue

            const row = [
                `"${(lead.first_name || '').replace(/"/g, '""')}"`,
                `"${(lead.last_name || '').replace(/"/g, '""')}"`,
                `"${(lead.email || '').replace(/"/g, '""')}"`,
                `"${(lead.title || '').replace(/"/g, '""')}"`,
                `"${(persona.persona_title || '').replace(/"/g, '""')}"`,
            ]

            // Add each sequence step
            for (let i = 0; i < numSequences; i++) {
                const email = persona.emails?.[i]
                if (email) {
                    row.push(`"${(email.subject || '').replace(/"/g, '""')}"`)
                    row.push(`"${(email.body || '').replace(/"/g, '""')}"`)
                } else {
                    row.push('""', '""')
                }
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

    const totalLeads = leads.length
    const totalEmails = results?.total_emails || 0

    return (
        <div className="page-enter">
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">B2B Email Generation</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Generate AI-powered email sequences tailored to each buyer persona
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {results && (
                        <button className="btn btn-outline" onClick={handleExport}>
                            <Download className="w-4 h-4" />
                            Export Sequences
                        </button>
                    )}
                    <button className="btn btn-b2b" onClick={handleGenerate} disabled={loading || leads.length === 0}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {loading ? 'Generating...' : 'Generate Sequences'}
                    </button>
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* ── Stats row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Leads with Email', value: totalLeads, icon: Mail, color: 'text-sky-600 bg-sky-50' },
                    { label: 'Personas Detected', value: personas.length, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
                    { label: 'Sequences', value: numSequences, icon: Settings2, color: 'text-amber-600 bg-amber-50' },
                    { label: 'Emails Generated', value: totalEmails, icon: Sparkles, color: 'text-emerald-600 bg-emerald-50' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="card flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{label}</p>
                            <p className="text-xl font-bold text-gray-900">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Company Profile Form ── */}
            <div className="card mb-6">
                <button
                    className="flex items-center justify-between w-full text-left"
                    onClick={() => setShowCompanyForm(!showCompanyForm)}
                >
                    <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-sky-600" />
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700">Company Profile</h3>
                            <p className="text-xs text-gray-400">Your company information for email personalization</p>
                        </div>
                    </div>
                    {showCompanyForm ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {showCompanyForm && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-5 border-t border-surface-200">
                        <InputField label="Company Name" value={company.name} onChange={(v) => setCompany({ ...company, name: v })} placeholder="e.g. SalesNimbus" />
                        <InputField label="Industry" value={company.industry} onChange={(v) => setCompany({ ...company, industry: v })} placeholder="e.g. Digital Marketing" />
                        <div className="md:col-span-2">
                            <InputField label="Description" value={company.description} onChange={(v) => setCompany({ ...company, description: v })} placeholder="Brief description of what your company does" textarea />
                        </div>
                        <InputField label="What do you sell?" value={company.what_do_you_sell} onChange={(v) => setCompany({ ...company, what_do_you_sell: v })} placeholder="Your products/services" textarea />
                        <InputField label="Who do you sell to?" value={company.who_do_you_sell_to} onChange={(v) => setCompany({ ...company, who_do_you_sell_to: v })} placeholder="Target audience" textarea />
                        <InputField label="Key Benefits" value={company.what_are_the_benefits} onChange={(v) => setCompany({ ...company, what_are_the_benefits: v })} placeholder="Main value propositions" textarea />
                        <InputField label="Website URL" value={company.website_url} onChange={(v) => setCompany({ ...company, website_url: v })} placeholder="https://yourcompany.com" />
                    </div>
                )}
            </div>

            {/* ── Buyer Personas (auto-detected) ── */}
            <div className="card mb-6">
                <button
                    className="flex items-center justify-between w-full text-left"
                    onClick={() => setShowPersonas(!showPersonas)}
                >
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-indigo-600" />
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700">Buyer Personas ({personas.length})</h3>
                            <p className="text-xs text-gray-400">Auto-detected from lead titles — click to review</p>
                        </div>
                    </div>
                    {showPersonas ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {showPersonas && (
                    <div className="mt-5 pt-5 border-t border-surface-200 space-y-3">
                        {personas.map((persona, idx) => (
                            <div key={idx} className="p-4 bg-surface-50 rounded-xl border border-surface-200">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{persona.title}</p>
                                        <p className="text-xs text-gray-500">{persona.role} · {persona.count} lead(s)</p>
                                    </div>
                                    <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg font-medium">
                                        Auto-detected
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500"><span className="font-medium">Goal:</span> {persona.primary_goal}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    <span className="font-medium">Pain Points:</span> {persona.pain_points.join(', ')}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Generation Settings ── */}
            <div className="card mb-6">
                <div className="flex items-center gap-3 mb-5">
                    <Settings2 className="w-5 h-5 text-amber-600" />
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700">Generation Settings</h3>
                        <p className="text-xs text-gray-400">Configure email tone and sequence count</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Tone selector */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">Email Tone</label>
                        <div className="grid grid-cols-2 gap-2">
                            {TONE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setTone(opt.value)}
                                    className={`p-3 rounded-xl border text-left transition-all ${tone === opt.value
                                        ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-500/20'
                                        : 'border-surface-200 hover:border-sky-300'
                                        }`}
                                >
                                    <p className={`text-sm font-medium ${tone === opt.value ? 'text-sky-700' : 'text-gray-700'}`}>
                                        {opt.label}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sequence count */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                            Number of Email Sequences: <span className="text-sky-600 font-bold">{numSequences}</span>
                        </label>
                        <input
                            type="range" min="1" max="5" value={numSequences}
                            onChange={(e) => setNumSequences(parseInt(e.target.value))}
                            className="w-full h-2 bg-surface-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-3">
                            Each sequence is a follow-up email in the outreach cadence.
                            More sequences = more touchpoints per prospect.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Results ── */}
            {results && results.data && (
                <div className="card p-0 overflow-hidden">
                    <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700">
                            Generated Sequences ({results.total_emails} emails across {results.total_groups} persona(s))
                        </h3>
                        <div className="flex items-center gap-4">
                            {results.raw_debug && (
                                <button 
                                    onClick={() => alert(`Raw Smythos Response:\n\n${results.raw_debug}`)}
                                    className="text-[10px] text-gray-400 hover:text-gray-600 underline"
                                >
                                    Debug Raw
                                </button>
                            )}
                            <span className="text-xs text-gray-400">Generated in {results.elapsed_seconds}s</span>
                        </div>
                    </div>

                    <div className="divide-y divide-surface-200">
                        {results.data.map((group, gIdx) => (
                            <div key={gIdx} className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{group.persona_title || 'Untitled Group'}</p>
                                        <p className="text-xs text-gray-500">{(group.emails || []).length} email(s) in sequence</p>
                                    </div>
                                    <button
                                        onClick={() => { setPreviewGroup(group); setPreviewEmailIdx(0) }}
                                        className="text-sm text-sky-600 hover:underline font-medium flex items-center gap-1"
                                    >
                                        <Eye className="w-4 h-4" /> Preview All
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="data-table text-xs min-w-[600px]">
                                        <thead>
                                            <tr>
                                                <th className="w-16">Seq #</th>
                                                <th>Subject Line</th>
                                                <th className="w-24">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(group.emails || []).length > 0 ? (
                                                (group.emails || []).map((email, eIdx) => (
                                                    <tr key={eIdx}>
                                                        <td>
                                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-sky-50 text-sky-700 font-bold text-xs">
                                                                {email.sequence_number || eIdx + 1}
                                                            </span>
                                                        </td>
                                                        <td className="text-gray-700 max-w-[400px] truncate font-medium">
                                                            {email.subject || '(No Subject)'}
                                                        </td>
                                                        <td>
                                                            <button
                                                                onClick={() => { setPreviewGroup(group); setPreviewEmailIdx(eIdx) }}
                                                                className="text-sm text-sky-600 hover:underline font-medium flex items-center gap-1"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" /> View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="3" className="py-4 text-center text-gray-400 italic">No emails found in this group</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── No leads state ── */}
            {leads.length === 0 && !results && (
                <div className="card flex flex-col items-center justify-center py-16 text-center">
                    <Mail className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">No leads available for email generation</p>
                    <p className="text-xs text-gray-400 mt-1">Go to B2B Lead Evaluation and click "Proceed to Email Generation"</p>
                </div>
            )}

            {/* ── Preview Modal ── */}
            {previewGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Mail className="w-5 h-5 text-sky-600" />
                                Email Preview — {previewGroup.persona_title || 'Untitled'}
                            </h3>
                            <button onClick={() => setPreviewGroup(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Sequence tabs */}
                        <div className="flex items-center gap-1 px-6 pt-4 pb-2 overflow-x-auto">
                            {(previewGroup.emails || []).map((email, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setPreviewEmailIdx(idx)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${previewEmailIdx === idx
                                        ? 'bg-sky-100 text-sky-700 border border-sky-200'
                                        : 'text-gray-500 hover:bg-gray-100'
                                        }`}
                                >
                                    Sequence {email.sequence_number || idx + 1}
                                </button>
                            ))}
                        </div>

                        <div className="p-6 overflow-y-auto bg-gray-50/50 flex-1">
                            {previewGroup.emails?.[previewEmailIdx] ? (
                                <>
                                    <div className="mb-4">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Group / Persona</p>
                                        <p className="text-sm text-gray-900 font-medium">{previewGroup.persona_title || 'N/A'}</p>
                                    </div>
                                    <div className="mb-6">
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Subject</p>
                                        <p className="text-sm text-gray-900 font-medium">
                                            {previewGroup.emails[previewEmailIdx].subject || '(No Subject)'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Message Content</p>
                                        <div className="bg-white p-4 rounded-lg border border-gray-200 text-gray-700 text-sm whitespace-pre-wrap leading-relaxed shadow-sm font-sans">
                                            {previewGroup.emails[previewEmailIdx].body || '(Empty Body)'}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400 italic">
                                    No email content to display
                                </div>
                            )}
                        </div>


                        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={previewEmailIdx === 0}
                                    onClick={() => setPreviewEmailIdx(i => i - 1)}
                                    className="btn btn-outline text-xs py-1.5 px-3 disabled:opacity-40"
                                >
                                    ← Previous
                                </button>
                                <button
                                    disabled={previewEmailIdx >= (previewGroup.emails?.length || 1) - 1}
                                    onClick={() => setPreviewEmailIdx(i => i + 1)}
                                    className="btn btn-outline text-xs py-1.5 px-3 disabled:opacity-40"
                                >
                                    Next →
                                </button>
                            </div>
                            <button className="btn btn-outline" onClick={() => setPreviewGroup(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

/* ── Reusable input field ── */
function InputField({ label, value, onChange, placeholder, textarea }) {
    const classes = "w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/30 transition-all"
    return (
        <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
            {textarea ? (
                <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                    className={`${classes} resize-none h-20`} />
            ) : (
                <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                    className={classes} />
            )}
        </div>
    )
}
