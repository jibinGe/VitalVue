import { useQuery } from '@tanstack/react-query';
import { patientService } from '@/services/patientService';

export const useDoctors = () => {
  return useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const profileRes = await patientService.getUserProfile();
      const orgId = profileRes?.data?.organization_id;

      if (!orgId) throw new Error('Organization ID not found');

      const response = await patientService.getDoctors(orgId);
      if (!response.success) throw new Error(response.message || 'Failed to fetch doctors');
      
      return response.data || [];
    },
    staleTime: 1000 * 60 * 5, // Doctors don't change often
  });
};
