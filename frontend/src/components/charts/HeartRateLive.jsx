import React, { useState, useEffect } from "react";
import { Hart } from '@/utilities/icons';
import OverviewCard from "@/components/overview-card";

const HeartRateLive = React.memo(function HeartRateLive({ 
  className = "", 
  width = 190, 
  height = 32, 
  stroke = "#caa75a",
  historyData = [] 
}) {
    // Extract heart rate values, map to number
    let dataList = historyData && historyData.length > 0
        ? historyData.map(h => typeof h.heart_rate === 'number' ? h.heart_rate : 0)
        : Array(40).fill(0);
        
    // Reverse because history comes latest first? Wait, we want timeline from left to right (old to new)
    // The history might be sorted differently. Let's just assume we want it sequentially.
    // Ensure we don't have an empty array causing Math.max to fail.
    if (dataList.length === 0) dataList = [0, 0];

    // If data is too small, just duplicate last point so it draws a line
    if (dataList.length === 1) dataList = [dataList[0], dataList[0]];

    const max = Math.max(...dataList, 1);
    const min = Math.min(...dataList, 0);
    const range = max === min ? 1 : max - min;
    
    const points = dataList
        .map((d, i) => {
            const x = (i / (dataList.length - 1)) * width;
            const y = height - ((d - min) / range) * height;
            return `${x},${y}`;
        })
        .join(" ");

    const lastPoint = points.split(" ").slice(-1)[0];
    const [lastX, lastY] = lastPoint ? lastPoint.split(",") : [0,0];

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
