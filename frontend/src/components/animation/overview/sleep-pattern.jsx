import { Bar, BarChart, ResponsiveContainer } from "recharts"

export default function SleepPattern() {
  const randerData = 120
  const chartData = [
    {
      bar1: randerData - 45, // fixed data
      bar2: randerData, // rander data
      bar3: randerData - 45, // fixed data
    },
  ]
  return (
    <div className="w-[calc(100%+16px)] -ml-2 -mb-2 h-18 sleep-pattern-animated">
      <style>
        {`
                @keyframes sleepBarPulse {
                    0%, 100% {
                        opacity: 0.8;
                        transform: scaleY(0.95);
                    }
                    50% {
                        opacity: 1;
                        transform: scaleY(1);
                    }
                }
                .sleep-pattern-animated .recharts-bar-rectangle {
                    transform-origin: bottom;
                    animation: sleepBarPulse 4s ease-in-out infinite;
                }
                /* Stagger the middle bar slightly for a breathing effect */
                .sleep-pattern-animated .recharts-bar-rectangle:nth-child(2) {
                    animation-delay: 0.5s;
                }
            `}
      </style>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barGap={0}>
          <defs>
            <linearGradient id="desktopGradient3" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor="#C29962" stopOpacity={1} />
              <stop offset="100%" stopColor="#303031" stopOpacity={0.5} />
            </linearGradient>
          </defs>

          {/* 80% width */}
          <Bar dataKey="bar1" fill="url(#desktopGradient3)" barSize="80%" />

          {/* fixed 20px */}
          <Bar dataKey="bar2" fill="#CCA166" barSize={10} />

          {/* calc(20% - 20px) */}
          <Bar dataKey="bar3" fill="url(#desktopGradient3)" barSize="16%" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
