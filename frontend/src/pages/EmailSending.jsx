import { useState, useEffect, useRef } from 'react'
import {
    Send, Mail, Calendar, Clock, Filter, Upload, Plus,
    CheckCircle, XCircle, Loader2, RefreshCcw, Eye, X,
    Play, AlertCircle, Inbox, Settings, Server, Edit2, Trash2,
    Pause, MoreVertical
} from 'lucide-react'
import { sendingAPI } from '../services/api'
import { useLocation } from 'react-router-dom'

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Emails' },
    { value: 'draft', label: 'Drafts' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'sent', label: 'Sent' },
    { value: 'opened', label: 'Opened' },
    { value: 'replied', label: 'Replied' },
    { value: 'bounced', label: 'Bounced' },
]

function getStatusBadge(status) {
    const map = {
        draft: <span className="badge text-gray-500"><span className="w-2 h-2 rounded-full bg-gray-300"></span>Draft</span>,
        scheduled: <span className="badge text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-400"></span>Scheduled</span>,
        sent: <span className="badge text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-400"></span>Sent</span>,
        opened: <span className="badge badge-active"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Opened</span>,
        replied: <span className="badge text-green-600"><span className="w-2 h-2 rounded-full bg-green-500"></span>Replied</span>,
        bounced: <span className="badge text-red-600"><span className="w-2 h-2 rounded-full bg-red-500"></span>Bounced</span>,
    }
    return map[status] || <span className="badge text-gray-400">{status}</span>
}

