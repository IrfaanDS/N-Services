import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, Globe, Zap, ShieldCheck } from 'lucide-react'
import { useAuth } from '../components/auth/AuthProvider'
import nServicesLogo from '../assets/n-services-logo.png'

export default function Login() {
    const { signIn } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const { error: signInError } = await signIn({ email, password })
            if (signInError) throw signInError
            navigate('/dashboard')
        } catch (err) {
            setError(err.message || 'Invalid email or password.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-white overflow-hidden">
            
            {/* ── Left Side: Atmospheric Branding ── */}
            <div className="hidden md:flex md:w-[45%] lg:w-[42%] relative overflow-hidden flex-col pt-32 px-16 lg:px-24 border-r border-gray-50">
                {/* Mesh Gradient Background */}
                <div className="absolute inset-0 z-0 scale-110">
                    <div className="absolute inset-0 bg-[#fffbfc]" />
                    <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] rounded-full blur-[100px] bg-#a004ec/15" />
                    <div className="absolute bottom-[-5%] left-[-10%] w-[70%] h-[70%] rounded-full blur-[100px] bg-pink-400/20" />
                    <div className="absolute top-[20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] bg-orange-200/30" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-10 select-none">
                        <img src={nServicesLogo} alt="Logo" className="h-10 w-auto" />
                        <span className="text-3xl font-bold text-gray-900 tracking-tighter">N-Services</span>
                    </div>

                    <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6 leading-[1.1] tracking-tight">
                        Welcome Back, <br />
                        <span className="text-[#a004ec]">Power User</span>
                    </h1>
                    
                    <p className="text-[15px] text-gray-500 mb-12 leading-relaxed max-w-sm font-medium">
                        Your business is waiting. Time to make magic happen with AI that actually understands your workflow—not just another pretty dashboard.
                    </p>

                    <ul className="space-y-5">
                        <li className="flex items-start gap-4 text-gray-600">
                            <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                                <Globe className="w-3 h-3 text-[#a004ec]" />
                            </div>
                            <span className="font-medium text-sm">AI that thinks ahead, not behind</span>
                        </li>
                        <li className="flex items-start gap-4 text-gray-600">
                            <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                                <Zap className="w-3 h-3 text-[#a004ec]" />
                            </div>
                            <span className="font-medium text-sm">Operations so smooth, your competitors will cry</span>
                        </li>
                        <li className="flex items-start gap-4 text-gray-600">
                            <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                                <ShieldCheck className="w-3 h-3 text-[#a004ec]" />
                            </div>
                            <span className="font-medium text-sm">Insights so sharp, you'll feel invincible</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* ── Right Side: Sign In Form ── */}
            <div className="flex-1 flex flex-col pt-32 px-8 sm:px-16 lg:px-24 pb-12 relative overflow-y-auto">
                
                {/* Mobile Logo */}
                <div className="md:hidden absolute top-8 left-8 flex items-center gap-2">
                    <img src={nServicesLogo} alt="Logo" className="h-6 w-auto" />
                    <span className="font-bold text-gray-900">N-Services</span>
                </div>

                <div className="max-w-xl w-full mx-auto md:mx-0">
                    <div className="mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Sign in to your account</h2>
                        <p className="text-base text-gray-500 font-medium">Welcome back! Please enter your details.</p>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600 font-bold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-500 mb-2 ml-1">Email address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full pl-12 pr-4 py-4 bg-gray-50/30 border border-gray-200 rounded-2xl
                                        focus:outline-none focus:ring-4 focus:ring-[#a004ec]/5 focus:border-[#a004ec] transition-all text-base text-gray-900"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2 ml-1">
                                <label className="block text-sm font-bold text-gray-500">Password</label>
                                <Link to="/forgot-password" size="sm" className="text-xs font-bold text-[#a004ec] hover:text-purple-700">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-12 py-4 bg-gray-50/30 border border-gray-200 rounded-2xl
                                        focus:outline-none focus:ring-4 focus:ring-[#a004ec]/5 focus:border-[#a004ec] transition-all text-base text-gray-900"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="lp-btn-pill lp-btn-primary w-full flex items-center justify-center py-4.5 mt-8 gap-3 border-0 shadow-lg shadow-[#a004ec]/20 active:scale-[0.98] text-base font-bold"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-[14px] text-gray-500 text-center mt-12 font-medium">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-purple-600 hover:text-purple-700 font-bold">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
