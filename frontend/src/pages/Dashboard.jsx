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
        { label: 'Total Leads', value: stats?.total_leads || 0, change: '', icon: Users, color: 'text-primary-700 bg-primary-50' },
        { label: 'Emails Sent', value: stats?.total_emails_sent || 0, change: '', icon: Mail, color: 'text-accent-400 bg-accent-50' },
        { label: 'Open Rate', value: `${stats?.open_rate || 0}%`, change: '', icon: Target, color: 'text-emerald-600 bg-emerald-50' },
        { label: 'Reply Rate', value: `${stats?.reply_rate || 0}%`, change: '', icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
    ]

    return (
        <div className="page-enter">
            {/* ── Page header ── */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-1">Overview of your lead acquisition and outreach performance</p>
            </div>

            {loading ? (
                <div className="h-64 flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 text-primary-600 animate-spin mb-4" />
                    <p className="text-gray-500 font-medium text-sm">Aggregating your data...</p>
                </div>
            ) : error ? (
                <div className="card p-8 text-center text-red-500">
                    <p className="font-semibold">{error}</p>
                </div>
            ) : (
                <>
                    {/* ── KPI cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {kpis.map(({ label, value, change, icon: Icon, color }) => (
                            <div key={label} className="card">
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    {change && (
                                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                            {change}
                                        </span>
                                    )}
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{value}</p>
                                <p className="text-xs text-gray-500 mt-1">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* ── Charts placeholder ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Chart 1 */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-gray-700">Outreach Performance</h3>
                                <button className="text-xs text-primary-700 font-medium hover:underline">View Details</button>
                            </div>
                            <div className="flex items-center justify-center h-52 bg-surface-50 rounded-lg border border-dashed border-surface-300">
                                <div className="text-center">
                                    <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">Campaign charts available in ReachInbox</p>
                                    <p className="text-xs text-gray-300 mt-1">Visit your sending page to view campaign status</p>
                                </div>
                            </div>
                        </div>

                        {/* Chart 2 */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-gray-700">Lead Health</h3>
                                <button className="text-xs text-primary-700 font-medium hover:underline">View Details</button>
                            </div>
                            <div className="flex items-center justify-center h-52 bg-surface-50 rounded-lg border border-dashed border-surface-300">
                                <div className="text-center">
                                    <PieChart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">Positive vs Negative replies</p>
                                    <p className="text-xs text-gray-300 mt-1">Live from ReachInbox Sentiment AI</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── Recent activity ── */}
            <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                    {[
                        { text: 'Syncing complete with ReachInbox API', time: 'Just now', color: 'bg-emerald-400' },
                        { text: `${stats?.leads_contacted || 0} leads currently being contacted`, time: 'Live', color: 'bg-blue-400' },
                        { text: `${stats?.bounced || 0} emails bounced (cleanup required)`, time: 'Live', color: 'bg-red-400' },
                    ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 py-2">
                            <span className={`w-2 h-2 rounded-full ${item.color}`}></span>
                            <span className="text-sm text-gray-700 flex-1">{item.text}</span>
                            <span className="text-xs text-gray-400">{item.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
