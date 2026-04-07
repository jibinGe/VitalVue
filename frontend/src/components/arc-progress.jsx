import { useEffect, useRef, useState } from "react"

export default function ArcProgress({ value = 0 }) {
    const pathRef = useRef(null)
    const [dot, setDot] = useState({ x: 10, y: 72 })

    useEffect(() => {
        if (!pathRef.current) return

        const path = pathRef.current
        const length = path.getTotalLength()
        const point = path.getPointAtLength((value / 100) * length)

        setDot({ x: point.x, y: point.y })
    }, [value])

    return (
        <svg
            className="rotate-130 size-40"
            viewBox="0 0 210 210"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <circle
                cx="107"
                cy="104"
                r="102"
                stroke="#2CD155"
                strokeOpacity="0.08"
                strokeWidth=""
            />

            <path
                ref={pathRef}
                d="M9.99223 72.4803C5.43599 86.5029 3.97401 101.347 5.70702 115.989C7.44003 130.631 12.3268 144.723 20.0307 157.295C27.7346 169.866 38.0724 180.618 50.3318 188.81C62.5913 197.001 76.4809 202.438 91.0437 204.744C105.606 207.051 120.496 206.173 134.687 202.17C148.878 198.168 162.032 191.137 173.244 181.561C184.455 171.986 193.458 160.093 199.631 146.703C205.803 133.313 209 118.744 209 104"
                stroke="#2CD155"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
            />

            <circle
                cx={dot.x}
                cy={dot.y}
                r="3.5"
                fill="#2CD155"
            />
        </svg>
    )
}
