import { Search, Bell, Settings } from 'lucide-react'

export default function TopBar() {
    return (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-surface-200">
            <div className="flex items-center justify-between px-8 py-4">
                {/* ── Search bar ── */}
                <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search anything here"
                        className="w-full pl-10 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl
                       text-sm text-gray-700 placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700/30
                       transition-all duration-200"
                    />
                </div>

                {/* ── Right section ── */}
                <div className="flex items-center gap-4">
                    <button className="p-2 rounded-lg hover:bg-surface-50 transition-colors text-gray-500 hover:text-gray-700">
                        <Settings className="w-5 h-5" />
                    </button>
                    <button className="relative p-2 rounded-lg hover:bg-surface-50 transition-colors text-gray-500 hover:text-gray-700">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-400 rounded-full"></span>
                    </button>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-700 to-accent-400 flex items-center justify-center text-white text-sm font-semibold ml-2">
                        U
                    </div>
                </div>
            </div>
        </header>
    )
}
