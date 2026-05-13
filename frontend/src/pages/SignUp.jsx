import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowLeft, ShieldCheck, Zap, Globe } from 'lucide-react'
import { useAuth } from '../components/auth/AuthProvider'
import { supabase } from '../services/supabaseClient'
import nServicesLogo from '../assets/n-services-logo.png'

export default function SignUp() {
    const { signUp } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const selectedTier = searchParams.get('plan') || 'basic'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    // Password validation requirements
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
    }

    const handleSignUp = async (e) => {
        e.preventDefault()
        setError('')

        // 1. Validation
        if (!requirements.length || !requirements.uppercase || !requirements.number || !requirements.special) {
            setError('Password does not meet all security requirements.')
            return
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        setLoading(true)

        try {
            // 2. Check if email exists
            const { data: exists, error: checkError } = await supabase.rpc('check_if_email_exists', {
                email_to_check: email
            })

            if (exists === true) {
                setError('This email is already registered. Please sign in instead.')
                setLoading(false)
                return
            }

            // 3. Supabase Auth Sign Up
            const { data: authData, error: signUpError } = await signUp({ email, password })
            if (signUpError) throw signUpError

            const user_id = authData?.user?.id

            if (user_id) {
                // 4. Stripe Integration Check
                if (selectedTier.toLowerCase() === 'basic') {
                    setSubmitted(true)
                    return
                }

                try {
                    const response = await fetch('http://localhost:8000/api/stripe/create-checkout-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id, email, tier: selectedTier })
                    })
                    const sessionData = await response.json()
                    if (sessionData.url) {
                        window.location.href = sessionData.url
                        return
                    }
                    setSubmitted(true)
                } catch (checkoutErr) {
                    console.error('Checkout error:', checkoutErr)
                    setSubmitted(true)
                }
            } else {
                setSubmitted(true)
            }
        } catch (err) {
            setError(err.message || 'An error occurred during account creation.')
        } finally {
            setLoading(false)
        }
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-white">
                <div className="w-full max-w-md text-center animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">Verification email sent</h2>
                    <p className="text-sm text-gray-500 mb-10 leading-relaxed">
                        We've sent a link to <span className="font-bold text-gray-900">{email}</span>.
                        Please verify your email to start using N-Services.
                    </p>
                    <Link to="/login" className="lp-btn-pill lp-btn-primary px-10 py-3 inline-flex items-center gap-2">
                        Back to Login
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        )
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
                        Reinvent your <br />
                        <span className="text-[#a004ec]">growth strategy.</span>
                    </h1>

                    <p className="text-[15px] text-gray-500 mb-12 leading-relaxed max-w-xs font-medium">
                        Skip the outreach fatigue. Experience lead generation reimagined for the modern age.
                    </p>

                    <ul className="space-y-5">
                        <li className="flex items-start gap-4 text-gray-600">
                            <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                                <Globe className="w-3 h-3 text-[#a004ec]" />
                            </div>
                            <span className="font-medium text-sm">AI intelligence paired with human strategy</span>
                        </li>
                        <li className="flex items-start gap-4 text-gray-600">
                            <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                                <Zap className="w-3 h-3 text-[#a004ec]" />
                            </div>
                            <span className="font-medium text-sm">Smart agents handle the grind, you close the deals</span>
                        </li>
                        <li className="flex items-start gap-4 text-gray-600">
                            <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                                <ShieldCheck className="w-3 h-3 text-[#a004ec]" />
                            </div>
                            <span className="font-medium text-sm">Outreach that scales from a chore into a machine</span>
                        </li>
                    </ul>
                </div>
            </div>

            {/* ── Right Side: Sign Up Form ── */}
            <div className="flex-1 flex flex-col pt-32 px-8 sm:px-16 lg:px-24 pb-12 relative overflow-y-auto">

                {/* Mobile Logo */}
                <div className="md:hidden absolute top-8 left-8 flex items-center gap-2">
                    <img src={nServicesLogo} alt="Logo" className="h-6 w-auto" />
                    <span className="font-bold text-gray-900">N-Services</span>
                </div>

                <div className="max-w-md w-full mx-auto md:mx-0">
                    <div className="mb-10">
                        <div className="flex items-center mb-6">
                            <Link
                                to="/pricing"
                                className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <h2 className="text-xl font-bold text-gray-900 ml-2">Create your account</h2>
                        </div>

                        <div className="mb-6 px-4 py-3 bg-[#a004ec]/10 rounded-xl border border-purple-100 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] text-[#a004ec] font-bold uppercase tracking-widest mb-0.5">SELECTED PLAN</p>
                                <p className="text-sm font-bold text-gray-900 capitalize">{selectedTier} Tier</p>
                            </div>
                            <Link
                                to="/pricing"
                                className="text-xs font-bold text-[#a004ec] hover:text-purple-700"
                            >
                                Change
                            </Link>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600 font-bold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSignUp} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 ml-1">Email address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50/30 border border-gray-200 rounded-xl
                                        focus:outline-none focus:ring-4 focus:ring-[#a004ec]/5 focus:border-[#a004ec] transition-all text-sm text-gray-900"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-11 py-3 bg-gray-50/30 border border-gray-200 rounded-xl
                                        focus:outline-none focus:ring-4 focus:ring-[#a004ec]/5 focus:border-[#a004ec] transition-all text-sm text-gray-900"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#a004ec] transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 px-1">
                                <Requirement met={requirements.length} text="8+ characters" />
                                <Requirement met={requirements.uppercase} text="Uppercase" />
                                <Requirement met={requirements.number} text="Number" />
                                <Requirement met={requirements.special} text="Special char" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 ml-1">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-11 pr-11 py-3 bg-gray-50/30 border border-gray-200 rounded-xl
                                        focus:outline-none focus:ring-4 focus:ring-[#a004ec]/5 focus:border-[#a004ec] transition-all text-sm text-gray-900"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#a004ec] transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="lp-btn-pill lp-btn-primary w-full flex items-center justify-center py-4 mt-6 gap-2 border-0 shadow-lg shadow-[#a004ec]/20 active:scale-[0.98]"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {selectedTier.toLowerCase() === 'basic' ? 'Create Account' : 'Continue to Payment'}
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-[13px] text-gray-500 text-center mt-10 font-medium">
                        Already have an account?{' '}
                        <Link to="/login" className="text-[#a004ec] hover:text-purple-700 font-bold">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

function Requirement({ met, text }) {
    return (
        <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${met ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${met ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-300'}`} />
            {text}
        </div>
    )
}
