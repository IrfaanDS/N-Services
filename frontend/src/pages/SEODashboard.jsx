import { useState, useEffect } from 'react'
import { Users, Mail, Target, TrendingUp, BarChart3, Activity } from 'lucide-react'
import { dashboardAPI } from '../services/api'
import KPICard from '../components/charts/KPICard'
import AnimatedBar from '../components/charts/AnimatedBar'
import DonutChart from '../components/charts/DonutChart'
import '../components/charts/charts.css'

export default function SEODashboard() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await dashboardAPI.getSEOStats()
                setData(res.data || res)
            } catch (err) {
                console.error('Failed to fetch SEO stats:', err)
                // Set empty data so we still render the dashboard structure
                setData({
                    kpis: { total_leads: 0, emails_sent: 0, open_rate: 0, reply_rate: 0 },
                    tier_distribution: { hot: 0, warm: 0, cold: 0 },
                    outreach_funnel: { sent: 0, opened: 0, replied: 0 },
                    top_niches: [],
                    reach_stats: { leads_contacted: 0, bounced: 0 },
                    recent_activity: [],
                })
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="dashboard-page">
                <div className="dashboard-loading">
                    <div className="dashboard-spinner" />
                    <p>Aggregating SEO analytics...</p>
                </div>
            </div>
        )
    }

    const kpis = data?.kpis || {}
    const tierDist = data?.tier_distribution || {}
    const funnel = data?.outreach_funnel || {}
    const niches = data?.top_niches || []
    const recentActivity = data?.recent_activity || []

    const tierSegments = [
        { label: 'Hot', value: tierDist.hot || 0, color: '#111111' },
        { label: 'Warm', value: tierDist.warm || 0, color: '#666666' },
        { label: 'Cold', value: tierDist.cold || 0, color: '#BBBBBB' },
    ]

    const totalTier = tierSegments.reduce((s, x) => s + x.value, 0)

    const nicheData = niches.map((n, i) => ({
        label: n.name,
        value: n.count,
        color: ['#111111', '#333333', '#555555', '#777777', '#999999', '#BBBBBB'][i] || '#CCCCCC',
    }))

    const funnelSteps = [
        { label: 'Sent', value: funnel.sent || kpis.emails_sent || 0, color: '#111111' },
        { label: 'Opened', value: funnel.opened || 0, color: '#444444' },
        { label: 'Replied', value: funnel.replied || 0, color: '#888888' },
    ]
    const funnelMax = Math.max(...funnelSteps.map(s => s.value), 1)

    const formatTime = (ts) => {
        if (!ts) return ''
        try {
            const d = new Date(ts)
            const now = new Date()
            const diff = Math.floor((now - d) / 60000)
            if (diff < 60) return `${diff}m ago`
            if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
            return `${Math.floor(diff / 1440)}d ago`
        } catch { return '' }
    }

    return (
        <div className="dashboard-page page-enter">
            <div className="dashboard-header">
                <h1>SEO Dashboard</h1>
                <p>Lead acquisition and outreach performance overview</p>
            </div>

            {/* KPI Cards */}
            <div className="dashboard-kpis">
                <KPICard value={kpis.total_leads} label="Total Leads" icon={Users} delay={0} />
                <KPICard value={kpis.emails_sent} label="Emails Sent" icon={Mail} delay={100} />
                <KPICard value={kpis.open_rate} label="Open Rate" icon={Target} suffix="%" delay={200} />
                <KPICard value={kpis.reply_rate} label="Reply Rate" icon={TrendingUp} suffix="%" delay={300} />
            </div>

            {/* Charts Row */}
            <div className="dashboard-charts">
                {/* Outreach Funnel */}
                <div className="chart-card">
                    <div className="chart-card-title">
                        <Activity size={16} />
                        Outreach Funnel
                    </div>
                    <div className="funnel-chart">
                        {funnelSteps.map((step, i) => (
                            <div key={i} className="funnel-step">
                                <span className="funnel-step-label">{step.label}</span>
                                <div className="funnel-bar-wrapper">
                                    <div
                                        className="funnel-bar"
                                        style={{
                                            width: `${Math.max((step.value / funnelMax) * 100, 8)}%`,
                                            backgroundColor: step.color,
                                        }}
                                    >
                                        {step.value > 0 && <span className="funnel-bar-label">{step.value}</span>}
                                    </div>
                                </div>
                                <span className="funnel-step-value">{step.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Lead Tier Distribution */}
                <div className="chart-card">
                    <div className="chart-card-title">
                        <BarChart3 size={16} />
                        Lead Score Distribution
                    </div>
                    <DonutChart
                        segments={tierSegments}
                        size={160}
                        thickness={28}
                        centerLabel={totalTier.toString()}
                        centerSub="Total"
                    />
                </div>

                {/* Top Niches */}
                <div className="chart-card">
                    <div className="chart-card-title">
                        <Target size={16} />
                        Top Niches
                    </div>
                    {nicheData.length > 0 ? (
                        <AnimatedBar data={nicheData} horizontal />
                    ) : (
                        <p style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.3)', textAlign: 'center', padding: '2rem 0' }}>
                            No niche data available yet
                        </p>
                    )}
                </div>

                {/* Vertical Bar — Emails per niche */}
                <div className="chart-card">
                    <div className="chart-card-title">
                        <Mail size={16} />
                        Outreach Summary
                    </div>
                    <AnimatedBar
                        data={[
                            { label: 'Contacted', value: data?.reach_stats?.leads_contacted || 0, color: '#111111' },
                            { label: 'Bounced', value: data?.reach_stats?.bounced || 0, color: '#999999' },
                            { label: 'Opened', value: funnel.opened || 0, color: '#444444' },
                            { label: 'Replied', value: funnel.replied || 0, color: '#666666' },
                        ]}
                        height={180}
                    />
                </div>
            </div>

            {/* Recent Activity */}
            <div className="activity-feed">
                <div className="activity-feed-title">Recent Activity</div>
                {recentActivity.length > 0 ? recentActivity.map((item, i) => (
                    <div key={i} className="activity-item">
                        <div className="activity-dot" style={{ backgroundColor: '#111111' }} />
                        <span className="activity-text">{item.text}</span>
                        <span className="activity-time">{formatTime(item.time)}</span>
                    </div>
                )) : (
                    <div className="activity-item">
                        <div className="activity-dot" style={{ backgroundColor: '#CCCCCC' }} />
                        <span className="activity-text" style={{ color: 'rgba(0,0,0,0.3)' }}>No recent activity</span>
                    </div>
                )}
            </div>
        </div>
    )
}
