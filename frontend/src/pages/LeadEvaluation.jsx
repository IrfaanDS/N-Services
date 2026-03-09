import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Upload, Download, FileSpreadsheet, Loader2, AlertCircle,
    TrendingUp, TrendingDown, BarChart3, ArrowRight, CheckCircle2, XCircle
} from 'lucide-react'
import { evaluationAPI } from '../services/api'

function getScoreColor(score) {
    if (score >= 70) return 'text-red-600 bg-red-50'
    if (score >= 40) return 'text-amber-600 bg-amber-50'
    return 'text-emerald-600 bg-emerald-50'
}

function getPriorityBadge(priority) {
    const map = {
        High: 'text-red-700 bg-red-50 border-red-200',
        Medium: 'text-amber-700 bg-amber-50 border-amber-200',
        Low: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    }
    return map[priority] || 'text-gray-600 bg-gray-50 border-gray-200'
}

export default function LeadEvaluation() {
    const navigate = useNavigate()
    const fileInputRef = useRef(null)

    // ── State ──
    const [scoredLeads, setScoredLeads] = useState([])
    const [summary, setSummary] = useState({ total: 0, avg_score: 0, high_potential: 0, low_potential: 0 })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [source, setSource] = useState(null) // 'acquisition' | 'upload' | null
    const [uploadedFileName, setUploadedFileName] = useState(null)
    const [incomingLeads, setIncomingLeads] = useState(null) // leads from acquisition

    // ── On mount: check if leads came from Lead Acquisition ──
    useEffect(() => {
        const stored = sessionStorage.getItem('audit_leads')
        if (stored) {
            try {
                const leads = JSON.parse(stored)
                if (leads.length > 0) {
                    setIncomingLeads(leads)
                    setSource('acquisition')
                    runEvaluation(leads)
                }
            } catch (e) {
                console.error('Failed to parse audit_leads:', e)
            }
            sessionStorage.removeItem('audit_leads')
        }
    }, [])

    // ── Run evaluation by business IDs ──
    async function runEvaluation(leads) {
        setLoading(true)
        setError(null)
        try {
            const businessIds = leads.map((l) => l.id).filter(Boolean)
            if (businessIds.length === 0) {
                setError('No valid business IDs found in the selected leads')
                setLoading(false)
                return
            }
            const res = await evaluationAPI.evaluate({ business_ids: businessIds })
            setScoredLeads(res.data.data)
            setSummary({
                total: res.data.total,
                avg_score: res.data.avg_score,
                high_potential: res.data.high_potential,
                low_potential: res.data.low_potential,
            })
        } catch (err) {
            console.error('Evaluation failed:', err)
            setError(err.response?.data?.detail || 'Evaluation failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // ── CSV Upload handler ──
    async function handleFileUpload(e) {
        const file = e.target.files?.[0]
        if (!file) return

        setLoading(true)
        setError(null)
        setSource('upload')
        setUploadedFileName(file.name)

        try {
            const res = await evaluationAPI.uploadCSV(file)
            setScoredLeads(res.data.data)
            setSummary({
                total: res.data.total,
                avg_score: res.data.avg_score,
                high_potential: res.data.high_potential,
                low_potential: res.data.low_potential,
            })
        } catch (err) {
            console.error('Upload evaluation failed:', err)
            setError(err.response?.data?.detail || 'Failed to evaluate uploaded CSV.')
        } finally {
            setLoading(false)
        }
    }

    // ── Download scored CSV ──
    function handleDownload() {
        if (scoredLeads.length === 0) return
        const headers = ['business_name', 'website_url', 'niche', 'city', 'country', 'email', 'phone', 'facebook', 'instagram', 'linkedin', 'lead_score', 'priority', 'reasoning']
        const csvRows = [headers.join(',')]
        for (const lead of scoredLeads) {
            csvRows.push(headers.map((h) => `"${(lead[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))
        }
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'scored_leads.csv'
        a.click()
        window.URL.revokeObjectURL(url)
    }

    // ── Proceed to Email Generation ──
    function handleProceedToEmail() {
        sessionStorage.setItem('scored_leads', JSON.stringify(scoredLeads))
        navigate('/email-generation')
    }

    const hasResults = scoredLeads.length > 0

    // ─────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────
    return (
        <div className="page-enter">
            {/* ── Page header ── */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Lead Evaluation</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {source === 'acquisition'
                            ? `Evaluating ${summary.total || '...'} leads from Lead Acquisition`
                            : source === 'upload'
                                ? `Evaluated ${uploadedFileName}`
                                : 'Score leads using the SEO audit model or upload a CSV'}
                    </p>
                </div>
                {hasResults && (
                    <div className="flex items-center gap-3">
                        <button className="btn btn-outline text-sm" onClick={handleDownload}>
                            <Download className="w-4 h-4" />
                            Download Results
                        </button>
                        <button className="btn btn-accent text-sm" onClick={handleProceedToEmail}>
                            <ArrowRight className="w-4 h-4" />
                            Proceed to Email Generation
                        </button>
                    </div>
                )}
            </div>

            {/* ── Upload + Stats Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Upload card */}
                <div
                    className="card lg:col-span-2 flex flex-col items-center justify-center py-10 border-2 border-dashed border-surface-300 hover:border-primary-700/30 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    {loading ? (
                        <>
                            <Loader2 className="w-10 h-10 text-primary-700 animate-spin mb-3" />
                            <p className="text-sm font-medium text-gray-700">Evaluating leads...</p>
                        </>
                    ) : (
                        <>
                            <Upload className="w-10 h-10 text-gray-400 mb-3" />
                            <p className="text-sm font-medium text-gray-700">Upload your CSV file for evaluation</p>
                            <p className="text-xs text-gray-400 mt-1">
                                CSV must contain <code className="bg-gray-100 px-1 rounded">business_id</code> or <code className="bg-gray-100 px-1 rounded">website_url</code> column
                            </p>
                            <button className="btn btn-outline mt-4 text-sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
                                <FileSpreadsheet className="w-4 h-4" />
                                Choose File
                            </button>
                        </>
                    )}
                </div>

                {/* Stats card */}
                <div className="card">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Evaluation Summary</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Total Leads</span>
                            <span className="text-lg font-bold text-gray-900">{hasResults ? summary.total : '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Avg Score</span>
                            <span className="text-lg font-bold text-gray-900">{hasResults ? summary.avg_score : '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 flex items-center gap-2"><XCircle className="w-4 h-4 text-red-400" /> High Priority</span>
                            <span className="text-lg font-bold text-red-600">{hasResults ? summary.high_potential : '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Low Priority</span>
                            <span className="text-lg font-bold text-emerald-600">{hasResults ? summary.low_potential : '—'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Error message ── */}
            {error && (
                <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* ── Results table ── */}
            <div className="card p-0 overflow-x-auto">
                <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">
                        {hasResults ? `Scored Leads (${scoredLeads.length})` : 'Scored Leads'}
                    </h3>
                    {hasResults && (
                        <div className="flex items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">High = Needs SEO help</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Low = Already optimized</span>
                        </div>
                    )}
                </div>

                {!hasResults && !loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <BarChart3 className="w-10 h-10 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No evaluation results yet</p>
                        <p className="text-xs text-gray-400 mt-1">Upload a CSV or use "Move to Audit" from Lead Acquisition</p>
                    </div>
                ) : loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 text-primary-700 animate-spin" />
                        <span className="ml-2 text-sm text-gray-500">Running evaluation...</span>
                    </div>
                ) : (
                    <table className="data-table text-xs">
                        <thead>
                            <tr>
                                <th>Website</th>
                                <th>Niche</th>
                                <th>City</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Lead Score</th>
                                <th>Priority</th>
                                <th>Reasoning</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scoredLeads.map((lead, idx) => (
                                <tr key={lead.business_id || idx}>
                                    <td className="text-primary-700 whitespace-nowrap max-w-[180px] truncate">
                                        {lead.website_url ? (
                                            <a href={lead.website_url.startsWith('http') ? lead.website_url : `https://${lead.website_url}`}
                                                target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                {lead.website_url.replace(/^https?:\/\/(www\.)?/, '')}
                                            </a>
                                        ) : '—'}
                                    </td>
                                    <td>{lead.niche ? <span className="tag text-xs">{lead.niche}</span> : '—'}</td>
                                    <td className="whitespace-nowrap">{lead.city || '—'}</td>
                                    <td className="text-gray-500 whitespace-nowrap max-w-[150px] truncate">{lead.email || '—'}</td>
                                    <td className="text-gray-500 whitespace-nowrap">{lead.phone || '—'}</td>
                                    <td>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold ${getScoreColor(lead.lead_score)}`}>
                                            {lead.lead_score}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityBadge(lead.priority)}`}>
                                            {lead.priority}
                                        </span>
                                    </td>
                                    <td className="text-gray-500 text-xs max-w-[250px]">
                                        <span className="line-clamp-2">{lead.reasoning}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
