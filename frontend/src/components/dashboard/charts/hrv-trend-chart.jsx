import React, { useState, useMemo } from 'react';
import { ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { formatToLocalTime } from '@/utilities/dateUtils';

const HrvTrendChart = ({ hrvData = [], statistics = null }) => {
  // Calculate baseline from statistics average, or default to 50
  const baseline = statistics?.average || 50;

  // Transform API data to chart format
  const chartData = useMemo(() => {
    if (!hrvData || hrvData.length === 0) {
      // Return empty data structure if no data
      return [];
    }

    return hrvData.map((item) => {
      const displayDate = formatToLocalTime(item.timestamp);
      const value = item.value || 0;

      const positive = value > baseline ? value : baseline;
      const negative = value < baseline ? value : baseline;

      return {
        date: item.timestamp,
        displayDate: displayDate,
        value: value,
        quality: item.quality || 100,
        positiveValue: positive,
        negativeValue: negative,
      };
    });
  }, [hrvData, baseline]);

  const [hoveredPoint, setHoveredPoint] = useState(null);

  // If no data, show empty state
  if (chartData.length === 0) {
    return (
      <div className="w-full h-50 md:h-75 flex items-center justify-center">
        <p className="text-[#9CA3AF] text-sm">No HRV data available</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = data.value;
      const quality = data.quality || 100;
      return (
        <div className="bg-[#2F2F31] border border-[#555555] p-2.5 rounded shadow-lg">
          <p className="text-[#9CA3AF] text-xs font-medium">{data.displayDate}</p>
          <p className="text-[#9CA3AF] text-xs">Value: {value.toFixed(1)}</p>
          <p className="text-[#9CA3AF] text-xs">Quality: {quality}%</p>
        </div>
      );
    }
    return null;
  };
  return (
    <div className="w-full h-50 md:h-75 relative z-1">
      <p className='text-[#9CA3AF] text-xs leading-none! -rotate-90 absolute -left-10 top-1/2 -translate-y-1/2'>HRV Relative Scale</p>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 0, right: 25, left: 0, bottom: 0 }}
          onMouseMove={(e) => {
            if (e && e.activePayload) {
              setHoveredPoint(e.activePayload[0]);
            }
          }}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="30%" stopColor="#0099FF4D" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#078EFD0D" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#57575B"
            vertical={false}
          />
          <XAxis
            dataKey="displayDate"
            stroke="#E6E6E6"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            tickLine={false}
            interval={Math.max(0, Math.floor(chartData.length / 5))}
            axisLine={{ stroke: '#9EA2AB' }}
          />
          <YAxis
            stroke="#E6E6E6"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            tickLine={false}
            domain={['auto', 'auto']}
            axisLine={{ stroke: '#9EA2AB' }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: '#E6E6E6', strokeWidth: 1, strokeDasharray: '' }}
          />
          <ReferenceLine
            y={baseline}
            stroke="#E6E6E6"
            strokeDasharray="8 4"
            strokeWidth={2}
            label={{ value: `${Math.round(baseline)} - Baseline`, fill: '#888888', fontSize: 12, position: 'right' }}
          />
          {hoveredPoint && (
            <ReferenceLine
              x={hoveredPoint.payload.displayDate}
              stroke="#888888"
              strokeWidth={1}
            />
          )}
          <Area
            type="monotone"
            dataKey="positiveValue"
            stroke="#22c55e"
            strokeWidth={0}
            fillOpacity={1}
            fill="url(#colorPositive)"
            animationDuration={500}
            dot={false}
            activeDot={{ fill: '#2B7FFF', stroke: '#59595A', strokeWidth: 2, r: 5 }}
          />
          <Area
            type="monotone"
            dataKey="negativeValue"
            stroke="#ef4444"
            strokeWidth={0}
            fillOpacity={1}
            fill="#2F2F31"
            animationDuration={500}
            dot={false}
            activeDot={{ fill: '#2B7FFF', stroke: '#59595A', strokeWidth: 2, r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HrvTrendChart;