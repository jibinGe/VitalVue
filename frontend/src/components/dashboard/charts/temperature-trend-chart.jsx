import { useMemo } from 'react';
import { formatToLocalTime } from '@/utilities/dateUtils';
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

export default function TemperatureTrendChart({ temperatureData = [] }) {
    const { formattedData, minTemp, maxTemp } = useMemo(() => {
        if (!temperatureData || temperatureData.length === 0) {
            // Fallback to mock data
            const mockData = [
                { time: '00:00', temp: 37.8 },
                { time: '01:00', temp: 38.2 },
                { time: '02:00', temp: 36.5 },
                { time: '03:00', temp: 38.9 },
                { time: '04:00', temp: 37.1 },
                { time: '05:00', temp: 38.4 },
                { time: '06:00', temp: 36.8 },
                { time: '07:00', temp: 37.6 },
                { time: '08:00', temp: 38.7 },
                { time: '09:00', temp: 37.3 },
                { time: '10:00', temp: 38.1 },
                { time: '11:00', temp: 36.9 },
                { time: '12:00', temp: 37.9 },
                { time: '13:00', temp: 38.5 },
                { time: '14:00', temp: 37.2 },
                { time: '15:00', temp: 38.8 },
                { time: '16:00', temp: 36.7 },
                { time: '17:00', temp: 37.5 },
                { time: '18:00', temp: 38.3 },
                { time: '19:00', temp: 37.4 },
                { time: '20:00', temp: 38.6 },
            ];
            return {
                formattedData: mockData,
                minTemp: 36,
                maxTemp: 39,
            };
        }

        // Process API data
        const maxDataPoints = 100; // Limit data points for performance
        const step = Math.max(1, Math.floor(temperatureData.length / maxDataPoints));

        const data = [];
        const values = [];

        for (let i = 0; i < temperatureData.length; i += step) {
            const item = temperatureData[i];
            data.push({
                time: formatToLocalTime(item.timestamp),
                temp: item.value,
            });
            values.push(item.value);
        }

        // Calculate dynamic domain based on data
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const padding = (maxValue - minValue) * 0.1 || 1; // 10% padding
        const minTemp = Math.max(30, Math.floor(minValue - padding));
        const maxTemp = Math.min(42, Math.ceil(maxValue + padding));

        return {
            formattedData: data,
            minTemp,
            maxTemp,
        };
    }, [temperatureData]);

    // Generate Y-axis ticks based on domain
    const generateTicks = () => {
        const ticks = [];
        const step = (maxTemp - minTemp) / 6;
        for (let i = minTemp; i <= maxTemp; i += step) {
            ticks.push(Math.round(i * 10) / 10);
        }
        return ticks;
    };

    return (
        <div className="w-full">
            <div className="h-55! md:h-72! w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formattedData} margin={{ top: 10, right: 30, left: -30, bottom: 0 }}>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="15%" stopColor="#FE9A0026" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="#FE9A0000" stopOpacity={1} />
                        </linearGradient>
                        <CartesianGrid strokeDasharray="3 3" stroke="#585D68" />
                        <XAxis
                            dataKey="time"
                            interval="preserveStartEnd"
                            stroke="#BABEC4"
                            tick={{ fill: '#BABEC4', fontSize: 12 }}
                            axisLine={{ stroke: '#E6E6E6' }}
                        />

                        <YAxis
                            stroke="#BABEC4"
                            tick={{ fill: '#BABEC4', fontSize: 12 }}
                            axisLine={{ stroke: '#E6E6E6' }}
                            domain={[minTemp, maxTemp]}
                            ticks={generateTicks()}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#2F2F31', border: '1px solid #555555', borderRadius: '8px' }}
                            labelStyle={{ color: '#9CA3AF' }}
                            formatter={(value) => [`${value}°C`, 'Temperature']}
                        />
                        <ReferenceLine
                            y={37.5}
                            stroke="#88443A"
                            strokeDasharray="3 3"
                            strokeWidth={2}
                            label={{ value: 'Fever Threshold', position: 'top', fill: '#88443A', fontSize: 10 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="temp"
                            stroke="#FE9A00"
                            strokeWidth={1.5}
                            fillOpacity={1}
                            fill="url(#areaGradient)"
                            dot={false}
                            activeDot={{
                                fill: '#E54D4D',
                                stroke: 'white',
                                strokeWidth: 2,
                                r: 4,
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

        </div>
    );
}