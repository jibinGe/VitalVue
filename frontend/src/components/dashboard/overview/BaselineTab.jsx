import React, { useEffect, useMemo, useState } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ReferenceArea, ReferenceLine, ReferenceDot,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { patientService } from "@/services/patientService";
import { BaselineDetailModal } from "@/components/dashboard/overview/BaselineDetailModal";

// Baseline tab (Baseline Engine v1, shadow mode): health score and vitals against the
// patient's personal baseline. Alerts do not use these values yet.

const REFRESH_MS = 60000;
const RANGES = [
  { key: "6h", label: "6 Hours" },
  { key: "12h", label: "12 Hours" },
  { key: "24h", label: "24 Hours" },
  { key: "3d", label: "3 Days" },
  { key: "7d", label: "7 Days" },
];

// Table / view rows. BP combines systolic + diastolic in one row.
const ROWS = [
  { key: "score", label: "Health Score" },
  { key: "hr", label: "HR", unit: "bpm" },
  { key: "hrv", label: "HRV", unit: "ms" },
  { key: "spo2", label: "SpO₂", unit: "%" },
  { key: "bp", label: "BP", unit: "mmHg" },
  { key: "map", label: "MAP", unit: "mmHg" },
  { key: "stress", label: "Stress" },
  { key: "temp", label: "Skin temp", unit: "°C" },
];
const VIEW_OPTIONS = [
  { key: "score", label: "Health Score" },
  { key: "hr", label: "Heart Rate" },
  { key: "spo2", label: "SpO₂" },
  { key: "sbp", label: "Systolic BP" },
  { key: "dbp", label: "Diastolic BP" },
  { key: "map", label: "MAP" },
  { key: "hrv", label: "HRV" },
  { key: "stress", label: "Stress" },
  { key: "temp", label: "Skin temp" },
];

// One data line; baseline dashed + neutral; markers red with a text callout (never colour alone).
const LINE_COLOR = "#E5C48B";
const BASELINE_COLOR = "rgba(255,255,255,0.55)";
const BAND_FILL = "rgba(143,163,191,0.14)";
const MARKER_COLOR = "#E54D4D";
const GRID_COLOR = "rgba(255,255,255,0.06)";
const AXIS_TEXT = { fill: "rgba(255,255,255,0.45)", fontSize: 11 };

const STATUS_STYLE = {
  "Normal": { color: "#2CD155", cell: "rgba(44,209,85,0.08)" },
  "Mild deviation": { color: "#FFBB33", cell: "rgba(255,187,51,0.14)" },
  "Moderate deviation": { color: "#FF8C42", cell: "rgba(255,140,66,0.18)" },
  "Severe deviation": { color: "#E54D4D", cell: "rgba(229,77,77,0.20)" },
  "Critical": { color: "#E54D4D", cell: "rgba(229,77,77,0.30)" },
};
const SCORE_BAND_STYLE = {
  "Within baseline": { color: "#2CD155", cell: "rgba(44,209,85,0.08)" },
  "Deviating": { color: "#FFBB33", cell: "rgba(255,187,51,0.14)" },
  "Significant change": { color: "#E54D4D", cell: "rgba(229,77,77,0.22)" },
};
const STATUS_RANK = { "Normal": 0, "Mild deviation": 1, "Moderate deviation": 2, "Severe deviation": 3, "Critical": 4 };
const REJECT_LABEL = {
  poor_signal: "poor signal", stuck_sensor: "stuck sensor", motion: "patient moving",
  alert_active: "alert active", deterioration: "deteriorating",
};
const MODE_LABEL = { population: "Learning", personal: "Personal baseline", adaptive: "Adaptive baseline" };

// ── helpers ─────────────────────────────────────────────────────────────────────

function toDate(iso) {
  // Backend timestamps are naive UTC.
  return new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
}

function fmtTime(iso, withDay) {
  const d = toDate(iso);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return withDay ? `${d.toLocaleDateString(undefined, { weekday: "short" })} ${time}` : time;
}

