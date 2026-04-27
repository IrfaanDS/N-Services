import { useState, useEffect } from 'react'
import { Users, Building2, UserCircle, Send, BarChart3, Target, Activity, Briefcase, MessageCircle } from 'lucide-react'

import { dashboardAPI } from '../../services/api'
import KPICard from '../../components/charts/KPICard'
import AnimatedBar from '../../components/charts/AnimatedBar'
import DonutChart from '../../components/charts/DonutChart'
import ProgressRing from '../../components/charts/ProgressRing'
import '../../components/charts/charts.css'

export default function B2BDashboard() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await dashboardAPI.getB2BStats()
                setData(res.data || res)
            } catch (err) {
                console.error('Failed to fetch B2B stats:', err)
                setData({
                    kpis: { total_leads: 0, total_companies: 0, total_personas: 0, total_campaigns: 0 },
                    avg_score: 0,
                    priority_breakdown: { High: 0, Medium: 0, Low: 0 },
                    seniority_breakdown: {},
                    campaign_funnel: { drafted: 0, sent: 0, opened: 0, replied: 0, bounced: 0 },
                    top_industries: [],
                    campaigns_sent: 0,
                    campaigns_active: 0,
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
                    <p>Aggregating B2B analytics...</p>
                </div>
            </div>
        )
    }

    const kpis = data?.kpis || {}
    const priority = data?.priority_breakdown || {}
    const seniority = data?.seniority_breakdown || {}
    const funnel = data?.campaign_funnel || {}
    const industries = data?.top_industries || []
    const recentActivity = data?.recent_activity || []

    const prioritySegments = [
        { label: 'High', value: priority.High || 0, color: '#111111' },
        { label: 'Medium', value: priority.Medium || 0, color: '#777777' },
        { label: 'Low', value: priority.Low || 0, color: '#CCCCCC' },
    ]

    const totalPriority = prioritySegments.reduce((s, x) => s + x.value, 0)

    const seniorityData = Object.entries(seniority).map(([label, value], i) => ({
        label,
        value,
        color: ['#111111', '#444444', '#777777', '#AAAAAA', '#CCCCCC'][i] || '#DDDDDD',
    }))

    const industryData = industries.map((n, i) => ({
        label: n.name,
        value: n.count,
        color: ['#111111', '#333333', '#555555', '#777777', '#999999', '#BBBBBB'][i] || '#CCCCCC',
    }))

    const funnelSteps = [
        { label: 'Drafted', value: funnel.drafted || 0, color: '#BBBBBB' },
        { label: 'Sent', value: funnel.sent || 0, color: '#888888' },
        { label: 'Opened', value: funnel.opened || 0, color: '#444444' },
        { label: 'Replied', value: funnel.replied || 0, color: '#111111' },
    ]
    const funnelMax = Math.max(...funnelSteps.map(s => s.value), 1)

    const avgScorePct = Math.min((data?.avg_score || 0), 100)

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
                <h1>B2B Dashboard</h1>
                <p>Lead generation, persona targeting, and campaign analytics</p>
            </div>

            {/* KPI Cards */}
            <div className="dashboard-kpis">
                <KPICard value={kpis.total_leads} label="Total Leads" icon={Users} delay={0} />
                <KPICard value={kpis.total_companies} label="Companies" icon={Building2} delay={100} />
                <KPICard value={kpis.total_personas} label="Active Personas" icon={UserCircle} delay={200} />
                <KPICard value={kpis.total_campaigns} label="Campaigns" icon={Send} delay={300} />
            </div>

            {/* Charts Row */}
            <div className="dashboard-charts">
                {/* Campaign Funnel */}
                <div className="chart-card">
                    <div className="chart-card-title">
                        <Activity size={16} />
                        Campaign Funnel
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

                {/* Priority Breakdown Donut */}
                <div className="chart-card">
                    <div className="chart-card-title">
                        <BarChart3 size={16} />
                        Lead Priority
                    </div>
                    <DonutChart
                        segments={prioritySegments}
                        size={160}
                        thickness={28}
                        centerLabel={totalPriority.toString()}
                        centerSub="Scored"
                    />
                </div>

                {/* Seniority Breakdown */}
                <div className="chart-card">
                    <div className="chart-card-title">
                        <Briefcase size={16} />
                        Seniority Mix
                    </div>
                    {seniorityData.length > 0 ? (
                        <AnimatedBar data={seniorityData} horizontal />
                    ) : (
                        <p style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.3)', textAlign: 'center', padding: '2rem 0' }}>
                            No seniority data yet
                        </p>
                    )}
                </div>

                {/* Avg Lead Score + Top Industries */}
                <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                    <div className="chart-card-title" style={{ width: '100%' }}>
                        <Target size={16} />
                        Average Lead Score
                    </div>
                    <ProgressRing
                        value={avgScorePct}
                        size={130}
                        strokeWidth={10}
                        color="#111111"
                        sublabel={`${data?.avg_score || 0}/100`}
                    />
                    {industryData.length > 0 && (
                        <div style={{ width: '100%', marginTop: '0.5rem' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#111', marginBottom: '0.75rem' }}>Top Industries</p>
                            <AnimatedBar data={industryData.slice(0, 4)} horizontal />
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Activity */}
            <div className="activity-feed">
                <div className="activity-feed-title">Recent Activity</div>
                {recentActivity.length > 0 ? recentActivity.map((item, i) => (
                    <div key={i} className="activity-item">
                        <div 
                            className="activity-dot" 
                            style={{ backgroundColor: item.type === 'reply' ? '#10b981' : '#111111' }} 
                        />
                        <span className="activity-text">
                            {item.type === 'reply' && <MessageCircle size={12} style={{ marginRight: '6px', color: '#10b981' }} />}
                            {item.text}
                        </span>
                        <span className="activity-time">{formatTime(item.time)}</span>
                    </div>
                )) : (

                    <div className="activity-item">
                        <div className="activity-dot" style={{ backgroundColor: '#CCCCCC' }} />
                        <span className="activity-text" style={{ color: 'rgba(0,0,0,0.3)' }}>No recent activity — upload leads to get started</span>
                    </div>
                )}
            </div>
        </div>
    )
}
