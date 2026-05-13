import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../components/auth/AuthProvider'
import nServicesLogo from '../assets/n-services-logo.png'
import illustration from '../assets/landing/login-illustration.png'

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
            const { error: loginError } = await signIn({ email, password })
            if (loginError) throw loginError
            navigate('/dashboard')
        } catch (err) {
            setError(err.message || 'Invalid email or password.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden"
             style={{ fontFamily: '"Sohne", "Inter", sans-serif' }}>
            {/* ── VISUAL SIDE (LEFT) ── */}
            <div className="hidden md:flex flex-1 lp-mesh-bg items-center justify-center p-12 border-r lp-border-hairline">
                <div className="max-w-md text-center flex flex-col items-center">
                    <img
                        src={illustration}
                        alt="Smart client acquisition"
                        className="w-full max-w-sm h-auto drop-shadow-sm mb-8"
                    />
                    <h2 className="text-[22px] lp-text-ink font-semibold tracking-tight"
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif' }}>
                        Smart client acquisition, on autopilot.
                    </h2>
                </div>
            </div>

            {/* ── FORM SIDE (RIGHT) ── */}
            <div className="flex-1 flex flex-col p-8 sm:p-12 lg:p-16">
                <Link to="/welcome" className="flex items-center gap-2.5 mb-20">
                    <img src={nServicesLogo} alt="N-Services" className="h-7 w-auto" />
                    <span className="text-lg font-bold tracking-tight lp-text-ink"
                          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>N-Services</span>
                </Link>

                <div className="m-auto w-full max-w-sm">
                    <h1 className="text-4xl font-bold lp-text-ink mb-2"
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>Welcome back</h1>
                    <p className="text-[15px] lp-text-ink-mute mb-10 font-medium">
                        Please enter your details
                    </p>

                    {error && (
                        <div className="mb-6 p-4 flex items-start gap-3 rounded-lg lp-bg-ruby-95 border lp-border-ruby-90 animate-in fade-in slide-in-from-top-1">
                            <AlertCircle className="w-5 h-5 shrink-0 lp-text-ruby-70" />
                            <p className="text-sm lp-text-ruby-70">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-[13px] font-bold lp-text-ink mb-2 uppercase tracking-wider" htmlFor="email">
                                Email address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-12 px-4 text-base rounded-lg border lp-border-hairline lp-bg-canvas focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                                required
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[13px] font-bold lp-text-ink uppercase tracking-wider" htmlFor="password">
                                    Password
                                </label>
                                <Link to="/forgot-password" size="sm" className="text-sm font-medium lp-text-ink hover:opacity-70 transition-opacity">
                                    Forgot Password?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-12 px-4 text-base rounded-lg border lp-border-hairline lp-bg-canvas focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 lp-text-ink-mute hover:lp-text-ink transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="lp-btn-pill lp-btn-primary w-full h-12 justify-center text-[15px] font-semibold mt-4"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : "Sign in"}
                        </button>
                    </form>

                    <p className="mt-8 text-[14px] lp-text-ink-mute text-center font-medium">
                        Don't have an account?{' '}
                        <Link to="/pricing" className="lp-text-primary hover:underline font-bold">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