function round1(v) {
  return v == null ? null : Math.round(v * 10) / 10;
}

function scoreBand(score, t) {
  if (score == null || !t) return null;
  if (score >= t.within_baseline) return "Within baseline";
  return score >= t.significant ? "Deviating" : "Significant change";
}

function worseStatus(a, b) {
  return (STATUS_RANK[a] ?? -1) >= (STATUS_RANK[b] ?? -1) ? a : b;
}

function joinWords(words) {
  if (words.length <= 1) return words.join("");
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

// Row value + status for one point.
function cellFor(row, point, thresholds) {
  if (!point) return { text: "—" };
  if (row === "score") {
    return { text: point.score ?? "—", style: SCORE_BAND_STYLE[scoreBand(point.score, thresholds)] };
  }
  if (row === "bp") {
    const s = point.values.sbp, d = point.values.dbp;
    if (s == null || d == null) return { text: "—" };
    return { text: `${Math.round(s)}/${Math.round(d)}`, style: STATUS_STYLE[worseStatus(point.status.sbp, point.status.dbp)] };
  }
  const v = point.values[row];
  return { text: v == null ? "—" : round1(v), style: STATUS_STYLE[point.status[row]] };
}

function baselineCell(row, data) {
  const b = data.baseline || {};
  if (row === "score") return data.usual_score ?? "—";
  if (row === "bp") return b.sbp && b.dbp ? `${Math.round(b.sbp.median)}/${Math.round(b.dbp.median)}` : "—";
  return b[row] ? round1(b[row].median) : "—";
}

// Columns of the interval table: evenly spaced times across the range + always the latest point.
function tableColumns(data) {
  const points = data.points || [];
  if (!points.length) return [];
  const step = data.table_step_minutes * 60000;
  const start = toDate(data.start).getTime();
  const end = toDate(points[points.length - 1].t).getTime();
  const first = Math.ceil(start / step) * step;
  const cols = [];
  for (let ts = first; ts <= end; ts += step) {
    let best = null;
    for (const p of points) {
      const dt = Math.abs(toDate(p.t).getTime() - ts);
      if (dt <= step / 2 && (!best || dt < best.dt)) best = { p, dt };
    }
    cols.push({ ts, point: best?.p || null });
  }
  const latest = points[points.length - 1];
  if (!cols.length || cols[cols.length - 1].point !== latest) cols.push({ ts: toDate(latest.t).getTime(), point: latest });
  return cols;
}

// Rule-based insight sentences, built only from the numbers the backend returned.
function insightText(i, withDay) {
  switch (i.type) {
    case "learning":
      return `Personal baseline is still learning: ${Math.min(i.stable, i.required)} of ${i.required} clean 10-minute readings collected. Health scores appear once it is ready.`;
    case "no_data":
      return `No readings from the band in this period.`;
    case "drop": {
      const pct = (c) => (c.percentDeviation != null ? ` (${c.percentDeviation > 0 ? "+" : ""}${c.percentDeviation}%)` : "");
      const up = i.changes.filter((c) => c.direction === "up").map((c) => `${c.label}${pct(c)}`);
      const down = i.changes.filter((c) => c.direction === "down").map((c) => `${c.label}${pct(c)}`);
      const parts = [up.length ? `higher ${joinWords(up)}` : null, down.length ? `lower ${joinWords(down)}` : null].filter(Boolean);
      const because = parts.length ? ` due to ${parts.join(", and ")}` : "";
      const more = i.episodes > 1 ? ` There were ${i.episodes} drops in this period; the lowest is shown.` : "";
      return `Health score dropped to ${i.score} at ${fmtTime(i.t, withDay)}${because}.${more}`;
    }
    case "recovery":
      if (i.state === "recovered") return `It has since recovered to ${i.score}, within the usual range.`;
      if (i.state === "recovering") return `It has started to recover (${i.score} now). Keep monitoring.`;
      return `It is still low (${i.score} now).`;
    case "steady":
      return `Health score is ${i.score} (${i.band?.toLowerCase()}). No deterioration in this period.`;
    case "kept_out": {
      const reasons = Object.entries(i.counts).map(([r, n]) => `${n} ${REJECT_LABEL[r] || r}`);
      const n = Object.values(i.counts).reduce((a, b) => a + b, 0);
      return `${n} of ${i.total} readings were kept out of the baseline (${joinWords(reasons)}).`;
    }
    default:
      return null;
  }
}

// ── pieces ──────────────────────────────────────────────────────────────────────

function ScoreRing({ score, band }) {
  const r = 34, c = 2 * Math.PI * r;
  const style = SCORE_BAND_STYLE[band] || { color: "rgba(255,255,255,0.3)" };
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={score == null ? "No health score yet" : `Health score ${score} of 100`}>
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      <circle
        cx="44" cy="44" r={r} fill="none" stroke={style.color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 44 44)"
      />
      <text x="44" y="46" textAnchor="middle" className="fill-white" fontSize="22" fontWeight="600">{score ?? "—"}</text>
      <text x="44" y="61" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10">/100</text>
    </svg>
  );
}

