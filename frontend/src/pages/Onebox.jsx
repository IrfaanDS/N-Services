import { useState, useEffect, useRef } from 'react'
import {
    Inbox,
    RefreshCw,
    Search,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Send,
    Reply,
    Paperclip,
    Archive,
    Trash2,
    Calendar,
    User,
    Mail
} from 'lucide-react'
import { oneboxAPI } from '../services/api'

// Simple formatting for dates
const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// Strip internal tracking image or hidden spans if needed (optional)
const cleanBody = (html) => {
    if (!html) return ''
    // Simple placeholder - actual sanitization should use DOMPurify if displaying raw HTML
    // For now we just return it, React dangerouslySetInnerHTML handles basic insertion
    return html
}

export default function Onebox() {
    const [threads, setThreads] = useState([])
    const [selectedThread, setSelectedThread] = useState(null)
    const [loading, setLoading] = useState(true)
    const [replying, setReplying] = useState(false)
    const [replyBody, setReplyBody] = useState('')
    const [sending, setSending] = useState(false)
    const [attachments, setAttachments] = useState([])
    const fileInputRef = useRef(null)

    // Pagination / Filter state
    const [offset, setOffset] = useState(0)
    const [limit] = useState(30)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('All') // 'All', 'Interested', 'Meeting Booked', etc.

    // Fetch thread list
    const fetchThreads = async () => {
        setLoading(true)
        try {
            const res = await oneboxAPI.list({
                limit,
                offset,
                q: searchQuery,
                status: statusFilter
            })
            setThreads(res.data?.data || [])
            // If we have threads and none selected, select the first one (optional)
            // if (res.data?.data?.length > 0 && !selectedThread) {
            //     handleSelectThread(res.data.data[0])
            // }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    // Initial load
    useEffect(() => {
        fetchThreads()
    }, [offset, statusFilter]) // Refresh when pagination or filter changes

    // Handle selecting a thread -> fetch full thread details
    const handleSelectThread = async (thread) => {
        // Just set it immediately for perceived speed, effectively "optimistic" if we already have data
        // For full thread reconstruction (all messages), we might need `oneboxAPI.getThread(thread.id)`
        // But the list endpoint returns a good summary.
        // Let's assume we want to call the detailed endpoint to mark as read or get full history:
        
        try {
            // Corrected to pass thread ID directly
            const res = await oneboxAPI.getThread(thread.id || thread.threadId || thread.messageId)
            // results.data is an array of messages in the thread
            if (res.data?.data) {
                // Sort by date usually
                const sorted = res.data.data.sort((a,b) => new Date(a.sentAt) - new Date(b.sentAt))
                setSelectedThread({ ...thread, messages: sorted })
            } else {
                setSelectedThread({ ...thread, messages: [thread] })
            }
        } catch (err) {
            console.error('Failed to load thread details', err)
            // Fallback to just showing the clicked item as a single message
            setSelectedThread({ ...thread, messages: [thread] })
        }
    }

    const handleSendReply = async () => {
        if (!replyBody.trim()) return
        setSending(true)

        try {
            const lastMsg = selectedThread.messages[selectedThread.messages.length - 1]
            
            // Construct email data JSON
            const emailJson = JSON.stringify({
                to: [lastMsg.fromEmail === lastMsg.account ? lastMsg.toEmail : lastMsg.fromEmail],
                from: lastMsg.account,
                subject: lastMsg.subject.startsWith('Re:') ? lastMsg.subject : `Re: ${lastMsg.subject}`,
                body: replyBody, // In a real app, wrap in basic HTML p tags or use a rich editor
                inReplyTo: lastMsg.messageId,
                references: [lastMsg.messageId] // simplistic reference
            })

            const formData = new FormData()
            formData.append('emaildata', emailJson)
            attachments.forEach(file => {
                formData.append('file', file)
            })

            // Corrected to include thread ID
            await oneboxAPI.sendReply(selectedThread.id || selectedThread.threadId || selectedThread.messageId, formData)
            
            // Clear editor
            setReplyBody('')
            setAttachments([])
            setReplying(false)
            
            // Refresh thread to show sent message (might take a moment to propagate in Onebox)
            // For now, we manually append or just re-fetch
            fetchThreads() 
            if(selectedThread) handleSelectThread(selectedThread)

        } catch (err) {
            alert('Failed to send reply: ' + (err.response?.data?.detail || err.message))
        } finally {
            setSending(false)
        }
    }

    const onFileChange = (e) => {
        if (e.target.files) {
            setAttachments(prev => [...prev, ...Array.from(e.target.files)])
        }
    }

    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col md:flex-row bg-white page-enter">
            {/* ── Thread List (Left Sidebar) ── */}
            <div className="w-full md:w-96 border-r border-gray-200 flex flex-col bg-gray-50/50">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Inbox className="w-5 h-5" /> Onebox
                        </h2>
                        <button onClick={fetchThreads} className="p-2 hover:bg-gray-200 rounded-full transition-colors" title="Refresh">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search emails..."
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && fetchThreads()}
                        />
                    </div>
                    {/* Filters */}
                    <div className="flex gap-2 text-xs overflow-x-auto pb-1 scrollbar-hide">
                        {['All', 'Interested', 'Meeting Booked', 'Closed'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors border ${
                                    statusFilter === status
                                        ? 'bg-primary-600 text-white border-primary-600'
                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {loading && threads.length === 0 ? (
                        <div className="py-10 flex flex-col items-center text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <p className="text-sm">Loading threads...</p>
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="py-10 flex flex-col items-center text-gray-400">
                            <Inbox className="w-10 h-10 mb-2 opacity-20" />
                            <p className="text-sm">No conversations found</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {threads.map(thread => {
                                const isSelected = selectedThread?.threadId === thread.threadId
                                return (
                                    <li
                                        key={thread.id}
                                        onClick={() => handleSelectThread(thread)}
                                        className={`p-4 cursor-pointer hover:bg-white transition-colors border-l-4 ${
                                            isSelected 
                                                ? 'bg-white border-l-primary-600 shadow-sm' 
                                                : 'bg-transparent border-l-transparent hover:border-l-gray-300'
                                        } ${!thread.isRead ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-sm truncate pr-2 ${!thread.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                {thread.fromName || thread.fromEmail}
                                            </h4>
                                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                {formatDate(thread.sentAt)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-800 truncate mb-1">{thread.subject}</p>
                                        <p className="text-xs text-gray-500 line-clamp-2">
                                            {thread.body?.replace(/<[^>]*>?/gm, '').substring(0, 100)}
                                        </p>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </div>

            {/* ── Chat View (Main Content) ── */}
            <div className="flex-1 flex flex-col h-full bg-white">
                {!selectedThread ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                        <Mail className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-medium text-gray-400">Select a conversation to start reading</p>
                    </div>
                ) : (
                    <>
                        {/* Thread Header */}
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm z-10">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 truncate max-w-lg">
                                    {selectedThread.subject}
                                </h2>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-600">
                                        {selectedThread.status || 'Active'}
                                    </span>
                                    <span>•</span>
                                    <span>{selectedThread.messages?.length || 1} messages</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <button className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                                    <Archive className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Thread Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
                            {selectedThread.messages?.map((msg, idx) => (
                                <div key={msg.id || idx} className={`flex flex-col max-w-3xl ${msg.fromEmail === msg.account ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        <span className="text-xs font-bold text-gray-700">{msg.fromName || msg.fromEmail}</span>
                                        <span className="text-[10px] text-gray-400">{formatDate(msg.sentAt)}</span>
                                    </div>
                                    <div 
                                        className={`rounded-xl px-5 py-4 shadow-sm text-sm leading-relaxed ${
                                            msg.fromEmail === msg.account 
                                                ? 'bg-primary-600 text-white rounded-tr-none' 
                                                : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                                        }`}
                                    >
                                        <div dangerouslySetInnerHTML={{ __html: msg.body }} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Reply Box */}
                        <div className="p-4 bg-white border-t border-gray-200">
                            {replying ? (
                                <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
                                    {/* Editor Toolbar (placeholder) */}
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                                        <span className="text-xs font-medium text-gray-500">Reply to {selectedThread.fromEmail}</span>
                                        <button onClick={() => setReplying(false)} className="text-gray-400 hover:text-gray-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <textarea
                                        className="w-full p-4 h-32 text-sm outline-none resize-none"
                                        placeholder="Write your reply..."
                                        value={replyBody}
                                        autoFocus
                                        onChange={e => setReplyBody(e.target.value)}
                                    />
                                    
                                    {/* Attachments List */}
                                    {attachments.length > 0 && (
                                        <div className="px-4 pb-2 flex gap-2 flex-wrap">
                                            {attachments.map((file, i) => (
                                                <div key={i} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                                                    <span>{file.name}</span>
                                                    <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-red-500">×</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Footer Actions */}
                                    <div className="px-4 py-3 bg-gray-50 flex justify-between items-center border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <button 
                                                className="p-2 text-gray-500 hover:bg-gray-200 rounded transition-colors"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <Paperclip className="w-4 h-4" />
                                            </button>
                                            <input type="file" multiple className="hidden" ref={fileInputRef} onChange={onFileChange} />
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                className="btn btn-outline text-xs" 
                                                onClick={() => setReplying(false)}
                                            >
                                                Discard
                                            </button>
                                            <button 
                                                className="btn btn-primary text-xs" 
                                                onClick={handleSendReply}
                                                disabled={!replyBody.trim() || sending}
                                            >
                                                {sending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                                                Send
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setReplying(true)}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-500 text-sm transition-all"
                                >
                                    <Reply className="w-4 h-4" />
                                    <span>Reply to this conversation...</span>
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}