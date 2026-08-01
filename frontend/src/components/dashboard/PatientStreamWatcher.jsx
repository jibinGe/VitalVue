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
export default function PatientStreamWatcher({ patientId, patientName, room, ward, phoneNumber }) {
  const { criticalAlert, streamData, alertDismissed } = useVitalsStream(patientId);
  const { addCriticalAlarm, updateLiveVitals, removeCriticalAlarmSilent, criticalAlarms } = useDashboardStore();

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

    addCriticalAlarm({
      name:        patientName,
      userId:      patientId,
      room:        criticalAlert.room_name ?? room,
      ward:        criticalAlert.ward_name ?? ward,
      phoneNumber: criticalAlert.phone_number ?? phoneNumber,
      vitals:      vitalsSnapshot,
      alert:       criticalAlert,   // { vital_type, triggered_value, severity, ... }
      source:      'home',          // prevents overview from showing home-page alarms
    });
  }, [criticalAlert]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3. Cross-screen alert dismissal
  // When any other logged-in user snoozes or takes action on an alert, the
  // backend broadcasts ALERT_SNOOZED / ALERT_RESOLVED on the patient's
  // alert channel. We receive it via SSE and clear the modal here so all
  // other sessions see the popup disappear automatically.
  useEffect(() => {
    if (!alertDismissed) return;

    const dismissedAlertId = alertDismissed.alert_id;
    const dismissedPatientId = alertDismissed.patient_id;

    // Remove from the store if it matches
    if (dismissedPatientId === patientId) {
      if (dismissedAlertId) {
        removeCriticalAlarmSilent(dismissedAlertId);
      } else {
        // If no specific alert ID, dismiss all for this patient
        const alarmsForPatient = criticalAlarms.filter(a => a.userId === patientId);
        alarmsForPatient.forEach(a => {
          removeCriticalAlarmSilent(a.alert?.id || a.alert?.alert_id);
        });
      }
    }
  }, [alertDismissed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Renders nothing — purely logic
  return null;
}

