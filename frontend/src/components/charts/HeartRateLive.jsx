import React, { useState, useEffect } from "react";
import { Hart } from '@/utilities/icons';
import OverviewCard from "@/components/overview-card";

const HeartRateLive = React.memo(function HeartRateLive({ 
  className = "", 
  width = 190, 
  height = 32, 
  stroke = "#caa75a" 
}) {
    const [data, setData] = useState(() => Array(40).fill(0));
    const [bpm, setBpm] = useState(0);

    // Simulation removed to clean up mock data
    useEffect(() => {
        // No-op
    }, []);


    const max = Math.max(...data);
    const min = Math.min(...data);
    const points = data
        .map((d, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = max === min ? height / 2 : height - ((d - min) / (max - min)) * height;
            return `${x},${y}`;
        })
        .join(" ");

    const lastPoint = points.split(" ").slice(-1)[0];
    const [lastX, lastY] = lastPoint.split(",");

    return (
        <div className={className}>
            <svg width={width} height={height} className="w-full">
                <polyline
                    fill="none"
                    stroke={stroke}
                    strokeWidth="1.5"
                    points={points}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
                <circle cx={lastX} cy={lastY} r="3" fill={stroke} />
            </svg>
        </div>
    );
});

export default HeartRateLive;
