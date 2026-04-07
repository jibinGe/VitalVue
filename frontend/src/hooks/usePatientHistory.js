import { useQuery } from '@tanstack/react-query';
import { patientService } from '@/services/patientService';

export const usePatientHistory = (userId, filterTab = 'Live') => {
  return useQuery({
    queryKey: ['patientHistory', userId, filterTab],
    queryFn: async () => {
      if (!userId) return null;

      // Calculate start_time and scale_minutes based on filterTab
      const end_time = new Date().toISOString();
      const start_date = new Date();
      let scale_minutes = 1;

      if (filterTab === 'Live') {
        start_date.setMinutes(start_date.getMinutes() - 15); // Last 15 minutes for Live
        scale_minutes = 1; // 1-minute buckets
      } else if (filterTab === '1h') {
        start_date.setHours(start_date.getHours() - 1);
        scale_minutes = 2; // 2-minute buckets
      } else if (filterTab === '24h') {
        start_date.setHours(start_date.getHours() - 24);
        scale_minutes = 30; // 30-minute buckets
      } else if (filterTab === '7d') {
        start_date.setDate(start_date.getDate() - 7);
        scale_minutes = 60 * 4; // 4-hour buckets
      }

      const start_time = start_date.toISOString();

      const response = await patientService.getPatientHistory(userId, {
        start_time,
        end_time,
        scale_minutes
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch patient history');
      }

      // Transform the nested API response into a flat array structure for the charts
      // that matches the original raw vitals structure
      const transformedHistory = (response.data || []).map(row => ({
        timestamp: row.timestamp,
        recorded_at: row.timestamp,
        // Map primary vitals
        heart_rate: row.primary_vitals?.heart_rate,
        spo2: row.primary_vitals?.spo2,
        temp: row.primary_vitals?.temp,
        temperature: row.primary_vitals?.temp,
        // The API returns bp as "sys/dia", let's split it out if needed or just use as is
        // wait, we can parse it for sys and dia
        systolic: row.primary_vitals?.blood_pressure ? parseInt(row.primary_vitals.blood_pressure.split('/')[0]) : undefined,
        diastolic: row.primary_vitals?.blood_pressure ? parseInt(row.primary_vitals.blood_pressure.split('/')[1]) : undefined,
        bp_systolic: row.primary_vitals?.blood_pressure ? parseInt(row.primary_vitals.blood_pressure.split('/')[0]) : undefined,

        // Map risks
        news2_score: row.clinical_risks?.news2_score,
        af_warning: row.clinical_risks?.af_warning,
        stroke_risk: row.clinical_risks?.stroke_risk,
        seizure_risk: row.clinical_risks?.seizure_risk,

        // Map advanced metrics
        hrv_score: row.advanced_metrics?.hrv_score,
        hrv: row.advanced_metrics?.hrv_score,
        stress_level: row.advanced_metrics?.stress_level,
        movement: row.advanced_metrics?.movement_index,

        // Map device status
        battery_percent: row.device_status?.battery,
        is_connected: row.device_status?.is_connected
      }));

      return transformedHistory;
    },
    enabled: !!userId,
    refetchInterval: filterTab === 'Live' ? 5000 : false, // Auto-refresh if 'Live'
    staleTime: filterTab === 'Live' ? 2000 : 1000 * 60,
  });
};
