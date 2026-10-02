import React from "react";

// Measurement schedule for 4G watches — shared by the admin defaults and the per-patient
// override. Intervals are minutes; null = that vital's auto-measurement is off.
//   deviceType  the linked watch's capabilities (GET /devices/types): adds an "On this watch"
//               column showing what each vital will actually do there
//   types       every watch type: shows that summary per type (for defaults)

import { VITAL_ROWS, PRESETS, formatInterval, vitalPlan } from "./schedule";

const TONE = { ok: "text-white/70", warn: "text-[#FFBB33]", muted: "text-white/35" };

function TypesSummary({ value, types }) {
  return (
    <div className="rounded-xl border border-white/5 overflow-x-auto w-0 min-w-full">
      <table className="w-full text-xs">
        <thead className="bg-white/[0.03] text-white/45">
          <tr>
            <th className="text-left font-medium px-3 py-2">What each watch type will do</th>
            {types.map((t) => <th key={t.key} className="text-left font-medium px-3 py-2 whitespace-nowrap">{t.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {VITAL_ROWS.map((row) => (
            <tr key={row.field} className="border-t border-white/5">
              <td className="px-3 py-1.5 text-white/70 whitespace-nowrap">{row.label}</td>
              {types.map((t) => {
                const p = vitalPlan(t, row.vital, value?.[row.field]);
                const short = { native: formatInterval(p.interval), requested: `${formatInterval(p.interval)} (server)`,
                  clamped: `${formatInterval(p.interval)} (minimum)`, off: "Off", unavailable: "Not available" }[p.mode];
                return <td key={t.key} className={`px-3 py-1.5 whitespace-nowrap ${TONE[p.tone]}`} title={p.text}>{short}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MonitoringScheduleForm({ value, onChange, disabled = false, deviceType = null, types = null }) {
  const set = (field, v) => onChange({ ...value, [field]: v });
  const inputCls =
    "px-2.5 py-1.5 bg-[#252528] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#CCA166]/60 disabled:opacity-50";

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-white/45 text-xs">
            <tr>
              <th className="text-left font-medium px-3 py-2">Vital</th>
              <th className="text-left font-medium px-3 py-2">Measure</th>
              <th className="text-left font-medium px-3 py-2">Interval</th>
              {deviceType && <th className="text-left font-medium px-3 py-2">On this watch</th>}
            </tr>
          </thead>
          <tbody>
            {VITAL_ROWS.map((row) => {
              const v = value?.[row.field];
              const on = v != null;
              const isPreset = PRESETS.includes(v);
              return (
                <tr key={row.field} className="border-t border-white/5">
                  <td className="px-3 py-2 text-white/85">
                    {row.label}
                    {row.hint && (!deviceType || deviceType.key === "veepoo_4g") && (
                      <div className="text-[11px] text-white/35">{row.hint}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={disabled}
                        onChange={(e) => set(row.field, e.target.checked ? 30 : null)}
                        className="accent-[#CCA166] size-4"
                      />
                      <span className="text-white/60 text-xs">{on ? "On" : "Off"}</span>
                    </label>
                  </td>
                  <td className="px-3 py-2">
                    {on ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={isPreset ? v : "custom"}
                          disabled={disabled}
                          onChange={(e) => set(row.field, e.target.value === "custom" ? v : Number(e.target.value))}
                          className={inputCls}
                          aria-label={`${row.label} interval`}
                        >
                          {PRESETS.map((m) => <option key={m} value={m}>{formatInterval(m)}</option>)}
                          <option value="custom">Custom…</option>
                        </select>
                        {!isPreset && (
                          <input
                            type="number" min={1} max={1440} value={v} disabled={disabled}
                            onChange={(e) => set(row.field, e.target.value === "" ? 1 : Number(e.target.value))}
                            className={`${inputCls} w-20`} aria-label={`${row.label} minutes`}
                          />
                        )}
                        {!isPreset && <span className="text-xs text-white/40">min</span>}
                      </div>
                    ) : (
                      <span className="text-white/30 text-xs">—</span>
                    )}
                  </td>
                  {deviceType && (() => {
                    const p = vitalPlan(deviceType, row.vital, v);
                    return <td className={`px-3 py-2 text-xs ${TONE[p.tone]}`}>{p.text}</td>;
                  })()}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className={`flex flex-col gap-1 text-xs text-white/55 ${deviceType && !deviceType.upload_interval ? "hidden" : ""}`}>
          Upload to server every
          <div className="flex items-center gap-2">
            <input
              type="number" min={1} max={255} disabled={disabled}
              value={value?.upload_interval_min ?? 5}
              onChange={(e) => set("upload_interval_min", Number(e.target.value) || 1)}
              className={`${inputCls} w-24`}
            />
            <span className="text-white/40">min (1–255)</span>
          </div>
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/55">
          Active from (optional)
          <input
            type="time" disabled={disabled} value={value?.window_start || ""}
            onChange={(e) => set("window_start", e.target.value || null)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/55">
          Active until (optional)
          <input
            type="time" disabled={disabled} value={value?.window_end || ""}
            onChange={(e) => set("window_end", e.target.value || null)}
            className={inputCls}
          />
        </label>
      </div>
      {types && types.length > 0 && <TypesSummary value={value} types={types} />}
      <p className="text-[11px] text-white/35">
        Shorter intervals use more battery. Each watch rounds intervals up to its own minimum (BPW8: 10 min);
        where it can't measure that often by itself, the server asks it to measure instead. Veepoo watches
        summarise data in 5-minute blocks, so intervals under 5 minutes don't add detail there.
        Leave the active window empty to measure all day.
        {deviceType?.window_note ? ` ${deviceType.window_note}` : ""}
      </p>
    </div>
  );
}
