import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Upload, Download, Loader2, AlertCircle,
    TrendingUp, BarChart3, ArrowRight, CheckCircle2, XCircle, Users
} from 'lucide-react'
import { b2bLeadsAPI } from '../../services/api'

function getScoreColor(score) {
    if (score >= 70) return 'text-emerald-600 bg-emerald-50'
    if (score >= 40) return 'text-amber-600 bg-amber-50'
    return 'text-red-600 bg-red-50'
}

function getPriorityBadge(priority) {
    const map = {
        High: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        Medium: 'text-amber-700 bg-amber-50 border-amber-200',
        Low: 'text-red-700 bg-red-50 border-red-200',
    }
    return map[priority] || 'text-gray-600 bg-gray-50 border-gray-200'
}

export default function B2BLeadEvaluation() {
    const navigate = useNavigate()

    // ── State ──
    const [scoredLeads, setScoredLeads] = useState([])
    const [summary, setSummary] = useState({ total: 0, avg_score: 0, high_potential: 0, low_potential: 0 })
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)
    const [selectedIds, setSelectedIds] = useState(new Set())

    // ── On mount: check if leads came from B2B Lead Acquisition ──
    useEffect(() => {
        const stored = sessionStorage.getItem('b2b_leads')
        if (stored) {
            try {
                const leads = JSON.parse(stored)
                if (leads.length > 0) {
                    runEvaluation(leads)
                }
            } catch (e) {
                console.error('Failed to parse b2b_leads:', e)
            }
            sessionStorage.removeItem('b2b_leads')
        }
    }, [])

    // ── Run evaluation ──
    async function runEvaluation(leads) {
        setLoading(true)
        setError(null)
        try {
            const res = await b2bLeadsAPI.evaluate({ leads })
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

    // ── Selection Handlers ──
    function toggleSelect(id) {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    function toggleSelectAll() {
        if (selectedIds.size === scoredLeads.length && scoredLeads.length > 0) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(scoredLeads.map((lead, idx) => lead.id || idx)))
        }
    }

    const selectedLeads = useMemo(() => {
        if (selectedIds.size === 0) return []
        return scoredLeads.filter((lead, idx) => selectedIds.has(lead.id || idx))
    }, [scoredLeads, selectedIds])

    // ── Download scored CSV ──
    function handleDownload() {
        const leadsToDownload = selectedLeads.length > 0 ? selectedLeads : scoredLeads
        if (leadsToDownload.length === 0) return

        const headers = ['name', 'title', 'company', 'email', 'phone', 'country', 'linkedin', 'lead_score', 'priority', 'reasoning']
        const csvRows = [headers.join(',')]
        for (const lead of leadsToDownload) {
            csvRows.push(headers.map((h) => `"${(lead[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))
        }
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = selectedLeads.length > 0 ? 'b2b_selected_leads.csv' : 'b2b_scored_leads.csv'
        a.click()
        window.URL.revokeObjectURL(url)
    }

    // ── Proceed to Email Generation ──
    async function handleProceedToEmail() {
        const leadsToProceed = selectedLeads.length > 0 ? selectedLeads : scoredLeads
        if (leadsToProceed.length === 0) return
        
        setSaving(true)
        setError(null)
        try {
            // Save to Supabase first
            await b2bLeadsAPI.saveLeads(leadsToProceed)
            
            // Then store in session and navigate
            sessionStorage.setItem('b2b_scored_leads', JSON.stringify(leadsToProceed))
            navigate('/b2b/email-generation')
        } catch (err) {
            console.error('Failed to save leads to DB:', err)
            setError(err.response?.data?.detail || 'Failed to save leads to database. You can still proceed, but data won\'t be persisted.')
            sessionStorage.setItem('b2b_scored_leads', JSON.stringify(leadsToProceed))
            setTimeout(() => navigate('/b2b/email-generation'), 2000)
        } finally {
            setSaving(false)
        }
    }

    const hasResults = scoredLeads.length > 0

    return (
        <div className="page-enter">
            {/* ── Page header ── */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">B2B Lead Evaluation</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {hasResults
                            ? `Evaluated ${summary.total} leads — scoring based on data completeness & title seniority`
                            : 'Upload leads from B2B Lead Acquisition to evaluate'}
                    </p>
                </div>
                {hasResults && (
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 mr-2">
                            {selectedIds.size > 0 ? `${selectedIds.size} leads selected` : 'All leads will be used'}
                        </span>
                        <button className="btn btn-outline text-sm" onClick={handleDownload}>
                            <Download className="w-4 h-4" />
                            {selectedIds.size > 0 ? 'Download Selected' : 'Download Results'}
                        </button>
                        <button className="btn btn-b2b text-sm" onClick={handleProceedToEmail} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <ArrowRight className="w-4 h-4" />
                                    {selectedIds.size > 0 ? 'Proceed with Selected' : 'Proceed to Email Generation'}
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* ── Stats cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Leads', value: hasResults ? summary.total : '—', icon: Users, color: 'text-sky-600 bg-sky-50' },
                    { label: 'Avg Score', value: hasResults ? summary.avg_score : '—', icon: BarChart3, color: 'text-indigo-600 bg-indigo-50' },
                    { label: 'High Potential', value: hasResults ? summary.high_potential : '—', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Low Potential', value: hasResults ? summary.low_potential : '—', icon: XCircle, color: 'text-red-600 bg-red-50' },
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
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">High = Best lead</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">Low = Incomplete data</span>
                        </div>
                    )}
                </div>

                {!hasResults && !loading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <BarChart3 className="w-10 h-10 text-gray-300 mb-3" />
                        <p className="text-gray-500 font-medium">No evaluation results yet</p>
                        <p className="text-xs text-gray-400 mt-1">Use "Move to Evaluation" from B2B Lead Acquisition</p>
                    </div>
                ) : loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 text-sky-600 animate-spin" />
                        <span className="ml-2 text-sm text-gray-500">Running evaluation...</span>
                    </div>
                ) : (
                    <table className="data-table text-xs">
                        <thead>
                            <tr>
                                <th className="w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-sky-600 focus:ring-sky-600"
                                        checked={selectedIds.size === scoredLeads.length && scoredLeads.length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th>Name</th>
                                <th>Title</th>
                                <th>Company</th>
                                <th>Email</th>
                                <th>Country</th>
                                <th>Lead Score</th>
                                <th>Priority</th>
                                <th>Reasoning</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scoredLeads.map((lead, idx) => {
                                const leadId = lead.id || idx
                                const isSelected = selectedIds.has(leadId)
                                return (
                                    <tr key={leadId} className={isSelected ? 'bg-sky-50/30' : ''}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-sky-600 focus:ring-sky-600"
                                                checked={isSelected}
                                                onChange={() => toggleSelect(leadId)}
                                            />
                                        </td>
                                        <td className="font-medium text-gray-900 whitespace-nowrap max-w-[150px] truncate">
                                            {lead.name || '—'}
                                        </td>
                                        <td className="whitespace-nowrap max-w-[150px] truncate">
                                            {lead.title ? <span className="tag text-xs">{lead.title}</span> : '—'}
                                        </td>
                                        <td className="whitespace-nowrap max-w-[140px] truncate">{lead.company || '—'}</td>
                                        <td className="text-gray-500 whitespace-nowrap max-w-[160px] truncate">{lead.email || '—'}</td>
                                        <td className="whitespace-nowrap">{lead.country || '—'}</td>
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
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
