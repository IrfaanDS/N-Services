import { Search, Bell, Settings } from 'lucide-react'

export default function TopBar() {
    return (
        <header className="sticky top-0 z-40 bg-transparent backdrop-blur-md border-b border-black/5">
            <div className="flex items-center justify-between px-8 py-4">
                {/* ── Search bar ── */}
                <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                    <input
                        type="text"
                        placeholder="Search anything here"
                        className="w-full pl-10 pr-4 py-2.5 bg-black/5 border border-black/10 rounded-xl
                       text-sm text-black placeholder-black/40
                       focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/30
                       transition-all duration-200"
                    />
                </div>

                {/* ── Right section ── */}
                <div className="flex items-center gap-4">
                    <button className="p-2 rounded-lg hover:bg-black/5 transition-colors text-black/60 hover:text-black">
                        <Settings className="w-5 h-5" />
                    </button>
                    <button className="relative p-2 rounded-lg hover:bg-black/5 transition-colors text-black/60 hover:text-black">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-black rounded-full"></span>
                    </button>
                    <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white text-sm font-semibold ml-2">
                        U
                    </div>
                </div>
            </div>
        </header>
    )
}
