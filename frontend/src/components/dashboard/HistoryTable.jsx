import React from 'react';
import { formatToLocalTime } from '@/utilities/dateUtils';
import { Hart, Spo, Bp, Temp } from '@/utilities/icons';

const HistoryTable = ({ history = [] }) => {
  if (!history || history.length === 0) {
    return (
      <div className="p-8 text-center text-para italic bg-white/5 rounded-2xl">
        No history records found for this patient.
      </div>
    );
  }

  // Sort history by recorded_at DESC (latest first)
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.recorded_at) - new Date(a.recorded_at)
  );

  return (
    <div className="w-full overflow-hidden rounded-2xl bg-[#2F2F31] border border-white/10 shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#3E3E41] border-b border-white/5">
              <th className="p-4 text-sm font-medium text-white/70 uppercase tracking-wider">Time</th>
              <th className="p-4 text-sm font-medium text-white/70 uppercase tracking-wider text-center">
                <div className="flex items-center justify-center gap-2">
                  <Hart className="size-4 text-green" />
                  <span>HR (bpm)</span>
                </div>
              </th>
              <th className="p-4 text-sm font-medium text-white/70 uppercase tracking-wider text-center">
                <div className="flex items-center justify-center gap-2">
                  <Spo className="size-4 text-purple" />
                  <span>SpO2 (%)</span>
                </div>
              </th>
              <th className="p-4 text-sm font-medium text-white/70 uppercase tracking-wider text-center">
                <div className="flex items-center justify-center gap-2">
                  <Bp className="size-4 text-pink" />
                  <span>BP (mmHg)</span>
                </div>
              </th>
              <th className="p-4 text-sm font-medium text-white/70 uppercase tracking-wider text-center">
                <div className="flex items-center justify-center gap-2">
                  <Temp className="size-4 text-blue" />
                  <span>Temp (°C)</span>
                </div>
              </th>
              <th className="p-4 text-sm font-medium text-white/70 uppercase tracking-wider text-center">
                HRV
              </th>
              <th className="p-4 text-sm font-medium text-white/70 uppercase tracking-wider text-center">
                Stress
              </th>
              <th className="p-4 text-sm font-medium text-white/70 uppercase tracking-wider text-center">
                Battery
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sortedHistory.map((record, index) => (
              <tr key={index} className="hover:bg-white/5 transition-colors">
                <td className="p-4 text-white font-medium whitespace-nowrap">
                  {formatToLocalTime(record.recorded_at || record.timestamp || new Date().toISOString())}
                </td>
                <td className="p-4 text-center text-white text-lg">
                  {record.heart_rate || '--'}
                </td>
                <td className="p-4 text-center text-white text-lg">
                  {record.spo2 ? parseFloat(record.spo2).toFixed(1) : '--'}%
                </td>
                <td className="p-4 text-center text-white text-lg">
                  {record.systolic || record.bp_systolic || '--'}/{record.diastolic || record.bp_diastolic || '--'}
                </td>
                <td className="p-4 text-center text-white text-lg">
                  {record.temperature ? parseFloat(record.temperature).toFixed(1) : (record.temp ? parseFloat(record.temp).toFixed(1) : '--')}
                </td>
                <td className="p-4 text-center text-white text-lg">
                  {record.hrv_score || record.hrv || '--'}
                </td>
                <td className="p-4 text-center text-white text-lg">
                  {record.stress_level || '--'}
                </td>
                <td className="p-4 text-center text-white text-lg">
                  {record.battery_percent !== undefined ? `${record.battery_percent}%` : '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryTable;
