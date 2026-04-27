import { useEffect, useState, useRef } from 'react'

/**
 * CSS-animated bar chart component.
 * Props: data = [{ label, value, color? }], horizontal (bool), maxValue (optional)
 */
export default function AnimatedBar({ data = [], horizontal = false, maxValue = null, height = 200 }) {
    const [isVisible, setIsVisible] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
            { threshold: 0.2 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    const max = maxValue || Math.max(...data.map(d => d.value), 1)

    if (horizontal) {
        return (
            <div ref={ref} className="bar-chart-horizontal">
                {data.map((item, i) => (
                    <div key={i} className="bar-row">
                        <span className="bar-label">{item.label}</span>
                        <div className="bar-track">
                            <div
                                className="bar-fill"
                                style={{
                                    width: isVisible ? `${(item.value / max) * 100}%` : '0%',
                                    backgroundColor: item.color || '#111111',
                                    transitionDelay: `${i * 80}ms`,
                                }}
                            />
                        </div>
                        <span className="bar-value">{item.value}</span>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div ref={ref} className="bar-chart-vertical" style={{ height }}>
            <div className="bar-chart-grid">
                {[100, 75, 50, 25, 0].map(pct => (
                    <div key={pct} className="bar-grid-line">
                        <span className="bar-grid-label">{Math.round(max * pct / 100)}</span>
                    </div>
                ))}
            </div>
            <div className="bar-chart-bars">
                {data.map((item, i) => (
                    <div key={i} className="bar-col">
                        <div className="bar-col-track">
                            <div
                                className="bar-col-fill"
                                style={{
                                    height: isVisible ? `${(item.value / max) * 100}%` : '0%',
                                    backgroundColor: item.color || '#111111',
                                    transitionDelay: `${i * 100}ms`,
                                }}
                            />
                        </div>
                        <span className="bar-col-label">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
