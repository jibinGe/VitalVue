import React from "react";

// Measurement schedule for Veepoo 4G watches — shared by the admin default and the
// per-patient override. Intervals are minutes; null = that vital's auto-measurement is off.

import { VITAL_ROWS, PRESETS, formatInterval } from "./schedule";

export default function MonitoringScheduleForm({ value, onChange, disabled = false }) {
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
                    {row.hint && <div className="text-[11px] text-white/35">{row.hint}</div>}
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-xs text-white/55">
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
      <p className="text-[11px] text-white/35">
        The watch summarises data in 5-minute blocks, so intervals under 5 minutes don't add detail.
        Intervals are rounded up to the watch's own minimum step. Shorter intervals use more battery.
        Leave the active window empty to measure all day.
      </p>
    </div>
  );
}
