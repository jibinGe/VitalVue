import { useState, useEffect } from 'react';

export const useVitalsStream = (patientId) => {
  const [streamData, setStreamData] = useState(null);
  const [streamError, setStreamError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!patientId) return;

    // Use full URL since EventSource doesn't use the axios instance
    const API_BASE_URL = 'http://localhost:8000'; // Match what's in apiClient.js
    const eventSource = new EventSource(`${API_BASE_URL}/api/v1/stream/vitals-stream/${patientId}`);

    eventSource.onopen = () => {
      setIsConnected(true);
      setStreamError(null);
    };

    eventSource.addEventListener('update', (event) => {
      try {
        const data = JSON.parse(event.data);
        setStreamData(data);
      } catch (err) {
        console.error('Error parsing stream data:', err);
      }
    });

    eventSource.addEventListener('alert', (event) => {
      try {
        const data = JSON.parse(event.data);
        // You could handle alerts specifically here
        console.log('Stream alert received:', data);
      } catch (err) {
        console.error('Error parsing stream alert:', err);
      }
    });

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      setIsConnected(false);
      setStreamError(error);
      eventSource.close(); // Stop auto-reconnecting if you prefer, or let it retry
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [patientId]);

  return { streamData, isConnected, streamError };
};
