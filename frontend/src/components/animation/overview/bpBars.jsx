import React from "react";
import { Bar, BarChart, ResponsiveContainer } from "recharts";

const chartData = [
    { data: 222 }, { data: 120 }, { data: 138 }, { data: 446 },
    { data: 364 }, { data: 243 }, { data: 89 },  { data: 137 },
    { data: 498 }, { data: 388 }, { data: 149 }, { data: 227 },
    { data: 293 }, { data: 335 }, { data: 197 }, { data: 197 },
    { data: 448 }, { data: 473 }, { data: 338 }, { data: 499 },
    { data: 315 }, { data: 35 },  { data: 177 }, { data: 82 },
    { data: 81 },  { data: 252 }, { data: 294 }, { data: 201 },
    { data: 213 }, { data: 420 }, { data: 233 }, { data: 78 },
    { data: 340 }, { data: 178 }, { data: 178 }, { data: 470 },
    { data: 103 }, { data: 439 }, { data: 88 },  { data: 294 },
    { data: 323 }, { data: 385 }, { data: 438 }, { data: 155 },
    { data: 92 },  { data: 492 },
];

// Staggered delays live in index.css as .bp-bars-animated nth-child rules.
// The waveCss string is built once here and injected via a single global style in index.css,
// but per-bar delays that depend on index must still be set inline via style prop.
const BPBars = React.memo(function BPBars({ className = "h-13" }) {
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
