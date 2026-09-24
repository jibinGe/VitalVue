import React, { useEffect, useState } from "react";
import { patientService } from "@/services/patientService";

// Baseline Engine v1 (shadow mode) — read-only view of the patient's personal baseline.
// Alerts do not use these values yet.

const REFRESH_MS = 60000;
const VITAL_ORDER = ["hr", "spo2", "sbp", "dbp", "map", "hrv", "stress"];

const STATUS_STYLE = {
  "Normal": { color: "#2CD155", bg: "rgba(44,209,85,0.10)" },
  "Mild deviation": { color: "#FFBB33", bg: "rgba(255,187,51,0.12)" },
  "Moderate deviation": { color: "#FF8C42", bg: "rgba(255,140,66,0.12)" },
  "Severe deviation": { color: "#E54D4D", bg: "rgba(229,77,77,0.12)" },
  "Critical": { color: "#E54D4D", bg: "rgba(229,77,77,0.20)" },
  "Unknown": { color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.05)" },
};

const MODE_LABEL = { population: "Learning", personal: "Personal baseline", adaptive: "Adaptive baseline" };

function trendArrow(vpo) {
  if (vpo.trend === "Unknown" || vpo.rate == null) return "";
  if (vpo.trend === "Stable") return "→";
  if (vpo.trend === "Oscillating") return "↕";
  return vpo.rate > 0 ? "↑" : "↓";
}

function formatRange({ low, high } = {}) {
  if (low != null && high != null) return `${low}–${high}`;
  if (low != null) return `≥ ${low}`;
  if (high != null) return `≤ ${high}`;
  return "—";
}

function formatTime(iso) {
  if (!iso) return "--";
  // Backend timestamps are naive UTC.
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function VitalTile({ vpo }) {
  const style = STATUS_STYLE[vpo.status] || STATUS_STYLE.Unknown;
  const hasBaseline = vpo.baseline != null;
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-white/60">{vpo.label}</span>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
          style={{ color: style.color, background: style.bg }}
        >
          {vpo.status}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold text-white">{vpo.current}</span>
        <span className="text-xs text-white/40">{vpo.unit}</span>
        {vpo.percentDeviation != null && (
          <span className="ml-auto text-xs font-medium" style={{ color: style.color }}>
            {vpo.percentDeviation > 0 ? "+" : ""}{vpo.percentDeviation}%
          </span>
        )}
      </div>
      <div className="text-xs text-white/50 flex justify-between gap-2">
        <span>
          {hasBaseline ? `Baseline ${vpo.baseline}` : `Population ${formatRange(vpo.populationRange)}`}
        </span>
        <span title={vpo.rate != null ? `${vpo.rate} ${vpo.unit}/min` : ""}>
          {trendArrow(vpo)} {vpo.trend}
        </span>
      </div>
      {hasBaseline && (
        <div className="text-[11px] text-white/35">
          Confidence {Math.round((vpo.confidence || 0) * 100)}%
          {vpo.persistence > 1 ? ` · abnormal for ${vpo.persistence} windows` : ""}
        </div>
      )}
    </div>
  );
}

export default function BaselinePanel({ patientId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!patientId) return undefined;
    let cancelled = false;
    const load = async () => {
      const res = await patientService.getPatientBaseline(patientId);
      if (!cancelled && res.success) setData(res.data);
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [patientId]);

  if (!data) return null;

  const vitals = VITAL_ORDER.map((k) => data.vpo?.[k]).filter(Boolean);
  const learning = data.mode === "population" || !data.mode;
  const { stable = 0, required = 12 } = data.learning || {};

  return (
    <div className="mt-6 rounded-[20px] bg-[#2f2f31] p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg md:text-xl text-white">Personal Baseline</h3>
          <p className="text-xs text-white/40">
            Preview only. Alerts still use the standard thresholds.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/60">
          <span className="px-3 py-1 rounded-full border border-[#CCA166]/40 text-[#E5C48B]">
            {learning ? `Learning ${Math.min(stable, required)}/${required}` : MODE_LABEL[data.mode]}
            {!learning && data.version ? ` v${data.version}` : ""}
          </span>
          {data.window_start && <span>Updated {formatTime(data.window_start)}</span>}
        </div>
      </div>

      {vitals.length === 0 ? (
        <p className="text-sm text-white/40">
          No baseline data yet. A reading is summarised every 10 minutes while the band is connected;
          the personal baseline is ready after {required} clean readings (about 2 hours).
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {vitals.map((vpo) => (
            <VitalTile key={vpo.label} vpo={vpo} />
          ))}
        </div>
      )}
    </div>
  );
}
