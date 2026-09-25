import React, { useEffect, useState } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ReferenceArea, ReferenceLine, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { patientService } from "@/services/patientService";
import Modal from "@/components/ui/modal";

// Baseline Engine v1 (shadow mode) — per-vital detail modal, opened from the Baseline tab.
// Alerts do not use these values yet.


// Single data line per chart; the baseline is dashed + neutral so it never relies on colour alone.
const LINE_COLOR = "#E5C48B";
const BASELINE_COLOR = "rgba(255,255,255,0.55)";
const BAND_FILL = "rgba(143,163,191,0.14)";
const GRID_COLOR = "rgba(255,255,255,0.06)";
const AXIS_TEXT = { fill: "rgba(255,255,255,0.45)", fontSize: 11 };

const STATUS_STYLE = {
  "Normal": { color: "#2CD155", bg: "rgba(44,209,85,0.10)" },
  "Mild deviation": { color: "#FFBB33", bg: "rgba(255,187,51,0.12)" },
  "Moderate deviation": { color: "#FF8C42", bg: "rgba(255,140,66,0.12)" },
  "Severe deviation": { color: "#E54D4D", bg: "rgba(229,77,77,0.12)" },
  "Critical": { color: "#E54D4D", bg: "rgba(229,77,77,0.20)" },
  "Unknown": { color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.05)" },
};

const MODE_LABEL = { population: "Learning", personal: "Personal baseline", adaptive: "Adaptive baseline" };

const REJECT_LABEL = {
  poor_signal: "poor signal",
  stuck_sensor: "stuck sensor",
  motion: "patient moving",
  alert_active: "alert active",
  deterioration: "deteriorating",
};

function toDate(iso) {
  // Backend timestamps are naive UTC.
  return new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
}

