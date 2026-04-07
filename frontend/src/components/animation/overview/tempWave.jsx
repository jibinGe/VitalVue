import React from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

// Animation for .temp-wave-animated is defined globally in index.css
const TempWave = React.memo(function TempWave({ className = "h-14", historyData = [] }) {
  const chartData = historyData && historyData.length > 0
      ? historyData.map(h => ({ desktop: typeof h.temp === 'number' ? h.temp : (typeof h.temperature === 'number' ? h.temperature : 37) }))
      : [{ desktop: 0 }, { desktop: 0 }];

  return (
    <div className={`w-full ${className} temp-wave-animated`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <AreaChart data={chartData} margin={{ left: 0, right: 0 }}>
          <defs>
            <linearGradient id="desktopGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C29962" stopOpacity={1} />
              <stop offset="100%" stopColor="#303031" stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <Area
            type="natural"
            dataKey="desktop"
            fill="url(#desktopGradient)"
            fillOpacity={1}
            stroke="#CCA166"
            activeDot={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

export default TempWave;
