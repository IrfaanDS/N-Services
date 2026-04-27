import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, Bot, Flame, TrendingUp, BarChart3, Target, Activity, ArrowLeft } from 'lucide-react'
import { dashboardAPI } from '../../services/api'
import KPICard from '../../components/charts/KPICard'
import AnimatedBar from '../../components/charts/AnimatedBar'
import DonutChart from '../../components/charts/DonutChart'
import ProgressRing from '../../components/charts/ProgressRing'
import '../../components/charts/charts.css'
import './ShopifyDashboard.css'

export default function ShopifyDashboard() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await dashboardAPI.getShopifyStats()
                setData(res.data || res)
            } catch (err) {
                console.error('Failed to fetch Shopify stats:', err)

                setData({
                    kpis: { total_stores: 0, assistants_created: 0, hot_leads: 0, avg_score: 0 },
                    total_leads: 0,
                    tier_distribution: { hot: 0, warm: 0, cold: 0 },
                    top_niches: [],
                    assistant_adoption: { created: 0, total: 0, rate: 0 },
                    outreach: { pending: 0, sent: 0, replied: 0, converted: 0 },
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
            <div className="shopify-dashboard-page">
                <div className="dashboard-loading">
                    <div className="dashboard-spinner" />
                    <p>Aggregating Shopify analytics...</p>
                </div>
            </div>
        )
    }

    const kpis = data?.kpis || {}
    const tierDist = data?.tier_distribution || {}
    const niches = data?.top_niches || []
    const adoption = data?.assistant_adoption || {}
    const recentActivity = data?.recent_activity || []

    const tierSegments = [
        { label: 'Hot', value: tierDist.hot || 0, color: '#111111' },
        { label: 'Warm', value: tierDist.warm || 0, color: '#666666' },
        { label: 'Cold', value: tierDist.cold || 0, color: '#CCCCCC' },
    ]

    const totalLeads = data?.total_leads || 0

    const nicheData = niches.map((n, i) => ({
        label: n.name,
        value: n.count,
        color: ['#111111', '#333333', '#555555', '#777777', '#999999', '#BBBBBB'][i] || '#CCCCCC',
    }))

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

    const tierColors = { hot: '#111111', warm: '#888888', cold: '#CCCCCC' }

    return (
        <div className="shopify-dashboard-page dashboard-page">
            <button className="back-btn" onClick={() => navigate('/shopify')}>
                <ArrowLeft size={18} />
                <span>Back</span>
            </button>

            <div className="dashboard-header">
                <h1>Shopify Analytics</h1>
                <p>Store discovery, AI assistant adoption, and lead intelligence</p>
            </div>

            {/* KPI Cards */}
            <div className="dashboard-kpis">
                <KPICard value={kpis.total_stores} label="Stores Discovered" icon={Store} delay={0} />
                <KPICard value={kpis.assistants_created} label="Assistants Live" icon={Bot} delay={100} />
                <KPICard value={kpis.hot_leads} label="Hot Leads" icon={Flame} delay={200} />
                <KPICard value={kpis.avg_score} label="Avg Lead Score" icon={TrendingUp} delay={300} />
            </div>

            {/* Charts Row */}
            <div className="dashboard-charts">
                {/* Tier Distribution Donut */}
                <div className="chart-card">
                    <div className="chart-card-title">
                        <BarChart3 size={16} />
                        Lead Tier Distribution
                    </div>
                    <DonutChart
                        segments={tierSegments}
                        size={160}
                        thickness={28}
                        centerLabel={totalLeads.toString()}
                        centerSub="Leads"
                    />
                </div>

                {/* Assistant Adoption */}
                <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
                    <div className="chart-card-title" style={{ width: '100%' }}>
                        <Bot size={16} />
                        AI Assistant Adoption
                    </div>
                    <ProgressRing
                        value={adoption.rate || 0}
                        size={140}
                        strokeWidth={12}
                        color="#111111"
                        sublabel={`${adoption.created || 0} / ${adoption.total || 0}`}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.4)', fontWeight: 500, textAlign: 'center' }}>
                        Stores with AI assistants enabled
                    </p>
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

                {/* Niche Bar (vertical) */}
                <div className="chart-card">
                    <div className="chart-card-title">
                        <Activity size={16} />
                        Stores by Niche
                    </div>
                    {nicheData.length > 0 ? (
                        <AnimatedBar data={nicheData.slice(0, 6)} height={180} />
                    ) : (
                        <p style={{ fontSize: '0.8rem', color: 'rgba(0,0,0,0.3)', textAlign: 'center', padding: '2rem 0' }}>
                            No store data yet
                        </p>
                    )}
                </div>
            </div>

            {/* Recent Activity */}
            <div className="activity-feed">
                <div className="activity-feed-title">Recent Discoveries</div>
                {recentActivity.length > 0 ? recentActivity.map((item, i) => (
                    <div key={i} className="activity-item">
                        <div className="activity-dot" style={{ backgroundColor: tierColors[item.tier] || '#CCCCCC' }} />
                        <span className="activity-text">{item.text}</span>
                        <span className="activity-time">{formatTime(item.time)}</span>
                    </div>
                )) : (
                    <div className="activity-item">
                        <div className="activity-dot" style={{ backgroundColor: '#CCCCCC' }} />
                        <span className="activity-text" style={{ color: 'rgba(0,0,0,0.3)' }}>No recent discoveries</span>
                    </div>
                )}
            </div>
        </div>
    )
}
