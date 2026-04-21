import React from 'react';
import DashboardHeroBar from './DashboardHeroBar';
import DashboardTopBar from './DashboardTopBar';
import PatientDetailsCards from './PatientDetailsCards';
import './NurseDashboard.css';

export default function NurseDashboard() {
  return (
    <div className="nurse-dashboard">
      <DashboardHeroBar />
      <DashboardTopBar />
      <PatientDetailsCards />
    </div>
  );
}
