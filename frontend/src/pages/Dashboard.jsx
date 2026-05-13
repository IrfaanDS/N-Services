import { useState, useEffect } from 'react'
import { TrendingUp, Users, Mail, Target, BarChart3, PieChart, Loader2 } from 'lucide-react'
import { dashboardAPI } from '../services/api'

export default function Dashboard() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await dashboardAPI.getStats()
                setStats(data)
            } catch (err) {
                console.error('Failed to fetch dashboard stats', err)
                setError("Failed to load dashboard data.")
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    const kpis = [
        { label: 'Total Leads', value: stats?.total_leads || 0, change: '', icon: Users, color: '#533afd' },
        { label: 'Emails Sent', value: stats?.total_emails_sent || 0, change: '', icon: Mail, color: '#4434d4' },
        { label: 'Open Rate', value: `${stats?.open_rate || 0}%`, change: '', icon: Target, color: '#15be53' },
        { label: 'Reply Rate', value: `${stats?.reply_rate || 0}%`, change: '', icon: TrendingUp, color: '#2e2b8c' },
    ]

    return (
        <div className="page-enter">
            {/* ── Page header ── */}
            <div className="mb-6">
                <h1 style={{ color: '#061b31', fontWeight: 300, letterSpacing: '-0.64px', fontSize: '2rem' }}>Dashboard</h1>
                <p className="text-sm mt-1" style={{ color: '#64748d', fontWeight: 300 }}>Overview of your lead acquisition and outreach performance</p>
            </div>

            {loading ? (
                <div className="h-64 flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: '#533afd' }} />
                    <p className="text-sm" style={{ color: '#64748d', fontWeight: 300 }}>Aggregating your data...</p>
                </div>
            ) : error ? (
                <div className="card p-8 text-center" style={{ color: '#ea2261' }}>
                    <p style={{ fontWeight: 400 }}>{error}</p>
                </div>
            ) : (
                <>
                    {/* ── KPI cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {kpis.map(({ label, value, change, icon: Icon, color }) => (
                            <div key={label} className="card">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-10 h-10 flex items-center justify-center"
                                         style={{ borderRadius: '6px', background: `${color}10` }}>
                                        <Icon className="w-5 h-5" style={{ color }} />
                                    </div>
                                    {change && (
                                        <span className="text-xs font-normal px-2 py-1"
                                              style={{ borderRadius: '4px', background: 'rgba(21,190,83,0.2)', color: '#108c3d', border: '1px solid rgba(21,190,83,0.4)' }}>
                                            {change}
                                        </span>
                                    )}
                                </div>
                                <p className="text-2xl" style={{ color: '#061b31', fontWeight: 300, letterSpacing: '-0.26px' }}>{value}</p>
                                <p className="text-xs mt-1" style={{ color: '#64748d', fontWeight: 400 }}>{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* ── Charts placeholder ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Chart 1 */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm" style={{ color: '#061b31', fontWeight: 400 }}>Outreach Performance</h3>
                                <button className="text-xs font-normal" style={{ color: '#533afd' }}>View Details</button>
                            </div>
                            <div className="flex items-center justify-center h-52"
                                 style={{ background: '#f6f9fc', borderRadius: '4px', border: '1px dashed #e5edf5' }}>
                                <div className="text-center">
                                    <BarChart3 className="w-10 h-10 mx-auto mb-2" style={{ color: '#b9b9f9' }} />
                                    <p className="text-sm" style={{ color: '#64748d', fontWeight: 300 }}>Campaign charts available in ReachInbox</p>
                                    <p className="text-xs mt-1" style={{ color: '#b9b9f9', fontWeight: 300 }}>Visit your sending page to view campaign status</p>
                                </div>
                            </div>
                        </div>

                        {/* Chart 2 */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm" style={{ color: '#061b31', fontWeight: 400 }}>Lead Health</h3>
                                <button className="text-xs font-normal" style={{ color: '#533afd' }}>View Details</button>
                            </div>
                            <div className="flex items-center justify-center h-52"
                                 style={{ background: '#f6f9fc', borderRadius: '4px', border: '1px dashed #e5edf5' }}>
                                <div className="text-center">
                                    <PieChart className="w-10 h-10 mx-auto mb-2" style={{ color: '#b9b9f9' }} />
                                    <p className="text-sm" style={{ color: '#64748d', fontWeight: 300 }}>Positive vs Negative replies</p>
                                    <p className="text-xs mt-1" style={{ color: '#b9b9f9', fontWeight: 300 }}>Live from ReachInbox Sentiment AI</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── Recent activity ── */}
            <div className="card">
                <h3 className="text-sm mb-4" style={{ color: '#061b31', fontWeight: 400 }}>Recent Activity</h3>
                <div className="space-y-3">
                    {[
                        { text: 'Syncing complete with ReachInbox API', time: 'Just now', color: '#15be53' },
                        { text: `${stats?.leads_contacted || 0} leads currently being contacted`, time: 'Live', color: '#533afd' },
                        { text: `${stats?.bounced || 0} emails bounced (cleanup required)`, time: 'Live', color: '#ea2261' },
                    ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 py-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: item.color }}></span>
                            <span className="text-sm flex-1" style={{ color: '#273951', fontWeight: 300 }}>{item.text}</span>
                            <span className="text-xs" style={{ color: '#64748d', fontWeight: 400 }}>{item.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
