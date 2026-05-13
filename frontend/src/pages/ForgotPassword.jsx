import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Mail, ArrowRight, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../components/auth/AuthProvider'
import nServicesLogo from '../assets/n-services-logo.png'

export default function ForgotPassword() {
    const { resetPassword } = useAuth()
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const handleReset = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const { error: resetError } = await resetPassword(email)
            if (resetError) throw resetError
            setSubmitted(true)
        } catch (err) {
            setError(err.message || 'An error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-md page-enter">
                    <div className="card text-center py-12 bg-white/40 backdrop-blur-md border border-black/5 shadow-2xl shadow-black/5">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
                        <p className="text-gray-500 mb-8">
                            We've sent a password reset link to <span className="font-semibold text-gray-900">{email}</span>.
                        </p>
                        <Link to="/login" className="btn btn-primary w-full justify-center py-3">
                            Return to Login
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md page-enter">
                {/* ── Logo ── */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <img src={nServicesLogo} alt="N-Services" className="h-10 w-auto" />
                    <span className="text-2xl font-bold text-gray-900">N-Services</span>
                </div>

                {/* ── Card ── */}
                <div className="card bg-white/40 backdrop-blur-md border border-black/5 shadow-2xl shadow-black/5">
                    <div className="mb-6">
                        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-4">
                            <ArrowLeft className="w-4 h-4" />
                            Back to login
                        </Link>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Reset password</h2>
                        <p className="text-sm text-gray-500">Enter your email and we'll send you a link to reset your password.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3 animate-fade-in">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleReset} className="space-y-4" autoComplete="off">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    autoComplete="off"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg
                             text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/30 transition-all"
                                />
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
                                    Send Reset Link
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
