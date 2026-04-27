import { useState, useEffect } from 'react'
import {
    Send, Mail, Loader2, RefreshCcw, CheckCircle, Trash2, Edit2, Play, Settings,
    Plus, Server, Check, Clock, X, Sparkles
} from 'lucide-react'
import { sendingAPI } from '../../services/api'

export default function B2BOutreach() {
    // ── State for Sending ──
    const [mailbox, setMailbox] = useState([])
    const [loadingMailbox, setLoadingMailbox] = useState(false)
    const [selectedLeads, setSelectedLeads] = useState(new Set())
    const [accounts, setAccounts] = useState([])
    const [selectedAccount, setSelectedAccount] = useState('')
    const [showCampaignModal, setShowCampaignModal] = useState(false)
    const [campaignName, setCampaignName] = useState(`B2B Campaign - ${new Date().toLocaleDateString()}`)
    const [isCreatingCampaign, setIsCreatingCampaign] = useState(false)

    // ── State for Domain/Mailbox Management ──
    const [showAccountsModal, setShowAccountsModal] = useState(false)
    const [accForm, setAccForm] = useState({
        name: '', smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '',
        imap_host: '', imap_port: 993, imap_user: '', imap_pass: ''
    })
    const [savingAccount, setSavingAccount] = useState(false)
    const [editAccountId, setEditAccountId] = useState(null)

    // ── Fetch Mailbox & Accounts ──
    const fetchMailboxData = async (quiet = false) => {
        if (!quiet) setLoadingMailbox(true)
        try {
            const [mailboxRes, accountsRes] = await Promise.all([
                sendingAPI.getMailbox('all'),
                sendingAPI.getAccounts()
            ])
            const b2bLeads = (mailboxRes.data?.emails || []).filter(e => e.type === 'b2b')
            const fetchedAccounts = accountsRes.data || []
            
            console.log('Fetched data:', { 
                b2bLeadsCount: b2bLeads.length, 
                accountsCount: fetchedAccounts.length 
            })

            setMailbox(b2bLeads)
            setAccounts(fetchedAccounts)
            
            if (fetchedAccounts.length > 0 && !selectedAccount) {
                console.log('Auto-selecting first account:', fetchedAccounts[0].id)
                setSelectedAccount(fetchedAccounts[0].id)
            }
        } catch (err) {
            console.error('Failed to fetch sending data:', err)
        } finally {
            if (!quiet) setLoadingMailbox(false)
        }
    }

    // Poller for active sending
    useEffect(() => {
        fetchMailboxData()
        const poller = setInterval(() => {
            // Use functional state to avoid closure issues with 'mailbox'
            setMailbox(currentMailbox => {
                const isSending = currentMailbox.some(m => m.status === 'scheduled' || m.status === 'sending')
                if (isSending) {
                    fetchMailboxData(true)
                }
                return currentMailbox
            })
        }, 4000)
        return () => clearInterval(poller)
    }, [])

    // ── Campaign creation ──
    const handleCreateCampaign = async () => {
        console.log('Starting campaign creation...', {
            campaignName,
            selectedLeadsCount: selectedLeads.size,
            selectedAccount
        })

        if (selectedLeads.size === 0) {
            alert('Please select at least one lead to send to.')
            return
        }
        if (!selectedAccount) {
            alert('Please select a sending domain first.')
            return
        }

        setIsCreatingCampaign(true)
        try {
            const payload = {
                campaign_name: campaignName,
                business_ids: Array.from(selectedLeads),
                account_id: selectedAccount,
                send_rate: 10,
            }
            console.log('Sending payload to API:', payload)
            
            const res = await sendingAPI.sendCampaign(payload)
            console.log('Campaign started successfully:', res.data)
            
            setShowCampaignModal(false)
            setSelectedLeads(new Set())
            await fetchMailboxData(true)
        } catch (err) {
            console.error('Campaign creation failed:', err)
            const errorMsg = err.response?.data?.detail || err.message || 'Unknown error'
            alert(`Failed to start campaign: ${errorMsg}`)
        } finally {
            setIsCreatingCampaign(false)
        }
    }

    // ── Account management logic ──
    const handleSaveAccount = async () => {
        if (!accForm.name || !accForm.smtp_host || !accForm.smtp_user) {
            alert("Name, SMTP host, and User are required.")
            return
        }
        setSavingAccount(true)
        try {
            if (editAccountId) {
                await sendingAPI.updateAccount(editAccountId, accForm)
            } else {
                await sendingAPI.addAccount(accForm)
            }
            await fetchMailboxData()
            setAccForm({
                name: '', smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '',
                imap_host: '', imap_port: 993, imap_user: '', imap_pass: ''
            })
            setEditAccountId(null)
        } catch (err) {
            console.error(err)
            alert('Failed to save account.')
        } finally {
            setSavingAccount(false)
        }
    }

    const handleDeleteAccount = async (id) => {
        if (!confirm("Delete this domain?")) return
        try {
            await sendingAPI.deleteAccount(id)
            fetchMailboxData()
        } catch (e) {
            console.error(e)
        }
    }

    const getStatusLabel = (status) => {
        switch (status) {
            case 'sent': return <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> SENT</span>
            case 'scheduled': return <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center gap-1 animate-pulse"><Clock className="w-3 h-3" /> SENDING...</span>
            case 'failed': return <span className="px-2 py-0.5 rounded-lg bg-red-100 text-red-700 font-bold">FAILED</span>
            default: return <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 font-bold">DRAFT</span>
        }
    }

    return (
        <div className="page-enter space-y-6">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">B2B Outreach Mailbox</h1>
                    <p className="text-sm text-gray-500 mt-1">Review and send generated emails for your B2B leads</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="btn btn-outline" onClick={() => setShowAccountsModal(true)}>
                        <Settings className="w-4 h-4" /> Manage Domains
                    </button>
                    <button className="btn btn-outline" onClick={() => fetchMailboxData()}>
                        <RefreshCcw className={`w-4 h-4 ${loadingMailbox ? 'animate-spin' : ''}`} />
                    </button>
                    <button className="btn btn-primary shadow-lg shadow-sky-200" disabled={selectedLeads.size === 0} onClick={() => setShowCampaignModal(true)}>
                        <Send className="w-4 h-4" /> Start Campaign ({selectedLeads.size})
                    </button>
                </div>
            </div>

            {/* ── Sending Domains List ── */}
            {accounts.length > 0 && (
                <div className="flex gap-4 overflow-x-auto pb-2">
                    {accounts.map(acc => (
                        <div key={acc.id} className={`flex-shrink-0 p-4 rounded-2xl border cursor-pointer transition-all ${selectedAccount === acc.id ? 'border-sky-500 bg-sky-50 shadow-sm' : 'border-gray-200 bg-white hover:border-sky-200'}`} onClick={() => setSelectedAccount(acc.id)}>
                            <div className="flex items-center gap-3 mb-1">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedAccount === acc.id ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    <Server className="w-4 h-4" />
                                </div>
                                <p className="text-sm font-bold text-gray-900">{acc.name}</p>
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium ml-11">{acc.smtp_user}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Mailbox Table ── */}
            <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="w-10"><input type="checkbox" onChange={(e) => setSelectedLeads(e.target.checked ? new Set(mailbox.map(m => m.business_id)) : new Set())} checked={selectedLeads.size === mailbox.length && mailbox.length > 0} /></th>
                                <th>Recipient</th>
                                <th>Persona</th>
                                <th>Subject</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mailbox.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <Mail className="w-10 h-10 mb-2 opacity-20" />
                                            <p className="text-sm font-medium">No B2B outreach leads found</p>
                                            <p className="text-xs mt-1">Generate emails first to see them here</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                mailbox.map((m) => (
                                    <tr key={m.business_id} className={selectedLeads.has(m.business_id) ? 'bg-sky-50/30' : ''}>
                                        <td><input type="checkbox" checked={selectedLeads.has(m.business_id)} onChange={() => { const next = new Set(selectedLeads); if (next.has(m.business_id)) next.delete(m.business_id); else next.add(m.business_id); setSelectedLeads(next); }} /></td>
                                        <td className="text-sm font-medium">{m.target_email}</td>
                                        <td><span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-lg font-bold">{m.persona}</span></td>
                                        <td className="text-sm text-gray-500 truncate max-w-[200px]">{m.subject}</td>
                                        <td>{getStatusLabel(m.status)}</td>
                                        <td><button className="p-1 hover:text-red-600" onClick={async () => { if (confirm('Delete?')) { await sendingAPI.deleteLead(m.business_id); fetchMailboxData(); } }}><Trash2 className="w-4 h-4" /></button></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Manage Domains Modal ── */}
            {showAccountsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold flex items-center gap-2"><Server className="w-5 h-5 text-sky-600" /> Sending Domains</h3>
                            <button onClick={() => setShowAccountsModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="flex-1 flex overflow-hidden">
                            <div className="w-1/3 border-r border-gray-100 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                                <button className="w-full p-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:text-sky-600 hover:border-sky-300 transition-all flex flex-col items-center gap-2" onClick={() => { setEditAccountId(null); setAccForm({ name: '', smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '', imap_host: '', imap_port: 993, imap_user: '', imap_pass: '' }) }}>
                                    <Plus className="w-6 h-6" />
                                    <span className="text-xs font-bold uppercase">Add New Domain</span>
                                </button>
                                {accounts.map(acc => (
                                    <div key={acc.id} className={`p-4 rounded-2xl border cursor-pointer transition-all ${editAccountId === acc.id ? 'border-sky-500 bg-white shadow-lg' : 'border-gray-200 bg-white'}`} onClick={() => { setEditAccountId(acc.id); setAccForm({ ...acc, smtp_pass: '', imap_pass: '' }) }}>
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-sm font-bold text-gray-900">{acc.name}</p>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteAccount(acc.id) }} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                        <p className="text-[10px] text-gray-400 truncate">{acc.smtp_user}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                <h4 className="text-sm font-bold text-gray-900 mb-4">{editAccountId ? 'Edit Connection' : 'Setup SMTP/IMAP Connection'}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2"><InputField label="Connection Name" value={accForm.name} onChange={(v) => setAccForm({ ...accForm, name: v })} placeholder="e.g. Work Gmail" /></div>
                                    <div className="col-span-2 p-3 bg-sky-50 rounded-xl text-[10px] font-bold text-sky-700 uppercase tracking-wider flex items-center gap-2"><Server className="w-3 h-3" /> SMTP (Outbound)</div>
                                    <InputField label="SMTP Host" value={accForm.smtp_host} onChange={(v) => setAccForm({ ...accForm, smtp_host: v })} />
                                    <InputField label="SMTP Port" value={accForm.smtp_port} onChange={(v) => setAccForm({ ...accForm, smtp_port: v })} />
                                    <InputField label="SMTP User" value={accForm.smtp_user} onChange={(v) => setAccForm({ ...accForm, smtp_user: v })} />
                                    <InputField label="SMTP Password" value={accForm.smtp_pass} onChange={(v) => setAccForm({ ...accForm, smtp_pass: v })} type="password" />
                                    <div className="col-span-2 p-3 bg-indigo-50 rounded-xl text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-2 mt-4"><Mail className="w-3 h-3" /> IMAP (Inbound)</div>
                                    <InputField label="IMAP Host" value={accForm.imap_host} onChange={(v) => setAccForm({ ...accForm, imap_host: v })} />
                                    <InputField label="IMAP Port" value={accForm.imap_port} onChange={(v) => setAccForm({ ...accForm, imap_port: v })} />
                                    <InputField label="IMAP User" value={accForm.imap_user} onChange={(v) => setAccForm({ ...accForm, imap_user: v })} />
                                    <InputField label="IMAP Password" value={accForm.imap_pass} onChange={(v) => setAccForm({ ...accForm, imap_pass: v })} type="password" />
                                </div>
                                
                                <div className="flex flex-col gap-4 pt-6 border-t border-gray-50">
                                    <div className="flex gap-2">
                                        <button 
                                            className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                            onClick={async () => {
                                                if(!editAccountId) return alert('Save account first to test');
                                                try { await sendingAPI.testAccount(editAccountId); alert('✅ SMTP Connection Successful!'); }
                                                catch(e) { alert('❌ SMTP Test Failed: ' + (e.response?.data?.detail || e.message)); }
                                            }}
                                        >
                                            Test SMTP
                                        </button>
                                        <button 
                                            className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                            onClick={async () => {
                                                if(!editAccountId) return alert('Save account first to test');
                                                try { await sendingAPI.testImap(editAccountId); alert('✅ IMAP Connection Successful!'); }
                                                catch(e) { alert('❌ IMAP Test Failed: ' + (e.response?.data?.detail || e.message)); }
                                            }}
                                        >
                                            Test IMAP
                                        </button>
                                    </div>
                                    
                                    <button 
                                        className="btn btn-primary w-full py-4 shadow-lg shadow-sky-100 flex items-center justify-center gap-2" 
                                        onClick={handleSaveAccount} 
                                        disabled={savingAccount}
                                    >
                                        {savingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} 
                                        {editAccountId ? 'Update Connection' : 'Save Connection'}
                                    </button>

                                    <p className="text-[10px] text-gray-400 text-center italic">
                                        * Using Gmail or Zoho? Use an <b>App Password</b> (not your login password).
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Campaign Modal ── */}
            {showCampaignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold">Launch B2B Campaign</h3>
                            <button onClick={() => setShowCampaignModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Campaign Name</label>
                                <input className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-sky-100 outline-none" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Sending Domain</label>
                                <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-sky-100 outline-none" value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.smtp_user})</option>)}
                                    {accounts.length === 0 && <option value="">No domains connected</option>}
                                </select>
                            </div>
                            <div className="p-4 bg-sky-50 rounded-2xl flex items-start gap-3">
                                <Sparkles className="w-4 h-4 text-sky-600 mt-1" />
                                <p className="text-xs text-sky-700 leading-relaxed font-medium">This will queue <b>{selectedLeads.size}</b> leads for outreach. Each lead will receive the Step 1 email of their assigned persona sequence.</p>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button className="btn btn-outline" onClick={() => setShowCampaignModal(false)}>Cancel</button>
                            <button className="btn btn-primary shadow-lg shadow-sky-200" onClick={handleCreateCampaign} disabled={isCreatingCampaign || !selectedAccount}>
                                {isCreatingCampaign ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                {isCreatingCampaign ? 'Launching...' : 'Start Sending Now'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function InputField({ label, value, onChange, placeholder, textarea, type = "text" }) {
    const classes = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500/30 transition-all outline-none"
    return (
        <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wide">{label}</label>
            {textarea ? (
                <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${classes} h-24 resize-none`} />
            ) : (
                <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={classes} />
            )}
        </div>
    )
}
