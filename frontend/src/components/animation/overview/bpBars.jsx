import React from "react";
import { Bar, BarChart, ResponsiveContainer } from "recharts";

// Staggered delays live in index.css as .bp-bars-animated nth-child rules.
// The waveCss string is built once here and injected via a single global style in index.css,
// but per-bar delays that depend on index must still be set inline via style prop.
const BPBars = React.memo(function BPBars({ className = "h-13", historyData = [] }) {
    const chartData = historyData && historyData.length > 0
        ? historyData.map(h => ({ data: typeof h.bp_systolic === 'number' ? h.bp_systolic : (typeof h.systolic === 'number' ? h.systolic : 0) }))
        : [{ data: 0 }, { data: 0 }];

    return (
        <div className={`w-full ${className} bp-bars-animated`}>
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={chartData} margin={{ left: 12, right: 12 }}>
                    <Bar
                        dataKey="data"
                        radius={[0, 0, 0, 0]}
                        fill="#CCA166"
                        /* Per-bar stagger delays applied via CSS nth-child in index.css */
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
});

export default BPBars;
