import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Rectangle, ReferenceArea } from 'recharts';

const data = [
    { time: '05:50 AM', value: 800 },
    { time: '06:10 AM', value: 620 },
    { time: '06:20 AM', value: 600 },
    { time: '06:30 AM', value: 1100 },
    { time: '06:50 AM', value: 350 },
    { time: '07:10 AM', value: 880 },
    { time: '07:30 AM', value: 850 },
    { time: '07:50 AM', value: 1000 },
    { time: '08:10 AM', value: 790 },
    { time: '08:30 AM', value: 800 },
];

const CustomLegend = () => (
    <div className="top-2.5 right-2.5 md:flex justify-center items-center gap-4 lg:gap-5 mb-4 text-sm absolute z-2 hidden">
        <div className="flex items-center gap-2">
            <div className="w-3.5 h-0.5 bg-blue-400 rounded"></div>
            <span className="text-para text-xs md:text-sm leading-none">RR Interval</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-3.5 h-2 bg-linear-to-t from-[#6EA7F740] to-[#6EA7F700]"></div>
            <span className="text-para text-xs md:text-sm leading-none">Suspected irregularity</span>
        </div>
    </div>
);

const RRIntervalChart = () => {
    const [chartTime, setChartTime] = useState("24h");
    const ChartValue = [
        "6h", "24h", "3d", "7d"
    ]
    return (
        <div className="w-full">
            <div className="flex flex-wrap md:flex-nowrap gap-3 justify-between items-center mb-4 lg:mb-6">
                <div >
                    <h3 className="text-lg lg:text-xl font-medium leading-none text-white mb-1.5">RR Interval Variability</h3>
                    <p className='text-xs leading-none'>Beat-to-beat rhythm irregularity analysis</p>
                </div>
                <div className="flex  bg-[#494950] rounded-lg lg:rounded-xl p-1">
                    {ChartValue.map((item, idx) => <button onClick={() => setChartTime(item)} key={idx} className={`${item == chartTime ? "chart-btn-bg text-white" : ""} hover:text-white hover:bg-[#B68D52] px-4 py-1 text-sm text-para rounded-lg`}>{item}</button>)}
                </div>
            </div>
            <div className="w-full h-40! md:h-50! relative z-1">
                <CustomLegend />
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="25%" stopColor="#6EA7F740" stopOpacity={1} />
                                <stop offset="100%" stopColor="#6EA7F700" stopOpacity={1} />
                            </linearGradient>
                        </defs>
                        <ReferenceArea
                            x1="06:20 AM"
                            x2="06:50 AM"
                            strokeOpacity={0}
                            fill="url(#lineGradient)"
                            fillOpacity={0.6}
                        />
                        <Rectangle
                            x={180}
                            y={0}
                            width={220}
                            height="100%"
                            fill="#1E40AF"
                            opacity={0.3}
                        />
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#57575B"
                            horizontal={true}
                            vertical={true}
                        />
                        <XAxis
                            dataKey="time"
                            stroke="#9CA3AF"
                            tick={{ fill: '#BABEC4', fontSize: 10 }}
                            axisLine={{ stroke: '#BABEC4' }}
                        />
                        <YAxis
                            stroke="#9CA3AF"
                            tick={{ fill: '#6EA7F7', fontSize: 10 }}
                            axisLine={{ stroke: '#BABEC4' }}
                            label={{
                                value: 'RR Interval (ms)',
                                angle: -90,
                                position: 'insideLeft',
                                style: { fill: '#6EA7F7', fontSize: 12 },
                            }}
                            domain={[300, 1200]}
                            ticks={[300, 600, 900, 1200]}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '', border: 'none', borderRadius: '8px', color: '#F3F4F6' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#6EA7F7"
                            strokeWidth={1.5}
                            dot={{ fill: '#60A5FA', r: 0 }}
                            activeDot={{ r: 2 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default RRIntervalChart;