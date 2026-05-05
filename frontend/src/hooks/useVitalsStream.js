import { useState, useEffect, useRef } from 'react';

export const useVitalsStream = (patientId) => {
  const [streamData, setStreamData] = useState(null);
  const [streamError, setStreamError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  // Each critical_alert event from the server updates this object so
  // consumers can open the alarm modal via a useEffect dependency.
  const [criticalAlert, setCriticalAlert] = useState(null);
  
  const latestVitalsRef = useRef(null);
  const alertSentStatusRef = useRef({ removed: false, disconnected: false });

  useEffect(() => {
    if (!patientId) return;

    // Use full URL since EventSource doesn't use the axios instance
    const API_BASE_URL = 'https://vitalvue-api.genesysailabs.com';
    const eventSource = new EventSource(`${API_BASE_URL}/api/v1/stream/vitals-stream/${patientId}`);

    eventSource.onopen = () => {
      setIsConnected(true);
      setStreamError(null);
    };

    const handlePatientVitalUpdate = (event) => {
      try {
        const data = JSON.parse(event.data);
        // The server wraps vitals inside a "vitals" key; flatten for consumers
        let vitals = data.vitals ?? data;

        // If battery percentage is missing, make it 0
        if (vitals.battery_percent === undefined || vitals.battery_percent === null) {
          vitals.battery_percent = 0;
        }

        setStreamData(vitals);
        latestVitalsRef.current = vitals;

        // Check for device removal or disconnection and show an alert with status only once per transition
        if (vitals.is_removed === true) {
          if (!alertSentStatusRef.current.removed) {
            setCriticalAlert({
              patient_id: data.patient_id || vitals.patient_id,
              vital_type: 'Device Status',
              triggered_value: 'Watch has been removed',
              severity: 'Critical',
              _ts: Date.now()
            });
            alertSentStatusRef.current.removed = true;
          }
        } else {
          alertSentStatusRef.current.removed = false;
        }

        if (vitals.is_connected === false) {
           if (!alertSentStatusRef.current.disconnected && !vitals.is_removed) {
               setCriticalAlert({
                 patient_id: data.patient_id || vitals.patient_id,
                 vital_type: 'Device Status',
                 triggered_value: 'Watch has disconnected with app',
                 severity: 'Critical',
                 _ts: Date.now()
               });
               alertSentStatusRef.current.disconnected = true;
           }
        } else {
           alertSentStatusRef.current.disconnected = false;
        }

      } catch (err) {
        console.error('Error parsing stream data:', err);
      }
    };

    // ── patient_vital_update events ──────────────────────────────────────
    eventSource.addEventListener('patient_vital_update', handlePatientVitalUpdate);
    eventSource.addEventListener('update', handlePatientVitalUpdate);

    // ── critical_alert events ────────────────────────────────────────────
    // Payload shape from the server (see DevTools EventStream tab):
    //   { patient_id, vital_type, triggered_value, ... }
    const handleCriticalAlert = (event) => {
      try {
        // If the watch is removed, we want to suppress other alerts (like heart rate 0, etc.)
        if (latestVitalsRef.current && latestVitalsRef.current.is_removed === true) {
            return;
        }

        const data = JSON.parse(event.data);
        console.warn('[VitalsStream] Critical alert received:', data);
        // Stamp with Date so repeated same-field alerts still trigger the
        // useEffect dependency in consumers (object identity changes).
        setCriticalAlert({ ...data, _ts: Date.now() });
      } catch (err) {
        console.error('Error parsing critical alert:', err);
      }
    };

    eventSource.addEventListener('critical_alert', handleCriticalAlert);
    // Legacy 'alert' event name (backward compat)
    eventSource.addEventListener('alert', handleCriticalAlert);

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      setIsConnected(false);
      setStreamError(error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [patientId]);

  return { streamData, isConnected, streamError, criticalAlert };
};
