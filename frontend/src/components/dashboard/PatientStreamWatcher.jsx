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
  const { setCriticalAlarmData, updateLiveVitals, clearCriticalAlarm, criticalAlarmData } = useDashboardStore();

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

    // Only act if the currently shown alarm matches this patient & alert
    const currentAlertId =
      criticalAlarmData?.alert?.id ||
      criticalAlarmData?.alert?.alert_id;

    const isMatchingPatient = criticalAlarmData?.userId === patientId ||
      criticalAlarmData?.userId === dismissedPatientId;

    const isMatchingAlert =
      !dismissedAlertId ||       // no specific ID means dismiss for the whole patient
      !currentAlertId ||         // no current alert ID tracked → clear anyway for safety
      currentAlertId === dismissedAlertId;

    if (isMatchingPatient && isMatchingAlert) {
      console.info(
        '[PatientStreamWatcher] Dismissing alert modal — resolved by another session.',
        alertDismissed
      );
      clearCriticalAlarm();
    }
  }, [alertDismissed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Renders nothing — purely logic
  return null;
}

