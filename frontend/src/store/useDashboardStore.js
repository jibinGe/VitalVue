import { create } from 'zustand';

export const useDashboardStore = create((set) => ({
  // Critical Alarm State
  criticalAlarmData: null,
  acknowledgedAlerts: {}, // { patientId: timestamp }
  
  setCriticalAlarmData: (data) => set({ criticalAlarmData: data }),
  
  clearCriticalAlarm: () => set((state) => {
    if (state.criticalAlarmData?.userId) {
      return {
        criticalAlarmData: null,
        acknowledgedAlerts: {
          ...state.acknowledgedAlerts,
          [state.criticalAlarmData.userId]: Date.now()
        }
      };
    }
    return { criticalAlarmData: null };
  }),

  // Cross-device dismiss: close the modal WITHOUT stamping a cooldown.
  // Device 2 didn't acknowledge anything — it was remotely dismissed,
  // so future alerts for this patient must NOT be suppressed by the cooldown.
  clearCriticalAlarmSilent: () => set({ criticalAlarmData: null }),

  canShowAlarm: (patientId, severity) => {
    // If we want different cooldowns for Warning vs Critical, we can check severity.
    // Let's enforce a 30-second cooldown for any new alert on a recently acknowledged patient
    const state = useDashboardStore.getState();
    const lastAck = state.acknowledgedAlerts[patientId];
    if (!lastAck) return true;
    
    // Cooldown: 30 seconds
    const cooldownMs = 30 * 1000;
    return (Date.now() - lastAck) > cooldownMs;
  },

  // Dashboard Filters
  triageFilter: 'All',
  setTriageFilter: (filter) => set({ triageFilter: filter }),

  // Active Patient for overview context
  selectedUserId: null,
  setSelectedUserId: (id) => set({ selectedUserId: id }),
  selectedUserName: null,
  setSelectedUserName: (name) => set({ selectedUserName: name }),

  // Global Search
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Live Vitals Cache (keyed by patientId)
  liveVitals: {},
  updateLiveVitals: (patientId, vitals) => set((state) => ({
    liveVitals: {
      ...state.liveVitals,
      [patientId]: { ...(state.liveVitals[patientId] || {}), ...vitals }
    }
  })),

  // Live Patient Status Cache (keyed by patientId) — pushed directly from SSE patient_status field
  liveStatuses: {},
  updateLiveStatus: (patientId, status) => set((state) => ({
    liveStatuses: {
      ...state.liveStatuses,
      [patientId]: status
    }
  })),
}));
