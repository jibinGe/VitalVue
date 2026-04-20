import React from 'react';
import './DashboardTopBar.css';

function RadarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" stroke="#EB727D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 18C21.26 16.33 22 14.25 22 12C22 9.75 21.26 7.67 20 6" stroke="#EB727D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 6C2.74 7.67 2 9.75 2 12C2 14.25 2.74 16.33 4 18" stroke="#EB727D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.8008 15.6004C17.5508 14.6004 18.0008 13.3504 18.0008 12.0004C18.0008 10.6504 17.5508 9.40039 16.8008 8.40039" stroke="#EB727D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.20001 8.40039C6.45001 9.40039 6 10.6504 6 12.0004C6 13.3504 6.45001 14.6004 7.20001 15.6004" stroke="#EB727D" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 8.12695V12.9072" stroke="#E0A225" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.9994 19.9904H5.93944C2.46944 19.9904 1.01944 17.6194 2.69944 14.7226L5.81944 9.34962L8.75944 4.30169C10.5394 1.23277 13.4594 1.23277 15.2394 4.30169L18.1794 9.35918L21.2994 14.7322C22.9794 17.629 21.5194 20 18.0594 20H11.9994V19.9904Z" stroke="#E0A225" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.9961 15.7754H12.0051" stroke="#E0A225" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StableIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12.6044 20.71C12.2644 20.83 11.7044 20.83 11.3644 20.71C8.46438 19.72 1.98438 15.59 1.98438 8.59C1.98438 5.5 4.47438 3 7.54437 3C9.36437 3 10.9744 3.88 11.9844 5.24C12.9944 3.88 14.6144 3 16.4244 3C19.4944 3 21.9844 5.5 21.9844 8.59C21.9844 15.59 15.5044 19.72 12.6044 20.71Z" stroke="#27BC4C" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 8.5H16.5M16.5 8.5H14.5M16.5 8.5V6.5M16.5 8.5V10.5" stroke="#27BC4C" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function StatusChip({ accentClass, icon, label, value }) {
  return (
    <div className={`dashboard-status-chip ${accentClass}`}>
      <span className="dashboard-status-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="dashboard-status-label">{label}</span>
      <span className="dashboard-status-value">{value}</span>
    </div>
  );
}

export default function DashboardTopBar() {
  return (
    <div className="dashboard-top-bar">
      <div className="dashboard-top-bar__statuses">
        <StatusChip accentClass="is-critical" icon={<RadarIcon />} label="Critical" value="3" />
        <StatusChip accentClass="is-warning" icon={<WarningIcon />} label="Warning" value="3" />
        <StatusChip accentClass="is-stable" icon={<StableIcon />} label="Stable" value="2" />
      </div>

      <button className="dashboard-top-bar__action" type="button">
        <span className="dashboard-top-bar__action-label">Show All Patients</span>
      </button>
    </div>
  );
}