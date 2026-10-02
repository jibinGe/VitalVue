import { useQuery } from '@tanstack/react-query';
import { patientService } from '@/services/patientService';
import { isFeatureEnabled } from '@/utilities/featureFlags';

// Live status of the 4G watches linked to these patients ({ [patientId]: { is_online, … } }),
// for the dashboard device card. Polled every 30 s; only while the 4G watch feature is on.
export function useWatchStatus(patientIds) {
  const ids = [...new Set((patientIds || []).filter(Boolean))].sort((a, b) => a - b);
  const enabled = ids.length > 0 && isFeatureEnabled('watches4g');
  const { data } = useQuery({
    queryKey: ['watchStatus', ids.join(',')],
    queryFn: async () => {
      const res = await patientService.getWatchStatus(ids);
      return res.success ? res.data : {};
    },
    enabled,
    refetchInterval: 30000,
    staleTime: 15000,
  });
  return enabled ? data || {} : {};
}
