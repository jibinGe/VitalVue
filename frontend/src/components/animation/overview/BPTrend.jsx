import React from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

/**
 * BPTrend - A clinical-standard line chart showing SBP and DBP.
 * SBP (Systolic) is typically the upper line, DBP (Diastolic) is the lower line.
 */
const BPTrend = React.memo(function BPTrend({ className = "h-13", historyData = [] }) {
    // Process data to ensure both SBP and DBP are handled
    const chartData = historyData && historyData.length > 0
        ? historyData.map(h => ({
            sbp: typeof h.bp_systolic === 'number' ? h.bp_systolic : (typeof h.systolic === 'number' ? h.systolic : 0),
            dbp: typeof h.bp_diastolic === 'number' ? h.bp_diastolic : (typeof h.diastolic === 'number' ? h.diastolic : 0)
        }))
        : [{ sbp: 0, dbp: 0 }, { sbp: 0, dbp: 0 }];

    return (
        <div className={`w-full ${className} bp-trend-animated`}>
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <LineChart data={chartData} margin={{ left: 5, right: 5, top: 5, bottom: 5 }}>
                    <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                    <Line
                        type="monotone"
                        dataKey="sbp"
                        stroke="#CCA166"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={true}
                        animationDuration={1500}
                    />
                    <Line
                        type="monotone"
                        dataKey="dbp"
                        stroke="#ff4d97ad"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={true}
                        animationDuration={1500}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
});

export default BPTrend;