function ChartTooltip({ active, payload, view, withDay, unit }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  if (p.value == null) return null;
  const status = view === "score" ? p.band : p.status;
  const style = (view === "score" ? SCORE_BAND_STYLE : STATUS_STYLE)[status];
  return (
    <div className="rounded-lg bg-[#1C1C1F] border border-white/10 px-3 py-2 text-xs shadow-xl">
      <div className="text-white/50 mb-1">{fmtTime(p.t, withDay)}</div>
      <div className="text-white font-semibold text-sm">{p.value} <span className="text-white/50 font-normal">{unit}</span></div>
      {p.baseline != null && <div className="text-white/50">{view === "score" ? "Usual score" : "Baseline"} {p.baseline}</div>}
      {status && (
        <div className="mt-1 flex items-center gap-1.5 text-white/75">
          <span className="inline-block size-2 rounded-full" style={{ background: style?.color }} />
          {status}
        </div>
      )}
      {p.windows > 1
        ? <div className="mt-1 text-white/45">{p.used} of {p.windows} readings used for baseline</div>
        : <div className="mt-1 text-white/45">{p.used ? "Used for baseline" : `Kept out: ${REJECT_LABEL[p.reject_reason] || p.reject_reason || "—"}`}</div>}
    </div>
  );
}

function MainChart({ data, view }) {
  const withDay = data.hours > 24;
  const isScore = view === "score";
  const unit = isScore ? "" : data.vitals?.[view]?.unit || "";
  const band = isScore ? null : data.bands?.[view];
  const thresholds = data.thresholds;

  const rawSeries = (data.points || []).map((p) => ({
    t: p.t,
    x: toDate(p.t).getTime(),
    value: isScore ? p.score : round1(p.values[view]),
    baseline: isScore ? data.usual_score : round1(p.baseline[view]),
    status: isScore ? null : p.status[view],
    band: isScore ? scoreBand(p.score, thresholds) : null,
    windows: p.windows,
    used: p.used,
    reject_reason: p.reject_reason,
  }));
  // Break the line across gaps (band off / no data) instead of drawing through them:
  // insert an empty point wherever more than 3 time steps are missing.
  const gapMs = 3 * (data.resolution_minutes || 10) * 60000;
  const series = [];
  rawSeries.forEach((pt, i) => {
    const prev = rawSeries[i - 1];
    if (prev && pt.x - prev.x > gapMs) {
      series.push({ t: null, x: prev.x + (pt.x - prev.x) / 2, value: null, baseline: null });
    }
    series.push(pt);
  });
  const markers = (data.markers || []).map((m) => {
    const pt = series.find((s) => s.t === m.t);
    return { ...m, x: toDate(m.t).getTime(), y: pt?.value ?? null };
  }).filter((m) => m.y != null);

  let domain = [0, 100];
  if (!isScore) {
    const nums = series.flatMap((s) => [s.value, s.baseline]).concat([band?.low, band?.high]).filter((v) => v != null);
    if (nums.length) {
      const lo = Math.min(...nums), hi = Math.max(...nums), pad = Math.max((hi - lo) * 0.15, 1);
      domain = [Math.floor(lo - pad), Math.ceil(hi + pad)];
    }
  }
  const x0 = toDate(data.start).getTime(), x1 = toDate(data.end).getTime();
  const hasValues = series.some((s) => s.value != null);

  return (
    <div className="h-80" role="img" aria-label={`${isScore ? "Health score" : data.vitals?.[view]?.label} over the last ${data.hours} hours`}>
      {!hasValues ? (
        <div className="h-full flex items-center justify-center text-sm text-white/40 text-center px-6">
          {isScore && data.mode === "population"
            ? "The health score appears once the personal baseline is ready (12 clean 10-minute readings)."
            : "No readings in this period."}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 36, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            {band && (band.low != null || band.high != null) && (
              <ReferenceArea y1={band.low ?? domain[0]} y2={band.high ?? domain[1]} fill={BAND_FILL} stroke="none" ifOverflow="hidden" />
            )}
            <XAxis
              dataKey="x" type="number" scale="time" domain={[x0, x1]}
              tickFormatter={(ts) => fmtTime(new Date(ts).toISOString(), withDay)}
              tick={AXIS_TEXT} tickLine={false} axisLine={false} minTickGap={40}
            />
            <YAxis
              domain={domain} tick={AXIS_TEXT} tickLine={false} axisLine={false} width={44} allowDecimals={false}
              label={isScore ? { value: "Health Score", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.45)", fontSize: 11, dx: 6 } : undefined}
            />
            <Tooltip content={<ChartTooltip view={view} withDay={withDay} unit={unit} />} cursor={{ stroke: "rgba(255,255,255,0.25)", strokeWidth: 1 }} />
            <Line type="stepAfter" dataKey="baseline" stroke={BASELINE_COLOR} strokeDasharray="5 5" strokeWidth={1.5} dot={false} activeDot={false} isAnimationActive={false} connectNulls={false} />
            <Line
              type="monotone" dataKey="value" stroke={LINE_COLOR} strokeWidth={2} isAnimationActive={false} connectNulls={false}
              dot={series.length <= 40 ? { r: 3, fill: LINE_COLOR, stroke: "#2f2f31", strokeWidth: 1.5 } : false}
              activeDot={{ r: 6, fill: LINE_COLOR, stroke: "#2f2f31", strokeWidth: 2 }}
            />
            {markers.map((m) => (
              <ReferenceDot
                key={m.t} x={m.x} y={m.y} r={7} fill={MARKER_COLOR} stroke="#2f2f31" strokeWidth={2}
                label={{ value: `Score ${m.score} · ${fmtTime(m.t, withDay)}`, position: "top", fill: "#FF9A9A", fontSize: 11, offset: 12 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── tab ─────────────────────────────────────────────────────────────────────────

export default function BaselineTab({ patientId }) {
  const [range, setRange] = useState("24h");
  const [view, setView] = useState("score");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null); // { vital, data } for the detail modal

  useEffect(() => {
    if (!patientId) return undefined;
    let cancelled = false;
    const load = async (showSpinner) => {
      if (showSpinner) setLoading(true);
      const res = await patientService.getPatientBaselineTimeline(patientId, range);
      if (!cancelled) {
        if (res.success) setData(res.data);
        setLoading(false);
      }
    };
    load(true);
    const timer = setInterval(() => load(false), REFRESH_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [patientId, range]);

  const columns = useMemo(() => (data ? tableColumns(data) : []), [data]);
  const withDay = (data?.hours || 0) > 24;
  const learning = !data?.mode || data.mode === "population";
  const markerTimes = new Set((data?.markers || []).map((m) => m.t));
  const thresholds = data?.thresholds;

  const openDetail = async (vital) => {
    const res = await patientService.getPatientBaseline(patientId);
    if (res.success && res.data?.vpo?.[vital]) setDetail({ vital, data: res.data });
  };

  const current = data?.current || {};
  const trend = data?.score_trend;
  const trendArrow = trend?.trend === "Improving" ? "↑" : trend?.trend === "Worsening" ? "↓" : "→";
  const trendColor = trend?.trend === "Improving" ? "#2CD155" : trend?.trend === "Worsening" ? "#E54D4D" : "rgba(255,255,255,0.7)";
  const viewKey = view === "score" ? null : view;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xl md:text-2xl text-white">Personal Baseline & Deterioration</h3>
          <p className="text-sm text-white/45">
            Vitals are compared with this patient&apos;s own baseline to spot early changes.
            <span className="text-white/35"> Preview only. Alerts still use the standard thresholds.</span>
          </p>
        </div>
        {data && (
          <span className="px-3 py-1 rounded-full border border-[#CCA166]/40 text-[#E5C48B] text-xs">
            {learning ? `Learning ${Math.min(data.learning.stable, data.learning.required)}/${data.learning.required}` : `${MODE_LABEL[data.mode]} v${data.version}`}
          </span>
        )}
      </div>

      {/* Range + view */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r.key} type="button" onClick={() => setRange(r.key)}
              className={`px-4 py-2 rounded-xl text-sm border transition-colors ${
                range === r.key ? "bg-[#CCA166] border-[#CCA166] text-[#1A1A1C] font-semibold" : "border-white/10 text-white/65 hover:text-white hover:border-white/25"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-white/55">
          View
          <select
            value={view} onChange={(e) => setView(e.target.value)}
            className="bg-[#252528] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#CCA166]/60"
          >
            {VIEW_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </label>
      </div>

      {loading && !data ? (
        <div className="rounded-[20px] bg-[#2f2f31] h-80 animate-pulse" />
      ) : !data ? (
        <div className="rounded-[20px] bg-[#2f2f31] p-6 text-sm text-white/45">Couldn&apos;t load the baseline for this patient.</div>
      ) : (
        <>
          {/* Graph + side cards */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-4">
            <div className="rounded-[20px] bg-[#2f2f31] p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-white/55">
                  <span className="flex items-center gap-1.5">
                    <svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke={LINE_COLOR} strokeWidth="2" /></svg>
                    {view === "score" ? "Health Score (0–100)" : `${VIEW_OPTIONS.find((o) => o.key === view)?.label}${data.vitals?.[view]?.unit ? ` (${data.vitals[view].unit})` : ""}`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke={BASELINE_COLOR} strokeWidth="1.5" strokeDasharray="5 5" /></svg>
                    {view === "score" ? "Usual score" : "Personal baseline"}
                  </span>
                  {view !== "score" && (
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-4 h-2.5 rounded-sm" style={{ background: BAND_FILL, outline: "1px solid rgba(143,163,191,0.3)" }} />
                      {data.bands?.[view]?.kind === "personal" ? "Usual range" : "Population range"}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <svg width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="4" fill={MARKER_COLOR} /></svg>
                    Deterioration (score below {thresholds?.deterioration})
                  </span>
                </div>
                {viewKey && (
                  <button type="button" onClick={() => openDetail(viewKey)} className="text-xs text-[#E5C48B] hover:underline">
                    Details ›
                  </button>
                )}
              </div>
              <MainChart data={data} view={view} />
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-[20px] bg-[#2f2f31] p-5">
                <h4 className="text-sm text-white/70 mb-3">Current Health Score</h4>
                <div className="flex items-center gap-4">
                  <ScoreRing score={current.score} band={current.band} />
                  <div className="text-sm">
                    {current.score == null ? (
                      <span className="text-white/45">{learning ? "Available once the baseline is ready" : "No recent reading"}</span>
                    ) : (
                      <span style={{ color: SCORE_BAND_STYLE[current.band]?.color }}>{current.band}</span>
                    )}
                    {current.t && <div className="text-[11px] text-white/35 mt-1">{fmtTime(current.t, withDay)}</div>}
                  </div>
                </div>
              </div>
              <div className="rounded-[20px] bg-[#2f2f31] p-5">
                <h4 className="text-sm text-white/70 mb-2">Score Trend</h4>
                {trend ? (
                  <>
                    <div className="text-base font-medium" style={{ color: trendColor }}>{trendArrow} {trend.trend}</div>
                    <div className="text-[11px] text-white/40 mt-1">
                      last 2 h vs previous {trend.vs_hours} h ({trend.change > 0 ? "+" : ""}{trend.change} points)
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-white/40">Not enough scored readings yet</div>
                )}
              </div>
            </div>
          </div>

          {/* Vitals at each interval */}
          <div className="rounded-[20px] bg-[#2f2f31] p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h4 className="text-base text-white">Vitals at Each Interval</h4>
              <span className="text-[11px] text-white/40">
                Every {data.table_step_minutes >= 60 ? `${data.table_step_minutes / 60} h` : `${data.table_step_minutes} min`}
                {data.resolution_minutes > 10 ? " · hourly medians, worst status in the hour" : " · 10-minute medians"} · click a vital to plot it
              </span>
            </div>
            {columns.length === 0 ? (
              <p className="text-sm text-white/40">No readings in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-separate border-spacing-1">
                  <thead>
                    <tr className="text-white/50">
                      <th className="text-left font-medium px-2 py-1.5 sticky left-0 bg-[#2f2f31]">Time</th>
                      <th className="font-medium px-2 py-1.5 whitespace-nowrap text-white/75">Your baseline</th>
                      {columns.map((c) => {
                        const flagged = c.point && markerTimes.has(c.point.t);
                        return (
                          <th
                            key={c.ts}
                            className={`font-medium px-2 py-1.5 whitespace-nowrap rounded-md ${flagged ? "text-[#FF9A9A] bg-[rgba(229,77,77,0.15)]" : ""}`}
                          >
                            {fmtTime(new Date(c.ts).toISOString(), withDay)}
                            {flagged && <div className="text-[10px]">Drop</div>}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {ROWS.map((row) => (
                      <tr key={row.key}>
                        <th className="text-left font-normal px-2 py-1.5 sticky left-0 bg-[#2f2f31] whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setView(row.key === "bp" ? "sbp" : row.key)}
                            className={`hover:text-white ${view === row.key || (row.key === "bp" && ["sbp", "dbp"].includes(view)) ? "text-[#E5C48B]" : "text-white/70"}`}
                          >
                            {row.label}{row.unit ? <span className="text-white/35"> ({row.unit})</span> : null}
                          </button>
                        </th>
                        <td className="px-2 py-1.5 text-center rounded-md bg-white/[0.04] text-white/80 font-medium">
                          {learning && row.key !== "score" ? "—" : baselineCell(row.key, data)}
                        </td>
                        {columns.map((c) => {
                          const cell = cellFor(row.key, c.point, thresholds);
                          return (
                            <td
                              key={c.ts}
                              className="px-2 py-1.5 text-center rounded-md text-white font-medium whitespace-nowrap"
                              style={{ background: cell.style?.cell || "rgba(255,255,255,0.03)" }}
                              title={cell.style ? undefined : "No status"}
                            >
                              {cell.text}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-white/45">
              {Object.entries(STATUS_STYLE).map(([label, s]) => (
                <span key={label} className="flex items-center gap-1.5">
                  <span className="inline-block size-2.5 rounded-sm" style={{ background: s.color, opacity: 0.8 }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="rounded-[20px] bg-[#2f2f31] p-4 md:p-5">
            <h4 className="text-base text-white mb-2">Insights</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm text-white/70">
              {(data.insights || []).map((i, idx) => {
                const text = insightText(i, withDay);
                return text ? <li key={idx}>{text}</li> : null;
              })}
            </ul>
            <p className="text-[11px] text-white/35 mt-3">
              Generated from the readings above by fixed rules. Not a diagnosis.
            </p>
          </div>
        </>
      )}

      {detail && (
        <BaselineDetailModal
          key={detail.vital}
          patientId={patientId}
          vital={detail.vital}
          initial={detail.data}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
