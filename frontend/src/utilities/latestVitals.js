// The latest *measured* value of each vital, from rows ordered oldest → newest.
//
// 4G watches send one vital per message, so the newest row usually carries only one vital
// (the others are 0 or null = not measured). Showing that row as "current vitals" would display
// HR 0 or BP 0/0. Each vital is taken from the newest connected, worn row that measured it.
// Mirrors backend app/services/latest_vitals.py.

const measured = (v) => v !== null && v !== undefined && Number(v) > 0;

export function latestMeasured(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const newest = rows[rows.length - 1];
  if (newest?.is_removed === true || newest?.is_connected === false) return newest;   // shown as it is
  const live = rows.filter((r) => r && r.is_removed !== true && r.is_connected !== false);
  const pick = (...keys) => {
    for (let i = live.length - 1; i >= 0; i -= 1) {
      for (const k of keys) if (measured(live[i][k])) return live[i][k];
    }
    return undefined;
  };
  const out = { ...newest };
  const hr = pick("heart_rate");
  const spo2 = pick("spo2");
  const temp = pick("temp", "temperature");
  const hrv = pick("hrv_score", "hrv");
  if (hr !== undefined) out.heart_rate = hr;
  if (spo2 !== undefined) out.spo2 = spo2;
  if (temp !== undefined) { out.temp = temp; out.temperature = temp; }
  if (hrv !== undefined) { out.hrv_score = hrv; out.hrv = hrv; }
  for (let i = live.length - 1; i >= 0; i -= 1) {
    const sys = live[i].bp_systolic ?? live[i].systolic;
    const dia = live[i].bp_diastolic ?? live[i].diastolic;
    if (measured(sys) && measured(dia)) {
      out.bp_systolic = sys;
      out.systolic = sys;
      out.bp_diastolic = dia;
      out.diastolic = dia;
      break;
    }
  }
  return out;
}
