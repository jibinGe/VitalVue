import { useQuery } from '@tanstack/react-query';
import { patientService } from '@/services/patientService';

/**
 * Hook to fetch and poll patient data for the organization/ward.
 * Replaces manual setInterval polling with automated state management.
 */
export const usePatients = (wardId = 'all', refreshTrigger = 0) => {
  return useQuery({
    queryKey: ['patients', wardId, refreshTrigger],
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
    // Poll every 5 seconds for real-time monitoring
    refetchInterval: 5000, 
    refetchIntervalInBackground: true,
    staleTime: 2000, // Consider data stale after 2 seconds
  });
};
