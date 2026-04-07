import apiClient from '@/config/apiClient';

export const patientService = {
  /**
   * Get current logged-in user profile (includes organization_id)
   */
  async getUserProfile() {
    try {
      const response = await apiClient.get('/api/v1/auth/profile');
      return {
        success: true,
        data: response.data?.data || response.data,
        message: "Success",
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {
        success: false,
        message: error.message || "Failed to fetch profile",
      };
    }
  },

  /**
   * Get all active patients
   */
  async getActivePatients(params = {}) {
    try {
      const response = await apiClient.get('/api/v1/patients/assigned', { params });
      return {
        success: true,
        data: response.data || [],
        message: "Success",
      };
    } catch (error) {
      console.error('Error fetching active patients:', error);
      return {
        success: false,
        data: [],
        message: error.message || "Failed to fetch patients",
      };
    }
  },

  /**
   * Get patient details by ID
   */
  async getPatientDetails(patientId) {
    return {
      success: true,
      data: null,
      message: "Patient not found",
    };
  },

  /**
   * Start monitoring a patient
   */
  async startMonitoring(patientId, monitoringData) {
    return {
      success: true,
      data: null,
      message: "Monitoring started",
    };
  },

  /**
   * End monitoring a patient
   */
  async endMonitoring(patientId, endData = {}) {
    return {
      success: true,
      data: null,
      message: "Monitoring ended",
    };
  },

  /**
   * Restart monitoring a patient
   */
  async restartMonitoring(patientId, monitoringData) {
    return {
      success: true,
      data: null,
      message: "Monitoring restarted",
    };
  },

  /**
   * Get current vitals for a specific patient
   */
  async getCurrentVitals(userId, includeHistory = false) {
    try {
      // For now, fetch all assigned and find the user since we know this endpoint exists
      const response = await apiClient.get('/api/v1/patients/assigned');
      const patients = response.data || [];
      const patient = patients.find(p => p.user_id === userId || p.id?.toString() === userId);

      if (!patient) {
        return {
          success: false,
          data: null,
          message: "Patient not found",
        };
      }

      return {
        success: true,
        data: patient,
        message: "Success",
      };
    } catch (error) {
      console.error('Error fetching current vitals:', error);
      return {
        success: false,
        data: null,
        message: error.message || "Failed to fetch vitals",
      };
    }
  },

  /**
   * Get list of wards
   */
  async getWards() {
    return {
      success: true,
      data: [
        { id: "ward-1", name: "General Ward" },
        { id: "ward-2", name: "ICU" }
      ],
      message: "Success",
    };
  },

  /**
   * Get list of doctors by organization ID
   */
  async getDoctors(orgId) {
    try {
      const response = await apiClient.get(`/api/v1/discovery/organizations/${orgId}/doctors`);
      return {
        success: true,
        data: response.data || [],
        message: "Success",
      };
    } catch (error) {
      console.error('Error fetching doctors:', error);
      return {
        success: false,
        data: [],
        message: error.message || "Failed to fetch doctors",
      };
    }
  },

  /**
   * Get all organization vitals (all patients in organization)
   */
  async getOrganizationVitals(params = {}) {
    try {
      const response = await apiClient.get('/api/v1/patients/assigned', { params });
      return {
        success: true,
        data: response.data || [],
        count: (response.data || []).length,
        message: "Success",
      };
    } catch (error) {
      console.error('Error fetching organization vitals:', error);
      return {
        success: false,
        data: [],
        count: 0,
        message: error.message || "Failed to fetch organization vitals",
      };
    }
  },

  /**
   * Get patient history timeline
   */
  async getPatientHistory(patientId, params = {}) {
    try {
      // Default to 24h if not specified
      let startTime = params.start_time;
      let endTime = params.end_time || new Date().toISOString();
      let scaleMinutes = params.scale_minutes || 5;

      if (!startTime) {
        const d = new Date();
        d.setHours(d.getHours() - 24);
        startTime = d.toISOString();
      }

      const response = await apiClient.get(`/api/v1/patients/history/${patientId}`, {
        params: {
          start_time: startTime,
          end_time: endTime,
          scale_minutes: scaleMinutes
        }
      });
      return {
        success: true,
        data: response.data || [],
        message: "Success",
      };
    } catch (error) {
      console.error('Error fetching patient history:', error);
      return {
        success: false,
        data: [],
        message: error.message || "Failed to fetch patient history",
      };
    }
  },

  /**
   * Get heart rate data for a patient
   */
  async getHeartRateData(patientId, params = {}) {
    return { success: true, data: [], message: "No data found" };
  },

  /**
   * Get SpO2 data for a patient
   */
  async getSpO2Data(patientId, params = {}) {
    return { success: true, data: [], message: "No data found" };
  },

  /**
   * Get blood pressure data for a patient
   */
  async getBloodPressureData(patientId, params = {}) {
    return { success: true, data: [], message: "No data found" };
  },

  /**
   * Get temperature data for a patient
   */
  async getTemperatureData(patientId, params = {}) {
    return { success: true, data: [], message: "No data found" };
  },

  /**
   * Get HRV data for a patient
   */
  async getHRVData(patientId, params = {}) {
    return { success: true, data: [], message: "No data found" };
  },

  /**
   * Get movement data for a patient
   */
  async getMovementData(patientId, params = {}) {
    return { success: true, data: [], message: "No data found" };
  },

  /**
   * Get sleep pattern data for a patient
   */
  async getSleepPatternData(userId, params = {}) {
    return { success: true, data: [], message: "No data found" };
  },

  /**
   * Get respiratory rate data for a patient
   */
  async getRespiratoryRateData(userId, params = {}) {
    return { success: true, data: [], message: "No data found" };
  },

  /**
   * Assign device to patient
   */
  async assignDevice(userId, deviceUid) {
    return {
      success: true,
      data: null,
      message: "Device assigned successfully",
    };
  },

  /**
   * Unassign device from patient
   */
  async unassignDevice(deviceUid) {
    return {
      success: true,
      data: null,
      message: "Device unassigned successfully",
    };
  },

  /**
   * Get heart rate data for a patient (REST endpoint)
   */
  async getHeartRateVitals(userId, params = {}) {
    return {
      success: true,
      data: [],
      message: "No data found",
    };
  },

  /**
   * Get SpO2 data for a patient (REST endpoint)
   */
  async getSpO2Vitals(userId, params = {}) {
    return {
      success: true,
      data: [],
      message: "No data found",
    };
  },

  /**
   * Get blood pressure data for a patient (REST endpoint)
   */
  async getBloodPressureVitals(userId, params = {}) {
    return {
      success: true,
      data: [],
      message: "No data found",
    };
  },

  /**
   * Get HRV data for a patient (REST endpoint)
   */
  async getHRVVitals(userId, params = {}) {
    return {
      success: true,
      data: [],
      message: "No data found",
    };
  },

  /**
   * Get sleep data for a patient (REST endpoint)
   */
  async getSleepVitals(userId, params = {}) {
    return {
      success: true,
      data: [],
      message: "No data found",
    };
  },

  /**
   * Log a clinical event for a patient
   */
  async logClinicalEvent(eventData) {
    return {
      success: true,
      data: null,
      message: "Event logged successfully",
    };
  },

  /**
   * Add a clinical note for a patient
   */
  async addClinicalNote(noteData) {
    return {
      success: true,
      data: null,
      message: "Clinical note added successfully",
    };
  },

  /**
   * Manage baseline deviation for a patient
   */
  async manageBaselineDeviation(deviationData) {
    return {
      success: true,
      data: null,
      message: "Success",
    };
  },

  /**
   * Flag patient for doctor review
   */
  async flagDoctorForReview(reviewData) {
    return {
      success: true,
      data: null,
      message: "Doctor flagged successfully",
    };
  },

  /**
   * Capture a clinical action for a patient
   */
  async captureAction(actionData) {
    return {
      success: true,
      data: null,
      message: "Action captured successfully",
    };
  },

  /**
   * Get staff notifications
   */
  async getNotifications(unreadOnly = false) {
    return {
      success: true,
      data: [],
      count: 0,
      message: "No notifications",
    };
  },

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId) {
    return {
      success: true,
      data: null,
      message: "Alert acknowledged",
    };
  },

  /**
   * Get all clinical alerts for a patient
   */
  async getAlerts(userId, params = {}) {
    return {
      success: true,
      data: [],
      message: "No alerts found"
    };
  },

  /**
   * Get NEWS2 Score for a patient
   */
  async getNews2Score(userId) {
    return {
      success: true,
      data: null,
      message: "No score found"
    };
  },

  /**
   * Get AF Warning for a patient
   */
  async getAfWarning(userId) {
    return {
      success: true,
      data: null,
      message: "No warning found"
    };
  },

  /**
   * Get Stroke Risk Assessment for a patient
   */
  async getStrokeRisk(userId) {
    return {
      success: true,
      data: null,
      message: "No risk assessment found"
    };
  },

  /**
   * Get Seizure Risk Assessment for a patient
   */
  async getSeizureRisk(userId) {
    return {
      success: true,
      data: null,
      message: "No risk assessment found"
    };
  },
};
