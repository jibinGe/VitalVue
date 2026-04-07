import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, CartesianGrid, Tooltip } from 'recharts';
import { formatToLocalTime } from '@/utilities/dateUtils';

const MovementActivityChart = ({ movementData = [], statistics = null }) => {
    // Transform API data to chart format
    // Since movement values are null, we'll treat this as binary: movement detected (1) or no movement (0)
    // We can also use quality to determine if data is valid
    const chartData = useMemo(() => {
        if (!movementData || movementData.length === 0) {
            return [];
        }

        // Group data by time intervals to reduce data points for better visualization
        // For movement, we'll show presence/absence as a binary indicator
        const processedData = movementData.map((item) => {
            const time = formatToLocalTime(item.timestamp);

            // If value is null, treat as no movement (0), otherwise use the value or 1 for movement detected
            const hasMovement = item.value !== null && item.value !== undefined;
            const movementValue = hasMovement ? (item.value || 1) : 0;

            // Determine color based on movement status
            // Since all values are null in the sample, we'll use quality to determine status
            // For now, we'll use a default color scheme
            let color = '#57575B'; // Default: Light Sleep / No movement

            if (hasMovement && item.value > 0) {
                color = '#F59E0B'; // Awake / Movement detected
            } else if (item.quality && item.quality >= 80) {
                color = '#2B7FFF'; // Deep Sleep / Good quality data
            }

            return {
                time: time,
                timestamp: item.timestamp,
                value: movementValue,
                color: color,
                quality: item.quality || 100,
                hasMovement: hasMovement
            };
        });

        // If we have too many data points, sample them for better visualization
        if (processedData.length > 50) {
            const step = Math.ceil(processedData.length / 50);
            return processedData.filter((_, index) => index % step === 0 || index === processedData.length - 1);
        }

        return processedData;
    }, [movementData]);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-[#2F2F31] border border-[#555555] p-2.5 rounded shadow-lg">
                    <p className="text-[#9CA3AF] text-xs font-medium">{data.time}</p>
                    <p className="text-[#9CA3AF] text-xs">
                        Movement: {data.hasMovement ? 'Detected' : 'No Movement'}
                    </p>
                    <p className="text-[#9CA3AF] text-xs">Quality: {data.quality}%</p>
                </div>
            );
        }
        return null;
    };

    // If no data, show empty state
    if (chartData.length === 0) {
        return (
            <div className="w-full h-50 md:h-70 flex items-center justify-center">
                <p className="text-[#9CA3AF] text-sm">No movement data available</p>
            </div>
        );
    }

    return (
        <div className="w-full h-50 md:h-70">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
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
                        domain={[0, 'auto']}
                        label={{
                            value: 'Activity Level',
                            angle: -90,
                            position: 'insideLeft',
                            style: { fill: '#BABEC4', fontSize: "12px" }
                        }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                        dataKey="value"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={20}
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

export default MovementActivityChart;
