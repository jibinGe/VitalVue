import { create } from 'zustand';

export const useDashboardStore = create((set) => ({
  // Critical Alarm State
  criticalAlarms: [],
  acknowledgedAlerts: {}, // { patientId: timestamp }
  
  addCriticalAlarm: (data) => set((state) => {
    const exists = state.criticalAlarms.some(a => {
      const aId = a.alert?.id || a.alert?.alert_id;
      const bId = data.alert?.id || data.alert?.alert_id;
      if (aId && bId && aId === bId) return true;
      if (a.userId === data.userId && a.alert?.vital_type === data.alert?.vital_type) return true;
      return false;
    });
    if (exists) return state;
    return { criticalAlarms: [...state.criticalAlarms, data] };
  }),
  
  removeCriticalAlarm: (alertId) => set((state) => {
    const alarmToRemove = state.criticalAlarms.find(a => (a.alert?.id || a.alert?.alert_id) === alertId);
    if (alarmToRemove && alarmToRemove.userId) {
      return {
        criticalAlarms: state.criticalAlarms.filter(a => (a.alert?.id || a.alert?.alert_id) !== alertId),
        acknowledgedAlerts: {
          ...state.acknowledgedAlerts,
          [alarmToRemove.userId]: Date.now()
        }
      };
    }
    return {
      criticalAlarms: state.criticalAlarms.filter(a => (a.alert?.id || a.alert?.alert_id) !== alertId)
    };
  }),

  clearCriticalAlarms: () => set((state) => {
    const newAck = { ...state.acknowledgedAlerts };
    state.criticalAlarms.forEach(a => {
      if (a.userId) newAck[a.userId] = Date.now();
    });
    return { criticalAlarms: [], acknowledgedAlerts: newAck };
  }),

  // Cross-device dismiss: close the modal WITHOUT stamping a cooldown.
  removeCriticalAlarmSilent: (alertId) => set((state) => ({
    criticalAlarms: state.criticalAlarms.filter(a => (a.alert?.id || a.alert?.alert_id) !== alertId)
  })),

  canShowAlarm: (patientId, severity) => {
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

  // Live Patient Status Cache (keyed by patientId)
  liveStatuses: {},
  updateLiveStatus: (patientId, status) => set((state) => ({
    liveStatuses: {
      ...state.liveStatuses,
      [patientId]: status
    }
  })),

  // Reset function to clear state on logout
  reset: () => set({
    criticalAlarms: [],
    acknowledgedAlerts: {},
    triageFilter: 'All',
    selectedUserId: null,
    selectedUserName: null,
    searchQuery: "",
    liveVitals: {},
    liveStatuses: {}
  }),
}));
