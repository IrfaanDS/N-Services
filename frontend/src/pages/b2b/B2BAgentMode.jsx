import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Bot, Play, Square, Upload, UploadCloud, Building2, MapPin, Briefcase,
    MessageSquare, CheckCircle2, Loader2, ArrowRight, Circle, AlertCircle,
    Sparkles, Send, Users, Mail, BarChart3, Target, Zap, HandMetal,
    FileText, ChevronRight, X
} from 'lucide-react'

const STEPS = [
    { id: 1, name: 'Lead Extraction', icon: Upload, redirect: '/b2b/leads' },
    { id: 2, name: 'Lead Evaluation', icon: BarChart3, redirect: '/b2b/evaluation' },
    { id: 3, name: 'Audience & Personas', icon: Users, redirect: '/b2b/evaluation' },
    { id: 4, name: 'Email Generation', icon: Mail, redirect: '/b2b/email-generation' },
    { id: 5, name: 'Campaign Setup', icon: Send, redirect: '/b2b/outreach' },
]

const INDUSTRIES = ['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Hospitality', 'Other']
const TONES = ['professional', 'casual', 'friendly', 'authoritative', 'conversational']

export default function B2BAgentMode() {
    const navigate = useNavigate()
    const logEndRef = useRef(null)
    const fileInputRef = useRef(null)

    // Phase: 'config' | 'running' | 'complete'
    const [phase, setPhase] = useState('config')

    // Config state
    const [companyName, setCompanyName] = useState('')
    const [companyDesc, setCompanyDesc] = useState('')
    const [industry, setIndustry] = useState('Technology')
    const [location, setLocation] = useState('United States')
    const [teamSize, setTeamSize] = useState('51-200 employees')
    const [tone, setTone] = useState('professional')
    const [numSequences, setNumSequences] = useState(3)
    const [maxEmails, setMaxEmails] = useState(50)
    const [csvFile, setCsvFile] = useState(null)
    const [demoMode, setDemoMode] = useState(false)

    // Execution state
    const [currentStep, setCurrentStep] = useState(0)
    const [completedSteps, setCompletedSteps] = useState({})
    const [reasoningLogs, setReasoningLogs] = useState([])
    const [isRunning, setIsRunning] = useState(false)
    const [error, setError] = useState(null)
    const [summary, setSummary] = useState(null)

    // Auto-scroll logs
    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [reasoningLogs])

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                const base64 = reader.result.split(',')[1]
                resolve(base64)
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
        })
    }

    const handleStart = async () => {
        if (!demoMode && !csvFile) {
            setError('Please upload a CSV file or enable Demo Mode.')
            return
        }
        if (!companyName.trim()) {
            setError('Please enter your company name.')
            return
        }

        setError(null)
        setPhase('running')
        setIsRunning(true)
        setReasoningLogs([])
        setCurrentStep(0)
        setCompletedSteps({})
        setSummary(null)

        let csvBase64 = null
        if (csvFile) {
            csvBase64 = await fileToBase64(csvFile)
        }

        const payload = {
            company_name: companyName,
            company_description: companyDesc,
            industry,
            location,
            team_size: teamSize,
            tone,
            num_sequences: numSequences,
            max_emails: maxEmails,
            leads_csv_base64: csvBase64,
            use_existing_leads: false,
            demo_mode: demoMode,
        }

        try {
            const token = localStorage.getItem('nservices_token')
            const response = await fetch('/api/b2b/agent/run', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`)
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const event = JSON.parse(line.slice(6))
                            handleSSEEvent(event)
                        } catch (e) {
                            // Skip malformed JSON
                        }
                    }
                }
            }
        } catch (err) {
            setError(`Connection failed: ${err.message}`)
        } finally {
            setIsRunning(false)
        }
    }

    const handleSSEEvent = (event) => {
        const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

        switch (event.type) {
            case 'step_start':
                setCurrentStep(event.step)
                setReasoningLogs(prev => [...prev, {
                    ts, step: event.step,
                    text: `━━━ ${event.name} ━━━`,
                    type: 'header'
                }])
                setReasoningLogs(prev => [...prev, {
                    ts, step: event.step,
                    text: event.message,
                    type: 'info'
                }])
                break

            case 'reasoning':
                setReasoningLogs(prev => [...prev, {
                    ts, step: event.step,
                    text: event.message,
                    type: 'reasoning'
                }])
                break

            case 'step_complete':
                setCompletedSteps(prev => ({
                    ...prev,
                    [event.step]: event.result
                }))
                setReasoningLogs(prev => [...prev, {
                    ts, step: event.step,
                    text: `✓ ${event.name} — completed`,
                    type: 'success'
                }])
                break

            case 'pipeline_complete':
                setSummary(event.summary)
                setPhase('complete')
                setReasoningLogs(prev => [...prev, {
                    ts, step: 0,
                    text: `\n🎉 Pipeline complete in ${event.summary.elapsed_seconds}s`,
                    type: 'complete'
                }])
                break

            case 'interrupted':
                setIsRunning(false)
                setReasoningLogs(prev => [...prev, {
                    ts, step: event.step,
                    text: '⏸ Pipeline interrupted by user',
                    type: 'warning'
                }])
                break

            case 'error':
                setError(event.message)
                setReasoningLogs(prev => [...prev, {
                    ts, step: event.step,
                    text: `✗ Error: ${event.message}`,
                    type: 'error'
                }])
                break
        }
    }

    const handleInterrupt = async () => {
        try {
            const token = localStorage.getItem('nservices_token')
            await fetch('/api/b2b/agent/interrupt', {
                method: 'POST',
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
            })
            setIsRunning(false)
        } catch (e) {
            console.error('Interrupt failed:', e)
        }
    }

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            setCsvFile(file)
            setError(null)
        }
    }

    // ═══════════════════════════════════════════════
    // RENDER: CONFIG PHASE
    // ═══════════════════════════════════════════════
    if (phase === 'config') {
        return (
            <div className="page-enter" style={{ maxWidth: 880, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div className="agent-icon-box">
                            <Bot style={{ width: 22, height: 22, color: '#fff' }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '2rem', fontWeight: 300, letterSpacing: '-0.64px', color: '#061b31' }}>Agent Mode</h1>
                            <p style={{ color: '#64748d', fontSize: '0.875rem', fontWeight: 300 }}>Automate the full B2B outreach pipeline — from leads to campaign-ready emails</p>
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="agent-error animate-fade-in">
                        <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                        {error}
                        <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}>
                            <X style={{ width: 14, height: 14 }} />
                        </button>
                    </div>
                )}

                {/* Demo Mode Toggle */}
                <div className="agent-demo-banner" onClick={() => setDemoMode(!demoMode)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: demoMode ? '#533afd' : 'rgba(83,58,253,0.08)' }}>
                            <Sparkles style={{ width: 18, height: 18, color: demoMode ? '#fff' : '#533afd' }} />
                        </div>
                        <div>
                            <p style={{ fontWeight: 400, fontSize: '0.875rem', color: '#061b31' }}>Demo Mode</p>
                            <p style={{ fontSize: '0.75rem', color: '#64748d', fontWeight: 300 }}>Run with synthetic leads — all emails sent to demo inbox</p>
                        </div>
                    </div>
                    <div className={`agent-toggle ${demoMode ? 'agent-toggle--active' : ''}`}>
                        <div className="agent-toggle-dot" />
                    </div>
                </div>

                {/* Config Form */}
                <div className="card" style={{ padding: 32, marginTop: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        {/* Company Name */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="agent-label"><Building2 style={{ width: 14, height: 14 }} /> Company Name</label>
                            <input
                                type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                                placeholder="e.g. Nexus Core Technologies"
                                className="agent-input"
                            />
                        </div>

                        {/* Description */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="agent-label"><FileText style={{ width: 14, height: 14 }} /> What does your company do?</label>
                            <textarea
                                value={companyDesc} onChange={e => setCompanyDesc(e.target.value)}
                                placeholder="We build custom SaaS solutions and AI-powered tools for enterprise clients..."
                                className="agent-input"
                                style={{ height: 88, resize: 'none' }}
                            />
                        </div>

                        {/* Industry */}
                        <div>
                            <label className="agent-label"><Briefcase style={{ width: 14, height: 14 }} /> Industry</label>
                            <select value={industry} onChange={e => setIndustry(e.target.value)} className="agent-input">
                                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                            </select>
                        </div>

                        {/* Location */}
                        <div>
                            <label className="agent-label"><MapPin style={{ width: 14, height: 14 }} /> Location</label>
                            <input
                                type="text" value={location} onChange={e => setLocation(e.target.value)}
                                placeholder="e.g. United States"
                                className="agent-input"
                            />
                        </div>

                        {/* Tone */}
                        <div>
                            <label className="agent-label"><MessageSquare style={{ width: 14, height: 14 }} /> Email Tone</label>
                            <select value={tone} onChange={e => setTone(e.target.value)} className="agent-input">
                                {TONES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                            </select>
                        </div>

                        {/* Sequences */}
                        <div>
                            <label className="agent-label"><Mail style={{ width: 14, height: 14 }} /> Email Steps</label>
                            <select value={numSequences} onChange={e => setNumSequences(Number(e.target.value))} className="agent-input">
                                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} step sequence</option>)}
                            </select>
                        </div>

                        {/* Max Emails */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="agent-label"><Target style={{ width: 14, height: 14 }} /> Maximum Leads to Process</label>
                            <input
                                type="number" value={maxEmails} onChange={e => setMaxEmails(Number(e.target.value))}
                                min={1} max={500}
                                className="agent-input"
                            />
                        </div>
                    </div>

                    {/* CSV Upload */}
                    {!demoMode && (
                        <div style={{ marginTop: 24 }}>
                            <label className="agent-label"><UploadCloud style={{ width: 14, height: 14 }} /> Upload Leads CSV</label>
                            <div
                                className="agent-upload-zone"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {csvFile ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(21,190,83,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <CheckCircle2 style={{ width: 20, height: 20, color: '#15be53' }} />
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 400, fontSize: '0.875rem', color: '#061b31' }}>{csvFile.name}</p>
                                            <p style={{ fontSize: '0.75rem', color: '#64748d' }}>{(csvFile.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setCsvFile(null) }}
                                            style={{ marginLeft: 'auto', color: '#64748d', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}>
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center' }}>
                                        <UploadCloud style={{ width: 32, height: 32, color: '#b9b9f9', marginBottom: 8, margin: '0 auto 8px' }} />
                                        <p style={{ fontWeight: 400, fontSize: '0.875rem', color: '#061b31' }}>Click to upload CSV</p>
                                        <p style={{ fontSize: '0.75rem', color: '#64748d' }}>Apollo, LinkedIn, or standard CSV exports</p>
                                    </div>
                                )}
                                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Start Button */}
                <button className="agent-start-btn" onClick={handleStart} style={{ marginTop: 24 }}>
                    <Zap style={{ width: 20, height: 20 }} />
                    Start Agent Pipeline
                    <ArrowRight style={{ width: 18, height: 18 }} />
                </button>
            </div>
        )
    }

    // ═══════════════════════════════════════════════
    // RENDER: RUNNING / COMPLETE PHASE
    // ═══════════════════════════════════════════════
    return (
        <div className="page-enter" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Top Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="agent-icon-box">
                        <Bot style={{ width: 20, height: 20, color: '#fff' }} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 300, color: '#061b31', letterSpacing: '-0.26px' }}>
                            {phase === 'complete' ? 'Pipeline Complete' : 'Agent Running'}
                        </h2>
                        <p style={{ fontSize: '0.75rem', color: '#64748d', fontWeight: 300 }}>
                            {companyName} • {demoMode ? 'Demo Mode' : `${maxEmails} max leads`} • {tone} tone
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {isRunning && (
                        <button className="agent-interrupt-btn" onClick={handleInterrupt}>
                            <HandMetal style={{ width: 16, height: 16 }} />
                            Take Over
                        </button>
                    )}
                    {phase === 'complete' && (
                        <button className="btn btn-outline" onClick={() => { setPhase('config'); setReasoningLogs([]); setSummary(null); setCompletedSteps({}); }}>
                            Run Again
                        </button>
                    )}
                </div>
            </div>

            {/* Main content: Step tracker + Log */}
            <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>
                {/* Left: Step Progress */}
                <div className="agent-steps-panel">
                    {STEPS.map((step) => {
                        const isActive = currentStep === step.id && isRunning
                        const isComplete = !!completedSteps[step.id]
                        const isPending = currentStep < step.id
                        const Icon = step.icon
                        const result = completedSteps[step.id]

                        return (
                            <div key={step.id} className={`agent-step ${isActive ? 'agent-step--active' : ''} ${isComplete ? 'agent-step--complete' : ''} ${isPending ? 'agent-step--pending' : ''}`}>
                                <div className="agent-step-icon">
                                    {isComplete ? (
                                        <CheckCircle2 style={{ width: 18, height: 18 }} />
                                    ) : isActive ? (
                                        <Loader2 style={{ width: 18, height: 18 }} className="agent-spin" />
                                    ) : (
                                        <Icon style={{ width: 18, height: 18 }} />
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p className="agent-step-name">{step.name}</p>
                                    {result && (
                                        <p className="agent-step-result">
                                            {step.id === 1 && `${result.total_leads} leads`}
                                            {step.id === 2 && `Avg: ${result.avg_score} • H:${result.high} M:${result.medium} L:${result.low}`}
                                            {step.id === 3 && `${result.total_personas} personas`}
                                            {step.id === 4 && `${result.total_templates} templates`}
                                            {step.id === 5 && `${result.saved_to_outreach} queued`}
                                        </p>
                                    )}
                                </div>
                                {isActive && <div className="agent-pulse-dot" />}
                                {/* Connector line */}
                                {step.id < 5 && <div className={`agent-step-connector ${isComplete ? 'agent-step-connector--done' : ''}`} />}
                            </div>
                        )
                    })}

                    {/* Navigate buttons for completed steps */}
                    {phase === 'complete' && (
                        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/b2b/outreach')}>
                                <Send style={{ width: 16, height: 16 }} /> Review & Send
                            </button>
                            <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/b2b/dashboard')}>
                                <BarChart3 style={{ width: 16, height: 16 }} /> Dashboard
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: Live Reasoning Log */}
                <div className="agent-log-panel">
                    <div className="agent-log-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: isRunning ? '#15be53' : '#64748d' }} />
                            <span>Agent Reasoning</span>
                        </div>
                        <span style={{ fontSize: '0.625rem', color: '#64748d' }}>{reasoningLogs.length} events</span>
                    </div>
                    <div className="agent-log-body">
                        {reasoningLogs.map((log, i) => (
                            <div key={i} className={`agent-log-line agent-log-line--${log.type} animate-fade-in`}>
                                <span className="agent-log-ts">{log.ts}</span>
                                <span className="agent-log-text">{log.text}</span>
                            </div>
                        ))}
                        {isRunning && (
                            <div className="agent-log-line agent-log-line--cursor">
                                <span className="agent-cursor">█</span>
                            </div>
                        )}
                        <div ref={logEndRef} />
                    </div>
                </div>
            </div>

            {/* Summary Cards (when complete) */}
            {summary && (
                <div className="agent-summary animate-fade-in" style={{ marginTop: 16 }}>
                    <SummaryCard icon={Users} label="Leads Processed" value={summary.total_leads_processed} />
                    <SummaryCard icon={Target} label="Personas Created" value={summary.total_personas} />
                    <SummaryCard icon={Mail} label="Emails Generated" value={summary.total_emails_generated} />
                    <SummaryCard icon={Send} label="Queued to Send" value={summary.leads_queued} />
                    <SummaryCard icon={BarChart3} label="Avg Lead Score" value={`${summary.avg_score}/100`} />
                    <SummaryCard icon={Zap} label="Time Elapsed" value={`${summary.elapsed_seconds}s`} />
                </div>
            )}
        </div>
    )
}

function SummaryCard({ icon: Icon, label, value }) {
    return (
        <div className="agent-summary-card">
            <Icon style={{ width: 18, height: 18, color: '#533afd' }} />
            <div>
                <p style={{ fontSize: '1.25rem', fontWeight: 300, color: '#061b31', letterSpacing: '-0.26px' }}>{value}</p>
                <p style={{ fontSize: '0.6875rem', color: '#64748d', fontWeight: 400 }}>{label}</p>
            </div>
        </div>
    )
}
