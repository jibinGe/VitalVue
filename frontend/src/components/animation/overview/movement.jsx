import { Bar, BarChart, ResponsiveContainer } from "recharts"

export default function Movement() {
    const chartData = [
        { data: 80 },
        { data: 100 },
        { data: 200 },
        { data: 300 },
        { data: 280 },
        { data: 250 },
        { data: 200 },
        { data: 80 },
    ]

    return (
        <div className="w-full h-18 movement-animated">
            <style>
                {`
                    @keyframes moveBarPulse {
                        0%, 100% {
                            transform: scaleY(0.7);
                            opacity: 0.7;
                        }
                        50% {
                            transform: scaleY(1);
                            opacity: 1;
                        }
                    }
                    .movement-animated .recharts-bar-rectangle {
                        transform-origin: bottom;
                        animation: moveBarPulse 2s ease-in-out infinite;
                    }
                    .movement-animated .recharts-bar-rectangle:nth-child(1) { animation-delay: 0s; }
                    .movement-animated .recharts-bar-rectangle:nth-child(2) { animation-delay: 0.1s; }
                    .movement-animated .recharts-bar-rectangle:nth-child(3) { animation-delay: 0.2s; }
                    .movement-animated .recharts-bar-rectangle:nth-child(4) { animation-delay: 0.3s; }
                    .movement-animated .recharts-bar-rectangle:nth-child(5) { animation-delay: 0.4s; }
                    .movement-animated .recharts-bar-rectangle:nth-child(6) { animation-delay: 0.5s; }
                    .movement-animated .recharts-bar-rectangle:nth-child(7) { animation-delay: 0.6s; }
                    .movement-animated .recharts-bar-rectangle:nth-child(8) { animation-delay: 0.7s; }
                `}
            </style>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <defs>
                        <linearGradient id="desktopGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#C29962" stopOpacity={1} />
                            <stop offset="100%" stopColor="#303031" stopOpacity={0.5} />
                        </linearGradient>
                    </defs>

                    <Bar dataKey="data" fill="url(#desktopGradient)" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
