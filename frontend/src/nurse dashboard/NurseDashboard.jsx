import React from 'react';
import DashboardTopBar from './DashboardTopBar';
import PatientDetailsCards from './PatientDetailsCards';
import './NurseDashboard.css';

export default function NurseDashboard() {
  return (
    <div className="nurse-dashboard">
      <DashboardTopBar />
      <PatientDetailsCards />
    </div>
  );
}
