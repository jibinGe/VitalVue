import React, { useState } from 'react';

const DateChart = () => {
  const [percentage] = useState(80.7);

  const size = 240;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2; // ✅ stays inside 240
  const center = size / 2;

  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (percentage / 100) * circumference;

  const gradientColors = [
    { offset: '0%', color: '#B3774C' },
    { offset: '33%', color: '#A5AC53' },
    { offset: '66%', color: '#40BF80' },
    { offset: '100%', color: '#BF4055' }
  ];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="progressGradient-d" x1="0%" y1="0%" x2="100%" y2="100%">
          {gradientColors.map((item, idx) => (
            <stop key={idx} offset={item.offset} stopColor={item.color} />
          ))}
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#374151"
        strokeWidth={strokeWidth}
      />

      {/* Progress circle */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="url(#progressGradient-d)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        className="transition-all duration-1000 ease-out"
      />

      {/* Center text */}
      <text
        x={center}
        y={center}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-2xl font-medium fill-[#F9FAFB]"
      >
        {percentage}%
      </text>

      <text
        x={center}
        y={center + 22}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-sm fill-[#9CA3AF]"
      >
        Data Completeness
      </text>
    </svg>
  );
};

export default DateChart;
