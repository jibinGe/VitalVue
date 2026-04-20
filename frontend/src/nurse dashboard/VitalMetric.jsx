import React from 'react';
import './VitalMetric.css';

export default function VitalMetric({ label, value, unit, icon, color }) {
  return (
    <div className="vital-metric">
      <div className="vital-header">
        <div className="metric-icon" style={{ backgroundColor: color }}>
          {icon}
        </div>
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-value">
        <span className="value">{value}</span>
        <span className="unit">{unit}</span>
      </div>
      {/* Mini chart placeholder */}
      <svg className="metric-chart" viewBox="0 0 100 40">
        <polyline 
          points="0,25 10,20 20,22 30,18 40,15 50,20 60,18 70,15 80,20 90,22 100,25"
          style={{ stroke: color, fill: 'none', strokeWidth: 1.5 }}
        />
      </svg>
    </div>
  );
}
