import { Zap, Mail, Lock } from 'lucide-react'

export default function Login() {
    return (
        <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* ── Logo ── */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-400 to-primary-700 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold text-primary-700">LeadFlow</span>
                </div>

                {/* ── Login card ── */}
                <div className="card">
                    <h2 className="text-xl font-bold text-gray-900 text-center mb-1">Welcome back</h2>
                    <p className="text-sm text-gray-500 text-center mb-6">Sign in to your account</p>

                    <form className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-lg
                             text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700/30"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-lg
                             text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20 focus:border-primary-700/30"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                                <input type="checkbox" className="rounded" />
                                Remember me
                            </label>
                            <a href="#" className="text-primary-700 hover:underline font-medium">Forgot password?</a>
                        </div>

                        <button type="submit" className="btn btn-primary w-full justify-center py-3">
                            Sign In
                        </button>
                    </form>

                    <p className="text-sm text-gray-500 text-center mt-6">
                        Don't have an account?{' '}
                        <a href="#" className="text-primary-700 hover:underline font-medium">Sign up</a>
                    </p>
                </div>
            </div>
        </div>
    )
}
