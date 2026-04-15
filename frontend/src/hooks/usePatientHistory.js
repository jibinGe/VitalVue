import { useQuery } from '@tanstack/react-query';
import { patientService } from '@/services/patientService';

export const usePatientHistory = (patientId, filterTab = 'Live') => {
  return useQuery({
    queryKey: ['patientHistory', patientId, filterTab],
    queryFn: async () => {
      if (!patientId) return null;

      // Calculate start_time and scale_minutes based on filterTab
      const start_date = new Date();
      const scale_minutes = 1; // Always use 5-minute buckets as requested

      if (filterTab === 'Live') {
        start_date.setMinutes(start_date.getMinutes() - 15); // Last 15 minutes for Live
      } else if (filterTab === '1h') {
        start_date.setHours(start_date.getHours() - 1);
      } else if (filterTab === '24h') {
        start_date.setHours(start_date.getHours() - 24);
      } else if (filterTab === '7d') {
        start_date.setDate(start_date.getDate() - 7);
      }

      const formatParamDate = (date) => date.toISOString().replace('T', ' ').replace('Z', '');
      const start_time = formatParamDate(start_date);
      const end_time = formatParamDate(new Date());

      const response = await patientService.getPatientHistory(patientId, {
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
        clinical_risks: row.clinical_risks,
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
    enabled: !!patientId && !isNaN(Number(patientId)),
    refetchInterval: filterTab === 'Live' ? 5000 : false, // Auto-refresh if 'Live'
    staleTime: filterTab === 'Live' ? 2000 : 1000 * 60,
  });
};
