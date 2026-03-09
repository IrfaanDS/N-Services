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
            .replace(/^### (.+)$/gm, '<h4 class="font-bold text-sm mt-3 mb-1 text-gray-900">$1</h4>')
            .replace(/^## (.+)$/gm, '<h3 class="font-bold text-base mt-3 mb-1 text-gray-900">$1</h3>')
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-pink-600 px-1 py-0.5 rounded text-xs">$1</code>')
            // Code blocks
            .replace(/```[\s\S]*?```/g, (match) => {
                const code = match.replace(/```\w*\n?/g, '').replace(/```/g, '')
                return `<pre class="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto my-2 whitespace-pre-wrap">${code}</pre>`
            })
            // Bullet lists
            .replace(/^[*-] (.+)$/gm, '<li class="ml-4 text-sm">• $1</li>')
            // Priority tags
            .replace(/\b(P0)\b/g, '<span class="inline-block bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded">$1</span>')
            .replace(/\b(P1)\b/g, '<span class="inline-block bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded">$1</span>')
            .replace(/\b(P2)\b/g, '<span class="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded">$1</span>')
            // Newlines
            .replace(/\n/g, '<br/>')
    }

    return (
        <>
            {/* ── Floating Button ── */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
                               bg-gradient-to-br from-violet-600 to-indigo-700
                               text-white shadow-lg shadow-violet-500/30
                               hover:shadow-xl hover:shadow-violet-500/40 hover:scale-105
                               transition-all duration-300 flex items-center justify-center
                               group"
                    title="SEO Assistant"
                >
                    <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                    {/* Pulse ring */}
                    <span className="absolute inset-0 rounded-full bg-violet-500 animate-ping opacity-20" />
                </button>
            )}

            {/* ── Chat Panel ── */}
            {isOpen && (
                <div
                    className={`fixed z-50 flex flex-col bg-white border border-gray-200 shadow-2xl shadow-gray-900/10
                                transition-all duration-300 ease-out
                                ${isExpanded
                                    ? 'top-0 right-0 h-screen w-full sm:w-[480px] rounded-none'
                                    : 'bottom-6 right-6 h-[600px] w-[400px] rounded-2xl'
                                }`}
                    style={{ maxHeight: isExpanded ? '100vh' : 'calc(100vh - 48px)' }}
                >
                    {/* ── Header ── */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-600 to-indigo-700 text-white flex-shrink-0"
                         style={{ borderRadius: isExpanded ? '0' : '16px 16px 0 0' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">SEO Expert Agent</h3>
                                <p className="text-[10px] text-violet-200">LeadFlow SEO Intelligence</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleClear}
                                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                                title="Clear conversation"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                                title={isExpanded ? 'Minimize' : 'Expand'}
                            >
                                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => { setIsOpen(false); setIsExpanded(false) }}
                                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                                title="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* ── Messages ── */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50/50">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center opacity-60 gap-3 px-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
                                    <Sparkles className="w-8 h-8 text-violet-500" />
                                </div>
                                <div>
                                <p className="text-sm font-semibold text-gray-700">SEO Expert Assistant</p>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
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
                                            className="text-[11px] px-3 py-1.5 bg-white border border-gray-200 rounded-full
                                                       text-gray-600 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50
                                                       transition-colors"
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
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Bot className="w-4 h-4 text-white" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed
                                        ${msg.role === 'user'
                                            ? 'bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-2xl rounded-br-md'
                                            : 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-bl-md shadow-sm'
                                        }`}
                                    dangerouslySetInnerHTML={
                                        msg.role === 'assistant'
                                            ? { __html: formatMessage(msg.content) }
                                            : undefined
                                    }
                                >
                                    {msg.role === 'user' ? msg.content : undefined}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <User className="w-4 h-4 text-gray-600" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="flex gap-2.5 justify-start">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                                        <span className="text-xs">Analyzing...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* ── Input ── */}
                    <div className="px-4 py-3 border-t border-gray-100 bg-white flex-shrink-0"
                         style={{ borderRadius: isExpanded ? '0' : '0 0 16px 16px' }}
                    >
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask about SEO or paste a URL to audit..."
                                className="flex-1 resize-none border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm
                                           focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none
                                           max-h-[100px] min-h-[42px] bg-gray-50/50"
                                rows={1}
                                disabled={loading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={loading || !input.trim()}
                                className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700
                                           text-white flex items-center justify-center flex-shrink-0
                                           hover:shadow-lg hover:shadow-violet-500/30 disabled:opacity-40
                                           transition-all duration-200"
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
