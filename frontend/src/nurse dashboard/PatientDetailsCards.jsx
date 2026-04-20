import React, { useState } from 'react';
import PatientCard from './PatientCard';
import './PatientDetailsCards.css';

export default function PatientDetailsCards() {
  // Sample patient data - replace with real data from your API
  const [patients] = useState([
    {
      id: '356478',
      name: 'Arthur Crane',
      recordNo: '4136',
      status: 'Connected',
      statusColor: 'connected',
      battery: 80,
      vitals: {
        heartRate: { value: 82, unit: 'bpm', icon: '♥' },
        spO2: { value: 98, unit: '%', icon: '⊙' },
        bpTrend: { value: 130, unit: '/80 mmHg', icon: '⬍' },
        temp: { value: 37.2, unit: '°C', icon: '🌡' }
      },
      warnings: [
        { label: 'NEWS2', severity: 'normal', value: '5', icon: '⚠' },
        { label: 'AF Warning', severity: 'high', icon: '⚠' },
        { label: 'Stroke Risk', severity: 'low', icon: '⚠' },
        { label: 'Seizure', severity: 'normal', icon: '✓' }
      ]
    },
    {
      id: '356432',
      name: 'Evelyn Hayes',
      recordNo: '4138',
      status: 'Disconnected',
      statusColor: 'disconnected',
      battery: 90,
      vitals: {
        heartRate: { value: 81, unit: 'bpm', icon: '♥' },
        spO2: { value: 92, unit: '%', icon: '⊙' },
        bpTrend: { value: 120, unit: '/80 mmHg', icon: '⬍' },
        temp: { value: 36.1, unit: '°C', icon: '🌡' }
      },
      warnings: [
        { label: 'NEWS2', severity: 'normal', value: '3', icon: '⚠' },
        { label: 'AF Warning', severity: 'normal', icon: '⚠' },
        { label: 'Stroke Risk', severity: 'low', icon: '⚠' },
        { label: 'Seizure', severity: 'normal', icon: '✓' }
      ]
    },
    {
      id: '356982',
      name: 'Albert Flores',
      recordNo: '4136',
      status: 'Connected',
      statusColor: 'connected',
      battery: 77,
      vitals: {
        heartRate: { value: 83, unit: 'bpm', icon: '♥' },
        spO2: { value: 97, unit: '%', icon: '⊙' },
        bpTrend: { value: 140, unit: '/90 mmHg', icon: '⬍' },
        temp: { value: 37.4, unit: '°C', icon: '🌡' }
      },
      warnings: [
        { label: 'NEWS2', severity: 'normal', value: '4', icon: '⚠' },
        { label: 'AF Warning', severity: 'normal', icon: '⚠' },
        { label: 'Stroke Risk', severity: 'low', icon: '⚠' },
        { label: 'Seizure', severity: 'normal', icon: '✓' }
      ]
    },
    {
      id: '356142',
      name: 'Kathryn Murphy',
      recordNo: '4132',
      status: 'Connected',
      statusColor: 'connected',
      battery: 80,
      vitals: {
        heartRate: { value: 82, unit: 'bpm', icon: '♥' },
        spO2: { value: 99, unit: '%', icon: '⊙' },
        bpTrend: { value: 120, unit: '/80 mmHg', icon: '⬍' },
        temp: { value: 40.2, unit: '°C', icon: '🌡' }
      },
      warnings: [
        { label: 'NEWS2', severity: 'normal', value: '5', icon: '⚠' },
        { label: 'AF Warning', severity: 'normal', icon: '⚠' },
        { label: 'Stroke Risk', severity: 'low', icon: '⚠' },
        { label: 'Seizure', severity: 'normal', icon: '✓' }
      ]
    },
    {
      id: '356875',
      name: 'Cody Fisher',
      recordNo: '4133',
      status: 'Connected',
      statusColor: 'connected',
      battery: 56,
      vitals: {
        heartRate: { value: 84, unit: 'bpm', icon: '♥' },
        spO2: { value: 92, unit: '%', icon: '⊙' },
        bpTrend: { value: 110, unit: '/90 mmHg', icon: '⬍' },
        temp: { value: 38.4, unit: '°C', icon: '🌡' }
      },
      warnings: [
        { label: 'NEWS2', severity: 'normal', value: '5', icon: '⚠' },
        { label: 'AF Warning', severity: 'normal', icon: '⚠' },
        { label: 'Stroke Risk', severity: 'normal', icon: '⚠' },
        { label: 'Seizure', severity: 'normal', icon: '✓' }
      ]
    }
  ]);

  return (
    <div className="patient-details-cards">
      <div className="cards-container">
        {patients.map((patient) => (
          <PatientCard key={patient.id} patient={patient} />
        ))}
      </div>
    </div>
  );
}
