import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, CartesianGrid, Tooltip } from 'recharts';
import { formatToLocalTime } from '@/utilities/dateUtils';

const SleepStagesChart = ({ sleepSummary = null, date = null }) => {
    // Transform API data to chart format
    // sleepSummary can be null, so we need to handle that case
    const chartData = useMemo(() => {
        // If no sleep summary data, return empty array
        if (!sleepSummary || !sleepSummary.stages || sleepSummary.stages.length === 0) {
            return [];
        }

        // Process sleep stages data
        // Assuming sleepSummary has a stages array with { timestamp, stage, duration } or similar structure
        // Adjust based on actual API response structure
        const processedData = sleepSummary.stages.map((item) => {
            const time = formatToLocalTime(item.timestamp || item.startTime || item.time);

            // Map sleep stage to value and color
            // Stage values: 0 = Awake, 1 = Light Sleep, 2 = Deep Sleep, 3 = REM (adjust based on API)
            let stageValue = item.stage || item.value || 0;
            let color = '#F59E0B'; // Default: Awake / Disrupted

            if (stageValue === 2 || stageValue === 'deep' || stageValue === 'Deep Sleep') {
                color = '#2B7FFF'; // Deep Sleep
                stageValue = 3;
            } else if (stageValue === 1 || stageValue === 'light' || stageValue === 'Light Sleep') {
                color = '#2AD354'; // Light Sleep
                stageValue = 2;
            } else if (stageValue === 0 || stageValue === 'awake' || stageValue === 'Awake') {
                color = '#F59E0B'; // Awake / Disrupted
                stageValue = 0.6;
            } else {
                // Default to light sleep if unknown
                color = '#2AD354';
                stageValue = 2;
            }

            return {
                time: time,
                timestamp: item.timestamp || item.startTime || item.time,
                value: stageValue,
                color: color,
                stage: item.stage || item.value,
                duration: item.duration || 0
            };
        });

        return processedData;
    }, [sleepSummary]);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const stageNames = {
                0: 'Awake',
                1: 'Light Sleep',
                2: 'Deep Sleep',
                3: 'REM'
            };
            return (
                <div className="bg-[#2F2F31] border border-[#555555] p-2.5 rounded shadow-lg">
                    <p className="text-[#9CA3AF] text-xs font-medium">{data.time}</p>
                    <p className="text-[#9CA3AF] text-xs">
                        Stage: {stageNames[data.stage] || data.stage || 'Unknown'}
                    </p>
                    {data.duration && (
                        <p className="text-[#9CA3AF] text-xs">Duration: {data.duration} min</p>
                    )}
                </div>
            );
        }
        return null;
    };

    // If no data, show empty state
    if (chartData.length === 0) {
        return (
            <div className="w-full h-50 md:h-70 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-[#9CA3AF] text-sm mb-2">
                        {sleepSummary === null
                            ? `No sleep data available for ${date || 'selected date'}`
                            : 'No sleep stages recorded'}
                    </p>
                    {sleepSummary === null && (
                        <p className="text-[#9CA3AF] text-xs">Try selecting a different date</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-50 md:h-70">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ top: 0, right: 0, left: 10, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#57575B" />
                    <XAxis
                        dataKey="time"
                        stroke="#BABEC4"
                        tick={{ fill: '#BABEC4', fontSize: 12 }}
                        angle={0}
                        textAnchor="middle"
                        interval={Math.max(0, Math.floor(chartData.length / 8))}
                        axisLine={{ stroke: '#E6E6E6' }}
                        tickLine={false}
                    />
                    <YAxis
                        stroke="#BABEC4"
                        tick={{ fill: '#BABEC4', fontSize: 12 }}
                        axisLine={{ stroke: '#E6E6E6' }}
                        tickLine={false}
                        domain={[0, 5]}
                        ticks={[0, 1, 2, 3, 4, 5]}
                        label={{
                            value: 'Sleep Stages',
                            angle: -90,
                            position: 'insideLeft',
                            style: { fill: '#BABEC4', fontSize: "12px" }
                        }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                        dataKey="value"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={64}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SleepStagesChart;
