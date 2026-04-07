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
import { useMemo } from 'react';
import { formatToLocalTime } from '@/utilities/dateUtils';

const mockData = [
    { time: '08:12 AM', RR: 98 },
    { time: '08:13 AM', RR: 97 },
    { time: '08:14 AM', RR: 99 },
    { time: '08:15 AM', RR: 96 },
    { time: '08:16 AM', RR: 98 },
    { time: '08:17 AM', RR: 97 },
    { time: '08:18 AM', RR: 75 }, // dip
    { time: '08:19 AM', RR: 78 },
    { time: '08:20 AM', RR: 82 },
    { time: '09:43 AM', RR: 100 },
    { time: '11:15 AM', RR: 102 },
    { time: '12:47 PM', RR: 76 }, // big dip
    { time: '02:07 PM', RR: 99 },
];

export default function SpoTrend({ spo2Data = [] }) {
    const data = useMemo(() => {
        if (spo2Data && spo2Data.length > 0) {
            // Sample data points if too many (for performance)
            const sampleRate = spo2Data.length > 200 ? Math.ceil(spo2Data.length / 200) : 1;

            return spo2Data
                .filter((_, index) => index % sampleRate === 0 || index === spo2Data.length - 1)
                .map((item) => ({
                    time: formatToLocalTime(item.timestamp),
                    RR: item.value,
                }));
        }
        return mockData;
    }, [spo2Data]);

    const visibleTimes = useMemo(() => {
        if (data.length === 0) return [];
        const step = Math.max(1, Math.floor(data.length / 5));
        return data.filter((_, index) => index % step === 0 || index === data.length - 1).map(d => d.time);
    }, [data]);

    return (
        <div className="w-full">
            <div className="h-40! md:h-72! w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 20, left: -30, bottom: 0 }}>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="15%" stopColor="#FE9A0026" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="#FE9A0000" stopOpacity={1} />
                        </linearGradient>
                        <CartesianGrid strokeDasharray="3 3" stroke="#585D68" />
                        <XAxis
                            dataKey="time"
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
                                        fontSize={11}
                                    >
                                        {payload.value}
                                    </text>
                                );
                            }}
                        />

                        <YAxis
                            domain={[70, 110]}
                            ticks={[70, 80, 90, 100, 110]}
                            tick={{ fill: '#BABEC4', fontSize: 11 }}
                            axisLine={{ stroke: '#585D68' }}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#2F2F31', border: '1px solid #555555', borderRadius: '8px' }}
                            labelStyle={{ color: '#9CA3AF' }}
                        />
                        <ReferenceLine y={6} stroke="r" strokeDasharray="5 5" />
                        <Area
                            type="monotone"
                            dataKey="RR"
                            stroke="#2563EB"
                            strokeWidth={1.5}
                            fillOpacity={1}
                            fill="url(#2F2F31)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

        </div>
    );
}