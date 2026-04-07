import React from 'react';
import { ComposedChart, Line, Area, Bar } from 'recharts';

// Animation for .hrv-score-animated is defined globally in index.css
export default function HrvScore() {
    const data = [
        { pv: 10, amt: 10 }, { pv: 13, amt: 13 }, { pv: 10, amt: 10 },
        { pv: 13, amt: 13 }, { pv: 10, amt: 10 }, { pv: 13, amt: 13 },
        { pv: 10, amt: 10 }, { pv: 13, amt: 13 }, { pv: 10, amt: 10 },
        { pv: 13, amt: 13 }, { pv: 10, amt: 10 }, { pv: 13, amt: 13 },
        { pv: 10, amt: 10 }, { pv: 13, amt: 13 }, { pv: 10, amt: 10 },
        { pv: 13, amt: 13 }, { pv: 10, amt: 10 }, { pv: 13, amt: 13 },
        { pv: 10, amt: 10 }, { pv: 23, amt: 23 }, { pv: 10, amt: 10 },
        { pv: 13, amt: 13 }, { pv: 10, amt: 10 }, { pv: 13, amt: 13 },
        { pv: 23, amt: 23 }, { pv: 10, amt: 10 }, { pv: 13, amt: 13 },
        { pv: 10, amt: 10 }, { pv: 13, amt: 13 },
    ];

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

