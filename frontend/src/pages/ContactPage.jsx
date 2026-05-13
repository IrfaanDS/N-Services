import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight } from 'lucide-react'
import logo from '../assets/n-services-logo.png'
import '../styles/landing.css'

/* ═══════════════════════════════════════════════════════════
   CONTACT PAGE — UI ONLY (non-functional form)
   ═══════════════════════════════════════════════════════════ */

function StepDot({ n, active, label }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] lp-tnum ${
          active ? 'lp-bg-primary lp-text-primary-foreground' : 'lp-border-hairline lp-text-ink-mute'
        }`}
        style={active ? { borderColor: 'var(--lp-primary)' } : {}}
      >
        {n}
      </span>
      <span className={active ? 'lp-text-ink font-medium' : 'lp-text-ink-mute'}>{label}</span>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium lp-text-ink mb-2">{label}</span>
      {children}
    </label>
  )
}

export default function ContactPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' })
  const [done, setDone] = useState(false)

  const next = (e) => {
    e.preventDefault()
    if (!form.email || !form.email.includes('@')) {
      alert('Enter a valid email')
      return
    }
    setStep(2)
  }

  const submit = (e) => {
    e.preventDefault()
    if (!form.name || !form.message) {
      alert('Please fill in all required fields')
      return
    }
    // Non-functional — just show success UI
    setDone(true)
  }

  const inputClasses = 'w-full h-11 px-3 text-base rounded-md lp-bg-canvas focus:outline-none transition-colors'
  const inputStyle = { border: '1px solid var(--lp-hairline)', color: 'var(--lp-ink)' }

  return (
    <div className="landing-page min-h-screen lp-mesh-bg">
      <header className="max-w-[1200px] mx-auto px-6 py-6">
        <Link to="/welcome" className="inline-flex items-center gap-2">
          <img src={logo} alt="N-Services" className="h-8 w-auto" />
        </Link>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 py-12">
        <div className="lp-bg-canvas rounded-xl border lp-border-hairline p-8 sm:p-12 max-w-3xl mx-auto"
          style={{ boxShadow: 'var(--lp-shadow-float)' }}>
          {done ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full lp-bg-primary-subdued lp-text-primary-deep mx-auto flex items-center justify-center mb-4">
                <Check className="w-6 h-6" />
              </div>
              <h1 className="mb-3">Thanks — we'll be in touch.</h1>
              <p className="text-base lp-text-ink-mute mb-6">
                A member of our team will reach out within one business day.
              </p>
              <Link to="/welcome" className="lp-btn-pill lp-btn-primary">Back to home</Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-6 mb-10 text-sm">
                <StepDot n={1} active={step >= 1} label="Your email" />
                <span className="flex-1 h-px" style={{ background: 'var(--lp-hairline)' }} />
                <StepDot n={2} active={step >= 2} label="Your info" />
              </div>

              {step === 1 ? (
                <form onSubmit={next}>
                  <h1 className="mb-3">Let's get you to the right place</h1>
                  <p className="text-base lp-text-ink-mute mb-8">We just need a few quick details.</p>
                  <Field label="Work email">
                    <input
                      type="email"
                      placeholder="jane@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={inputClasses}
                      style={inputStyle}
                      required
                    />
                  </Field>
                  <div className="flex justify-end mt-8">
                    <button type="submit" className="lp-btn-pill lp-btn-primary">
                      Continue <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={submit}>
                  <h1 className="mb-3">Tell us about you</h1>
                  <p className="text-base lp-text-ink-mute mb-8">We'll match you with the right specialist.</p>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field label="Full name">
                      <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className={inputClasses}
                        style={inputStyle}
                        required
                      />
                    </Field>
                    <Field label="Company (optional)">
                      <input
                        value={form.company}
                        onChange={(e) => setForm({ ...form, company: e.target.value })}
                        className={inputClasses}
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                  <div className="mt-5">
                    <Field label="How can we help?">
                      <textarea
                        rows={5}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        className="w-full px-3 py-2 text-base rounded-md lp-bg-canvas focus:outline-none resize-y"
                        style={inputStyle}
                        required
                      />
                    </Field>
                  </div>
                  <div className="flex justify-between mt-8">
                    <button type="button" onClick={() => setStep(1)} className="lp-btn-pill lp-btn-secondary">
                      Back
                    </button>
                    <button type="submit" className="lp-btn-pill lp-btn-primary">
                      Send message <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
