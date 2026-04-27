import { useEffect, useState, useRef } from 'react'

/**
 * SVG circular progress ring.
 * Props: value (0-100), size, strokeWidth, color, label, sublabel
 */
export default function ProgressRing({ value = 0, size = 120, strokeWidth = 8, color = '#111111', label = '', sublabel = '' }) {
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

    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (isVisible ? (value / 100) * circumference : 0)

    return (
        <div ref={ref} className="progress-ring-wrapper">
            <svg width={size} height={size} className="progress-ring-svg">
                {/* Background track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="rgba(0,0,0,0.06)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="progress-ring-circle"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </svg>
            <div className="progress-ring-label">
                <span className="progress-ring-value">{isVisible ? Math.round(value) : 0}%</span>
                {sublabel && <span className="progress-ring-sub">{sublabel}</span>}
            </div>
            {label && <p className="progress-ring-title">{label}</p>}
        </div>
    )
}
