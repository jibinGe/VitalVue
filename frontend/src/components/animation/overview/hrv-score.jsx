import React from 'react';
import { ComposedChart, Line, Area, Bar } from 'recharts';

// Animation for .hrv-score-animated is defined globally in index.css
export default function HrvScore({ historyData = [] }) {
    // Only measured points: a bucket without a reading is a gap, not 0.
    const measured = (historyData || []).filter(h => h.hrv_score > 0).map(h => ({ pv: h.hrv_score, amt: h.hrv_score }));
    const data = measured.length > 1 ? measured
        : measured.length === 1 ? [measured[0], measured[0]]
        : [{ pv: 0, amt: 0 }, { pv: 0, amt: 0 }];

    return (
        <div className="w-full hrv-score-animated">
            <ComposedChart
                className='h-18 -mb-1 -ml-3 w-[calc(100%+24px)]'
                responsive
                data={data}
            >
                <Area type="monotone" dataKey="amt" fill="transparent" stroke="#CCA166" />
                <Bar dataKey="pv" barSize={3} fill="#CCA16680" />
            </ComposedChart>
        </div>
    );
}
