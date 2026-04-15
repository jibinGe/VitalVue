import { create } from 'zustand';

export const useDashboardStore = create((set) => ({
  // Critical Alarm State
  criticalAlarmData: null,
  setCriticalAlarmData: (data) => set({ criticalAlarmData: data }),
  clearCriticalAlarm: () => set({ criticalAlarmData: null }),

  // Dashboard Filters
  triageFilter: 'All',
  setTriageFilter: (filter) => set({ triageFilter: filter }),

  // Active Patient for overview context
  selectedUserId: null,
  setSelectedUserId: (id) => set({ selectedUserId: id }),
  selectedUserName: null,
  setSelectedUserName: (name) => set({ selectedUserName: name }),

  // Live Vitals Cache (keyed by patientId)
  liveVitals: {},
  updateLiveVitals: (patientId, vitals) => set((state) => ({
    liveVitals: {
      ...state.liveVitals,
      [patientId]: { ...(state.liveVitals[patientId] || {}), ...vitals }
    }
  })),
}));
