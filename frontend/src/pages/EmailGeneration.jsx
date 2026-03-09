import { useState, useEffect } from 'react'
import { Sparkles, Download, Eye, ArrowRight, Mail, Loader2, AlertCircle, X, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { emailsAPI } from '../services/api'

function getStatusBadge(status) {
    switch (status) {
        case 'generated': return <span className="badge badge-active"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Generated</span>
        case 'processing': return <span className="badge text-blue-600 bg-blue-50"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>Processing...</span>
        case 'pending': return <span className="badge text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-400"></span>Pending</span>
        case 'queued': return <span className="badge text-gray-500"><span className="w-2 h-2 rounded-full bg-gray-300"></span>Queued</span>
        default: return null
    }
}

export default function EmailGeneration() {
    const navigate = useNavigate()
    const [leads, setLeads] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [previewEmail, setPreviewEmail] = useState(null)

    useEffect(() => {
        const stored = sessionStorage.getItem('scored_leads')
        if (stored) {
            try {
                const parsedLeads = JSON.parse(stored)
                const mappedLeads = parsedLeads.filter(l => l.email).map(l => ({
                    ...l,
                    status: 'pending',
                    subject: '',
                    body: ''
                }))
                setLeads(mappedLeads)
            } catch (e) {
                console.error("Failed to parse scored_leads", e)
            }
        }
    }, [])

    const handleGenerate = async () => {
        const pendingLeads = leads.filter(l => l.status === 'pending' || l.status === 'queued')
        if (pendingLeads.length === 0) return

        setLoading(true)
        setError(null)

        let currentLeads = leads.map(l => (l.status === 'pending' ? { ...l, status: 'queued' } : l))
        setLeads(currentLeads)

        try {
            for (const lead of pendingLeads) {
                // Set current lead as processing
                currentLeads = currentLeads.map(l =>
                    l.business_id === lead.business_id ? { ...l, status: 'processing' } : l
                )
                setLeads(currentLeads)

                try {
                    const response = await emailsAPI.generate({
                        leads: [{
                            business_id: lead.business_id,
                            business_name: lead.business_name,
                            website_url: lead.website_url,
                            niche: lead.niche,
                            city: lead.city,
                            email: lead.email,
                            lead_score: lead.lead_score,
                            reasoning: lead.reasoning
                        }]
                    })

                    const data = response.data
                    if (data.data && data.data.length > 0) {
                        const generatedEmail = data.data[0]
                        currentLeads = currentLeads.map(l =>
                            l.business_id === lead.business_id ? {
                                ...l,
                                status: 'generated',
                                subject: generatedEmail.subject,
                                body: generatedEmail.body
                            } : l
                        )
                    } else {
                        throw new Error("No data returned")
                    }
                    setLeads(currentLeads)
                } catch (err) {
                    console.error(`Email generation failed for ${lead.business_name}`, err)
                    // Mark as failed/pending to try again later
                    currentLeads = currentLeads.map(l =>
                        l.business_id === lead.business_id ? { ...l, status: 'pending' } : l
                    )
                    setLeads(currentLeads)
                }
            }
        } finally {
            setLoading(false)
        }
    }

    const handleMoveToSending = () => {
        const generatedLeads = leads.filter(l => l.status === 'generated')
        if (generatedLeads.length === 0) {
            setError("No generated emails to move.")
            return
        }

        // Auto-download the CSV
        try {
            handleExport()
        } catch (e) { console.error("Could not export automatically", e) }

        // Give the browser a moment to process the download before unmounting
        setTimeout(() => {
            navigate('/email-sending', {
                state: {
                    autoOpenCampaign: true,
                    preselectedIds: generatedLeads.map(l => l.business_id)
                }
            })
        }, 300)
    }

    const handleExport = () => {
        if (leads.length === 0) return
        const headers = ['Business Name', 'Website URL', 'Email', 'Status', 'Subject', 'Body']
        const csvRows = [headers.join(',')]

        for (const lead of leads) {
            const row = [
                lead.business_name || '',
                lead.website_url || '',
                lead.email || '',
                lead.status || '',
                lead.subject || '',
                lead.body || ''
            ]
            csvRows.push(row.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))
        }

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'generated_emails.csv'
        a.click()
        window.URL.revokeObjectURL(url)
    }

    const totalLeads = leads.length
    const generatedCount = leads.filter(l => l.status === 'generated').length
    const pendingCount = leads.filter(l => l.status === 'pending').length
    const queuedCount = leads.filter(l => l.status === 'queued' || l.status === 'processing').length

    return (
        <div className="page-enter">
            {/* ── Page header ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Email Generation</h1>
                    <p className="text-sm text-gray-500 mt-1">Generate personalized emails based on SEO audit data</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="btn btn-outline" onClick={handleExport} disabled={leads.length === 0 || loading}>
                        <Download className="w-4 h-4" />
                        Export All
                    </button>
                    <button className="btn btn-accent" onClick={handleGenerate} disabled={pendingCount === 0 || loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {loading ? 'Generating...' : 'Generate Emails'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* ── Stats row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Leads', value: totalLeads, icon: Mail, color: 'text-primary-700 bg-primary-50' },
                    { label: 'Generated', value: generatedCount, icon: Sparkles, color: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Pending', value: pendingCount, icon: Eye, color: 'text-amber-600 bg-amber-50' },
                    { label: 'Queued', value: queuedCount, icon: ArrowRight, color: 'text-gray-600 bg-gray-100' },
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

            {/* ── Email list table ── */}
            <div className="card p-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Generated Emails (Preview)</h3>
                    <button
                        className="text-sm text-primary-700 hover:underline font-medium disabled:opacity-50 flex items-center gap-1"
                        onClick={handleMoveToSending}
                        disabled={generatedCount === 0 || loading}
                    >
                        <Send className="w-4 h-4" /> Proceed to Sending →
                    </button>
                </div>

                {leads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Mail className="w-10 h-10 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No leads selected for generation</p>
                        <p className="text-xs text-gray-400 mt-1">Go to Lead Evaluation to move leads here</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table min-w-[800px]">
                            <thead>
                                <tr>
                                    <th>Business</th>
                                    <th>Recipient</th>
                                    <th>Subject Line</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="font-medium text-gray-900 truncate max-w-[150px]">{item.business_name || item.website_url}</td>
                                        <td className="text-gray-500 truncate max-w-[150px]">{item.email}</td>
                                        <td className="text-gray-700 max-w-[300px] truncate">{item.subject || '—'}</td>
                                        <td>{getStatusBadge(item.status)}</td>
                                        <td>
                                            {item.status === 'generated' && (
                                                <button
                                                    onClick={() => setPreviewEmail(item)}
                                                    className="text-sm text-primary-700 hover:underline font-medium flex items-center gap-1"
                                                >
                                                    <Eye className="w-4 h-4" /> Preview
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Preview Modal ── */}
            {previewEmail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Mail className="w-5 h-5 text-primary-700" />
                                Email Preview
                            </h3>
                            <button onClick={() => setPreviewEmail(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto bg-gray-50/50">
                            <div className="mb-4">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">To</p>
                                <p className="text-sm text-gray-900 font-medium">{previewEmail.email}</p>
                            </div>
                            <div className="mb-6">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Subject</p>
                                <p className="text-sm text-gray-900 font-medium">{previewEmail.subject}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Message</p>
                                <div className="bg-white p-4 rounded-lg border border-gray-200 text-gray-700 text-sm whitespace-pre-wrap leading-relaxed shadow-sm">
                                    {previewEmail.body}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
                            <button className="btn btn-outline" onClick={() => setPreviewEmail(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
