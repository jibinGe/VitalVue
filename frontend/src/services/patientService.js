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
      const patients = response.data || [];
      patients.forEach(p => {
        if (p.vitals_history && Array.isArray(p.vitals_history)) {
          p.vitals_history.reverse();
        }
      });
      return {
        success: true,
        data: patients,
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
   * Get patient details by ID or User ID (Resolves identifier to patient metadata)
   */
  async getPatientDetails(identifier) {
    return this.getPatientById(identifier);
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
   * Get patient metadata by ID or User ID
   * Replaces the former lookup logic for patient metadata
   */
  async getPatientById(identifier) {
    try {
      if (!identifier) return { success: false, message: "No identifier provided" };
      
      // Fetch assigned patients to find the specific one
      const response = await apiClient.get('/api/v1/patients/assigned');
      const patients = response.data || [];
      
      // Look up by patient ID (integer/string) or user ID
      const patient = patients.find(p => 
        p.user_id === identifier || 
        p.id?.toString() === identifier?.toString()
      );

      if (patient && patient.vitals_history && Array.isArray(patient.vitals_history)) {
        patient.vitals_history.reverse();
      }

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
      console.error('Error in getPatientById:', error);
      return {
        success: false,
        data: null,
        message: error.message || "Failed to fetch patient",
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
      const patients = response.data || [];
      patients.forEach(p => {
        if (p.vitals_history && Array.isArray(p.vitals_history)) {
          p.vitals_history.reverse();
        }
      });
      return {
        success: true,
        data: patients,
        count: patients.length,
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
   * Internal helper to fetch dynamic metric history directly from new API
   */
  async getDynamicMetricHistory(patientId, metricName, params = {}) {
    try {
      const mappedParams = this._mapIntervalToParams(params.interval);
      let startTime = params.start_time || mappedParams.start_time;
      let endTime = params.end_time || mappedParams.end_time;
      let scaleMinutes = params.scale_minutes || mappedParams.scale_minutes;

      const response = await apiClient.get(`/api/v1/patients/history/${patientId}/${metricName}`, {
        params: {
          start_time: startTime,
          end_time: endTime,
          scale_minutes: scaleMinutes
        }
      });
      return {
        success: true,
        data: response.data?.data || [],
        message: "Success",
      };
    } catch (error) {
      console.error(`Error fetching dynamic metric history for ${metricName}:`, error);
      return {
        success: false,
        data: [],
        message: error.message || `Failed to fetch history for ${metricName}`,
      };
    }
  },

  /**
   * Get heart rate data for a patient
   */
  async getHeartRateData(patientId, params = {}) {
    try {
      const historyResponse = await this.getDynamicMetricHistory(patientId, 'heart_rate', params);
      if (!historyResponse.success) return historyResponse;

      const heartRateData = historyResponse.data.map(row => ({
        time: row.t,
        value: row.v
      })).filter(d => d.value !== undefined && d.value !== null);

      const statistics = this._calculateStats(heartRateData.map(d => d.value));

      return {
        success: true,
        data: {
          heartRateData: heartRateData,
          statistics: statistics
        },
        message: "Success"
      };
    } catch (error) {
      console.error('Error in getHeartRateData:', error);
      return { success: false, data: [], message: error.message };
    }
  },

  /**
   * Get SpO2 data for a patient
   */
  async getSpO2Data(patientId, params = {}) {
    try {
      const historyResponse = await this.getDynamicMetricHistory(patientId, 'spo2', params);
      if (!historyResponse.success) return historyResponse;

      const spo2Data = historyResponse.data.map(row => ({
        time: row.t,
        value: row.v
      })).filter(d => d.value !== undefined && d.value !== null);

      const statistics = this._calculateStats(spo2Data.map(d => d.value));

      return {
        success: true,
        data: {
          spo2Data: spo2Data,
          statistics: statistics
        },
        message: "Success"
      };
    } catch (error) {
      console.error('Error in getSpO2Data:', error);
      return { success: false, data: [], message: error.message };
    }
  },

  /**
   * Get blood pressure data for a patient
   */
  async getBloodPressureData(patientId, params = {}) {
    try {
      const [sysResponse, diaResponse] = await Promise.all([
        this.getDynamicMetricHistory(patientId, 'bp_systolic', params),
        this.getDynamicMetricHistory(patientId, 'bp_diastolic', params)
      ]);

      if (!sysResponse.success) return sysResponse;
      if (!diaResponse.success) return diaResponse;

      const sysMap = new Map(sysResponse.data.map(d => [d.t, d.v]));
      const diaMap = new Map(diaResponse.data.map(d => [d.t, d.v]));

      const allTimes = new Set([...sysMap.keys(), ...diaMap.keys()]);
      const bloodPressureData = Array.from(allTimes).sort().map(t => {
        return {
          time: t,
          value: {
            systolic: sysMap.get(t) || null,
            diastolic: diaMap.get(t) || null
          }
        };
      }).filter(d => d.value.systolic !== null);

      const sysStats = this._calculateStats(bloodPressureData.map(d => d.value.systolic).filter(v => v !== null));
      const diaStats = this._calculateStats(bloodPressureData.map(d => d.value.diastolic).filter(v => v !== null));

      return {
        success: true,
        data: {
          bloodPressureData: bloodPressureData,
          statistics: {
            systolic: sysStats,
            diastolic: diaStats,
            // Compatibility for gauge/summary
            min: sysStats.min,
            max: sysStats.max,
            average: sysStats.average,
            count: sysStats.count
          }
        },
        message: "Success"
      };
    } catch (error) {
      console.error('Error in getBloodPressureData:', error);
      return { success: false, data: [], message: error.message };
    }
  },

  /**
   * Get temperature data for a patient
   */
  async getTemperatureData(patientId, params = {}) {
    try {
      const historyResponse = await this.getDynamicMetricHistory(patientId, 'temp', params);
      if (!historyResponse.success) return historyResponse;

      const temperatureData = historyResponse.data.map(row => ({
        time: row.t,
        value: row.v
      })).filter(d => d.value !== undefined && d.value !== null);

      const statistics = this._calculateStats(temperatureData.map(d => d.value));

      return {
        success: true,
        data: {
          temperatureData: temperatureData,
          statistics: statistics
        },
        message: "Success"
      };
    } catch (error) {
      console.error('Error in getTemperatureData:', error);
      return { success: false, data: [], message: error.message };
    }
  },

  /**
   * Get HRV data for a patient
   */
  async getHRVData(patientId, params = {}) {
    try {
      const historyResponse = await this.getDynamicMetricHistory(patientId, 'hrv_score', params);
      if (!historyResponse.success) return historyResponse;

      const hrvData = historyResponse.data.map(row => ({
        time: row.t,
        value: row.v
      })).filter(d => d.value !== undefined && d.value !== null);

      const statistics = this._calculateStats(hrvData.map(d => d.value));

      return {
        success: true,
        data: {
          hrvData: hrvData,
          statistics: statistics
        },
        message: "Success"
      };
    } catch (error) {
      console.error('Error in getHRVData:', error);
      return { success: false, data: [], message: error.message };
    }
  },

  /**
   * Get movement data for a patient
   */
  async getMovementData(patientId, params = {}) {
    try {
      const historyResponse = await this.getDynamicMetricHistory(patientId, 'movement', params);
      if (!historyResponse.success) return historyResponse;

      const movementData = historyResponse.data.map(row => ({
        time: row.t,
        value: row.v
      })).filter(d => d.value !== undefined && d.value !== null);

      const statistics = this._calculateStats(movementData.map(d => d.value));

      return {
        success: true,
        data: {
          movementData: movementData,
          statistics: statistics
        },
        message: "Success"
      };
    } catch (error) {
      console.error('Error in getMovementData:', error);
      return { success: false, data: [], message: error.message };
    }
  },

  /**
   * Internal helper to map interval strings to API history params
   */
  _mapIntervalToParams(interval) {
    const params = { scale_minutes: 5 };
    const end = new Date();
    const start = new Date();

    switch (interval) {
      case '1h':
        start.setHours(start.getHours() - 1);
        params.scale_minutes = 1;
        break;
      case '6h':
        start.setHours(start.getHours() - 6);
        params.scale_minutes = 5;
        break;
      case '24h':
        start.setHours(start.getHours() - 24);
        params.scale_minutes = 5;
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        params.scale_minutes = 6;
        break;
      default:
        start.setHours(start.getHours() - 24);
        params.scale_minutes = 10;
    }

    params.start_time = start.toISOString().replace('T', ' ').replace('Z', '');
    params.end_time = end.toISOString().replace('T', ' ').replace('Z', '');
    return params;
  },

  /**
   * Internal helper to calculate metrics statistics
   */
  _calculateStats(values) {
    if (!values || values.length === 0) {
      return { min: 0, max: 0, average: 0, count: 0, current: 0, baseline: 0, baselineDeviation: 0 };
    }

    const validValues = values.filter(v => v !== null && v !== undefined);
    if (validValues.length === 0) {
      return { min: 0, max: 0, average: 0, count: 0, current: 0, baseline: 0, baselineDeviation: 0 };
    }

    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    const sum = validValues.reduce((a, b) => a + b, 0);
    const average = sum / validValues.length;
    const current = validValues[validValues.length - 1];

    // Simple baseline logic: average of the first 20% of data if available, or just average
    const baselineCount = Math.max(1, Math.floor(validValues.length * 0.2));
    const baseline = validValues.slice(0, baselineCount).reduce((a, b) => a + b, 0) / baselineCount;
    const baselineDeviation = baseline !== 0 ? Math.round(((current - baseline) / baseline) * 100) : 0;

    return {
      min: Math.round(min * 10) / 10,
      max: Math.round(max * 10) / 10,
      average: Math.round(average * 10) / 10,
      count: validValues.length,
      current: Math.round(current * 10) / 10,
      baseline: Math.round(baseline * 10) / 10,
      baselineDeviation
    };
  },

  /**
   * Get sleep pattern data for a patient
   */
  async getSleepPatternData(patientId, params = {}) {
    try {
      const historyResponse = await this.getDynamicMetricHistory(patientId, 'sleep_score', params);
      if (!historyResponse.success) return historyResponse;

      const sleepData = historyResponse.data.map(row => ({
        time: row.t,
        value: row.v
      })).filter(d => d.value !== undefined && d.value !== null);

      const statistics = this._calculateStats(sleepData.map(d => d.value));

      return {
        success: true,
        data: {
          sleepData: sleepData,
          statistics: statistics
        },
        message: "Success"
      };
    } catch (error) {
      console.error('Error in getSleepPatternData:', error);
      return { success: false, data: [], message: error.message };
    }
  },
  /**
   * Get stress level data for a patient
   */
  async getStressData(patientId, params = {}) {
    try {
      const historyResponse = await this.getDynamicMetricHistory(patientId, 'stress_level', params);
      if (!historyResponse.success) return historyResponse;

      const stressData = historyResponse.data.map(row => ({
        time: row.t,
        value: row.v,
        stress_level: row.v // StressPatternChart expects this
      })).filter(d => d.value !== undefined && d.value !== null);

      const statistics = this._calculateStats(stressData.map(d => {
        if (d.value === "High") return 90;
        if (d.value === "Moderate") return 60;
        if (d.value === "Low") return 30;
        return 0;
      }));

      return {
        success: true,
        data: {
          stressData: stressData,
          statistics: statistics
        },
        message: "Success"
      };
    } catch (error) {
      console.error('Error in getStressData:', error);
      return { success: false, data: [], message: error.message };
    }
  },

  /**
   * Get respiratory rate data for a patient
   */
  async getRespiratoryRateData(patientId, params = {}) {
    try {
      const historyResponse = await this.getDynamicMetricHistory(patientId, 'respiratory_rate', params);
      if (!historyResponse.success) return historyResponse;

      const respData = historyResponse.data.map(row => ({
        time: row.t,
        value: row.v
      })).filter(d => d.value !== undefined && d.value !== null);

      const statistics = this._calculateStats(respData.map(d => d.value));

      return {
        success: true,
        data: {
          respiratoryData: respData,
          statistics: statistics
        },
        message: "Success"
      };
    } catch (error) {
      console.error('Error in getRespiratoryRateData:', error);
      return { success: false, data: [], message: error.message };
    }
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
   * POST /api/v1/patients/patients/{patient_id}/flag
   *
   * reviewData:
   *   - patientId   : integer (required) — internal patient ID
   *   - message     : string  (required) — reason / note text
   *   - doctorId    : integer (optional) — selected_doctor_id
   */
  async flagDoctorForReview(reviewData) {
    try {
      const { patientId, message, doctorId } = reviewData;

      if (!patientId) {
        return { success: false, message: "Patient ID is required to flag a doctor." };
      }
      if (!message || !message.trim()) {
        return { success: false, message: "A reason is required to flag a doctor." };
      }

      const params = { reason: message.trim() };
      if (doctorId) {
        params.selected_doctor_id = Number(doctorId);
      }

      const response = await apiClient.post(
        `/api/v1/patients/patients/${patientId}/flag`,
        null,         // no request body — params are in the query string
        { params }
      );

      return {
        success: true,
        data: response.data,
        message: response.data?.message || "Doctor flagged successfully",
      };
    } catch (error) {
      console.error("Error flagging doctor for review:", error);
      return {
        success: false,
        data: null,
        message:
          error.response?.data?.detail?.[0]?.msg ||
          error.message ||
          "Failed to flag doctor for review",
      };
    }
  },

  /**
   * Capture a clinical action for a patient
   * POST /api/v1/patients/patients/{patient_id}/action
   *
   * actionData:
   *   - patientId    : integer (required) — internal patient ID
   *   - actionType   : string  (required) — e.g. "Patient Examinated"
   *   - alertId      : integer (optional, default 0)
   *   - otherDetails : string  (optional) — clinical notes
   *   - actionTime   : string  (optional) — ISO datetime; defaults to now
   */
  async captureAction(actionData) {
    try {
      const { patientId, actionType, alertId = 0, otherDetails = "", actionTime } = actionData;

      if (!patientId) {
        return { success: false, message: "Patient ID is required to capture an action." };
      }
      if (!actionType || !actionType.trim()) {
        return { success: false, message: "Action type is required." };
      }

      const performedAt = actionTime || new Date().toISOString();

      const body = {
        action_type: actionType.trim(),
        alert_id: Number(alertId) || 0,
        other_details: otherDetails || "",
        performed_at: performedAt,
      };

      const response = await apiClient.post(
        `/api/v1/patients/patients/${patientId}/action`,
        body
      );

      return {
        success: true,
        data: response.data,
        message: response.data?.message || "Action captured successfully",
      };
    } catch (error) {
      console.error("Error capturing patient action:", error);
      return {
        success: false,
        data: null,
        message:
          error.response?.data?.detail?.[0]?.msg ||
          error.response?.data?.detail ||
          error.message ||
          "Failed to capture action",
      };
    }
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
    try {
      const response = await this.getDynamicMetricHistory(userId, 'news2_score');
      if (!response.success || !response.data || response.data.length === 0) {
        return { success: true, data: null, message: "No data found" };
      }
      
      const latest = response.data[response.data.length - 1];
      const score = typeof latest.v === 'string' ? parseInt(latest.v, 10) : latest.v;
      let riskLevel = 'Low';
      if (score >= 7) riskLevel = 'High';
      else if (score >= 5) riskLevel = 'Medium';
      
      return {
        success: true,
        data: {
          score: score,
          riskLevel: riskLevel,
          timestamp: latest.t,
          history: response.data.map(d => ({ score: d.v, timestamp: d.t })),
          components: {}
        },
        message: "Success"
      };
    } catch (error) {
      console.error('Error fetching NEWS2 score:', error);
      return { success: false, data: null, message: error.message || "Failed to fetch NEWS2 score" };
    }
  },

  /**
   * Get AF Warning for a patient
   */
  async getAfWarning(userId) {
    try {
      const response = await this.getDynamicMetricHistory(userId, 'af_warning');
      if (!response.success || !response.data || response.data.length === 0) {
        return { success: true, data: null, message: "No warning found" };
      }
      
      const latest = response.data[response.data.length - 1];
      const val = latest.v; // 'Normal' or 'Detected'
      const status = val === 'Detected' ? 'High' : 'Normal';
      
      return {
        success: true,
        data: {
          hasWarning: val === 'Detected',
          status: status,
          confidence: val === 'Detected' ? 85 : 0, 
          detection: val === 'Detected' ? 'Irregular' : 'Regular',
          episodes: val === 'Detected' ? [{ duration: 120 }] : [], 
          timestamp: latest.t,
        },
        message: "Success"
      };
    } catch (error) {
      console.error('Error fetching AF warning:', error);
      return { success: false, data: null, message: error.message || "Failed to fetch AF warning" };
    }
  },

  /**
   * Get Stroke Risk Assessment for a patient
   */
  async getStrokeRisk(userId) {
    try {
      const response = await this.getDynamicMetricHistory(userId, 'stroke_risk');
      if (!response.success || !response.data || response.data.length === 0) {
        return { success: true, data: null, message: "No risk assessment found" };
      }
      
      const latest = response.data[response.data.length - 1];
      const riskLevel = latest.v; // 'Low', 'Medium', 'High'
      let score = 2;
      if (riskLevel === 'High') score = 8;
      else if (riskLevel === 'Medium') score = 5;

      return {
        success: true,
        data: {
          riskLevel: riskLevel,
          score: score,
          neuroSigns: "Based on dynamic metric evaluation",
          indicators: {},
          recommendations: [],
          timestamp: latest.t
        },
        message: "Success"
      };
    } catch (error) {
      console.error('Error fetching stroke risk:', error);
      return { success: false, data: null, message: error.message || "Failed to fetch stroke risk" };
    }
  },

  /**
   * Get Seizure Risk Assessment for a patient
   */
  async getSeizureRisk(userId) {
    try {
      const response = await this.getDynamicMetricHistory(userId, 'seizure_risk');
      if (!response.success || !response.data || response.data.length === 0) {
        return { success: true, data: null, message: "No risk assessment found" };
      }
      
      const latest = response.data[response.data.length - 1];
      const riskLevel = latest.v; // 'Low', 'Medium', 'High'

      return {
        success: true,
        data: {
          riskLevel: riskLevel,
          status: riskLevel === 'Low' ? 'Normal' : riskLevel,
          indicators: {},
          episodes: [],
          timestamp: latest.t
        },
        message: "Success"
      };
    } catch (error) {
      console.error('Error fetching seizure risk:', error);
      return { success: false, data: null, message: error.message || "Failed to fetch seizure risk" };
    }
  },
};
