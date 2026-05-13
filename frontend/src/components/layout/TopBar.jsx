import { Search, Bell, Settings } from 'lucide-react'

export default function TopBar() {
    return (
        <header className="sticky top-0 z-40 border-b"
                style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderColor: '#e5edf5' }}>
            <div className="flex items-center justify-between px-8 py-4">
                {/* ── Search bar ── */}
                <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#64748d' }} />
                    <input
                        type="text"
                        placeholder="Search anything here"
                        className="w-full pl-10 pr-4 py-2.5 text-sm transition-all duration-200"
                        style={{
                            background: '#f6f9fc',
                            border: '1px solid #e5edf5',
                            borderRadius: '4px',
                            color: '#061b31',
                            fontWeight: 300,
                            outline: 'none',
                        }}
                        onFocus={e => { e.target.style.borderColor = '#533afd'; e.target.style.boxShadow = '0 0 0 2px rgba(83,58,253,0.1)' }}
                        onBlur={e => { e.target.style.borderColor = '#e5edf5'; e.target.style.boxShadow = 'none' }}
                    />
                </div>

                {/* ── Right section ── */}
                <div className="flex items-center gap-4">
                    <button className="p-2 rounded-md transition-colors"
                            style={{ color: '#64748d' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(83,58,253,0.04)'; e.currentTarget.style.color = '#533afd' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748d' }}>
                        <Settings className="w-5 h-5" />
                    </button>
                    <button className="relative p-2 rounded-md transition-colors"
                            style={{ color: '#64748d' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(83,58,253,0.04)'; e.currentTarget.style.color = '#533afd' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748d' }}>
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#533afd' }}></span>
                    </button>
                    <div className="w-9 h-9 rounded-md flex items-center justify-center text-white text-sm font-normal ml-2"
                         style={{ background: '#533afd' }}>
                        U
                    </div>
                </div>
            </div>
        </header>
    )
}
