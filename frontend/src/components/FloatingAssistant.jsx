import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Trash2, Loader2, Bot, User, Sparkles, Minimize2 } from 'lucide-react'
import { seoAssistantAPI } from '../services/api'

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)
}

export default function FloatingAssistant() {
    const [isOpen, setIsOpen] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [sessionId] = useState(() => generateSessionId())
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isOpen])

    const handleSend = async () => {
        const question = input.trim()
        if (!question || loading) return

        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: question }])
        setLoading(true)

        try {
            const res = await seoAssistantAPI.ask({ session_id: sessionId, question })
            setMessages(prev => [...prev, { role: 'assistant', content: res.data?.answer || 'No response received.' }])
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠️ ${err.response?.data?.detail || 'Failed to get response. Please try again.'}`
            }])
        } finally {
            setLoading(false)
        }
    }

    const handleClear = async () => {
        try {
            await seoAssistantAPI.clear(sessionId)
        } catch { /* ignore */ }
        setMessages([])
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Format markdown-like text (bold, code, headers, lists)
    const formatMessage = (text) => {
        if (!text) return ''
        return text
            // Headers
            .replace(/^### (.+)$/gm, '<h4 style="font-weight:400;font-size:0.875rem;margin-top:0.75rem;margin-bottom:0.25rem;color:#061b31">$1</h4>')
            .replace(/^## (.+)$/gm, '<h3 style="font-weight:400;font-size:1rem;margin-top:0.75rem;margin-bottom:0.25rem;color:#061b31">$1</h3>')
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:400">$1</strong>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code style="background:#f6f9fc;color:#533afd;padding:1px 4px;border-radius:4px;font-size:0.75rem;font-family:Source Code Pro,monospace">$1</code>')
            // Code blocks
            .replace(/```[\s\S]*?```/g, (match) => {
                const code = match.replace(/```\w*\n?/g, '').replace(/```/g, '')
                return `<pre style="background:#0d253d;color:#b9b9f9;padding:12px;border-radius:4px;font-size:0.75rem;overflow-x:auto;margin:8px 0;white-space:pre-wrap;font-family:Source Code Pro,monospace">${code}</pre>`
            })
            // Bullet lists
            .replace(/^[*-] (.+)$/gm, '<li style="margin-left:1rem;font-size:0.875rem">• $1</li>')
            // Newlines
            .replace(/\n/g, '<br/>')
    }

    return (
        <>
            {/* ── Floating Button ── */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 w-14 h-14
                               text-white flex items-center justify-center
                               group transition-all duration-300"
                    style={{
                        borderRadius: '6px',
                        background: '#533afd',
                        boxShadow: 'rgba(83,58,253,0.3) 0px 8px 24px',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = 'rgba(83,58,253,0.4) 0px 12px 32px'; e.currentTarget.style.transform = 'scale(1.05)' }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'rgba(83,58,253,0.3) 0px 8px 24px'; e.currentTarget.style.transform = 'scale(1)' }}
                    title="SEO Assistant"
                >
                    <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                </button>
            )}

            {/* ── Chat Panel ── */}
            {isOpen && (
                <div
                    className={`fixed z-50 flex flex-col transition-all duration-300 ease-out`}
                    style={{
                        background: '#ffffff',
                        border: '1px solid #e5edf5',
                        boxShadow: 'rgba(50,50,93,0.25) 0px 30px 45px -30px, rgba(0,0,0,0.1) 0px 18px 36px -18px',
                        ...(isExpanded
                            ? { top: 0, right: 0, height: '100vh', width: '480px', borderRadius: 0 }
                            : { bottom: '24px', right: '24px', height: '600px', width: '400px', borderRadius: '6px' }
                        ),
                        maxHeight: isExpanded ? '100vh' : 'calc(100vh - 48px)',
                    }}
                >
                    {/* ── Header ── */}
                    <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                         style={{
                             background: '#533afd',
                             borderBottom: 'none',
                             borderRadius: isExpanded ? '0' : '5px 5px 0 0',
                         }}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 flex items-center justify-center"
                                 style={{ borderRadius: '6px', background: 'rgba(255,255,255,0.2)' }}>
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm text-white" style={{ fontWeight: 400 }}>SEO Expert Agent</h3>
                                <p className="text-white" style={{ fontSize: '10px', opacity: 0.7, fontWeight: 300 }}>N-Services Intelligence</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleClear}
                                className="p-1.5 transition-colors text-white"
                                style={{ borderRadius: '4px' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                title="Clear conversation"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="p-1.5 transition-colors text-white"
                                style={{ borderRadius: '4px' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                title={isExpanded ? 'Minimize' : 'Expand'}
                            >
                                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => { setIsOpen(false); setIsExpanded(false) }}
                                className="p-1.5 transition-colors text-white"
                                style={{ borderRadius: '4px' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                title="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* ── Messages ── */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ background: '#f6f9fc' }}>
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center opacity-60 gap-3 px-6">
                                <div className="w-16 h-16 flex items-center justify-center"
                                     style={{ borderRadius: '8px', background: 'rgba(83,58,253,0.08)' }}>
                                    <Sparkles className="w-8 h-8" style={{ color: '#533afd' }} />
                                </div>
                                <div>
                                    <p className="text-sm" style={{ color: '#061b31', fontWeight: 400 }}>SEO Expert Assistant</p>
                                    <p className="text-xs mt-1 leading-relaxed" style={{ color: '#64748d', fontWeight: 300 }}>
                                        Ask me any SEO question, or paste a URL for a quick technical audit.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                                    {[
                                        'What is structured data?',
                                        'Audit https://example.com',
                                        'How to fix missing alt text?',
                                    ].map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            onClick={() => { setInput(suggestion); inputRef.current?.focus() }}
                                            className="px-3 py-1.5 transition-colors"
                                            style={{
                                                fontSize: '11px',
                                                background: '#ffffff',
                                                border: '1px solid #e5edf5',
                                                borderRadius: '4px',
                                                color: '#64748d',
                                                fontWeight: 400,
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#b9b9f9'; e.currentTarget.style.color = '#533afd' }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5edf5'; e.currentTarget.style.color = '#64748d' }}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 mt-0.5"
                                         style={{ borderRadius: '6px', background: '#533afd' }}>
                                        <Bot className="w-4 h-4 text-white" />
                                    </div>
                                )}
                                <div
                                    className="max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed"
                                    style={msg.role === 'user'
                                        ? { background: '#533afd', color: '#ffffff', borderRadius: '6px 6px 2px 6px', fontWeight: 300 }
                                        : { background: '#ffffff', border: '1px solid #e5edf5', color: '#061b31', borderRadius: '2px 6px 6px 6px', fontWeight: 300, boxShadow: 'rgba(23,23,23,0.06) 0px 3px 6px' }
                                    }
                                    dangerouslySetInnerHTML={
                                        msg.role === 'assistant'
                                            ? { __html: formatMessage(msg.content) }
                                            : undefined
                                    }
                                >
                                    {msg.role === 'user' ? msg.content : undefined}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 mt-0.5"
                                         style={{ borderRadius: '6px', background: '#e5edf5' }}>
                                        <User className="w-4 h-4" style={{ color: '#64748d' }} />
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="flex gap-2.5 justify-start">
                                <div className="w-7 h-7 flex items-center justify-center flex-shrink-0"
                                     style={{ borderRadius: '6px', background: '#533afd' }}>
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="px-4 py-3"
                                     style={{ background: '#ffffff', border: '1px solid #e5edf5', borderRadius: '2px 6px 6px 6px', boxShadow: 'rgba(23,23,23,0.06) 0px 3px 6px' }}>
                                    <div className="flex items-center gap-2 text-sm" style={{ color: '#64748d' }}>
                                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#533afd' }} />
                                        <span style={{ fontSize: '12px', fontWeight: 300 }}>Analyzing...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* ── Input ── */}
                    <div className="px-4 py-3 flex-shrink-0"
                         style={{
                             borderTop: '1px solid #e5edf5',
                             background: '#ffffff',
                             borderRadius: isExpanded ? '0' : '0 0 5px 5px',
                         }}>
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask about SEO or paste a URL to audit..."
                                className="flex-1 resize-none px-3.5 py-2.5 text-sm max-h-[100px] min-h-[42px]"
                                style={{
                                    border: '1px solid #e5edf5',
                                    borderRadius: '4px',
                                    color: '#061b31',
                                    fontWeight: 300,
                                    outline: 'none',
                                    background: '#f6f9fc',
                                }}
                                onFocus={e => { e.target.style.borderColor = '#533afd'; e.target.style.boxShadow = '0 0 0 2px rgba(83,58,253,0.1)' }}
                                onBlur={e => { e.target.style.borderColor = '#e5edf5'; e.target.style.boxShadow = 'none' }}
                                rows={1}
                                disabled={loading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={loading || !input.trim()}
                                className="w-10 h-10 text-white flex items-center justify-center flex-shrink-0
                                           disabled:opacity-40 transition-all duration-200"
                                style={{
                                    borderRadius: '4px',
                                    background: '#533afd',
                                }}
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
