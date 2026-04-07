import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';

const NightSpoChart = () => {
    const data = [
        { time: '00:00', value: 88, line: 92 },
        { time: '00:40', value: 95, line: 94 },
        { time: '01:20', value: 92, line: 95 },
        { time: '02:00', value: 98, line: 94 },
        { time: '02:40', value: 96, line: 93 },
        { time: '03:20', value: 94, line: 92 },
        { time: '04:00', value: 97, line: 91 },
        { time: '04:40', value: 95, line: 90 },
        { time: '05:20', value: 93, line: 89 },
        { time: '06:00', value: 96, line: 87 },
        { time: '06:40', value: 94, line: 86 },
        { time: '07:20', value: 92, line: 85 },
        { time: '08:00', value: 95, line: 84 },
        { time: '08:40', value: 90, line: 83 },
        { time: '09:20', value: 88, line: 82 },
        { time: '10:00', value: 91, line: 80 },
        { time: '10:40', value: 95, line: 82 },
        { time: '11:20', value: 92, line: 83 },
        { time: '12:00', value: 90, line: 84 },
        { time: '12:40', value: 88, line: 85 },
        { time: '13:20', value: 86, line: 87 },
        { time: '14:00', value: 87, line: 90 },
        { time: '14:40', value: 90, line: 91 },
        { time: '15:20', value: 92, line: 92 },
        { time: '16:00', value: 96, line: 94 },
        { time: '16:40', value: 95, line: 95 },
        { time: '17:20', value: 93, line: 94 },
        { time: '18:00', value: 89, line: 92 },
        { time: '19:00', value: 94, line: 90 },
        { time: '20:00', value: 98, line: 92 },
    ];
    const visibleTimes = ['00:00', '06:00', '12:00', '18:00', '20:00'];

    return (
        <div className="w-full h-40 md:h-50">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={data}
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="75%" stopColor="#7056F6BF" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#7056F600" stopOpacity={0.6} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#57575B"
                        opacity={.5}
                    // vertical={false}
                    />

                    <XAxis
                        dataKey="time"
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={{ stroke: '#57575B' }}
                        interval={0}
                        tick={({ x, y, payload }) => {
                            if (!visibleTimes.includes(payload.value)) return null;

                            return (
                                <text
                                    x={x}
                                    y={y}
                                    dy={16}
                                    textAnchor="middle"
                                    fill="#BABEC4"
                                    fontSize={10}
                                >
                                    {payload.value}
                                </text>
                            );
                        }}
                    />

                    <YAxis
                        stroke="#64748b"
                        tick={{ fill: '#6EA7F7', fontSize: 10 }}
                        tickLine={false}
                        axisLine={{ stroke: '#57575B' }}
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                    />

                    <Bar
                        dataKey="value"
                        fill="url(#barGradient)"
                        radius={[2, 2, 0, 0]}
                        barSize={19.7}
                    />

                    <Line
                        type="monotone"
                        dataKey="line"
                        stroke="#9986F9"
                        strokeWidth={1.5}
                        dot={false}
                        activeDot={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default NightSpoChart;