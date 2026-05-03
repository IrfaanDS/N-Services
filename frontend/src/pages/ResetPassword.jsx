import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, Lock, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../components/auth/AuthProvider'

export default function ResetPassword() {
    const { updatePassword } = useAuth()
    const navigate = useNavigate()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const handleUpdate = async (e) => {
        e.preventDefault()
        setError('')
        
        if (password !== confirmPassword) {
            setError('Passwords do not match.')
            return
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.')
            return
        }

        setLoading(true)
        try {
            const { error: updateError } = await updatePassword(password)
            if (updateError) throw updateError
            setSubmitted(true)
        } catch (err) {
            setError(err.message || 'An error occurred. Link might be expired.')
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
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Password updated</h2>
                        <p className="text-gray-500 mb-8">
                            Your password has been successfully reset. You can now sign in with your new password.
                        </p>
                        <Link to="/login" className="btn btn-primary w-full justify-center py-3">
                            Sign In
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
                    <div className="w-11 h-11 rounded-xl bg-black/5 border border-black/10 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-black" />
                    </div>
                    <span className="text-2xl font-bold text-gray-900">LeadFlow</span>
                </div>

                {/* ── Card ── */}
                <div className="card bg-white/40 backdrop-blur-md border border-black/5 shadow-2xl shadow-black/5">
                    <div className="mb-6 text-center">
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Set new password</h2>
                        <p className="text-sm text-gray-500">Please enter your new password below.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3 animate-fade-in">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleUpdate} className="space-y-4" autoComplete="off">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
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
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
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
                                    Update Password
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
