import React, { useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Brain,
  Droplets,
  Heart,
  HeartPulse,
  Info,
  Thermometer,
  Wind,
} from "lucide-react";
import { patientService } from "@/services/patientService";
import { formatToLocalTime } from "@/utilities/dateUtils";

const RANGES = [
  { key: "6h", label: "6 hrs", hours: 6 },
  { key: "12h", label: "12 hrs", hours: 12 },
  { key: "24h", label: "24 hrs", hours: 24 },
];

const RISK = {
  Low: {
    color: "#2CD155",
    bg: "rgba(44,209,85,0.14)",
    border: "rgba(44,209,85,0.35)",
    label: "Low Risk",
    hint: "Continue routine monitoring",
  },
  Medium: {
    color: "#FF8C42",
    bg: "rgba(255,140,66,0.16)",
    border: "rgba(255,140,66,0.40)",
    label: "Moderate Risk",
    hint: "Increased monitoring required",
  },
  High: {
    color: "#E54D4D",
    bg: "rgba(229,77,77,0.16)",
    border: "rgba(229,77,77,0.40)",
    label: "High Risk",
    hint: "Urgent clinical review needed",
  },
};

function riskFromScore(score) {
  if (score == null) return "Low";
  if (score >= 7) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

function scoreTone(points) {
  if (points >= 3) return "#E54D4D";
  if (points === 2) return "#FF8C42";
  if (points === 1) return "#FFBB33";
  return "#5BBEFF";
}

function measured(v) {
  return v != null && Number(v) > 0;
}

function hrScore(hr) {
  if (!measured(hr)) return 0;
  if (hr >= 131 || hr <= 40) return 3;
  if (hr >= 111 || hr <= 50) return 2;
  if (hr >= 91) return 1;
  return 0;
}

function spo2Score(spo2) {
  if (!measured(spo2)) return 0;
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0;
}

function sbpScore(sbp) {
  if (!measured(sbp)) return 0;
  if (sbp <= 90 || sbp >= 220) return 3;
  if (sbp <= 100) return 2;
  if (sbp <= 110) return 1;
  return 0;
}

function tempScore(temp) {
  if (!measured(temp)) return 0;
  if (temp <= 35.0) return 3;
  if (temp >= 39.1) return 2;
  if (temp <= 36.0 || temp >= 38.1) return 1;
  return 0;
}

function rrScore(rr) {
  if (!measured(rr)) return 0;
  if (rr <= 8 || rr >= 25) return 3;
  if (rr >= 21) return 2;
  if (rr <= 11) return 1;
  return 0;
}

function toDate(iso) {
  if (!iso) return null;
  const s = String(iso);
  return new Date(s.endsWith("Z") ? s : `${s}Z`);
}

function fmtClock(iso) {
  const d = toDate(iso);
  if (!d || Number.isNaN(d.getTime())) return "--";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function pickVital(source, keys) {
  for (const key of keys) {
    const v = source?.[key];
    if (v != null && v !== "") return v;
  }
  return null;
}

function buildParameters(vitals) {
  const hr = Number(pickVital(vitals, ["heart_rate", "hr"]));
  const spo2 = Number(pickVital(vitals, ["spo2"]));
  const sbp = Number(pickVital(vitals, ["bp_systolic", "systolic", "sbp"]));
  const temp = Number(pickVital(vitals, ["temp", "temperature"]));
  const rr = Number(pickVital(vitals, ["respiratory_rate", "rr"]));
  const consciousness = pickVital(vitals, ["consciousness", "avpu"]) || "Alert";
  const onOxygen = Boolean(pickVital(vitals, ["on_oxygen", "oxygen_therapy"]));

  return [
    {
      key: "rr",
      name: "Respiratory Rate",
      short: "RR",
      Icon: Wind,
      iconColor: "#5BBEFF",
      value: measured(rr) ? `${Math.round(rr)} /min` : "—",
      raw: measured(rr) ? rr : null,
      score: rrScore(rr),
      normal: "12–20",
      unit: "/min",
    },
    {
      key: "spo2",
      name: "SpO₂",
      short: "SpO₂",
      Icon: Droplets,
      iconColor: "#5BBEFF",
      value: measured(spo2) ? `${Math.round(spo2)}%` : "—",
      raw: measured(spo2) ? spo2 : null,
      score: spo2Score(spo2),
      normal: "≥ 96%",
      unit: "%",
    },
    {
      key: "o2",
      name: "Oxygen Therapy",
      short: "O₂",
      Icon: Wind,
      iconColor: "#67E8F9",
      value: onOxygen ? "On oxygen" : "Air",
      raw: onOxygen ? 1 : 0,
      score: onOxygen ? 2 : 0,
      normal: "Air",
      unit: "",
    },
    {
      key: "temp",
      name: "Temperature",
      short: "Temp",
      Icon: Thermometer,
      iconColor: "#FF8C42",
      value: measured(temp) ? `${Number(temp).toFixed(1)}°C` : "—",
      raw: measured(temp) ? temp : null,
      score: tempScore(temp),
      normal: "36.1–38.0",
      unit: "°C",
    },
    {
      key: "sbp",
      name: "Systolic BP",
      short: "SBP",
      Icon: HeartPulse,
      iconColor: "#2CD155",
      value: measured(sbp) ? `${Math.round(sbp)} mmHg` : "—",
      raw: measured(sbp) ? sbp : null,
      score: sbpScore(sbp),
      normal: "111–219",
      unit: "mmHg",
    },
    {
      key: "hr",
      name: "Heart Rate",
      short: "HR",
      Icon: Heart,
      iconColor: "#E54D4D",
      value: measured(hr) ? `${Math.round(hr)} bpm` : "—",
      raw: measured(hr) ? hr : null,
      score: hrScore(hr),
      normal: "51–90",
      unit: "bpm",
    },
    {
      key: "avpu",
      name: "Level of Consciousness",
      short: "AVPU",
      Icon: Brain,
      iconColor: "#5BBEFF",
      value: consciousness,
      raw: consciousness,
      score: String(consciousness).toLowerCase() === "alert" ? 0 : 3,
      normal: "Alert",
      unit: "",
    },
  ];
}

function recommendedActions(risk) {
  if (risk === "High") {
    return [
      "Escalate for urgent clinical review now",
      "Increase observation frequency to continuous or every 15 minutes",
      "Consider oxygen and airway support if SpO₂ is low",
      "Document findings and inform the covering clinician",
    ];
  }
  if (risk === "Medium") {
    return [
      "Assess the patient for signs of deterioration",
      "Increase monitoring frequency",
      "Inform the nurse in charge / covering clinician",
      "Review NEWS2 parameters contributing to the score",
    ];
  }
  return [
    "Continue routine monitoring",
    "Recalculate NEWS2 at the next scheduled observation",
    "Escalate promptly if the score rises or the patient looks unwell",
  ];
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-white/10 bg-[#1A1A1C] px-3 py-2 text-xs shadow-xl">
      <div className="text-white font-medium">NEWS2: {p.score}</div>
      <div className="text-white/50 mt-0.5">{p.label}</div>
    </div>
  );
}

function Panel({ title, children, className = "" }) {
  return (
    <div className={`rounded-[20px] bg-[#2f2f31] border border-white/5 ${className}`}>
      {title ? <h4 className="text-sm text-white/70 px-4 pt-4 md:px-5 md:pt-5">{title}</h4> : null}
      <div className={title ? "p-4 md:p-5 pt-3" : "p-4 md:p-5"}>{children}</div>
    </div>
  );
}

export default function NewsScore({ userId, patientDetails, latestVitals }) {
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(null);
  const [range, setRange] = useState("6h");
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userId) {
        setScore(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [scoreRes, timelineRes] = await Promise.all([
          patientService.getNews2Score(userId),
          patientService.getPatientTimeline(userId, { page: 1, limit: 8, is_resolved: false }),
        ]);
        if (cancelled) return;
        if (scoreRes.success) setScore(scoreRes.data);
        if (timelineRes.success) {
          const list = (timelineRes.data?.alerts || timelineRes.data || [])
            .slice(0, 5)
            .map((a) => ({
              id: a.id || a.alertId,
              title: a.title || a.alert_type || a.type || "Alert",
              message: a.message || a.description || "",
              severity: (a.severity || "medium").toLowerCase(),
              time: a.created_at || a.timestamp,
            }));
          setAlerts(list);
        }
      } catch (error) {
        console.error("Failed to load NEWS2 view:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const vitalsSource = useMemo(() => {
    const primary = latestVitals?.primary_vitals || {};
    return {
      ...(patientDetails || {}),
      ...(latestVitals || {}),
      ...primary,
      heart_rate: latestVitals?.heart_rate ?? primary.heart_rate ?? patientDetails?.heart_rate,
      spo2: latestVitals?.spo2 ?? primary.spo2 ?? patientDetails?.spo2,
      bp_systolic: latestVitals?.bp_systolic ?? latestVitals?.systolic ?? primary.blood_pressure?.split?.("/")?.[0] ?? patientDetails?.bp_systolic,
      temp: latestVitals?.temp ?? latestVitals?.temperature ?? primary.temp ?? patientDetails?.temp,
      respiratory_rate: latestVitals?.respiratory_rate ?? patientDetails?.respiratory_rate,
    };
  }, [latestVitals, patientDetails]);

  const parameters = useMemo(() => buildParameters(vitalsSource), [vitalsSource]);
  const computedTotal = parameters.reduce((sum, p) => sum + (p.score || 0), 0);
  const currentScore = score?.score ?? computedTotal;
  const riskKey = score?.riskLevel || riskFromScore(currentScore);
  const risk = RISK[riskKey] || RISK.Low;

  const chartData = useMemo(() => {
    const hours = RANGES.find((r) => r.key === range)?.hours || 6;
    const cut = Date.now() - hours * 3600000;
    const history = (score?.history || [])
      .map((h) => {
        const t = toDate(h.timestamp);
        if (!t || Number.isNaN(t.getTime())) return null;
        return {
          t: t.getTime(),
          label: fmtClock(h.timestamp),
          score: Number(h.score) || 0,
        };
      })
      .filter(Boolean)
      .filter((p) => p.t >= cut)
      .sort((a, b) => a.t - b.t);
    if (history.length) return history;
    return [{ t: Date.now(), label: "Now", score: currentScore || 0 }];
  }, [score, range, currentScore]);

  const patientName =
    patientDetails?.full_name || patientDetails?.name || "Patient";
  const initials = patientName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "VV";
  const room =
    patientDetails?.room_no || patientDetails?.room_name || patientDetails?.room || "--";
  const ward = patientDetails?.ward_name || patientDetails?.ward || "--";
  const patientId =
    patientDetails?.user_id || patientDetails?.patient_id || userId || "--";

  const latestList = parameters.filter((p) => ["hr", "rr", "spo2", "temp", "sbp"].includes(p.key));
  const actions = recommendedActions(riskKey);
  const worstScore = (score?.history || []).reduce(
    (max, h) => Math.max(max, Number(h.score) || 0),
    currentScore || 0,
  );

  if (loading) {
    return <div className="rounded-[20px] bg-[#2f2f31] h-80 animate-pulse" />;
  }

  if (!score && currentScore == null) {
    return (
      <div className="rounded-[20px] bg-[#2f2f31] p-6 text-sm text-white/45">
        No NEWS2 data available for this patient.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-xl md:text-2xl text-white">NEWS2 Score</h3>
          <p className="text-sm text-white/45">
            Early warning score from current vitals. Decision-support only — not a diagnosis.
          </p>
        </div>
      </div>

      {/* Patient + current score strip */}
      <Panel>
        <div className="flex flex-col xl:flex-row xl:items-center gap-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-12 rounded-full bg-[#CCA166]/20 border border-[#CCA166]/35 text-[#E5C48B] flex items-center justify-center font-semibold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-white font-medium truncate">{patientName}</div>
              <div className="text-xs text-white/45 mt-0.5 truncate">
                Room {room} · {ward} · ID {patientId}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 xl:ml-auto">
            <div
              className="size-14 rounded-2xl flex items-center justify-center text-2xl font-semibold"
              style={{ background: risk.bg, color: risk.color, border: `1px solid ${risk.border}` }}
            >
              {currentScore ?? "—"}
            </div>
            <div>
              <div className="text-xs text-white/45">Current NEWS2 Score</div>
              <div className="text-base font-medium" style={{ color: risk.color }}>{risk.label}</div>
              <div className="text-xs text-white/40">{risk.hint}</div>
            </div>
          </div>

          <div className="flex gap-6 text-xs text-white/45 xl:pl-4 xl:border-l xl:border-white/10">
            <div>
              <div>Last updated</div>
              <div className="text-sm text-white mt-0.5">
                {score?.timestamp ? formatToLocalTime(score.timestamp) : "—"}
              </div>
            </div>
            <div>
              <div>Worst in period</div>
              <div className="text-sm text-white mt-0.5" style={{ color: scoreTone(worstScore >= 3 ? 3 : worstScore) }}>
                {worstScore}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)] gap-5">
        <div className="flex flex-col gap-5 min-w-0">
          {/* Trend */}
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h4 className="text-base text-white">NEWS2 Score Trend</h4>
              <div className="flex gap-1 rounded-xl border border-white/10 p-0.5" role="group" aria-label="Trend range">
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRange(r.key)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      range === r.key
                        ? "bg-[#CCA166] text-[#1A1A1C] font-semibold"
                        : "text-white/55 hover:text-white"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-56 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <ReferenceArea y1={0} y2={4.5} fill="rgba(44,209,85,0.08)" strokeOpacity={0} />
                  <ReferenceArea y1={4.5} y2={6.5} fill="rgba(255,140,66,0.10)" strokeOpacity={0} />
                  <ReferenceArea y1={6.5} y2={12} fill="rgba(229,77,77,0.10)" strokeOpacity={0} />
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={[0, 12]}
                    ticks={[0, 4, 7, 12]}
                    tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.2)" }} />
                  <Area type="monotone" dataKey="score" stroke="none" fill="rgba(91,190,255,0.12)" />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#5BBEFF"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#5BBEFF", strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-[11px]">
              <span className="flex items-center gap-1.5 text-[#E54D4D]"><span className="size-2.5 rounded-sm bg-[#E54D4D]/70" />High (7+)</span>
              <span className="flex items-center gap-1.5 text-[#FF8C42]"><span className="size-2.5 rounded-sm bg-[#FF8C42]/70" />Medium (5–6)</span>
              <span className="flex items-center gap-1.5 text-[#2CD155]"><span className="size-2.5 rounded-sm bg-[#2CD155]/70" />Low (0–4)</span>
            </div>
          </Panel>

          {/* Breakdown */}
          <Panel title="NEWS2 Score Breakdown">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/45 text-xs">
                    <th className="text-left font-medium py-2 pr-3">Parameter</th>
                    <th className="text-left font-medium py-2 px-3">Value</th>
                    <th className="text-center font-medium py-2 px-3">Score</th>
                    <th className="text-right font-medium py-2 pl-3">Normal Range</th>
                  </tr>
                </thead>
                <tbody>
                  {parameters.map((p) => (
                    <tr key={p.key} className="border-t border-white/5">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="size-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${p.iconColor}18`, color: p.iconColor }}
                          >
                            <p.Icon className="size-4" strokeWidth={2} />
                          </span>
                          <span className="text-white/85">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium" style={{ color: p.score > 0 ? scoreTone(p.score) : "rgba(255,255,255,0.85)" }}>
                        {p.value}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className="inline-flex min-w-8 h-8 items-center justify-center rounded-lg text-sm font-semibold"
                          style={{
                            color: scoreTone(p.score),
                            background: `${scoreTone(p.score)}18`,
                            border: `1px solid ${scoreTone(p.score)}40`,
                          }}
                        >
                          {p.score}
                        </span>
                      </td>
                      <td className="py-3 pl-3 text-right text-white/40 text-xs">{p.normal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 pt-4 border-t border-white/8 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-white/55">Total NEWS2 Score</span>
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex min-w-10 h-10 items-center justify-center rounded-xl text-lg font-semibold"
                  style={{ background: risk.bg, color: risk.color, border: `1px solid ${risk.border}` }}
                >
                  {currentScore}
                </span>
                <span className="text-sm font-medium" style={{ color: risk.color }}>{risk.label}</span>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          <Panel title="Latest Vitals">
            <div className="flex flex-col gap-2.5">
              {latestList.map((p) => (
                <div key={p.key} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2.5">
                  <span
                    className="size-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${p.iconColor}18`, color: p.iconColor }}
                  >
                    <p.Icon className="size-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-white/45">{p.short}</div>
                    <div className="text-sm font-medium" style={{ color: p.score > 0 ? scoreTone(p.score) : "#fff" }}>
                      {p.value}
                    </div>
                  </div>
                  <div className="text-[11px] text-white/35 text-right">
                    ({p.normal})
                    {p.score > 0 && (
                      <div className="mt-0.5 font-medium" style={{ color: scoreTone(p.score) }}>
                        +{p.score}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Alerts & Notifications">
            {alerts.length === 0 ? (
              <p className="text-sm text-white/40">No active alerts for this patient.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {alerts.map((a) => {
                  const sev =
                    a.severity === "critical" || a.severity === "high"
                      ? { color: "#E54D4D", Icon: AlertTriangle }
                      : a.severity === "medium"
                        ? { color: "#FF8C42", Icon: AlertTriangle }
                        : { color: "#5BBEFF", Icon: Info };
                  return (
                    <div key={a.id || a.title} className="flex gap-3 rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2.5">
                      <span
                        className="size-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: `${sev.color}18`, color: sev.color }}
                      >
                        <sev.Icon className="size-3.5" strokeWidth={2} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium" style={{ color: sev.color }}>{a.title}</div>
                        {a.message ? <div className="text-xs text-white/45 mt-0.5 line-clamp-2">{a.message}</div> : null}
                        <div className="text-[11px] text-white/30 mt-1">{a.time ? formatToLocalTime(a.time) : ""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <div className="rounded-[20px] border border-[#2CD155]/25 bg-[rgba(44,209,85,0.08)] p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="size-4 text-[#2CD155]" />
              <h4 className="text-sm text-[#2CD155] font-medium">Recommended Actions</h4>
            </div>
            <ul className="space-y-2">
              {actions.map((item) => (
                <li key={item} className="text-sm text-white/75 flex gap-2">
                  <span className="text-[#2CD155] mt-1.5 size-1.5 rounded-full bg-[#2CD155] shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