export default function EmailSending() {
    const location = useLocation()
    const [activeTab, setActiveTab] = useState('mailbox')

    // Lead editing state
    const [editingLead, setEditingLead] = useState(null)
    const [editLeadForm, setEditLeadForm] = useState({ target_email: '', subject: '', body: '', business_url: '' })
    const [savingLead, setSavingLead] = useState(false)
    
    // Campaign editing state
    const [editingCampaign, setEditingCampaign] = useState(null)
    const [editCampaignForm, setEditCampaignForm] = useState({ name: '' })
    const [savingCampaign, setSavingCampaign] = useState(false)
    const [campaignsList, setCampaignsList] = useState([])

    const [emails, setEmails] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [statusFilter, setStatusFilter] = useState('all')
    const [selected, setSelected] = useState(new Set())
    const [previewEmail, setPreviewEmail] = useState(null)

    // Accounts / Domains state
    const [accounts, setAccounts] = useState([])
    const [selectedAccount, setSelectedAccount] = useState('')
    const [showAccountsModal, setShowAccountsModal] = useState(false)
    const [accForm, setAccForm] = useState({
        name: '', smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '',
        imap_host: '', imap_port: 993, imap_user: '', imap_pass: ''
    })
    const [savingAccount, setSavingAccount] = useState(false)
    const [editAccountId, setEditAccountId] = useState(null)
    const [testingAccountId, setTestingAccountId] = useState(null)
    const [showGmailQuick, setShowGmailQuick] = useState(false)
    const [gmailQuickForm, setGmailQuickForm] = useState({ name: '', email: '', app_password: '' })
    const [savingGmail, setSavingGmail] = useState(false)

    // Campaign modal
    const [showCampaignModal, setShowCampaignModal] = useState(false)
    const [campaignName, setCampaignName] = useState(`SEO Outreach - ${new Date().toLocaleDateString()}`)
    const [scheduledAt, setScheduledAt] = useState('')
    const [sendRate, setSendRate] = useState(5)
    const [isSending, setIsSending] = useState(false)

    const fileInputRef = useRef(null)

    const fetchMailbox = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await sendingAPI.getMailbox(statusFilter)
            setEmails(res.data?.emails || [])
        } catch (err) {
            console.error('Mailbox fetch failed', err)
            setError('Failed to load mailbox. Make sure the backend is running.')
        } finally {
            setLoading(false)
        }
    }

    const fetchAccounts = async () => {
        try {
            const res = await sendingAPI.getAccounts()
            setAccounts(res.data || [])
            if (res.data?.length > 0 && !selectedAccount) {
                setSelectedAccount(res.data[0].id)
            }
        } catch (err) {
            console.error('Failed to load accounts', err)
        }
    }

    const fetchCampaigns = async () => {
        try {
            const res = await sendingAPI.getCampaigns()
            setCampaignsList(res.data || [])
        } catch (err) {
            console.error('Failed to load campaigns', err)
        }
    }

    useEffect(() => {
        fetchMailbox()
        fetchAccounts()
        fetchCampaigns()
    }, [statusFilter])

    useEffect(() => {
        if (location.state?.autoOpenCampaign && location.state?.preselectedIds && emails.length > 0) {
            const ids = location.state.preselectedIds
            // verify they are in the emails list
            const validIds = emails.filter(e => ids.includes(e.business_id)).map(e => e.business_id)
            if (validIds.length > 0) {
                setSelected(new Set(validIds))
                setShowCampaignModal(true)
                // clear state to prevent reopening on reload
                window.history.replaceState({}, document.title)
            }
        }
    }, [location.state, emails])

    const toggleSelect = (id) => {
        setSelected(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const toggleSelectAll = () => {
        if (selected.size === emails.length) {
            setSelected(new Set())
        } else {
            setSelected(new Set(emails.map(e => e.business_id)))
        }
    }

    const handleImportCSV = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = async (event) => {
            try {
                const text = event.target.result
                const lines = text.split('\n')
                const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())

                const parsed = []
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue
                    const values = lines[i].match(/("([^"]|"")*"|[^,]*)/g).map(v =>
                        v.replace(/^"|"$/g, '').replace(/""/g, '"').trim()
                    )
                    const row = {}
                    headers.forEach((h, idx) => { row[h] = values[idx] || '' })

                    if (row['Email'] && row['Subject']) {
                        parsed.push({
                            business_id: (row['Business Name'] || 'import').replace(/\s+/g, '-').toLowerCase() + '-' + i,
                            business_name: row['Business Name'] || '',
                            website_url: row['Website URL'] || '',
                            email: row['Email'],
                            subject: row['Subject'],
                            body: row['Body'] || '',
                        })
                    }
                }

                if (parsed.length > 0) {
                    await sendingAPI.receiveEmails({ emails: parsed })
                    await fetchMailbox()
                } else {
                    setError('No valid rows found in CSV. Expected columns: Business Name, Website URL, Email, Subject, Body')
                }
            } catch (err) {
                console.error('CSV import failed', err)
                setError('Failed to import CSV file')
            }
        }
        reader.readAsText(file)
        e.target.value = ''
    }

    const handleCreateCampaign = async () => {
        if (selected.size === 0) return
        if (!selectedAccount) {
            setError('Please select a sending domain first.')
            setShowCampaignModal(false)
            setShowAccountsModal(true)
            return
        }

        setIsSending(true)
        setError(null)
        try {
            await sendingAPI.sendCampaign({
                campaign_name: campaignName,
                business_ids: Array.from(selected),
                account_id: selectedAccount,
                scheduled_at: scheduledAt || null,
                send_rate: sendRate,
            })
            setShowCampaignModal(false)
            setSelected(new Set())
            await fetchMailbox()
            await fetchCampaigns()
            setActiveTab('campaigns')
        } catch (err) {
            console.error('Campaign send failed', err)
            setError(err.response?.data?.detail || 'Failed to create and send campaign')
        } finally {
            setIsSending(false)
        }
    }

    const handleSaveAccount = async () => {
        if (!accForm.name || !accForm.smtp_host || !accForm.smtp_user) {
            setError("Domain name, SMTP host, and User are required.")
            return
        }
        setSavingAccount(true)
        try {
            if (editAccountId) {
                await sendingAPI.updateAccount(editAccountId, accForm)
            } else {
                await sendingAPI.addAccount(accForm)
            }
            await fetchAccounts()

            // Do not immediately close modal if the user wants to add/edit more easily, or do close it if that's preferred.
            // Reset form
            setAccForm({
                name: '', smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '',
                imap_host: '', imap_port: 993, imap_user: '', imap_pass: ''
            })
            setEditAccountId(null)
            setError(null)
        } catch (err) {
            console.error(err)
            setError(editAccountId ? 'Failed to update sending domain.' : 'Failed to add sending domain.')
        } finally {
            setSavingAccount(false)
        }
    }

    const handleEditAccount = (acc) => {
        setAccForm({
            name: acc.name,
            smtp_host: acc.smtp_host,
            smtp_port: acc.smtp_port,
            smtp_user: acc.smtp_user,
            smtp_pass: '', // blank it for security, will resend "********" logic mapped on backend
            imap_host: acc.imap_host,
            imap_port: acc.imap_port,
            imap_user: acc.imap_user,
            imap_pass: ''
        })
        setEditAccountId(acc.id)
    }

    const handleDeleteAccount = async (id) => {
        if (!window.confirm("Are you sure you want to delete this connected domain?")) return
        try {
            await sendingAPI.deleteAccount(id)
            if (selectedAccount === id) setSelectedAccount('')
            await fetchAccounts()
        } catch (e) {
            console.error(e)
            setError("Failed to delete account")
        }
    }

    const handleTestAccount = async (id) => {
        setTestingAccountId(id)
        try {
            const res = await sendingAPI.testAccount(id)
            alert(res.data?.message || 'Test email sent successfully!')
        } catch (err) {
            alert(err.response?.data?.detail || 'Test email failed. Check your SMTP credentials.')
        } finally {
            setTestingAccountId(null)
        }
    }

    const handleGmailQuickConnect = async () => {
        if (!gmailQuickForm.email || !gmailQuickForm.app_password) {
            setError('Gmail address and App Password are required.')
            return
        }
        setSavingGmail(true)
        try {
            await sendingAPI.addGmailQuick({
                name: gmailQuickForm.name || gmailQuickForm.email.split('@')[0],
                email: gmailQuickForm.email,
                app_password: gmailQuickForm.app_password,
            })
            await fetchAccounts()
            setGmailQuickForm({ name: '', email: '', app_password: '' })
            setShowGmailQuick(false)
            setError(null)
        } catch (err) {
            console.error(err)
            setError('Failed to add Gmail account.')
        } finally {
            setSavingGmail(false)
        }
    }

    // Stats
    const draftCount = emails.filter(e => e.status === 'draft').length
    const sentCount = emails.filter(e => e.status === 'sent' || e.status === 'scheduled').length
    const repliedCount = emails.filter(e => e.status === 'replied').length
    const bouncedCount = emails.filter(e => e.status === 'bounced').length

    return (
        <div className="page-enter">
            {/* ── Page header ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Email Sending</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your outreach mailbox and send campaigns via custom SMTP domains</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn btn-outline" onClick={() => setShowAccountsModal(true)}>
                        <Settings className="w-4 h-4" /> Sending Domains
                    </button>
                    <button className="btn btn-outline p-2" onClick={() => { fetchMailbox(); fetchCampaigns(); }} disabled={loading}>
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleImportCSV} />
                    <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4" /> Import CSV
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowCampaignModal(true)}
                        disabled={selected.size === 0}
                    >
                        <Send className="w-4 h-4" />
                        Create Campaign ({selected.size})
                    </button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {error}
                    <button className="ml-auto" onClick={() => setError(null)}><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* ── Stats row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Drafts', value: draftCount, icon: Mail, color: 'text-gray-600 bg-gray-100' },
                    { label: 'Sent/Scheduled', value: sentCount, icon: Send, color: 'text-blue-600 bg-blue-50' },
                    { label: 'Replied', value: repliedCount, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Bounced', value: bouncedCount, icon: XCircle, color: 'text-red-600 bg-red-50' },
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

            {/* ── Tabs ── */}
            <div className="flex items-center gap-4 border-b border-gray-200 mb-6">
                <button
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'mailbox' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('mailbox')}
                >
                    Leads
                </button>
                <button
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'campaigns' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('campaigns')}
                >
                    Sending Campaigns
                </button>
            </div>

            {/* ── Mailbox table ── */}
            {activeTab === 'mailbox' && (
                <div className="card p-0 overflow-hidden">
                    <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Inbox className="w-5 h-5 text-gray-500" />
                            <h3 className="text-sm font-semibold text-gray-700">Leads</h3>
                            {selected.size > 0 && (
                                <span className="text-xs text-primary-700 font-medium bg-primary-50 px-2 py-0.5 rounded-full">
                                    {selected.size} selected
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-400" />
                            <select
                                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                {STATUS_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-2" />
                            <p className="text-sm text-gray-500 font-medium">Loading mailbox...</p>
                        </div>
                    ) : emails.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                            <Inbox className="w-10 h-10 mb-2 opacity-20" />
                            <p className="text-sm font-medium">No emails found</p>
                            <p className="text-xs mt-1">Generate emails first or import a CSV file</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th className="w-10">
                                            <input
                                                type="checkbox"
                                                checked={selected.size === emails.length && emails.length > 0}
                                                onChange={toggleSelectAll}
                                                className="rounded border-gray-300"
                                            />
                                        </th>
                                        <th>Business</th>
                                        <th>Recipient</th>
                                        <th>Subject</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {emails.map((email, idx) => (
                                        <tr key={email.business_id || idx} className={selected.has(email.business_id) ? 'bg-primary-50/50' : ''}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(email.business_id)}
                                                    onChange={() => toggleSelect(email.business_id)}
                                                    className="rounded border-gray-300"
                                                />
                                            </td>
                                            <td className="font-medium text-gray-900 truncate max-w-[150px]">{email.business_url || '—'}</td>
                                            <td className="text-gray-500 truncate max-w-[180px]">{email.target_email}</td>
                                            <td className="text-gray-700 truncate max-w-[250px]">{email.subject || '—'}</td>
                                            <td>{getStatusBadge(email.status)}</td>
                                            <td>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setPreviewEmail(email)}
                                                        className="text-sm text-primary-700 hover:underline font-medium flex items-center gap-1"
                                                    >
                                                        <Eye className="w-4 h-4" /> View
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingLead(email)
                                                            setEditLeadForm({
                                                                target_email: email.target_email || '',
                                                                subject: email.subject || '',
                                                                body: email.body || '',
                                                                business_url: email.business_url || '',
                                                            })
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                        title="Edit Lead"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (!window.confirm('Are you sure you want to delete this lead?')) return
                                                            try {
                                                                await sendingAPI.deleteLead(email.business_id)
                                                                await fetchMailbox()
                                                            } catch (e) {
                                                                console.error(e)
                                                                setError('Failed to delete lead')
                                                            }
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                        title="Delete Lead"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
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
            )}

            {/* ── Campaigns table ── */}
            {activeTab === 'campaigns' && (
                <div className="card p-0 overflow-hidden">
                    <div className="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Send className="w-5 h-5 text-gray-500" />
                            <h3 className="text-sm font-semibold text-gray-700">Active Campaigns</h3>
                        </div>
                    </div>
                    {campaignsList.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                            <Play className="w-10 h-10 mb-2 opacity-20" />
                            <p className="text-sm font-medium">No campaigns created yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>High-Level Status</th>
                                        <th>Progress</th>
                                        <th>Sending Domain</th>
                                        <th>Created/Scheduled</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {campaignsList.map((c) => {
                                        const statusStyle = c.status === 'Completed'
                                            ? 'text-emerald-600 bg-emerald-50'
                                            : c.status === 'Paused'
                                            ? 'text-amber-600 bg-amber-50'
                                            : 'text-blue-600 bg-blue-50'
                                        return (
                                        <tr key={c.id}>
                                            <td className="font-medium text-gray-900">{c.name}</td>
                                            <td>
                                                <span className={`badge font-medium ${statusStyle}`}>
                                                    {c.status === 'Completed' && <CheckCircle className="w-3.5 h-3.5" />}
                                                    {c.status === 'Paused' && <Pause className="w-3.5 h-3.5" />}
                                                    {c.status === 'Running' && <Play className="w-3.5 h-3.5" />}
                                                    {c.status || 'Running'}
                                                </span>
                                            </td>
                                            <td className="text-gray-500">{c.sent_count || 0} / {c.total_leads}</td>
                                            <td className="text-gray-500 truncate max-w-[150px]">{accounts.find(a => a.id === c.account_id)?.name || c.account_id}</td>
                                            <td className="text-gray-500">{new Date(c.created_at).toLocaleString()}</td>
                                            <td>
                                                <div className="flex items-center gap-1">
                                                    {c.status === 'Running' && (
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await sendingAPI.toggleCampaign(c.id, 'pause')
                                                                    await fetchCampaigns()
                                                                } catch (e) {
                                                                    console.error(e)
                                                                    setError('Failed to pause campaign')
                                                                }
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                                                            title="Pause Campaign"
                                                        >
                                                            <Pause className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {c.status === 'Paused' && (
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await sendingAPI.toggleCampaign(c.id, 'resume')
                                                                    await fetchCampaigns()
                                                                } catch (e) {
                                                                    console.error(e)
                                                                    setError('Failed to resume campaign')
                                                                }
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                                            title="Resume Campaign"
                                                        >
                                                            <Play className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setEditingCampaign(c)
                                                            setEditCampaignForm({ name: c.name })
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                        title="Edit Campaign"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (!window.confirm('Are you sure you want to delete this campaign?')) return
                                                            try {
                                                                await sendingAPI.deleteCampaign(c.id)
                                                                await fetchCampaigns()
                                                            } catch (e) {
                                                                console.error(e)
                                                                setError('Failed to delete campaign')
                                                            }
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                        title="Delete Campaign"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )})
                                    }
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Preview Modal ── */}
            {previewEmail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Mail className="w-5 h-5 text-primary-700" />
                                Lead Preview
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setEditingLead(previewEmail)
                                        setEditLeadForm({
                                            target_email: previewEmail.target_email || '',
                                            subject: previewEmail.subject || '',
                                            body: previewEmail.body || '',
                                            business_url: previewEmail.business_url || '',
                                        })
                                        setPreviewEmail(null)
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                    title="Edit Lead"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!window.confirm('Are you sure you want to delete this lead?')) return
                                        try {
                                            await sendingAPI.deleteLead(previewEmail.business_id)
                                            setPreviewEmail(null)
                                            await fetchMailbox()
                                        } catch (e) {
                                            console.error(e)
                                            setError('Failed to delete lead')
                                        }
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    title="Delete Lead"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setPreviewEmail(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 overflow-y-auto bg-gray-50/50">
                            <div className="mb-4">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">To</p>
                                <p className="text-sm text-gray-900 font-medium">{previewEmail.target_email}</p>
                            </div>
                            <div className="mb-6">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Subject</p>
                                <p className="text-sm text-gray-900 font-medium">{previewEmail.subject}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Message</p>
                                <div className="bg-white p-4 rounded-lg border border-gray-200 text-gray-700 text-sm whitespace-pre-wrap leading-relaxed shadow-sm">
                                    {previewEmail.body}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
                            <button className="btn btn-outline" onClick={() => setPreviewEmail(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Lead Modal ── */}
            {editingLead && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Edit2 className="w-5 h-5 text-primary-700" />
                                Edit Lead
                            </h3>
                            <button onClick={() => setEditingLead(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Business URL</label>
                                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                    value={editLeadForm.business_url} onChange={e => setEditLeadForm({ ...editLeadForm, business_url: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                    value={editLeadForm.target_email} onChange={e => setEditLeadForm({ ...editLeadForm, target_email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                    value={editLeadForm.subject} onChange={e => setEditLeadForm({ ...editLeadForm, subject: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                                <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm min-h-[120px]"
                                    value={editLeadForm.body} onChange={e => setEditLeadForm({ ...editLeadForm, body: e.target.value })} />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
                            <button className="btn btn-outline" onClick={() => setEditingLead(null)}>Cancel</button>
                            <button className="btn btn-primary" disabled={savingLead} onClick={async () => {
                                setSavingLead(true)
                                try {
                                    await sendingAPI.updateLead(editingLead.business_id, editLeadForm)
                                    setEditingLead(null)
                                    await fetchMailbox()
                                } catch (e) {
                                    console.error(e)
                                    setError('Failed to update lead')
                                } finally {
                                    setSavingLead(false)
                                }
                            }}>
                                {savingLead ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Campaign Modal ── */}
            {editingCampaign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Edit2 className="w-5 h-5 text-primary-700" />
                                Edit Campaign
                            </h3>
                            <button onClick={() => setEditingCampaign(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                    value={editCampaignForm.name} onChange={e => setEditCampaignForm({ ...editCampaignForm, name: e.target.value })} />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
                            <button className="btn btn-outline" onClick={() => setEditingCampaign(null)}>Cancel</button>
                            <button className="btn btn-primary" disabled={savingCampaign} onClick={async () => {
                                setSavingCampaign(true)
                                try {
                                    await sendingAPI.updateCampaign(editingCampaign.id, editCampaignForm)
                                    setEditingCampaign(null)
                                    await fetchCampaigns()
                                } catch (e) {
                                    console.error(e)
                                    setError('Failed to update campaign')
                                } finally {
                                    setSavingCampaign(false)
                                }
                            }}>
                                {savingCampaign ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Sending Domains Modal ── */}
            {showAccountsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Server className="w-5 h-5 text-primary-700" />
                                Sending Domains & Accounts
                            </h3>
                            <button onClick={() => {
                                setShowAccountsModal(false)
                                setEditAccountId(null)
                            }} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                            {/* Existing Accounts List */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold text-gray-700">Saved Accounts</h4>
                                    <button
                                        className="text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors flex items-center gap-1.5"
                                        onClick={() => setShowGmailQuick(!showGmailQuick)}
                                    >
                                        <Mail className="w-3.5 h-3.5" /> Gmail Quick Connect
                                    </button>
                                </div>

                                {/* Gmail Quick Connect Form */}
                                {showGmailQuick && (
                                    <div className="mb-4 p-4 bg-red-50/50 border border-red-200 rounded-lg space-y-3">
                                        <p className="text-xs text-gray-600">Auto-configures Gmail SMTP & IMAP. You only need your Gmail address and an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-primary-600 underline">App Password</a>.</p>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Label (optional)</label>
                                            <input type="text" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                                                value={gmailQuickForm.name} onChange={e => setGmailQuickForm({ ...gmailQuickForm, name: e.target.value })} placeholder="e.g. My Gmail" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Gmail Address</label>
                                            <input type="email" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                                                value={gmailQuickForm.email} onChange={e => setGmailQuickForm({ ...gmailQuickForm, email: e.target.value })} placeholder="you@gmail.com" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">App Password</label>
                                            <input type="password" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                                                value={gmailQuickForm.app_password} onChange={e => setGmailQuickForm({ ...gmailQuickForm, app_password: e.target.value })} placeholder="16-character app password" />
                                        </div>
                                        <button className="btn btn-primary text-sm py-1.5" onClick={handleGmailQuickConnect} disabled={savingGmail}>
                                            {savingGmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Gmail Account
                                        </button>
                                    </div>
                                )}

                                {accounts.length === 0 ? (
                                    <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded p-3">No domains configured yet.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {accounts.map(acc => (
                                            <li key={acc.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg group hover:border-primary-300 transition-colors">
                                                <div>
                                                    <p className="font-medium text-sm text-gray-900">{acc.name}</p>
                                                    <p className="text-xs text-gray-500">{acc.smtp_user} (SMTP: {acc.smtp_host}:{acc.smtp_port})</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleTestAccount(acc.id)}
                                                        disabled={testingAccountId === acc.id}
                                                        className="text-[11px] font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200 transition-colors flex items-center gap-1"
                                                        title="Send Test Email"
                                                    >
                                                        {testingAccountId === acc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                                        Test
                                                    </button>
                                                    <span className="text-[11px] font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-full border border-primary-100 hidden sm:inline-block">
                                                        Connected
                                                    </span>
                                                    <button onClick={() => handleEditAccount(acc)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit Domain">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteAccount(acc.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete Domain">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <hr />

                            {/* Add New Account Form */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                    {editAccountId ? 'Update Domain / Account' : 'Add New Domain / Account'}
                                </h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Domain Name / Label</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                            value={accForm.name}
                                            onChange={(e) => setAccForm({ ...accForm, name: e.target.value })}
                                            placeholder="e.g. Acme Corp Email"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                                            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                                value={accForm.smtp_host} onChange={e => setAccForm({ ...accForm, smtp_host: e.target.value })} placeholder="smtp.gmail.com" />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                                            <input type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                                value={accForm.smtp_port} onChange={e => setAccForm({ ...accForm, smtp_port: Number(e.target.value) })} />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Username</label>
                                            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                                value={accForm.smtp_user} onChange={e => setAccForm({ ...accForm, smtp_user: e.target.value })} />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
                                            <input type="password" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                                value={accForm.smtp_pass} onChange={e => setAccForm({ ...accForm, smtp_pass: e.target.value })} />
                                        </div>
                                    </div>

                                    <h4 className="text-sm font-semibold text-gray-700 mt-4 underline decoration-gray-300">IMAP Settings (For Receiving Replies)</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">IMAP Host</label>
                                            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                                value={accForm.imap_host} onChange={e => setAccForm({ ...accForm, imap_host: e.target.value })} placeholder="imap.gmail.com" />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">IMAP Port</label>
                                            <input type="number" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                                value={accForm.imap_port} onChange={e => setAccForm({ ...accForm, imap_port: Number(e.target.value) })} />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">IMAP Username</label>
                                            <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                                value={accForm.imap_user} onChange={e => setAccForm({ ...accForm, imap_user: e.target.value })} />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">IMAP Password</label>
                                            <input type="password" className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                                                value={accForm.imap_pass} onChange={e => setAccForm({ ...accForm, imap_pass: e.target.value })} />
                                        </div>
                                    </div>

                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button className="btn btn-primary" onClick={handleSaveAccount} disabled={savingAccount}>
                                        {savingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {editAccountId ? 'Update Account' : 'Save Account'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Create Campaign Modal ── */}
            {showCampaignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Send className="w-5 h-5 text-primary-700" />
                                Schedule Campaign Sending
                            </h3>
                            <button onClick={() => setShowCampaignModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Campaign Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    placeholder="Enter campaign name"
                                />
                            </div>

                            {/* Sending Profile */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sending Domain / Account</label>
                                {accounts.length === 0 ? (
                                    <p className="text-xs text-red-500 font-medium">No accounts added. Please add one in settings.</p>
                                ) : (
                                    <select
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                                        value={selectedAccount}
                                        onChange={e => setSelectedAccount(e.target.value)}
                                    >
                                        <option value="" disabled>Select an account</option>
                                        {accounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>{acc.name} ({acc.smtp_user})</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Schedule */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Schedule (optional)
                                </label>
                                <input
                                    type="datetime-local"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    value={scheduledAt}
                                    onChange={(e) => setScheduledAt(e.target.value)}
                                />
                                <p className="text-xs text-gray-400 mt-1">Leave empty to begin queuing immediately</p>
                            </div>

                            {/* Send Rate */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> Send Rate
                                </label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={sendRate}
                                        onChange={(e) => setSendRate(Number(e.target.value))}
                                        className="flex-1 accent-primary-600"
                                    />
                                    <span className="text-sm font-semibold text-gray-900 w-28 text-right">{sendRate} emails/sec</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Determines spacing between SMTP dispatches.</p>
                            </div>

                            {/* Summary */}
                            <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm text-gray-600">
                                    <span className="font-semibold">{selected.size}</span> emails selected.
                                    They will be added to the background queue.
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
                            <button className="btn btn-outline" onClick={() => setShowCampaignModal(false)} disabled={isSending}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleCreateCampaign} disabled={isSending || !campaignName}>
                                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                {isSending ? 'Queuing...' : 'Launch Campaign Queue'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
