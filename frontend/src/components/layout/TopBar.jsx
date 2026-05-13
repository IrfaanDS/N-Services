import { useState, useRef, useEffect } from 'react'
import { LogOut, User as UserIcon, Shield } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'

export default function TopBar() {
    const { user, signOut } = useAuth()
    const [showProfileMenu, setShowProfileMenu] = useState(false)
    const menuRef = useRef(null)

    // Handle clicking outside to close menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowProfileMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <header className="sticky top-0 z-40 border-b"
                style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderColor: '#e5edf5' }}>
            <div className="flex items-center justify-end px-8 py-3">
                
                {user && (
                    <div className="flex items-center gap-4 relative" ref={menuRef}>
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all overflow-hidden relative
                                ${showProfileMenu ? 'shadow-lg border-[#a004ec]' : 'border-[#e5edf5] bg-white hover:shadow-md'}`}
                        >
                            <UserIcon className="w-5 h-5 transition-colors" style={{ color: showProfileMenu ? '#a004ec' : '#64748d' }} />
                        </button>

                        {/* ── Dropdown Menu ── */}
                        {showProfileMenu && (
                            <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-2xl border border-[#e5edf5] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[100]">
                                <div className="p-4 border-b border-[#e5edf5] bg-gray-50/50">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-[#a004ec]/10 flex items-center justify-center">
                                            <UserIcon className="w-5 h-5 text-[#a004ec]" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-bold text-gray-900 truncate">{user.email?.split('@')[0]}</p>
                                            <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-[#e5edf5]">
                                        <Shield className="w-3.5 h-3.5" style={{ color: '#a004ec' }} />
                                        <span className="text-xs font-bold text-gray-900">Standard Subscription</span>
                                    </div>
                                </div>

                                <div className="p-2">
                                    <button
                                        onClick={() => signOut()}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-red-100/50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                                            <LogOut className="w-4 h-4" />
                                        </div>
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    )
}