function formatTime(iso) {
  if (!iso) return "--";
  return toDate(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

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

// Filled dot = used for the baseline; hollow dot = kept out (reason in the tooltip).
function ObservationDot({ cx, cy, payload, index, points }) {
  if (cx == null || cy == null || payload?.value == null) return null;
  const isLatest = index === (points?.length ?? 0) - 1;
  const r = isLatest ? 5 : 3.5;
  return payload.is_stable ? (
    <circle cx={cx} cy={cy} r={r} fill={LINE_COLOR} stroke="#2f2f31" strokeWidth={2} />
  ) : (
    <circle cx={cx} cy={cy} r={r} fill="#2f2f31" stroke={LINE_COLOR} strokeWidth={1.5} />
  );
}

function ChartTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (p.value == null) return null;
  const start = toDate(p.window_start);
  const end = new Date(start.getTime() + 10 * 60000);
  const fmt = (d) => d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const style = STATUS_STYLE[p.status] || STATUS_STYLE.Unknown;
  return (
    <div className="rounded-lg bg-[#1C1C1F] border border-white/10 px-3 py-2 text-xs shadow-xl">
      <div className="text-white/50 mb-1">{fmt(start)}–{fmt(end)}</div>
      <div className="text-white font-semibold text-sm">{p.value} <span className="text-white/50 font-normal">{unit}</span></div>
      {p.status && (
        <div className="mt-1 flex items-center gap-1.5 text-white/70">
          <span className="inline-block size-2 rounded-full" style={{ background: style.color }} />
          {p.status}
        </div>
      )}
      <div className="mt-1 text-white/45">
        {p.is_stable ? "Used for baseline" : `Kept out of baseline: ${REJECT_LABEL[p.reject_reason] || p.reject_reason}`}
      </div>
    </div>
  );
}

function VitalChart({ vital, vpo, observations, band, heightClass = "h-36" }) {
  const data = observations.map((o) => ({
    window_start: o.window_start,
    time: formatTime(o.window_start),
    value: o[vital] != null ? Math.round(o[vital] * 10) / 10 : null,
    status: o.status?.[vital],
    is_stable: o.is_stable,
    reject_reason: o.reject_reason,
  }));

  // Y range: the data plus the band / baseline, padded so marks never touch the edges.
  const values = data.map((d) => d.value).filter((v) => v != null);
  const refs = [band?.low, band?.high, vpo.baseline].filter((v) => v != null);
  const all = values.concat(refs);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = Math.max((hi - lo) * 0.15, 1);
  const domain = [Math.floor(lo - pad), Math.ceil(hi + pad)];
  const bandLow = band?.low ?? domain[0];
  const bandHigh = band?.high ?? domain[1];

  return (
    <div className={`${heightClass} -mx-1`} role="img" aria-label={`${vpo.label} over the last ${data.length} ten-minute windows`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={GRID_COLOR} vertical={false} />
          {(band?.low != null || band?.high != null) && (
            <ReferenceArea y1={bandLow} y2={bandHigh} fill={BAND_FILL} stroke="none" ifOverflow="hidden" />
          )}
          {vpo.baseline != null && (
            <ReferenceLine y={vpo.baseline} stroke={BASELINE_COLOR} strokeDasharray="4 4" strokeWidth={1.5} />
          )}
          <XAxis dataKey="time" tick={AXIS_TEXT} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
          <YAxis domain={domain} tick={AXIS_TEXT} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
          <Tooltip
            content={<ChartTooltip unit={vpo.unit} />}
            cursor={{ stroke: "rgba(255,255,255,0.25)", strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={LINE_COLOR}
            strokeWidth={2}
            connectNulls={false}
            isAnimationActive={false}
            dot={(props) => <ObservationDot key={props.index} {...props} points={data} />}
            activeDot={{ r: 6, fill: LINE_COLOR, stroke: "#2f2f31", strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartKey({ learning }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-white/50 mb-4">
      <span className="flex items-center gap-1.5">
        <svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke={LINE_COLOR} strokeWidth="2" /></svg>
        10-minute median
      </span>
      {!learning && (
        <span className="flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke={BASELINE_COLOR} strokeWidth="1.5" strokeDasharray="4 4" /></svg>
          Personal baseline
        </span>
      )}
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-4 h-2.5 rounded-sm" style={{ background: BAND_FILL, outline: "1px solid rgba(143,163,191,0.3)" }} />
        {learning ? "Population range" : "Usual range"}
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="3.5" fill={LINE_COLOR} /></svg>
        Used for baseline
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="3.5" fill="#2f2f31" stroke={LINE_COLOR} strokeWidth="1.5" /></svg>
        Kept out (hover for reason)
      </span>
    </div>
  );
}

// ── Detail modal ────────────────────────────────────────────────────────────────

const RANGES = [
  { label: "6 h", limit: 36 },
  { label: "12 h", limit: 72 },
  { label: "24 h", limit: 144 },
];

function fmt(value, digits = 1) {
  return value == null ? "—" : Number(value).toFixed(digits).replace(/\.0+$/, "");
}

function Stat({ label, value, hint }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2.5">
      <div className="text-[11px] text-white/45 mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-white">{value}</div>
      {hint && <div className="text-[11px] text-white/35 mt-0.5">{hint}</div>}
    </div>
  );
}

export function BaselineDetailModal({ patientId, vital, initial, onClose }) {
  const [range, setRange] = useState(RANGES[0]);
  const [data, setData] = useState(initial);

  useEffect(() => {
    if (!vital || range.limit === RANGES[0].limit) return undefined;
    let cancelled = false;
    patientService.getPatientBaseline(patientId, { limit: range.limit }).then((res) => {
      if (!cancelled && res.success) setData(res.data);
    });
    return () => { cancelled = true; };
  }, [patientId, vital, range]);

  const source = range.limit === RANGES[0].limit ? initial : data;
  const vpo = vital ? source?.vpo?.[vital] : null;
  const stats = vital ? source?.baseline?.[vital] : null;
  const band = vital ? source?.bands?.[vital] : null;
  const observations = source?.observations || [];
  const learning = source?.mode === "population" || !source?.mode;
  const style = STATUS_STYLE[vpo?.status] || STATUS_STYLE.Unknown;
  const unit = vpo?.unit || "";
  const withUnit = (v) => (v === "—" ? v : `${v} ${unit}`.trim());
  const usedCount = observations.filter((o) => o.is_stable && o[vital] != null).length;
  const shownCount = observations.filter((o) => o[vital] != null).length;

  return (
    <Modal
      modalCondition={Boolean(vital && vpo)}
      onClick={onClose}
      title={vpo ? `${vpo.label}: baseline details` : ""}
      des={learning
        ? `Learning ${Math.min(source?.learning?.stable || 0, source?.learning?.required || 12)}/${source?.learning?.required || 12}: compared with the population range until the personal baseline is ready`
        : `${MODE_LABEL[source?.mode]} v${source?.version} · preview only, alerts still use the standard thresholds`}
      innerClass="max-w-4xl"
    >
      {vpo && (
        <div className="flex flex-col gap-5">
          {/* Headline + range switch */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-white">{vpo.current}</span>
              <span className="text-sm text-white/45">{unit}</span>
              {vpo.percentDeviation != null && (
                <span className="text-sm text-white/70">
                  {vpo.percentDeviation > 0 ? "+" : ""}{vpo.percentDeviation}% vs baseline
                </span>
              )}
              <span
                className="ml-2 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                style={{ color: style.color, background: style.bg }}
              >
                <span className="inline-block size-1.5 rounded-full" style={{ background: style.color }} />
                {vpo.status}
              </span>
            </div>
            <div className="flex rounded-xl border border-white/10 p-0.5" role="group" aria-label="Time range">
              {RANGES.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    range.label === r.label ? "bg-[#CCA166] text-[#1A1A1C] font-semibold" : "text-white/60 hover:text-white"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <ChartKey learning={learning} />
          <VitalChart vital={vital} vpo={vpo} observations={observations} band={band} heightClass="h-72" />

          {/* The numbers behind the status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <Stat
              label={learning ? "Population range" : "Personal baseline"}
              value={learning ? withUnit(formatRange(vpo.populationRange)) : withUnit(fmt(vpo.baseline))}
              hint={learning ? "Personal baseline not ready yet" : "median of accepted windows"}
            />
            <Stat
              label="Usual range"
              value={band?.low != null || band?.high != null ? withUnit(formatRange({ low: band.low, high: band.high })) : "—"}
              hint={learning ? "population normal" : "baseline ± 2 × spread"}
            />
            <Stat
              label="Change from baseline"
              value={vpo.delta != null ? withUnit(`${vpo.delta > 0 ? "+" : ""}${fmt(vpo.delta)}`) : "—"}
              hint={vpo.percentDeviation != null ? `${vpo.percentDeviation > 0 ? "+" : ""}${vpo.percentDeviation}%` : null}
            />
            <Stat label="Robust z-score" value={fmt(vpo.robustZ, 2)} hint="drives the status" />
            <Stat
              label="Variability (MAD / SD)"
              value={stats ? `${fmt(stats.mad)} / ${fmt(stats.sd)}` : "—"}
              hint={vpo.variability?.level ? `${vpo.variability.level} variability` : null}
            />
            <Stat
              label="Trend"
              value={`${trendArrow(vpo)} ${vpo.trend}`}
              hint={vpo.rate != null ? `${vpo.rate > 0 ? "+" : ""}${fmt(vpo.rate * 10)} ${unit} per 10 min` : null}
            />
            <Stat
              label="Abnormal for"
              value={vpo.persistence ? `${vpo.persistence} window${vpo.persistence > 1 ? "s" : ""}` : "—"}
              hint={vpo.persistence ? `about ${vpo.persistence * 10} min` : "currently normal"}
            />
            <Stat
              label="Confidence"
              value={`${Math.round((vpo.confidence || 0) * 100)}%`}
              hint={stats ? `based on ${stats.n} windows` : `${source?.learning?.stable || 0} of ${source?.learning?.required || 12} windows so far`}
            />
          </div>

          {/* Window-by-window table (also the non-graph view of the same data) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm text-white/80">10-minute windows</h5>
              <span className="text-[11px] text-white/40">{usedCount} of {shownCount} used for the baseline</span>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-white/5">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#222225] text-white/45">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">Window</th>
                    <th className="text-right font-medium px-3 py-2">{vpo.label} ({unit})</th>
                    <th className="text-left font-medium px-3 py-2">Status</th>
                    <th className="text-left font-medium px-3 py-2">Baseline</th>
                  </tr>
                </thead>
                <tbody>
                  {[...observations].reverse().filter((o) => o[vital] != null).map((o) => {
                    const st = STATUS_STYLE[o.status?.[vital]] || STATUS_STYLE.Unknown;
                    const start = toDate(o.window_start);
                    const end = new Date(start.getTime() + 10 * 60000);
                    const t = (d) => d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
                    return (
                      <tr key={o.window_start} className="border-t border-white/5 text-white/75">
                        <td className="px-3 py-1.5 whitespace-nowrap">{t(start)}–{t(end)}</td>
                        <td className="px-3 py-1.5 text-right font-medium text-white">{fmt(o[vital])}</td>
                        <td className="px-3 py-1.5">
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block size-1.5 rounded-full" style={{ background: st.color }} />
                            {o.status?.[vital] || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-white/55">
                          {o.is_stable ? "Used" : `Kept out: ${REJECT_LABEL[o.reject_reason] || o.reject_reason}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
