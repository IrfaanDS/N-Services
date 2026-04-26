import { useState, useEffect, useRef } from 'react'
import {
    Sparkles, Download, Eye, Mail, Loader2, AlertCircle, X,
    Users, Building2, Globe, ChevronDown, ChevronUp, Settings2,
    Send, Inbox, RefreshCcw, CheckCircle, Trash2, Edit2, Play, Settings,
    Plus, Server, Check, Clock
} from 'lucide-react'
import { b2bEmailsAPI, sendingAPI } from '../../services/api'

const TONE_OPTIONS = [
    { value: 'professional', label: 'Professional', desc: 'Polished and business-appropriate' },
    { value: 'casual', label: 'Casual', desc: 'Friendly and conversational' },
    { value: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
    { value: 'formal', label: 'Formal', desc: 'Traditional and structured' },
]

export default function B2BEmailGeneration() {
    const [activeTab, setActiveTab] = useState('generation')
    
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

    // ── State for Generation ──
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [results, setResults] = useState(null)
    const [previewGroup, setPreviewGroup] = useState(null)
    const [previewEmailIdx, setPreviewEmailIdx] = useState(0)

    // ── State for Sending ──
    const [mailbox, setMailbox] = useState([])
    const [loadingMailbox, setLoadingMailbox] = useState(false)
    const [selectedLeads, setSelectedLeads] = useState(new Set())
    const [accounts, setAccounts] = useState([])
    const [selectedAccount, setSelectedAccount] = useState('')
    const [showCampaignModal, setShowCampaignModal] = useState(false)
    const [campaignName, setCampaignName] = useState(`B2B Campaign - ${new Date().toLocaleDateString()}`)
    const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)

    // ── State for Domain/Mailbox Management ──
    const [showAccountsModal, setShowAccountsModal] = useState(false)
    const [accForm, setAccForm] = useState({
        name: '', smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '',
        imap_host: '', imap_port: 993, imap_user: '', imap_pass: ''
    })
    const [savingAccount, setSavingAccount] = useState(false)
    const [editAccountId, setEditAccountId] = useState(null)

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

    // ── Fetch Mailbox & Accounts ──
    const fetchMailboxData = async (quiet = false) => {
        if (!quiet) setLoadingMailbox(true)
        try {
            const [mailboxRes, accountsRes] = await Promise.all([
                sendingAPI.getMailbox('all'),
                sendingAPI.getAccounts()
            ])
            const b2bLeads = (mailboxRes.data?.emails || []).filter(e => e.type === 'b2b')
            setMailbox(b2bLeads)
            setAccounts(accountsRes.data || [])
            if (accountsRes.data?.length > 0 && !selectedAccount) {
                setSelectedAccount(accountsRes.data[0].id)
            }
        } catch (err) {
            console.error('Failed to fetch sending data', err)
        } finally {
            if (!quiet) setLoadingMailbox(false)
        }
    }

    // Poller for active sending
    useEffect(() => {
        let poller = null
        if (activeTab === 'sending') {
            fetchMailboxData()
            // Poll every 4 seconds if there are leads in "scheduled" or "sending" status
            poller = setInterval(() => {
                const isSending = mailbox.some(m => m.status === 'scheduled' || m.status === 'sending')
                if (isSending || activeTab === 'sending') {
                    fetchMailboxData(true)
                }
            }, 4000)
        }
        return () => clearInterval(poller)
    }, [activeTab, mailbox.length])

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

    // ── Campaign creation ──
    const handleCreateCampaign = async () => {
        if (selectedLeads.size === 0 || !selectedAccount) return
        setIsCreatingCampaign(true)
        try {
            await sendingAPI.sendCampaign({
                campaign_name: campaignName,
                business_ids: Array.from(selectedLeads),
                account_id: selectedAccount,
                send_rate: 10, // 10 emails per second (max)
            })
            setShowCampaignModal(false)
            setSelectedLeads(new Set())
            // Immediately refresh to show "scheduled" status
            await fetchMailboxData(true)
        } catch (err) {
            console.error('Campaign creation failed', err)
            alert('Failed to start campaign. Check if your backend is running.')
        } finally {
            setIsCreatingCampaign(false)
        }
    }

    // ... Account management logic ...
    const handleSaveAccount = async () => {
        if (!accForm.name || !accForm.smtp_host || !accForm.smtp_user) {
            alert("Name, SMTP host, and User are required.")
            return
        }
        setSavingAccount(true)
        try {
            if (editAccountId) {
                await sendingAPI.updateAccount(editAccountId, accForm)
            } else {
                await sendingAPI.addAccount(accForm)
            }
            await fetchMailboxData()
            setAccForm({
                name: '', smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '',
                imap_host: '', imap_port: 993, imap_user: '', imap_pass: ''
            })
            setEditAccountId(null)
        } catch (err) {
            console.error(err)
            alert('Failed to save account.')
        } finally {
            setSavingAccount(false)
        }
    }

    const handleDeleteAccount = async (id) => {
        if (!confirm("Delete this domain?")) return
        try {
            await sendingAPI.deleteAccount(id)
            fetchMailboxData()
        } catch (e) {
            console.error(e)
        }
    }

    const getStatusLabel = (status) => {
        switch (status) {
            case 'sent': return <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> SENT</span>
            case 'scheduled': return <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center gap-1 animate-pulse"><Clock className="w-3 h-3" /> SENDING...</span>
            case 'failed': return <span className="px-2 py-0.5 rounded-lg bg-red-100 text-red-700 font-bold">FAILED</span>
            default: return <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 font-bold">DRAFT</span>
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
        <div className="page-enter">
            {/* ── Tabs ── */}
            <div className="flex items-center gap-6 border-b border-gray-200 mb-6">
                <button
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'generation' ? 'border-sky-600 text-sky-600' : 'border-transparent text-gray-400'}`}
                    onClick={() => setActiveTab('generation')}
                >
                    Email Generation
                </button>
                <button
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'sending' ? 'border-sky-600 text-sky-600' : 'border-transparent text-gray-400'}`}
                    onClick={() => setActiveTab('sending')}
                >
                    Sending & Outreach
                </button>
            </div>

            {activeTab === 'generation' ? (
                <>
                    {/* ── Generation Tab Content ── */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">B2B Email Generation</h1>
                            <p className="text-sm text-gray-500 mt-1">Generate AI-powered email sequences tailored to each buyer persona</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {results && (
                                <button className="btn btn-outline border-sky-500 text-sky-600 hover:bg-sky-50" onClick={() => setActiveTab('sending')}>
                                    <Mail className="w-4 h-4" /> Review in Mailbox
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
                    {/* ... persona display ... */}
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
                </>
            ) : (
                <div className="space-y-6">
                    {/* ── Sending Tab Content ── */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">B2B Outreach Mailbox</h2>
                            <p className="text-sm text-gray-500">Review and send generated emails for your B2B leads</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="btn btn-outline" onClick={() => setShowAccountsModal(true)}>
                                <Settings className="w-4 h-4" /> Manage Domains
                            </button>
                            <button className="btn btn-outline" onClick={() => fetchMailboxData()}>
                                <RefreshCcw className={`w-4 h-4 ${loadingMailbox ? 'animate-spin' : ''}`} />
                            </button>
                            <button className="btn btn-primary shadow-lg shadow-sky-200" disabled={selectedLeads.size === 0} onClick={() => setShowCampaignModal(true)}>
                                <Send className="w-4 h-4" /> Start Campaign ({selectedLeads.size})
                            </button>
                        </div>
                    </div>

                    {/* ── Sending Domains List ── */}
                    {accounts.length > 0 && (
                        <div className="flex gap-4 overflow-x-auto pb-2">
                            {accounts.map(acc => (
                                <div key={acc.id} className={`flex-shrink-0 p-4 rounded-2xl border cursor-pointer transition-all ${selectedAccount === acc.id ? 'border-sky-500 bg-sky-50 shadow-sm' : 'border-gray-200 bg-white hover:border-sky-200'}`} onClick={() => setSelectedAccount(acc.id)}>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedAccount === acc.id ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                            <Server className="w-4 h-4" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-900">{acc.name}</p>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium ml-11">{acc.smtp_user}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Mailbox Table ── */}
                    <div className="card p-0 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th className="w-10"><input type="checkbox" onChange={(e) => setSelectedLeads(e.target.checked ? new Set(mailbox.map(m => m.business_id)) : new Set())} checked={selectedLeads.size === mailbox.length && mailbox.length > 0} /></th>
                                        <th>Recipient</th>
                                        <th>Persona</th>
                                        <th>Subject</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mailbox.map((m) => (
                                        <tr key={m.business_id} className={selectedLeads.has(m.business_id) ? 'bg-sky-50/30' : ''}>
                                            <td><input type="checkbox" checked={selectedLeads.has(m.business_id)} onChange={() => { const next = new Set(selectedLeads); if (next.has(m.business_id)) next.delete(m.business_id); else next.add(m.business_id); setSelectedLeads(next); }} /></td>
                                            <td className="text-sm font-medium">{m.target_email}</td>
                                            <td><span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-lg font-bold">{m.persona}</span></td>
                                            <td className="text-sm text-gray-500 truncate max-w-[200px]">{m.subject}</td>
                                            <td>{getStatusLabel(m.status)}</td>
                                            <td><button className="p-1 hover:text-red-600" onClick={async () => { if (confirm('Delete?')) { await sendingAPI.deleteLead(m.business_id); fetchMailboxData(); } }}><Trash2 className="w-4 h-4" /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Manage Domains Modal ── */}
            {showAccountsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold flex items-center gap-2"><Server className="w-5 h-5 text-sky-600" /> Sending Domains</h3>
                            <button onClick={() => setShowAccountsModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="flex-1 flex overflow-hidden">
                            <div className="w-1/3 border-r border-gray-100 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                                <button className="w-full p-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:text-sky-600 hover:border-sky-300 transition-all flex flex-col items-center gap-2" onClick={() => { setEditAccountId(null); setAccForm({ name: '', smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '', imap_host: '', imap_port: 993, imap_user: '', imap_pass: '' }) }}>
                                    <Plus className="w-6 h-6" />
                                    <span className="text-xs font-bold uppercase">Add New Domain</span>
                                </button>
                                {accounts.map(acc => (
                                    <div key={acc.id} className={`p-4 rounded-2xl border cursor-pointer transition-all ${editAccountId === acc.id ? 'border-sky-500 bg-white shadow-lg' : 'border-gray-200 bg-white'}`} onClick={() => { setEditAccountId(acc.id); setAccForm({ ...acc, smtp_pass: '', imap_pass: '' }) }}>
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-sm font-bold text-gray-900">{acc.name}</p>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteAccount(acc.id) }} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                        <p className="text-[10px] text-gray-400 truncate">{acc.smtp_user}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                <h4 className="text-sm font-bold text-gray-900 mb-4">{editAccountId ? 'Edit Connection' : 'Setup SMTP/IMAP Connection'}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2"><InputField label="Connection Name" value={accForm.name} onChange={(v) => setAccForm({ ...accForm, name: v })} placeholder="e.g. Work Gmail" /></div>
                                    <div className="col-span-2 p-3 bg-sky-50 rounded-xl text-[10px] font-bold text-sky-700 uppercase tracking-wider flex items-center gap-2"><Server className="w-3 h-3" /> SMTP (Outbound)</div>
                                    <InputField label="SMTP Host" value={accForm.smtp_host} onChange={(v) => setAccForm({ ...accForm, smtp_host: v })} />
                                    <InputField label="SMTP Port" value={accForm.smtp_port} onChange={(v) => setAccForm({ ...accForm, smtp_port: v })} />
                                    <InputField label="SMTP User" value={accForm.smtp_user} onChange={(v) => setAccForm({ ...accForm, smtp_user: v })} />
                                    <InputField label="SMTP Password" value={accForm.smtp_pass} onChange={(v) => setAccForm({ ...accForm, smtp_pass: v })} type="password" />
                                    <div className="col-span-2 p-3 bg-indigo-50 rounded-xl text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-2 mt-4"><Mail className="w-3 h-3" /> IMAP (Inbound)</div>
                                    <InputField label="IMAP Host" value={accForm.imap_host} onChange={(v) => setAccForm({ ...accForm, imap_host: v })} />
                                    <InputField label="IMAP Port" value={accForm.imap_port} onChange={(v) => setAccForm({ ...accForm, imap_port: v })} />
                                    <InputField label="IMAP User" value={accForm.imap_user} onChange={(v) => setAccForm({ ...accForm, imap_user: v })} />
                                    <InputField label="IMAP Password" value={accForm.imap_pass} onChange={(v) => setAccForm({ ...accForm, imap_pass: v })} type="password" />
                                </div>
                                <div className="flex justify-end pt-6"><button className="btn btn-primary w-full shadow-lg shadow-sky-100" onClick={handleSaveAccount} disabled={savingAccount}>{savingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {editAccountId ? 'Update Connection' : 'Save Connection'}</button></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Campaign Modal ── */}
            {showCampaignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold">Launch B2B Campaign</h3>
                            <button onClick={() => setShowCampaignModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Campaign Name</label>
                                <input className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-sky-100 outline-none" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Sending Domain</label>
                                <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-sky-100 outline-none" value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.smtp_user})</option>)}
                                    {accounts.length === 0 && <option value="">No domains connected</option>}
                                </select>
                            </div>
                            <div className="p-4 bg-sky-50 rounded-2xl flex items-start gap-3">
                                <Sparkles className="w-4 h-4 text-sky-600 mt-1" />
                                <p className="text-xs text-sky-700 leading-relaxed font-medium">This will queue <b>{selectedLeads.size}</b> leads for outreach. Each lead will receive the Step 1 email of their assigned persona sequence.</p>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button className="btn btn-outline" onClick={() => setShowCampaignModal(false)}>Cancel</button>
                            <button className="btn btn-primary shadow-lg shadow-sky-200" onClick={handleCreateCampaign} disabled={isCreatingCampaign || !selectedAccount}>
                                {isCreatingCampaign ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                {isCreatingCampaign ? 'Launching...' : 'Start Sending Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Preview Modal ── */}
            {previewGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold flex items-center gap-2"><Mail className="w-5 h-5 text-sky-600" /> Sequence Preview</h3>
                            <button onClick={() => setPreviewGroup(null)}><X className="w-5 h-5" /></button>
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
