import React from 'react';
import {
    AreaChart,
    Area,
    Line,
    XAxis,
    YAxis,
    ResponsiveContainer,
    CartesianGrid,
    Tooltip,
} from 'recharts';

const ImmobilityDurationChart = () => {
const data = [
  { time: '10:58 AM', orange: 28, purple: 45 },
  { time: '11:03 AM', orange: 35, purple: 60 },
  { time: '11:08 AM', orange: 22, purple: 48 },
  { time: '11:13 AM', orange: 40, purple: 72 },
  { time: '11:18 AM', orange: 30, purple: 55 },
  { time: '11:23 AM', orange: 18, purple: 42 },
  { time: '11:28 AM', orange: 26, purple: 50 },
  { time: '11:33 AM', orange: 33, purple: 58 },
  { time: '11:38 AM', orange: 45, purple: 62 },
  { time: '11:43 AM', orange: 29, purple: 47 },

  { time: '11:48 AM', orange: 36, purple: 65 },
  { time: '11:53 AM', orange: 24, purple: 44 },
  { time: '11:58 AM', orange: 32, purple: 59 },
  { time: '12:03 PM', orange: 41, purple: 70 },
  { time: '12:08 PM', orange: 27, purple: 52 },
  { time: '12:13 PM', orange: 34, purple: 61 },
  { time: '12:18 PM', orange: 20, purple: 40 },
  { time: '12:23 PM', orange: 38, purple: 66 },
  { time: '12:28 PM', orange: 25, purple: 49 },
  { time: '12:33 PM', orange: 31, purple: 57 },

  { time: '12:38 PM', orange: 62, purple: 55 },
  { time: '01:58 AM', orange: 58, purple: 52 },
  { time: '02:28 AM', orange: 21, purple: 43 },
  { time: '02:58 AM', orange: 29, purple: 54 },
  { time: '03:28 AM', orange: 35, purple: 60 },
  { time: '03:58 AM', orange: 26, purple: 48 },
  { time: '04:28 AM', orange: 33, purple: 59 },
  { time: '05:28 AM', orange: 40, purple: 68 },
  { time: '06:28 AM', orange: 28, purple: 46 },
  { time: '07:58 AM', orange: 37, purple: 63 },
];



    const visibleTimes = [
        '10:58 AM',
        '02:28 PM',
        '05:58 PM',
        '09:28 PM',
        '12:58 AM',
        '04:28 AM',
        '07:58 AM',
    ];

    return (
        <div className="h-50 md:h-68 w-full bg-[#3E3E41] p-3 lg:p-4 rounded-xl lg:rounded-[20px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 0, right: 25, left: -30, bottom: 0 }}>
                    <defs>
                        <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="25%" stopColor="#B686F933" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="#B686F90D" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" opacity={0.8} />

                    <XAxis
                        dataKey="time"
                        stroke="#9CA3AF"
                        axisLine={{ stroke: '#9CA3AF' }}
                        tickLine={false}
                        interval={0}
                        allowDuplicatedCategory={false}
                        tick={({ x, y, payload }) => {
                            if (!visibleTimes.includes(payload.value)) return null;

                            return (
                                <text
                                    x={x}
                                    y={y}
                                    dy={16}
                                    textAnchor="middle"
                                    fill="#BABEC4"
                                    fontSize={11}
                                >
                                    {payload.value}
                                </text>
                            );
                        }}
                    />
                    <YAxis
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF', fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: '#9CA3AF' }}
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                    />

                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#2F2F31',
                            border: '1px solid #555',
                            borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#9CA3AF' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="purple"
                        stroke="#B686F9"
                        strokeWidth={1}
                        fill="url(#purpleGradient)"
                        dot={false}
                        activeDot={false}
                    />
                    <Line
                        type="monotone"
                        dataKey="orange"
                        stroke="#FE9A00"
                        strokeWidth={1}
                        dot={{
                            fill: '#E54D4D',
                            stroke: '#59595A',
                            strokeWidth: 3,
                            r: 5,
                        }}
                        activeDot={{
                            fill: '#E54D4D',
                            stroke: '#59595A',
                            strokeWidth: 3,
                            r: 5,
                        }}
                    />

                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ImmobilityDurationChart;
