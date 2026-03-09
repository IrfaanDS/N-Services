import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Search, Download, Filter, ChevronDown, X, Loader2,
    Mail, Phone, Facebook, Instagram, Linkedin, ClipboardCheck
} from 'lucide-react'
import { leadsAPI } from '../services/api'

/* ── Column availability filter definitions (no Twitter) ── */
const AVAILABILITY_FILTERS = [
    { key: 'email', label: 'Emails', icon: Mail, color: 'text-sky-600 bg-sky-50 border-sky-200', activeColor: 'text-white bg-sky-500 border-sky-500' },
    { key: 'phone', label: 'Phones', icon: Phone, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', activeColor: 'text-white bg-emerald-500 border-emerald-500' },
    { key: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-600 bg-blue-50 border-blue-200', activeColor: 'text-white bg-blue-500 border-blue-500' },
    { key: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-600 bg-pink-50 border-pink-200', activeColor: 'text-white bg-pink-500 border-pink-500' },
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-indigo-600 bg-indigo-50 border-indigo-200', activeColor: 'text-white bg-indigo-500 border-indigo-500' },
]

export default function LeadAcquisition() {
    const navigate = useNavigate()

    // ── Data state ──
    const [leads, setLeads] = useState([])
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [pageSize] = useState(25)
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)

    // ── DB Filters (server-side) ──
    const [niche, setNiche] = useState('')
    const [city, setCity] = useState('')
    const [country, setCountry] = useState('')
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')

    // ── Client-side must-have filters ──
    const [mustHave, setMustHave] = useState({})

    // ── Selection ──
    const [selectedIds, setSelectedIds] = useState(new Set())

    // ── Filter dropdown options ──
    const [filterOptions, setFilterOptions] = useState({ niches: [], cities: [], countries: [] })
    const [openDropdown, setOpenDropdown] = useState(null)

    // ── Fetch filter options on mount ──
    useEffect(() => {
        async function loadFilters() {
            try {
                const res = await leadsAPI.getFilters()
                setFilterOptions(res.data)
            } catch (err) {
                console.error('Failed to load filters:', err)
            }
        }
        loadFilters()
    }, [])

    // ── Fetch leads from API ──
    const fetchLeads = useCallback(async () => {
        setLoading(true)
        try {
            const params = { page, page_size: pageSize }
            if (niche) params.niche = niche
            if (city) params.city = city
            if (country) params.country = country
            if (search) params.search = search

            const res = await leadsAPI.getLeads(params)
            setLeads(res.data.data)
            setTotal(res.data.total)
        } catch (err) {
            console.error('Failed to fetch leads:', err)
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, niche, city, country, search])

    useEffect(() => { fetchLeads() }, [fetchLeads])

    // Search debounce
    useEffect(() => {
        const timer = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
        return () => clearTimeout(timer)
    }, [searchInput])

    // ── Client-side filtering (must-have only) ──
    const filteredLeads = useMemo(() => {
        let result = leads
        const activeFilters = Object.entries(mustHave).filter(([, active]) => active)
        for (const [key] of activeFilters) {
            result = result.filter((lead) => lead[key] != null && lead[key] !== '')
        }
        return result
    }, [leads, mustHave])

    // ── Availability counts — based on FILTERED leads ──
    const availabilityCounts = useMemo(() => {
        const counts = {}
        for (const { key } of AVAILABILITY_FILTERS) {
            counts[key] = filteredLeads.filter((l) => l[key] != null && l[key] !== '').length
        }
        return counts
    }, [filteredLeads])

    // ── Selection handlers ──
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredLeads.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredLeads.map((l) => l.id)))
        }
    }

    const toggleSelect = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const isAllSelected = filteredLeads.length > 0 && selectedIds.size === filteredLeads.length
    const isSomeSelected = selectedIds.size > 0

    // ── CSV Export ──
    const handleExport = async () => {
        setExporting(true)
        try {
            if (selectedIds.size > 0) {
                const selected = filteredLeads.filter((l) => selectedIds.has(l.id))
                const headers = ['website_url', 'niche', 'city', 'country', 'email', 'phone', 'facebook', 'instagram', 'linkedin']
                const csvRows = [headers.join(',')]
                for (const lead of selected) {
                    csvRows.push(headers.map((h) => `"${(lead[h] || '').toString().replace(/"/g, '""')}"`).join(','))
                }
                const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `leads_export_${selectedIds.size}_selected.csv`
                a.click()
                window.URL.revokeObjectURL(url)
            } else {
                const params = {}
                if (niche) params.niche = niche
                if (city) params.city = city
                if (country) params.country = country
                if (search) params.search = search
                const res = await leadsAPI.exportCSV(params)
                const blob = new Blob([res.data], { type: 'text/csv' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'leads_export.csv'
                a.click()
                window.URL.revokeObjectURL(url)
            }
        } catch (err) {
            console.error('Export failed:', err)
        } finally {
            setExporting(false)
        }
    }

    // ── Move to Audit ──
    const handleMoveToAudit = () => {
        const leadsToAudit = selectedIds.size > 0
            ? filteredLeads.filter((l) => selectedIds.has(l.id))
            : filteredLeads
        sessionStorage.setItem('audit_leads', JSON.stringify(leadsToAudit))
        navigate('/evaluation')
    }

    // ── Filter helpers ──
    const handleFilterChange = (type, value) => {
        if (type === 'niche') setNiche(value)
        if (type === 'city') setCity(value)
        if (type === 'country') setCountry(value)
        setPage(1)
        setOpenDropdown(null)
    }
    const clearFilter = (type) => handleFilterChange(type, '')
    const toggleMustHave = (key) => setMustHave((prev) => ({ ...prev, [key]: !prev[key] }))
    const totalPages = Math.ceil(total / pageSize)

    // ─────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────
    return (
        <div className="page-enter">
            {/* ── Compact header row: title + filters + actions ── */}
            <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
                {/* Left: lead count */}
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-tight">
                            {total} Leads Found
                        </h1>
                        <p className="text-xs text-gray-400">{filteredLeads.length} displayed</p>
                    </div>
                </div>


                {/* Right: action buttons */}
                <div className="flex items-center gap-2">
                    {isSomeSelected && (
                        <span className="text-xs text-primary-700 font-semibold bg-primary-50 px-2.5 py-1 rounded-lg">
                            {selectedIds.size} selected
                        </span>
                    )}
                    <button className="btn btn-outline text-xs py-1.5 px-3" onClick={handleExport} disabled={exporting || total === 0}>
                        {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        {isSomeSelected ? `Export ${selectedIds.size}` : 'Export CSV'}
                    </button>
                    <button className="btn btn-accent text-xs py-1.5 px-3" onClick={handleMoveToAudit} disabled={total === 0}>
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        {isSomeSelected ? `Audit ${selectedIds.size}` : 'Move to Audit'}
                    </button>
                </div>
            </div>

            {/* ── Filter bar ── */}
            <div className="card mb-4 py-3 px-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Filter className="w-3.5 h-3.5" />
                        <span className="font-medium">Filters:</span>
                    </div>

                    <FilterDropdown label="Niche" value={niche} options={filterOptions.niches}
                        isOpen={openDropdown === 'niche'} onToggle={() => setOpenDropdown(openDropdown === 'niche' ? null : 'niche')}
                        onChange={(v) => handleFilterChange('niche', v)} onClear={() => clearFilter('niche')} />

                    <FilterDropdown label="City" value={city} options={filterOptions.cities}
                        isOpen={openDropdown === 'city'} onToggle={() => setOpenDropdown(openDropdown === 'city' ? null : 'city')}
                        onChange={(v) => handleFilterChange('city', v)} onClear={() => clearFilter('city')} />

                    <FilterDropdown label="Country" value={country} options={filterOptions.countries}
                        isOpen={openDropdown === 'country'} onToggle={() => setOpenDropdown(openDropdown === 'country' ? null : 'country')}
                        onChange={(v) => handleFilterChange('country', v)} onClear={() => clearFilter('country')} />

                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search leads..."
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-surface-200 rounded-lg text-xs
                         focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700/30" />
                    </div>
                </div>
            </div>

            {/* ── Info Row: Results count + Filter pills + Page info ── */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3 text-xs text-gray-500">
                <p className="min-w-max">
                    Showing <span className="font-semibold text-gray-900">{filteredLeads.length}</span>
                    {filteredLeads.length !== leads.length && <span> (filtered from {leads.length})</span>}
                    {' '}of <span className="font-semibold text-gray-900">{total}</span> leads
                </p>

                <div className="flex items-center gap-4 flex-1 justify-end">
                    {/* ── Column availability filter pills ── */}
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                        {AVAILABILITY_FILTERS.map(({ key, label, icon: Icon, color, activeColor }) => {
                            const active = mustHave[key]
                            const count = availabilityCounts[key] || 0
                            return (
                                <button key={key} onClick={() => toggleMustHave(key)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-full text-xs font-medium transition-all cursor-pointer ${active ? activeColor : color
                                        }`}>
                                    <Icon className="w-3.5 h-3.5" />
                                    {count} {label}
                                </button>
                            )
                        })}
                    </div>

                    <div className="text-right whitespace-nowrap">
                        {totalPages > 1 && (
                            <p>Page {page} of {totalPages}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Data table ── */}
            <div className="card p-0 overflow-x-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 text-primary-700 animate-spin" />
                        <span className="ml-2 text-sm text-gray-500">Loading leads...</span>
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Search className="w-8 h-8 text-gray-300 mb-2" />
                        <p className="text-gray-500 text-sm font-medium">No leads found</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
                    </div>
                ) : (
                    <table className="data-table text-xs">
                        <thead>
                            <tr>
                                <th className="w-8">
                                    <input type="checkbox" className="rounded" checked={isAllSelected} onChange={toggleSelectAll} />
                                </th>
                                <th>Website</th>
                                <th>Niche</th>
                                <th>City</th>
                                <th>Country</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Facebook</th>
                                <th>Instagram</th>
                                <th>LinkedIn</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.map((lead) => (
                                <tr key={lead.id} className={selectedIds.has(lead.id) ? 'bg-primary-50/40' : ''}>
                                    <td>
                                        <input type="checkbox" className="rounded"
                                            checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} />
                                    </td>
                                    <td className="text-primary-700 whitespace-nowrap max-w-[200px] truncate">
                                        {lead.website_url ? (
                                            <a href={lead.website_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                {lead.website_url.replace(/^https?:\/\/(www\.)?/, '')}
                                            </a>
                                        ) : '—'}
                                    </td>
                                    <td>{lead.niche ? <span className="tag text-xs">{lead.niche}</span> : '—'}</td>
                                    <td className="whitespace-nowrap">{lead.city || '—'}</td>
                                    <td>{lead.country || '—'}</td>
                                    <td className="text-gray-500 whitespace-nowrap max-w-[160px] truncate">{lead.email || '—'}</td>
                                    <td className="text-gray-500 whitespace-nowrap">{lead.phone || '—'}</td>
                                    <td className="max-w-[120px] truncate">
                                        {lead.facebook ? (
                                            <a href={lead.facebook} target="_blank" rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline">View</a>
                                        ) : <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className="max-w-[120px] truncate">
                                        {lead.instagram ? (
                                            <a href={lead.instagram} target="_blank" rel="noopener noreferrer"
                                                className="text-pink-600 hover:underline">View</a>
                                        ) : <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className="max-w-[120px] truncate">
                                        {lead.linkedin ? (
                                            <a href={lead.linkedin} target="_blank" rel="noopener noreferrer"
                                                className="text-indigo-600 hover:underline">View</a>
                                        ) : <span className="text-gray-300">—</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Pagination: lead count left, page numbers right ── */}
            {
                totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                        <p className="text-xs text-gray-400">
                            {isSomeSelected ? `${selectedIds.size} of ${filteredLeads.length} selected` : `${filteredLeads.length} rows on this page`}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                                className="btn btn-outline text-xs py-1 px-3 disabled:opacity-40 disabled:cursor-not-allowed">
                                Prev
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const pageNum = page <= 3 ? i + 1 : page + i - 2
                                if (pageNum > totalPages || pageNum < 1) return null
                                return (
                                    <button key={pageNum} onClick={() => setPage(pageNum)}
                                        className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${pageNum === page ? 'bg-primary-700 text-white' : 'hover:bg-surface-50 text-gray-600'
                                            }`}>
                                        {pageNum}
                                    </button>
                                )
                            })}
                            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="btn btn-outline text-xs py-1 px-3 disabled:opacity-40 disabled:cursor-not-allowed">
                                Next
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    )
}

/* ── Filter Dropdown (compact) ── */
function FilterDropdown({ label, value, options, isOpen, onToggle, onChange, onClear }) {
    return (
        <div className="relative">
            <button onClick={onToggle}
                className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs transition-colors ${value ? 'bg-primary-50 border-primary-700/30 text-primary-700'
                    : 'bg-surface-50 border-surface-200 text-gray-600 hover:border-primary-700/30'
                    }`}>
                {value || label}
                {value ? (
                    <X className="w-3 h-3 hover:text-red-500" onClick={(e) => { e.stopPropagation(); onClear() }} />
                ) : (
                    <ChevronDown className="w-3 h-3" />
                )}
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-surface-200 rounded-xl shadow-lg z-50 max-h-56 overflow-y-auto">
                    {options.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-gray-400">No options</div>
                    ) : (
                        options.map((opt) => (
                            <button key={opt} onClick={() => onChange(opt)}
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-50 transition-colors ${opt === value ? 'text-primary-700 font-medium bg-primary-50' : 'text-gray-700'
                                    }`}>
                                {opt}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
