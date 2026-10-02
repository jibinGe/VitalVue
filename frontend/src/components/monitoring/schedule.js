// Shared helpers for 4G watch measurement schedules.

export const VITAL_ROWS = [
  { field: "hr_interval_min", vital: "hr", label: "Heart rate" },
  { field: "spo2_interval_min", vital: "spo2", label: "SpO₂" },
  { field: "bp_interval_min", vital: "bp", label: "Blood pressure", hint: "Veepoo: one reading per 5-minute block at most" },
  { field: "temp_interval_min", vital: "temp", label: "Skin temperature" },
  { field: "hrv_interval_min", vital: "hrv", label: "HRV" },
  { field: "stress_interval_min", vital: "stress", label: "Stress" },
];
export const PRESETS = [5, 10, 15, 30, 60, 120, 240];
export const VITAL_LABEL = Object.fromEntries(VITAL_ROWS.map((r) => [r.vital, r.label]));

// Vitals the device-gateway may poll with "measure now" when the watch can't schedule them
// itself. Must match REQUESTED_ALLOWED in backend app/devices/schedule.py.
const REQUESTED_ALLOWED = ["hr", "spo2", "temp", "hrv"];

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

/**
 * What one watch type will actually do for one vital of a schedule (same rules as the
 * backend's plan_for): { mode, interval, text, tone }.
 *   mode: native | requested | clamped | off | unavailable
 */
export function vitalPlan(deviceType, vital, interval) {
  if (interval == null) return { mode: "off", text: "Off", tone: "muted" };
  const lim = deviceType?.vitals?.[vital];
  if (!lim) return { mode: "native", interval, text: formatInterval(interval), tone: "ok" };
  if (lim.native && interval >= lim.min_interval) {
    return { mode: "native", interval, text: `${formatInterval(interval)}, by the watch`, tone: "ok" };
  }
  if (lim.requestable && REQUESTED_ALLOWED.includes(vital)) {
    return {
      mode: "requested", interval, tone: "warn",
      text: `${formatInterval(interval)}, requested by the server (only while connected and worn; uses more battery)`,
    };
  }
  if (lim.native) {
    return {
      mode: "clamped", interval: lim.min_interval, tone: "warn",
      text: `${formatInterval(lim.min_interval)}: this watch's minimum`,
    };
  }
  return { mode: "unavailable", text: "Not available on this watch", tone: "muted" };
}
