import React, { useMemo } from 'react';
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
import ChartTitle from '../chart-title';

export default function RespiratoryRateChart({
    respiratoryRateData = [],
    statistics = null,
    filter = ['1h', '6h', '24h', '7d'],
    filterTab = '24h',
    onFilterChange
}) {
    // Calculate baseline from statistics average, or default to 16
    const baseline = statistics?.average || 16;

    // Transform API data to chart format
    const chartData = useMemo(() => {
        if (!respiratoryRateData || respiratoryRateData.length === 0) {
            return [];
        }

        return respiratoryRateData.map((item) => {
            return {
                time: formatToLocalTime(item.timestamp),
                timestamp: item.timestamp,
                RR: item.value || 0,
                quality: item.quality || 100,
            };
        });
    }, [respiratoryRateData]);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-[#2F2F31] border border-[#555555] p-2.5 rounded shadow-lg">
                    <p className="text-[#9CA3AF] text-xs font-medium">{data.time}</p>
                    <p className="text-[#9CA3AF] text-xs">RR: {data.RR} bpm</p>
                    <p className="text-[#9CA3AF] text-xs">Quality: {data.quality}%</p>
                </div>
            );
        }
        return null;
    };

    // If no data, show empty state
    if (chartData.length === 0) {
        return (
            <div className="w-full">
                <ChartTitle
                    title="Respiratory Rate Trend"
                    des="Continuous tracking of breathing rate over time."
                    filter_items={filter}
                    set_active_filter={filter.indexOf(filterTab)}
                    onFilterChange={onFilterChange}
                />
                <div className="h-50! md:h-82! w-full flex items-center justify-center">
                    <p className="text-[#9CA3AF] text-sm">No respiratory rate data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <ChartTitle
                title="Respiratory Rate Trend"
                des="Continuous tracking of breathing rate over time."
                filter_items={filter}
                set_active_filter={filter.indexOf(filterTab)}
                onFilterChange={onFilterChange}
            />
            <p className='flex items-center gap-2 text-white text-xs leading-none! mb-4 lg:mb-6'>
                <span className='size-3 rounded-sm bg-[#2B7FFF] block'></span>
                Normal Range (12-20 bpm) - Baseline ({Math.round(baseline)} bpm)
            </p>
            <div className="h-50! md:h-82! w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="30%" stopColor="#0099FF4D" stopOpacity={0.6} />
                                <stop offset="100%" stopColor="#078EFD0D" stopOpacity={1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#585D68" />
                        <XAxis
                            dataKey="time"
                            stroke="#E6E6E6"
                            axisLine={{ stroke: '#E6E6E6' }}
                            tick={{ fill: '#BABEC4', fontSize: 14 }}
                            tickLine={false}
                            interval={Math.max(0, Math.floor(chartData.length / 5))}
                        />
                        <YAxis
                            stroke="#E6E6E6"
                            tick={{ fill: '#9CA3AF', fontSize: 14 }}
                            axisLine={{ stroke: '#E6E6E6' }}
                            domain={['auto', 'auto']}
                            label={{
                                value: 'Breaths per minute',
                                angle: -90,
                                position: 'insideLeft',
                                style: { fill: '#9CA3AF', fontSize: 14 },
                            }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={baseline} stroke="#E6E6E6" strokeDasharray="5 5" strokeWidth={2} />
                        <ReferenceLine y={12} stroke="#F59E0B" strokeDasharray="3 3" strokeWidth={1} />
                        <ReferenceLine y={20} stroke="#F59E0B" strokeDasharray="3 3" strokeWidth={1} />
                        <Area
                            type="monotone"
                            dataKey="RR"
                            stroke="#9CA3AF"
                            strokeWidth={0}
                            fillOpacity={1}
                            fill="url(#areaGradient)"
                            dot={{
                                fill: '#2B7FFF',
                                stroke: '#59595A',
                                strokeWidth: 2,
                                r: 4,
                            }}
                            activeDot={{
                                fill: '#2B7FFF',
                                stroke: '#59595A',
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