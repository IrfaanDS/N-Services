import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../components/auth/AuthProvider'

export default function Login() {
    const { signIn } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(true)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const { error: loginError } = await signIn({ email, password })
            if (loginError) throw loginError
            
            // On success, redirect to service selector (home)
            navigate('/')
        } catch (err) {
            setError(err.message || 'Invalid email or password.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md page-enter">
                {/* ── Logo ── */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-11 h-11 rounded-xl bg-black/5 border border-black/10 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-black" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900">LeadFlow</span>
                </div>

                {/* ── Login card ── */}
                <div className="card bg-white/40 backdrop-blur-md border border-black/5 shadow-2xl shadow-black/5">
                    <h2 className="text-xl font-bold text-gray-900 text-center mb-1">Welcome back</h2>
                    <p className="text-sm text-gray-500 text-center mb-6">Sign in to your account</p>

                    {error && (
                        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3 animate-fade-in">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg
                             text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/30 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg
                             text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/30 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" 
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                Remember me
                            </label>
                            <Link to="/forgot-password" size="sm" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">
                                Forgot password?
                            </Link>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="btn btn-primary w-full justify-center py-3 mt-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-sm text-gray-500 text-center mt-6">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
