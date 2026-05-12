import { useState, useEffect, useRef } from 'react';

export const useVitalsStream = (patientId) => {
  const [streamData, setStreamData] = useState(null);
  const [streamError, setStreamError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  // Each critical_alert event from the server updates this object so
  // consumers can open the alarm modal via a useEffect dependency.
  const [criticalAlert, setCriticalAlert] = useState(null);
  
  const latestVitalsRef = useRef(null);
  const alertSentStatusRef = useRef({ removed: false, disconnected: false, battery: false });

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
        const data = JSON.parse(event.data);
        
        // If the watch is removed or disconnected, we want to suppress bogus critical alerts (like heart rate 0).
        // However, we still allow 'warning' alerts to pass through if they are sent by the backend.
        const isDeviceAlert = data.vital_type === "Band Status" || data.vital_type === "Connectivity" || data.vital_type === "Device Status";
        const isCritical = data.severity?.toLowerCase() === 'critical';

        if (!isDeviceAlert && !isCritical) {
            console.warn('[VitalsStream] Ignoring non-critical, non-device alert:', data);
            return;
        }

        // If the watch is removed or disconnected, we want to suppress bogus critical alerts (like heart rate 0).
        const isRemoved = latestVitalsRef.current ? latestVitalsRef.current.is_removed === true : false;
        const isDisconnected = latestVitalsRef.current ? latestVitalsRef.current.is_connected === false : false;

        // Bogus vitals usually have triggered_value of 0, '0', or are missing.
        const valNum = parseFloat(data.triggered_value);
        const isBogusValue = data.triggered_value === 0 || data.triggered_value === '0' || (!isNaN(valNum) && valNum <= 0) || !data.triggered_value;

        // If we don't have vitals yet (initial load), assume it might be a stale/bogus alert if the value is bogus.
        // Even better, if we don't have vitals at all, it's safer to suppress non-device critical alerts until we know the connection state.
        const isUnknownState = !latestVitalsRef.current;

        if (!isDeviceAlert && (isRemoved || isDisconnected || (isUnknownState && isBogusValue))) {
            if (isCritical) {
                console.warn('[VitalsStream] Suppressing critical vitals alert because device is removed/disconnected or state is unknown with bogus value:', data);
                return;
            }
        }

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
