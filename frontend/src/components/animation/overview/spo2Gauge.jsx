import { useMemo, useState, useEffect } from "react";
import ReactSpeedometer from "react-d3-speedometer";
import React from "react";

const custom_range = Array.from({ length: 101 }, (_, i) => i);

const Spo2Gauge = React.memo(function Spo2Gauge({ value = 0, className = "h-38 -mt-12", set_height = false, animate = true }) {
  const [animatedValue, setAnimatedValue] = useState(value);

  // Animation logic to oscillate the needle
  useEffect(() => {
    if (!animate) {
      setAnimatedValue(value);
      return;
    }

    // ReactSpeedometer uses d3 transitions by default (transitionDuration: 500ms).
    // Updating state every 2 seconds is enough to create a slow "breathing" effect 
    // without blocking the React main thread like requestAnimationFrame does.
    const intervalId = setInterval(() => {
      // Small random oscillation between -2 and +2
      const oscillation = (Math.random() - 0.5) * 4;
      setAnimatedValue(Math.min(100, Math.max(0, value + oscillation)));
    }, 2000);

    return () => clearInterval(intervalId);
  }, [value, animate]);

  const custom_segmentColors = useMemo(() => {
    // Coloring is based on original stable value, or animatedValue if we want colors to shimmer too. 
    // Keeping it stable (value) is usually less distracting, but animatedValue makes whole gauge live.
    // Let's use value for stable segments so only needle moves.
    return Array.from({ length: 100 }, (_, i) =>
      i < value ? "#CCA166" : "#CCA1661a"
    );
  }, [value]);

  return (
    <div className={`mx-auto ${className}`}>
      <ReactSpeedometer
        fluidWidth={set_height}
        maxValue={100}
        value={animatedValue}
        needleColor="#CCA166"
        needleHeightRatio={0.75}
        segments={1}
        ringWidth={3}
        customSegmentStops={custom_range}
        segmentColors={custom_segmentColors}
        textColor="rgba(0, 0, 0, 0)"
      />
    </div>
  );
});

export default Spo2Gauge;

