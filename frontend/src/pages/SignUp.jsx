import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react'
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

    // Validation patterns
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const passwordRequirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
    }

    const validateForm = () => {
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address.')
            return false
        }
        if (!passwordRequirements.length || !passwordRequirements.uppercase || !passwordRequirements.number || !passwordRequirements.special) {
            setError('Password does not meet requirements.')
            return false
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return false
        }
        return true
    }

    const handleSignUp = async (e) => {
        e.preventDefault()
        setError('')
        
        if (!validateForm()) return

        setLoading(true)
        try {
            // 1. Check if email already exists using our custom RPC
            const { data: exists, error: checkError } = await supabase.rpc('check_if_email_exists', { 
                email_to_check: email 
            })

            if (checkError) {
                console.error('Email check failed:', checkError)
            }

            if (exists === true) {
                setError('This email is already registered. Please sign in instead.')
                setLoading(false)
                return
            }

            // 2. Proceed with sign up
            const { data: authData, error: signUpError } = await signUp({ email, password })
            if (signUpError) throw signUpError

            // 3. Create Stripe checkout session
            const user_id = authData?.user?.id
            
            if (user_id) {
                try {
                    const response = await fetch('http://localhost:8000/api/stripe/create-checkout-session', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            user_id: user_id,
                            email: email,
                            tier: selectedTier
                        })
                    })
                    const sessionData = await response.json()
                    
                    if (sessionData.url) {
                        window.location.href = sessionData.url
                        return
                    } else {
                        console.error('No checkout URL returned', sessionData)
                        setSubmitted(true) // Fallback
                    }
                } catch (checkoutErr) {
                    console.error('Checkout session error:', checkoutErr)
                    setSubmitted(true) // Fallback to normal flow if stripe fails
                }
            } else {
                setSubmitted(true)
            }
            
        } catch (err) {
            setError(err.message || 'An error occurred during sign up.')
        } finally {
            setLoading(false)
        }
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md page-enter">
                    <div className="card bg-white/40 backdrop-blur-md border border-black/5 shadow-2xl shadow-black/5 text-center py-12">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
                        <p className="text-gray-500 mb-8">
                            We've sent a confirmation link to <span className="font-semibold text-gray-900">{email}</span>. 
                            Please click the link to activate your account.
                        </p>
                        <Link to="/login" className="btn btn-outline w-full justify-center">
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 py-12">
            <div className="w-full max-w-md page-enter transition-all duration-500">
                
                {/* ── Logo ── */}
                <Link to="/welcome" className="flex items-center justify-center gap-3 mb-8">
                    <img src={nServicesLogo} alt="N-Services" className="h-10 w-auto" />
                    <span className="text-2xl font-bold text-gray-900">N-Services</span>
                </Link>

                <div className="card bg-white/40 backdrop-blur-md border border-black/5 shadow-2xl shadow-black/5">
                    <div className="flex items-center mb-6">
                        <Link 
                            to="/pricing"
                            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h2 className="text-xl font-bold text-gray-900 ml-2">Create your account</h2>
                    </div>
                    
                    <div className="mb-6 px-4 py-3 bg-primary-50 rounded-xl border border-primary-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-primary-600 font-semibold uppercase tracking-wider mb-0.5">Selected Plan</p>
                            <p className="text-sm font-medium text-gray-900 capitalize">{selectedTier} Tier</p>
                        </div>
                        <Link 
                            to="/pricing"
                            className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                        >
                            Change
                        </Link>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3 animate-fade-in">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSignUp} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
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
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="new-password"
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
                            
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <Requirement met={passwordRequirements.length} text="8+ characters" />
                                <Requirement met={passwordRequirements.uppercase} text="Uppercase" />
                                <Requirement met={passwordRequirements.number} text="Number" />
                                <Requirement met={passwordRequirements.special} text="Special char" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg
                             text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/30 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
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
                                    Continue to Payment
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-sm text-gray-500 text-center mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">
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
        <div className={`flex items-center gap-1.5 text-[11px] ${met ? 'text-green-600' : 'text-gray-400'}`}>
            <CheckCircle2 className={`w-3 h-3 ${met ? 'text-green-500' : 'text-gray-300'}`} />
            {text}
        </div>
    )
}
