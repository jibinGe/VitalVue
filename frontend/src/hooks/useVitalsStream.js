import { useState, useEffect, useRef } from 'react';

export const useVitalsStream = (patientId) => {
  const [streamData, setStreamData] = useState(null);
  const [streamError, setStreamError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  // Each critical_alert event from the server updates this object so
  // consumers can open the alarm modal via a useEffect dependency.
  const [criticalAlert, setCriticalAlert] = useState(null);

  useEffect(() => {
    if (!patientId) return;

    // Use full URL since EventSource doesn't use the axios instance
    const API_BASE_URL = 'https://vitalvue-api.genesysailabs.com';
    const eventSource = new EventSource(`${API_BASE_URL}/api/v1/stream/vitals-stream/${patientId}`);

    eventSource.onopen = () => {
      setIsConnected(true);
      setStreamError(null);
    };

    // ── patient_vital_update events ──────────────────────────────────────
    eventSource.addEventListener('patient_vital_update', (event) => {
      try {
        const data = JSON.parse(event.data);
        // The server wraps vitals inside a "vitals" key; flatten for consumers
        setStreamData(data.vitals ?? data);
      } catch (err) {
        console.error('Error parsing stream data:', err);
      }
    });

    // Legacy 'update' event (kept for backwards compatibility)
    eventSource.addEventListener('update', (event) => {
      try {
        const data = JSON.parse(event.data);
        setStreamData(data.vitals ?? data);
      } catch (err) {
        console.error('Error parsing stream data:', err);
      }
    });

    // ── critical_alert events ────────────────────────────────────────────
    // Payload shape from the server (see DevTools EventStream tab):
    //   { patient_id, vital_type, triggered_value, ... }
    const handleCriticalAlert = (event) => {
      try {
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
