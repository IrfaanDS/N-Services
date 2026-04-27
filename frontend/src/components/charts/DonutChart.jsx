import { useEffect, useState, useRef } from 'react'

/**
 * CSS conic-gradient donut chart.
 * Props: segments = [{ label, value, color }], size (px), thickness (px), centerLabel
 */
export default function DonutChart({ segments = [], size = 200, thickness = 32, centerLabel = '', centerSub = '' }) {
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

    const total = segments.reduce((sum, s) => sum + s.value, 0) || 1
    let accumulated = 0

    // Build conic-gradient stops
    const stops = segments.flatMap((seg) => {
        const start = (accumulated / total) * 360
        accumulated += seg.value
        const end = (accumulated / total) * 360
        return [
            `${seg.color} ${start}deg`,
            `${seg.color} ${end}deg`,
        ]
    })

    const gradient = `conic-gradient(${stops.join(', ')})`
    const innerSize = size - thickness * 2

    return (
        <div ref={ref} className="donut-chart-wrapper">
            <div
                className={`donut-chart ${isVisible ? 'donut-visible' : ''}`}
                style={{
                    width: size,
                    height: size,
                    background: isVisible ? gradient : 'conic-gradient(rgba(0,0,0,0.05) 0deg, rgba(0,0,0,0.05) 360deg)',
                }}
            >
                <div
                    className="donut-hole"
                    style={{
                        width: innerSize,
                        height: innerSize,
                    }}
                >
                    {centerLabel && <span className="donut-center-label">{centerLabel}</span>}
                    {centerSub && <span className="donut-center-sub">{centerSub}</span>}
                </div>
            </div>
            <div className="donut-legend">
                {segments.map((seg, i) => (
                    <div key={i} className="donut-legend-item">
                        <span className="donut-legend-dot" style={{ backgroundColor: seg.color }} />
                        <span className="donut-legend-label">{seg.label}</span>
                        <span className="donut-legend-value">{seg.value}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
