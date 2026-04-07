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
import ChartTitle from '../chart-title';
const data = [
    { time: '00:00', RR: 12 },
    { time: '01:00', RR: 45 },
    { time: '02:00', RR: 78 },
    { time: '03:00', RR: 34 },
    { time: '04:00', RR: 90 },
    { time: '05:00', RR: 56 },
    { time: '06:00', RR: 23 },
    { time: '07:00', RR: 67 },
    { time: '08:00', RR: 81 },
    { time: '09:00', RR: 14 },
    { time: '10:00', RR: 99 },
    { time: '11:00', RR: 38 },
    { time: '12:00', RR: 72 },
    { time: '13:00', RR: 6 },
    { time: '14:00', RR: 54 },
    { time: '15:00', RR: 88 },
    { time: '16:00', RR: 29 },
    { time: '17:00', RR: 61 },
    { time: '18:00', RR: 95 },
    { time: '19:00', RR: 40 },
    { time: '20:00', RR: 70 },
];
const visibleTimes = ['00:00', '06:00', '12:00', '18:00', '20:00'];
export default function NightHearRateChart() {
    return (
        <div className="w-full">
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
                            stroke="#E6E6E6"
                            axisLine={{ stroke: '#E6E6E6' }}
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
                            stroke="#E6E6E6"
                            tick={{ fill: '#6EA7F7', fontSize: 12 }}
                            axisLine={{ stroke: '#E6E6E6' }}
                            domain={[0, 100]}
                            ticks={[0, 25, 50, 75, 100]}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#2F2F31', border: '1px solid #555555', borderRadius: '8px' }}
                            labelStyle={{ color: '#9CA3AF' }}
                        />
                        <ReferenceLine y={6} stroke="r" strokeDasharray="5 5" />
                        <Area
                            type="monotone"
                            dataKey="RR"
                            stroke="#6EA7F7"
                            strokeWidth={1.5}
                            fillOpacity={1}
                            fill="url(#areaGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
          
        </div>
    );
}