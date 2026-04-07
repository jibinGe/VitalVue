import React, { useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';

const data = [
    { time: '00:00', intensity: 12 },
    { time: '1:00', intensity: 0 },
    { time: '02:00', intensity: 12 },
    { time: '02:05', intensity: 0 },
    { time: '02:06', intensity: 12 },
    { time: '03:10', intensity: 0 },
    { time: '03:20', intensity: 10 },
    { time: '03:30', intensity: 0 },
    { time: '04:00', intensity: 10 },
];

export default function MotionIntensityChart() {
    const [chartTime, setChartTime] = useState("24h");
    const ChartValue = [
        "6h", "24h", "3d", "7d"
    ]
    return (
        <div className="w-full">
            <div className="flex flex-wrap md:flex-nowrap gap-3 justify-between items-center mb-4 lg:mb-6">
                <div >
                    <h3 className="text-lg lg:text-xl font-medium leading-none text-white mb-1.5">Motion Pattern Analysis</h3>
                    <p className='text-xs leading-none'>Temporal movement intensity tracking</p>
                </div>
                <div className="flex  bg-[#494950] rounded-lg lg:rounded-xl p-1">
                    {ChartValue.map((item, idx) => <button onClick={() => setChartTime(item)} key={idx} className={`${item == chartTime ? "chart-btn-bg text-white" : ""} hover:text-white hover:bg-[#B68D52] px-4 py-1 text-sm text-para rounded-lg`}>{item}</button>)}
                </div>
            </div>
            <div className="h-40! md:h-50! w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="25%" stopColor="#6EA7F740" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="#6EA7F700" stopOpacity={1} />
                        </linearGradient>
                        <CartesianGrid strokeDasharray="3 3" stroke="#585D68" />
                        <XAxis
                            dataKey="time"
                            stroke="#57575B"
                            tick={{ fill: '#BABEC4', fontSize: 10 }}
                            axisLine={{ stroke: '#585D68' }}
                            ticks={["00:00", "02:00", "03:00", "03:30", "04:00"]}
                        />
                        <YAxis
                            stroke="#585D68"
                            tick={{ fill: '#6EA7F7', fontSize: 10 }}
                            axisLine={{ stroke: '#585D68' }}
                            domain={[0, 12]}
                            ticks={[0, 3, 6, 9, 12]}
                            label={{
                                value: 'Motion Intensity',
                                angle: -90,
                                position: 'insideLeft',
                                style: { fill: '#6EA7F7', fontSize: 12 },
                            }}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                            labelStyle={{ color: '#F3F4F6' }}
                        />
                        <ReferenceLine y={6} stroke="#F59E0B80" strokeDasharray="5 5" />
                        <Area
                            type="monotone"
                            dataKey="intensity"
                            stroke="#6EA7F7"
                            strokeWidth={1.5}
                            fillOpacity={1}
                            fill="url(#areaGradient)"
                            dot={{ fill: '#60A5FA', r: 0 }}
                            activeDot={{ r: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}