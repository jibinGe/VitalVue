import React from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

const CustomDot = (props) => {
  const { cx, cy, index, dataLength } = props;
  if (index === dataLength - 1) {
    return (
      <g key={`dot-${index}`}>
        <circle cx={cx} cy={cy} r={6} fill="#CCA166" fillOpacity={0.4} className="dot-pulse" />
        <circle cx={cx} cy={cy} r={3.5} fill="#CCA166" stroke="#2F2F31" strokeWidth={1} />
      </g>
    );
  }
  return null;
};

// Animation for .temp-wave-animated is defined globally in index.css
const TempWave = React.memo(function TempWave({ className = "h-14", historyData = [] }) {
  const chartData = historyData && historyData.length > 0
      ? historyData.map(h => ({ desktop: typeof h.temp === 'number' ? h.temp : (typeof h.temperature === 'number' ? h.temperature : 37) }))
      : [{ desktop: 37 }, { desktop: 37.2 }];

  return (
    <div className={`w-full ${className} temp-wave-animated`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <AreaChart data={chartData} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="desktopGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C29962" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#303031" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="natural"
            dataKey="desktop"
            fill="url(#desktopGradient)"
            fillOpacity={1}
            stroke="#CCA166"
            strokeWidth={2}
            isAnimationActive={true}
            animationDuration={2000}
            activeDot={true}
            dot={<CustomDot dataLength={chartData.length} />}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

export default TempWave;
