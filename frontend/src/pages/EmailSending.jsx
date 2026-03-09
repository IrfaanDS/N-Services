import { useState, useEffect } from 'react'
import { Send, Play, Pause, Plus, Clock, CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCcw } from 'lucide-react'
import { sendingAPI } from '../services/api'

function getCampaignStatusBadge(status) {
    const s = (status || '').toUpperCase()
    switch (s) {
        case 'SENDING_EMAILS':
        case 'ACTIVE': return <span className="badge badge-active"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Active</span>
        case 'COMPLETED': return <span className="badge text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-400"></span>Completed</span>
        case 'NOT_SENDING_EMAILS':
        case 'DRAFT': return <span className="badge text-gray-500"><span className="w-2 h-2 rounded-full bg-gray-300"></span>Draft</span>
        case 'PAUSED': return <span className="badge text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-400"></span>Paused</span>
        default: return <span className="badge text-gray-400">{status}</span>
    }
}

export default function EmailSending() {
    const [campaigns, setCampaigns] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [actionLoading, setActionLoading] = useState(null)

    const fetchCampaigns = async () => {
        setLoading(true)
        try {
            const data = await sendingAPI.listCampaigns()
            setCampaigns(data || [])
            setError(null)
        } catch (err) {
            console.error('Failed to fetch campaigns', err)
            setError("Could not load campaigns from ReachInbox.")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCampaigns()
    }, [])

    const handleToggle = async (id, currentStatus) => {
        const action = (currentStatus === 'SENDING_EMAILS' || currentStatus === 'ACTIVE') ? 'pause' : 'start'
        setActionLoading(id)
        try {
            await sendingAPI.toggleCampaign(id, action)
            await fetchCampaigns()
        } catch (err) {
            alert(`Failed to ${action} campaign: ` + (err.response?.data?.detail || err.message))
        } finally {
            setActionLoading(null)
        }
    }

    const totalSent = campaigns.reduce((acc, c) => acc + (c.totalEmailSent || 0), 0)
    const totalOpened = campaigns.reduce((acc, c) => acc + (c.totalEmailOpened || 0), 0)
    const totalReplied = campaigns.reduce((acc, c) => acc + (c.totalEmailReplied || 0), 0)
    const totalBounced = campaigns.reduce((acc, c) => acc + (c.totalEmailBounced || 0), 0)

    return (
        <div className="page-enter">
            {/* ── Page header ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Email Sending</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage campaigns and sending sequences via ReachInbox</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn btn-outline p-2" onClick={fetchCampaigns} disabled={loading}>
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button className="btn btn-primary" onClick={() => window.open('https://app.reachinbox.ai/campaigns', '_blank')}>
                        <Plus className="w-4 h-4" />
                        ReachInbox Dashboard
                    </button>
                </div>
            </div>

            {/* ── Stats row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Sent', value: totalSent, icon: Send, color: 'text-primary-700 bg-primary-50' },
                    { label: 'Opened', value: totalOpened, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Replied', value: totalReplied, icon: Clock, color: 'text-blue-600 bg-blue-50' },
                    { label: 'Bounced', value: totalBounced, icon: XCircle, color: 'text-red-600 bg-red-50' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="card flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{label}</p>
                            <p className="text-xl font-bold text-gray-900">{loading ? '...' : value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Campaigns table ── */}
            <div className="card p-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-surface-200">
                    <h3 className="text-sm font-semibold text-gray-700">ReachInbox Campaigns</h3>
                </div>

                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-2" />
                        <p className="text-sm text-gray-500 font-medium">Loading your campaigns...</p>
                    </div>
                ) : error ? (
                    <div className="py-20 flex flex-col items-center justify-center text-red-500">
                        <XCircle className="w-8 h-8 mb-2" />
                        <p className="text-sm font-medium">{error}</p>
                        <button className="mt-4 text-xs font-bold underline" onClick={fetchCampaigns}>Try Again</button>
                    </div>
                ) : campaigns.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                        <Send className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm font-medium">No campaigns found</p>
                        <p className="text-xs">Create one from the Email Generation page</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Campaign Name</th>
                                    <th>Leads</th>
                                    <th>Sent</th>
                                    <th>Opened</th>
                                    <th>Replied</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {campaigns.map((campaign, idx) => (
                                    <tr key={campaign.id || idx}>
                                        <td className="font-medium text-gray-900">{campaign.name}</td>
                                        <td>{campaign.leadAddedCount || 0}</td>
                                        <td>{campaign.totalEmailSent || 0}</td>
                                        <td>{campaign.totalEmailOpened || 0}</td>
                                        <td>{campaign.totalEmailReplied || 0}</td>
                                        <td>{getCampaignStatusBadge(campaign.status)}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    className={`btn text-xs py-1.5 px-3 ${(campaign.status === 'SENDING_EMAILS' || campaign.status === 'ACTIVE')
                                                            ? 'btn-outline' : 'btn-primary'
                                                        }`}
                                                    onClick={() => handleToggle(campaign.id, campaign.status)}
                                                    disabled={actionLoading === campaign.id}
                                                >
                                                    {actionLoading === campaign.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        (campaign.status === 'SENDING_EMAILS' || campaign.status === 'ACTIVE')
                                                            ? <><Pause className="w-3 h-3" /> Pause</>
                                                            : <><Play className="w-3 h-3" /> Start</>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Sequence builder placeholder ── */}
            <div className="card mt-6 border-2 border-dashed border-surface-300">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertTriangle className="w-8 h-8 text-amber-400 mb-3" />
                    <h3 className="text-sm font-semibold text-gray-700">Real-time Syncing</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-md">
                        Your campaigns are automatically synced with ReachInbox. Any changes made here reflect in your main dashboard instantly.
                    </p>
                </div>
            </div>
        </div>
    )
}
