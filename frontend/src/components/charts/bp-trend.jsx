import React, { useState, useEffect } from 'react';

import OverviewCard from "@/components/overview-card";
import { Bp } from '@/utilities/icons';

export default function BpTrend({ className, title, iconClass = "", titleClass = "", valueClass, subClass, href, }) {
  const [currentReading, setCurrentReading] = useState({ systolic: '--', diastolic: '--' });
  const [readings, setReadings] = useState([]);
  const [isLive, setIsLive] = useState(false);

  // Simulation removed to clean up mock data
  useEffect(() => {
    // No-op for now as we are removing all mock data
  }, []);


  // Heart pulse animation
  // const [heartBeat, setHeartBeat] = useState(false);
  // useEffect(() => {
  //   const beatInterval = setInterval(() => {
  //     setHeartBeat(true);
  //     setTimeout(() => setHeartBeat(false), 200);
  //   }, 60000 / pulse);

  //   return () => clearInterval(beatInterval);
  // }, [pulse]);

  // Calculate bar heights
  const maxSys = Math.max(...readings.map(r => r.sys));
  const minSys = Math.min(...readings.map(r => r.sys));
  const range = maxSys - minSys || 1;

  const getBarHeight = (value) => {
    const normalized = ((value - minSys) / range) * 60 + 40;
    return `${normalized}%`;
  };

  // const getBPStatus = (sys, dia) => {
  //   if (sys < 120 && dia < 80) return { text: 'Normal', color: 'text-green-400', bg: 'bg-green-500/10' };
  //   if (sys < 130 && dia < 80) return { text: 'Elevated', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
  //   if (sys < 140 || dia < 90) return { text: 'Stage 1', color: 'text-orange-400', bg: 'bg-orange-500/10' };
  //   return { text: 'Stage 2', color: 'text-red-400', bg: 'bg-red-500/10' };
  // };

  // const status = getBPStatus(currentReading.systolic, currentReading.diastolic);


  return (
    <OverviewCard
      href={href}
      className={className}
      data-attr={href}
      icon={<Bp />}
      iconClass={`${iconClass ? iconClass : 'size-9 bg-pink'}`}
      title={title}
      titleClass={`${titleClass ? titleClass : 'text-xs'}`}
      value={`${currentReading.systolic}/${currentReading.diastolic}`}
      sub='mmHg'
      valueClass={valueClass ? valueClass : 'text-[28px]'}
      subClass={subClass ? subClass : 'text-xs'}
      children={
        <div className="relative h-9 overflow-hidden flex items-end justify-between gap-1">
          {readings.map((reading, idx) => (
            <div key={idx} className="flex-1 bg-linear-180 from-primary to-primary/0 rounded-sm transition-all duration-500 cursor-pointer relative group" style={{ height: getBarHeight(reading.sys), animation: idx === readings.length - 1 && isLive ? 'slideUp 0.5s ease-out' : 'none' }} />
          ))}
        </div>
      }
    />
  )
}