import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { patientService } from '@/services/patientService';

/**
 * Hook to fetch patient data and stream live vitals via Server-Sent Events.
 * Fully replaces the manual polling logic.
 */
export const usePatients = (wardId = 'all', refreshTrigger = 0) => {
  const queryClient = useQueryClient();
  const queryKey = ['patients', wardId, refreshTrigger];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const params = {};
      if (wardId && wardId !== "all") {
        params.ward = wardId;
      }
      const response = await patientService.getOrganizationVitals(params);

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch patients');
      }

      return response.data || [];
    },
    // Disabled polling in favor of Server-Sent Events
    refetchInterval: false,
    staleTime: Infinity, // Keep in-memory cache until updated by stream
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Use the backend base URL from settings/config or fallback to the current window origin for relatives
    const backendBaseUrl = 'https://vitalvue-api.genesysailabs.com'; 
    
    let streamUrl = `${backendBaseUrl}/api/v1/stream/assigned/stream`;
    if (wardId && wardId !== "all") {
      streamUrl = `${backendBaseUrl}/api/v1/stream/ward-stream/${wardId}`;
    }

    const eventSource = new EventSource(`${streamUrl}?token=${token}`);

    const handleMessageUpdate = (e) => {
      try {
        const data = JSON.parse(e.data);

        queryClient.setQueryData(queryKey, (oldData) => {
          if (!oldData) return oldData;
          return oldData.map(patient => {
            // Find patient by integer ID or specific string formats
            if (
              patient.id === data.patient_id ||
              patient.user_id === data.patient_id ||
              patient.id?.toString() === data.patient_id?.toString()
            ) {
              const updatedPatient = { ...patient };

              if (data.vitals) {
                const newVitalsEntry = {
                  ...data.vitals,
                  recorded_at: new Date().toISOString()
                };

                updatedPatient.vitals_history = [
                  ...(updatedPatient.vitals_history || []),
                  newVitalsEntry
                ];

                // Keep array size manageable for memory
                if (updatedPatient.vitals_history.length > 30) {
                  // shift instead of slicing for performance if we are constantly appending
                  updatedPatient.vitals_history = updatedPatient.vitals_history.slice(-30);
                }
              }
              return updatedPatient;
            }
            return patient;
          });
        });
      } catch (err) {
        console.error("Error parsing SSE update", err);
      }
    };

    eventSource.addEventListener('patient_vital_update', handleMessageUpdate);
    eventSource.addEventListener('ward_vital_update', handleMessageUpdate);
    eventSource.addEventListener('critical_alert', handleMessageUpdate);
    eventSource.addEventListener('ward_alert', handleMessageUpdate);

    eventSource.onerror = (err) => {
      console.error('SSE connection failed for URL:', streamUrl);
      console.error('Check if your token is valid or if there is a CORS mismatch.');
      // Most browsers don't provide the status code directly in EventSource error, 
      // but we can at least log that it failed.
      console.warn('SSE Data Stream Error, it will attempt to reconnect natively.', err);
    };

    return () => {
      eventSource.close();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wardId, refreshTrigger]); // queryClient is stable, omit token refetch

  return query;
};
