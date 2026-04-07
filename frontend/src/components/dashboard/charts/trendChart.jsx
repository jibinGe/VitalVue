import { useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';

const data = [
    { time: '02:00', score: 4 },
    { time: '06:00', score: 7 },
    { time: '10:00', score: 8 },
    { time: '14:00', score: 6 },
    { time: '14:32', score: 10 },
];

export default function TrendChart() {
    const [chartTime, setChartTime] = useState("24h");
    const ChartValue = [
        "6h", "24h", "3d", "7d"
    ]
    return (
        <div className="w-full">
            <div className="flex flex-wrap md:flex-nowrap gap-3 justify-between items-center mb-6">
                <h3 className="text-lg lg:text-xl font-medium leading-none text-white">Recent NEWS2 Trend</h3>
                <div className="flex bg-[#494950] rounded-lg lg:rounded-xl p-1">
                    {ChartValue.map((item, idx) => <button onClick={() => setChartTime(item)} key={idx} className={`${item == chartTime ? "chart-btn-bg text-white" : ""} hover:text-white hover:bg-[#B68D52] px-4 py-1 text-sm text-para rounded-lg`}>{item}</button>)}
                </div>
            </div>
            <div className="h-40! md:h-50! w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#57575B" />
                        <XAxis
                            dataKey="time"
                            stroke="#57575B"
                            axisLine={{ stroke: '#57575B' }}
                            tick={{
                                fill: '#BABEC4',
                                fontSize: 10
                            }}  
                        />
                        <YAxis
                            stroke="#57575B"
                            axisLine={{ stroke: '#57575B' }}
                            domain={[0, 12]}
                            ticks={[0, 3, 6, 9, 12]}
                            tick={{
                                fill: '#6EA7F7',
                                fontSize: 10
                            }}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                            labelStyle={{ color: '#F3F4F6' }}
                        />
                        <ReferenceLine y={6} stroke="#996E26" strokeDasharray="5 5" />
                        <Line
                            type="monotone"
                            dataKey="score"
                            stroke="#94A3B8"
                            strokeWidth={2}
                            dot={{ fill: '#94A3B8', r: 6 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}