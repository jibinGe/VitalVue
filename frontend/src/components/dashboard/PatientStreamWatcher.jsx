import { useEffect } from 'react';
import { useVitalsStream } from '@/hooks/useVitalsStream';
import { useDashboardStore } from '@/store/useDashboardStore';

/**
 * PatientStreamWatcher
 * Invisible component — renders nothing, just wires up SSE per patient.
 * Mount one of these for each patient visible on the home page.
 *
 * Props:
 *   patientId   : number  — the integer patient ID for the stream endpoint
 *   patientName : string  — displayed in the CriticalAlarmModal title
 */
export default function PatientStreamWatcher({ patientId, patientName }) {
  const { criticalAlert, streamData } = useVitalsStream(patientId);
  const { setCriticalAlarmData, updateLiveVitals } = useDashboardStore();

  // 1. Update live vitals cache for clinical risks / UI bubbles
  useEffect(() => {
    if (streamData) {
      updateLiveVitals(patientId, streamData);
    }
  }, [streamData, patientId, updateLiveVitals]);

  // 2. Handle critical alarms (modals)
  useEffect(() => {
    if (!criticalAlert) return;


    // Build vitals snapshot from the most recent patient_vital_update data
    const vitalsSnapshot = {
      heartRate:    streamData?.heart_rate  ?? undefined,
      spo2:         streamData?.spo2         ?? undefined,
      bloodPressure: (streamData?.bp_systolic && streamData?.bp_diastolic)
        ? { systolic: streamData.bp_systolic, diastolic: streamData.bp_diastolic }
        : undefined,
      temperature:  streamData?.temp         ?? undefined,
    };

    setCriticalAlarmData({
      name:    patientName,
      userId:  patientId,
      vitals:  vitalsSnapshot,
      alert:   criticalAlert,   // { vital_type, triggered_value, severity, ... }
      source:  'home',          // prevents overview from showing home-page alarms
    });
  }, [criticalAlert]); // eslint-disable-line react-hooks/exhaustive-deps

  // Renders nothing — purely logic
  return null;
}
