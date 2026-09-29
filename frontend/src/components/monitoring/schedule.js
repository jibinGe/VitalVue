// Shared helpers for 4G watch measurement schedules.

export const VITAL_ROWS = [
  { field: "hr_interval_min", label: "Heart rate" },
  { field: "spo2_interval_min", label: "SpO₂" },
  { field: "bp_interval_min", label: "Blood pressure", hint: "One reading per 5-minute block at most" },
  { field: "temp_interval_min", label: "Skin temperature" },
  { field: "hrv_interval_min", label: "HRV" },
  { field: "stress_interval_min", label: "Stress" },
];
export const PRESETS = [5, 10, 15, 30, 60, 120, 240];

export function formatInterval(min) {
  if (min == null) return "Off";
  if (min < 60) return `Every ${min} min`;
  const h = min / 60;
  return `Every ${Number.isInteger(h) ? h : h.toFixed(1)} h`;
}

export function scheduleSummary(schedule) {
  if (!schedule) return "";
  return VITAL_ROWS.map((r) => `${r.label}: ${formatInterval(schedule[r.field]).toLowerCase()}`).join(" · ");
}
