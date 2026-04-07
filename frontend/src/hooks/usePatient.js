import { useQuery } from '@tanstack/react-query';
import { patientService } from '@/services/patientService';

/**
 * Hook to fetch and poll a single patient's current vitals.
 */
export const usePatient = (userId) => {
  return useQuery({
    queryKey: ['patient', userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await patientService.getCurrentVitals(userId);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch patient data');
      }
      
      return response.data || null;
    },
    enabled: !!userId,
    refetchInterval: 5000, 
    refetchIntervalInBackground: true,
    staleTime: 2000,
  });
};
