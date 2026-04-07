import React from 'react';
import { BarChart, Bar, ResponsiveContainer } from 'recharts';

const StressPatternChart = ({ className = "w-full h-12", historyData = [] }) => {
    const data = historyData && historyData.length > 0
        ? historyData.map(h => {
             let v = 50;
             if (h.stress_level === "Low") v = 30;
             if (h.stress_level === "Moderate") v = 60;
             if (h.stress_level === "High") v = 90;
             return { value: v };
        })
        : [{ value: 0 }, { value: 0 }];
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