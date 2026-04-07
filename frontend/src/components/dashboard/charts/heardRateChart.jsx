import React, { useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

const data = [
    { time: '00:00', motion: 10, hr: 80 },
    { time: '00:30', motion: 11, hr: 88 },
    { time: '01:00', motion: 9, hr: 85 },
    { time: '01:30', motion: 8, hr: 90 },
    { time: '02:00', motion: 10, hr: 60 },
    { time: '02:30', motion: 7, hr: 82 },
    { time: '03:00', motion: 11, hr: 98 },
    { time: '03:30', motion: 8, hr: 60 },
    { time: '04:00', motion: 9, hr: 85 },
];

export default function HeardRateChart() {
    const [chartTime, setChartTime] = useState("24h");
    const ChartValue = [
        "6h", "24h", "3d", "7d"
    ]
    return (
        <div className="w-ful">
            <div className="flex flex-wrap md:flex-nowrap gap-3 justify-between items-center mb-4 lg:mb-6">
                <div >
                    <h3 className="text-lg lg:text-xl font-medium leading-none text-white mb-1.5">Recent NEWS2 Trend</h3>
                    <p className='text-xs leading-none'>Temporal correlation observed</p>
                </div>
                <div className="flex bg-[#494950] rounded-lg lg:rounded-xl p-1">
                    {ChartValue.map((item, idx) => <button onClick={() => setChartTime(item)} key={idx} className={`${item == chartTime ? "chart-btn-bg text-white" : ""} hover:text-white hover:bg-[#B68D52] px-4 py-1 text-sm text-para rounded-lg`}>{item}</button>)}
                </div>
            </div>
            <div className="h-40! md:h-50!  w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#57575B" />
                        <XAxis
                            dataKey="time"
                            stroke="#57575B"
                            tick={{ fill: '#BABEC4', fontSize: 10 }}
                            axisLine={{ stroke: '#57575B' }}
                        />
                        <YAxis
                            yAxisId="motion"
                            orientation="left"
                            stroke="#57575B"
                            tick={{ fill: '#6EA7F7', fontSize: 10 }}
                            axisLine={{ stroke: '#57575B' }}
                            domain={[0, 12]}
                            ticks={[0, 3, 6, 9, 12]}
                            label={{ value: 'Motion', angle: -90, position: 'insideLeft', style: { fill: '#6EA7F7', fontSize: 12 } }}
                        />
                        <YAxis
                            yAxisId="hr"
                            orientation="right"
                            stroke="#57575B"
                            tick={{ fill: '#BABEC4', fontSize: 10 }}
                            axisLine={{ stroke: '#4B5563' }}
                            domain={[25, 100]}
                            ticks={[25, 50, 75, 100]}
                            label={{ value: 'HR (bpm)', angle: 90, position: 'insideRight', style: { fill: '#0FBD83', fontSize: 12 } }}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                            labelStyle={{ color: '#F3F4F6' }}
                        />
                        <Line
                            yAxisId="motion"
                            type="monotone"
                            dataKey="motion"
                            stroke="#6EA7F7"
                            strokeWidth={1.5}
                            dot={{ fill: '#3E3E41', r: 3 }}
                            activeDot={{ r: 3 }}
                        />
                        <Line
                            yAxisId="hr"
                            type="monotone"
                            dataKey="hr"
                            stroke="#0FBD83"
                            strokeWidth={1.5}
                            dot={{ fill: '#3E3E41', r: 3 }}
                            activeDot={{ r: 3 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}