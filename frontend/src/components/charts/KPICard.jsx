import { useEffect, useState, useRef } from 'react'

/**
 * Animated KPI Card with count-up effect.
 * Props: value (number|string), label, icon (Lucide component), suffix, prefix, trend
 */
export default function KPICard({ value, label, icon: Icon, suffix = '', prefix = '', trend = null, delay = 0 }) {
    const [displayValue, setDisplayValue] = useState(0)
    const [isVisible, setIsVisible] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
            { threshold: 0.3 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        if (!isVisible) return
        const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0
        if (numericValue === 0) { setDisplayValue(0); return }

        const duration = 1200
        const startTime = Date.now()
        const timer = setTimeout(() => {
            const animate = () => {
                const elapsed = Date.now() - startTime - delay
                if (elapsed < 0) { requestAnimationFrame(animate); return }
                const progress = Math.min(elapsed / duration, 1)
                const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
                setDisplayValue(Math.round(eased * numericValue))
                if (progress < 1) requestAnimationFrame(animate)
            }
            animate()
        }, delay)
        return () => clearTimeout(timer)
    }, [isVisible, value, delay])

    const formattedValue = typeof value === 'string' && value.includes('.')
        ? displayValue.toFixed(1)
        : displayValue.toLocaleString()

    return (
        <div ref={ref} className="kpi-card">
            <div className="kpi-card-header">
                <div className="kpi-card-icon">
                    {Icon && <Icon size={20} />}
                </div>
                {trend !== null && trend !== undefined && (
                    <span className={`kpi-trend ${trend >= 0 ? 'up' : 'down'}`}>
                        {trend >= 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>
            <p className="kpi-card-value">{prefix}{formattedValue}{suffix}</p>
            <p className="kpi-card-label">{label}</p>
        </div>
    )
}
