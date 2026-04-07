import React from "react";

const AutonomicBalanceChart2 = () => {
    const percentage = 65;

    const size = 120;
    const strokeWidth = 12;
    const center = size / 2;
    const radius = center - strokeWidth / 2;

    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset =
        circumference - (percentage / 100) * circumference;
    const [animatedOffset, setAnimatedOffset] = React.useState(circumference);
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedOffset(strokeDashoffset);
        }, 100);

        return () => clearTimeout(timer);
    }, [strokeDashoffset]);
    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
        >
            <defs>
                <linearGradient id="progressGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="50%" stopColor="#8F5C06" />
                </linearGradient>
            </defs>

            {/* Background circle (FULL 120) */}
            <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#D9D9D9"
                strokeWidth={strokeWidth}
            />

            {/* Progress circle */}
            <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="url(#progressGradient2)"
                strokeWidth={strokeWidth + 1}
                strokeDasharray={circumference}
                strokeDashoffset={animatedOffset}
                strokeLinecap="round"
                style={{
                    transition: 'stroke-dashoffset 3s ease-in-out',
                }}
            />

            <text
                x={center}
                y={center}
                textAnchor="middle"
                dy=".35em"
                className="text-2xl font-medium fill-[#F9FAFB]"
            >
                {percentage}%
            </text>

        </svg>
    );
};

export default AutonomicBalanceChart2;
