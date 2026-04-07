import React from 'react';
import { BarChart, Bar, ResponsiveContainer } from 'recharts';

const data = [
    { value: 20 },
    { value: 40 },
    { value: 25 },
    { value: 30 },
    { value: 70 },
    { value: 60 },
    { value: 80 },
    { value: 90 },
    { value: 70 },
    { value: 60 },
    { value: 10 },
    { value: 30 },
    { value: 50 },
    { value: 90 },
];

const StressPatternChart = ({ className = "w-full h-12" }) => {
    return (
        <div className={className}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} barGap={4} barCategoryGap="4%">
                    <defs>
                        <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="50%" stopColor="#FF666680" stopOpacity={1} />
                            <stop offset="100%" stopColor="#DB4A4A33" stopOpacity={1} />
                        </linearGradient>
                    </defs>
                    <Bar
                        dataKey="value"
                        fill="url(#redGradient)"
                        radius={[6, 6, 6, 6]}
                        isAnimationActive={true}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default StressPatternChart;