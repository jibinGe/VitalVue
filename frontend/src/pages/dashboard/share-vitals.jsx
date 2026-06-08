import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { patientService } from "@/services/patientService";
import { useDashboardStore } from "@/store/useDashboardStore";
import HeartRateLive from "@/components/charts/HeartRateLive";
import BPTrend from "@/components/animation/overview/BPTrend";
import Spo2Gauge from "@/components/animation/overview/spo2Gauge";

/* ── helpers ─────────────────────────────────────────────── */
const glowFor = (status) => {
  const s = (status || "stable").toLowerCase();
  if (s === "critical") return { border: "#E54D4D", glow: "rgba(229,77,77,0.25)" };
  if (s === "warning")  return { border: "#E5DB4C", glow: "rgba(229,219,76,0.22)" };
  return                       { border: "#2CD155", glow: "rgba(44,209,85,0.18)" };
};

const statusChip = (status) => {
  const s = (status || "stable").toLowerCase();
  if (s === "critical") return { bg: "rgba(229,77,77,0.15)",  text: "#E54D4D" };
  if (s === "high" || s === "low" || s === "warning")
                        return { bg: "rgba(229,219,76,0.15)", text: "#E5DB4C" };
  return                       { bg: "rgba(44,209,85,0.13)",  text: "#2CD155" };
};

/* ── icons ───────────────────────────────────────────────── */
const IHeart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12.62 20.81C12.28 20.93 11.72 20.93 11.38 20.81C8.48 19.82 2 15.69 2 8.69C2 5.6 4.49 3.1 7.56 3.1C9.38 3.1 10.99 3.98 12 5.34C13.01 3.98 14.63 3.1 16.44 3.1C19.51 3.1 22 5.6 22 8.69C22 15.69 15.52 19.82 12.62 20.81Z" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const ISpo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7.33 12H10.17L11.83 8.5L13 15.5L14.83 12H16.67" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IBp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M22 12H18L15 21L9 3L6 12H2" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IAF = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IPhone = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M17.45 22.95C10.19 22.95 1.05 13.81 1.05 6.55C1.05 4.08 2.82 1.97 5.18 1.54L6.5 1.31C7.15 1.19 7.79 1.53 8.07 2.12L9.79 5.79C10.04 6.32 9.88 6.96 9.41 7.32L7.88 8.46C8.99 10.8 13.2 15.01 15.54 16.12L16.68 14.59C17.04 14.12 17.68 13.96 18.21 14.21L21.88 15.93C22.47 16.21 22.81 16.85 22.69 17.5L22.46 18.82C22.03 21.18 19.92 22.95 17.45 22.95Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IRoom = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M22 22H2M17 22V6.2C17 5.08 17 4.52 16.78 4.09C16.59 3.71 16.29 3.41 15.91 3.22C15.48 3 14.92 3 13.8 3H10.2C9.08 3 8.52 3 8.09 3.22C7.71 3.41 7.41 3.71 7.22 4.09C7 4.52 7 5.08 7 6.2V22M7 22V12.2C7 11.08 7 10.52 6.78 10.09C6.59 9.71 6.29 9.41 5.91 9.22C5.48 9 4.92 9 3.8 9H3V22M17 22V12.2C17 11.08 17 10.52 17.22 10.09C17.41 9.71 17.71 9.41 18.09 9.22C18.52 9 19.08 9 20.2 9H21V22" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IWard = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IWA = () => (
  <svg width="13" height="13" viewBox="0 0 32 32" fill="none">
    <path d="M16 3C8.832 3 3 8.832 3 16c0 2.618.762 5.063 2.074 7.13L3 29l6.054-2.044A12.932 12.932 0 0 0 16 29c7.168 0 13-5.832 13-13S23.168 3 16 3z" fill="rgba(44,209,85,0.2)" stroke="#2CD155" strokeWidth="1.5"/>
    <path d="M21.5 18.5c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.89.12.58-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z" fill="#2CD155"/>
  </svg>
);

/* ── NoGraph placeholder ─────────────────────────────────── */
const NoGraph = () => (
  <p className="text-[10px] text-white/25 mt-3 italic">no data</p>
);

/* ── graph renderer ─────────────────────────────────────── */
const renderGraph = (vital, historyData) => {
  const isZero = () => {
    if (vital.title === "Heart Rate") return !vital.heartRate || vital.heartRate === 0;
    if (vital.title === "SpO2")       return !vital.spo2 || vital.spo2 === 0;
    if (vital.title === "BP Trend") {
      const p = vital.bp ? vital.bp.split("/") : [];
      return p[0] === "0" || p[0] === "--" || !vital.bp;
    }
    return true;
  };
  if (isZero()) return <NoGraph />;
  if (vital.title === "Heart Rate")
    return <HeartRateLive width={260} height={30} className="-ml-2 mt-3" historyData={historyData} />;
  if (vital.title === "SpO2")
    return <Spo2Gauge value={vital.spo2 || 90} className="h-20 w-48 -mt-6 -ml-3" set_height animate />;
  if (vital.title === "BP Trend")
    return <BPTrend className="h-9 scale-110 -mb-1" historyData={historyData} />;
  return null;
};

/* ── AF card ─────────────────────────────────────────────── */
const AFCard = ({ vital, delay, historyData }) => {
  const isHigh =
    vital.afWarning &&
    vital.afWarning !== "Normal" &&
    vital.afWarning !== 0 &&
    vital.afWarning !== false &&
    String(vital.afWarning).toLowerCase() !== "normal";
  const color  = isHigh ? "#E54D4D" : "#4DE573";
  const label  = isHigh ? String(vital.afWarning) : "Normal";
  const sub    = isHigh ? "Irregular Rhythm" : "Regular Rhythm";
  const iconBg = isHigh ? "bg-froly" : "bg-green";
  const bdrCls = isHigh ? "border-[#E54D4D]" : "border-[#4DE573]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.38, ease: "easeOut" }}
      className={`border relative overflow-hidden rounded-[20px] bg-[#2f2f31] shadow-[0_0_60px_rgba(0,0,0,0.12)] flex flex-col justify-between min-h-[120px] p-3.5 ${bdrCls}`}
    >
      {/* header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h4 className="text-[13px] text-white/55 font-lufga">AF Warning</h4>
          <div className="text-[26px] font-medium text-white leading-tight" style={{ textShadow: `0 0 12px ${color}40` }}>
            {label}
          </div>
          <p className="text-[11px] text-para">{sub}</p>
        </div>
        <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
          <IAF />
        </div>
      </div>
      {/* decorative arcs */}
      <div className="absolute bottom-0 right-0 -z-10 pointer-events-none opacity-60">
        <svg width="80" height="72" viewBox="0 0 116 104" fill="none">
          <circle cx="104" cy="104" r="102" stroke={color} strokeOpacity="0.12" strokeWidth="4"/>
          <rect x="12" y="33" width="20" height="20" rx="10" fill="#2F2F31"/>
          <circle cx="22" cy="43" r="4" fill={color}/>
        </svg>
      </div>
      <div className="absolute top-0 left-0 -z-10 pointer-events-none">
        <svg width="100" height="100" viewBox="0 0 170 170" fill="none">
          <g filter="url(#af_g)">
            <ellipse cx="45.6" cy="45.6" rx="75" ry="12.6" transform="rotate(45 45.6 45.6)" fill={color} fillOpacity="0.3"/>
          </g>
          <defs>
            <filter id="af_g" x="-50" y="-50" width="250" height="250" filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="20"/>
            </filter>
          </defs>
        </svg>
      </div>
    </motion.div>
  );
};

/* ── Vital card (vertical, full-width) ─────────────────── */
const ICON_BG = ["bg-green", "bg-purple", "bg-pink", "bg-blue"];
const ICON_MAP = { "Heart Rate": <IHeart />, SpO2: <ISpo />, "BP Trend": <IBp />, "AF Warning": <IAF /> };

const VitalCard = ({ vital, vIndex, delay, historyData }) => {
  const sc = statusChip(vital.status);
  const hasValue =
    (vital.heartRate !== undefined && vital.heartRate !== 0) ||
    (vital.spo2 !== undefined && vital.spo2 !== 0) ||
    (vital.bp && vital.bp !== "--/--");

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.38, ease: "easeOut" }}
      className="bg-[#2F2F31] rounded-[20px] overflow-hidden p-3.5 flex flex-col gap-2 min-h-[120px] relative"
    >
      {/* top row: icon + title + status badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${ICON_BG[vIndex % ICON_BG.length]}`}>
            {ICON_MAP[vital.title] || vital.icon}
          </div>
          <span className="text-[15px] text-white font-medium">{vital.title}</span>
        </div>
        {vital.status && (
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full" style={sc}>
            {vital.status}
          </span>
        )}
      </div>

      {/* value */}
      <div className="text-[28px] font-semibold text-white pl-0.5">
        {vital.heartRate !== undefined && (
          <>{vital.heartRate || "--"}<span className="text-[13px] text-white/40 font-normal ml-1">bpm</span></>
        )}
        {vital.spo2 !== undefined && (
          <>{vital.spo2 || "--"}<span className="text-[13px] text-white/40 font-normal">%</span></>
        )}
        {vital.bp && (
          <>
            {vital.bp.split("/")[0]}
            <span className="text-[18px] text-white/60">/{vital.bp.split("/")[1]}</span>
            <span className="text-[13px] text-white/40 font-normal ml-1">mmHg</span>
          </>
        )}
        {!hasValue && vital.title !== "AF Warning" && (
          <span className="text-white/30 text-[22px]">--</span>
        )}
      </div>

      {/* graph */}
      <div>{renderGraph(vital, historyData)}</div>
    </motion.div>
  );
};

/* ── info row (icon + label + value) ───────────────────── */
const InfoRow = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5">
      <div className="size-6 rounded-full bg-white/8 flex items-center justify-center text-white/50 shrink-0">
        {icon}
      </div>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[12px] text-white/40 whitespace-nowrap">{label}:</span>
        <span className="text-[13px] text-white font-medium truncate">{value}</span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────── */
/*  MAIN PAGE                                              */
/* ─────────────────────────────────────────────────────── */
export default function ShareVitalsPage() {
  const { patientId } = useParams();
  const { liveVitals }   = useDashboardStore();

  const [patient, setPatient]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [shared,  setShared]    = useState(false);
  const [shareErr,setShareErr]  = useState("");

  /* ── load + auto-share ── */
  useEffect(() => {
    if (!patientId) return;
    (async () => {
      setLoading(true);
      const res = await patientService.getPatientById(Number(patientId));
      if (res.success) setPatient(res.data);
      setLoading(false);

      /* auto-trigger WhatsApp alert */
      const sr = await patientService.shareVitals(Number(patientId));
      if (sr.success) setShared(true);
      else            setShareErr(sr.message || "Share failed");
    })();
  }, [patientId]);

  /* ── merge live vitals ── */
  const live   = liveVitals?.[patientId] || {};
  const h      = patient?.vitals_history || [];
  const latest = h.length > 0 ? h[h.length - 1] : {};

  const heartRate  = live.heart_rate   ?? latest.heart_rate   ?? 0;
  const hrStatus   = live.heart_rate_status  ?? latest.heart_rate_status  ?? "Stable";
  const spo2       = live.spo2         ?? latest.spo2         ?? 0;
  const spo2Status = live.spo2_status  ?? latest.spo2_status  ?? "Stable";
  const bpSys      = live.bp_systolic  ?? latest.bp_systolic  ?? 0;
  const bpDia      = live.bp_diastolic ?? latest.bp_diastolic ?? 0;
  const bpStatus   = live.bp_status    ?? latest.bp_status    ?? "Stable";
  const afWarning  = live.af_warning   ?? latest.af_warning   ?? "Normal";
  const isConnected= live.is_connected ?? latest.is_connected ?? false;

  /* ── overall triage ── */
  const overall = (() => {
    const ss = [hrStatus, spo2Status, bpStatus].map(s => (s||"").toLowerCase());
    if (ss.includes("critical")) return "Critical";
    if (ss.some(s => ["high","low","warning"].includes(s))) return "Warning";
    return "Stable";
  })();
  const glow = glowFor(overall);
  const sc   = statusChip(overall);

  /* ── last sync ── */
  const lastSync = (() => {
    const ts = live.recorded_at || latest.recorded_at;
    if (!ts) return null;
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  })();

  /* ── vitals array (no device card) ── */
  const vitals = [
    { title: "Heart Rate", heartRate: heartRate ? Math.round(heartRate) : 0, status: hrStatus },
    { title: "SpO2",       spo2: spo2 ? Math.round(spo2) : 0,               status: spo2Status },
    { title: "BP Trend",   bp: bpSys ? `${Math.round(bpSys)}/${Math.round(bpDia)}` : "--/--", status: bpStatus },
    { title: "AF Warning", afWarning },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ background: "#111113", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── WhatsApp banner ── */}
      <AnimatePresence>
        {(shared || shareErr) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-4 py-2.5 flex items-center gap-2 text-[12px]"
            style={{
              background: shared ? "rgba(44,209,85,0.08)" : "rgba(229,77,77,0.08)",
              borderBottom: `1px solid ${shared ? "rgba(44,209,85,0.2)" : "rgba(229,77,77,0.2)"}`,
            }}
          >
            {shared ? (
              <>
                <IWA />
                <span className="text-[#2CD155] font-medium">Doctor alert sent via WhatsApp</span>
              </>
            ) : (
              <span className="text-[#E54D4D]">{shareErr}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── loading ── */}
      {loading ? (
        <div className="flex items-center justify-center h-screen">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
            className="size-10 rounded-full"
            style={{ border: "2.5px solid rgba(204,161,102,0.18)", borderTopColor: "#CCA166" }}
          />
        </div>
      ) : (
        <div className="px-4 py-5 flex flex-col gap-4 pb-10">

          {/* ── PATIENT CARD ── */}
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.42, ease: "easeOut" }}
            className="rounded-3xl overflow-hidden"
            style={{
              border: `3px solid ${glow.border}`,
              boxShadow: `0 0 28px ${glow.glow}`,
              background: "#1E1E20",
            }}
          >
            <div className="p-5 flex flex-col gap-4">

              {/* name + status */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-white/35 uppercase tracking-widest mb-1">Patient</p>
                  <h1 className="text-[22px] font-bold text-white leading-tight truncate">
                    {patient?.full_name || "Unknown"}
                  </h1>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className="text-[12px] font-semibold px-3 py-1 rounded-full"
                    style={sc}
                  >
                    {overall}
                  </span>
                  {isConnected ? (
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex size-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2CD155] opacity-75" />
                        <span className="relative inline-flex rounded-full size-1.5 bg-[#2CD155]" />
                      </span>
                      <span className="text-[11px] text-[#2CD155]">Live</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#E54D4D]">Offline</span>
                  )}
                </div>
              </div>

              {/* divider */}
              <div className="h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)" }} />

              {/* info grid */}
              <div className="grid grid-cols-1 gap-2.5">
                <InfoRow icon={<IRoom />}  label="Room"      value={patient?.room_no} />
                <InfoRow icon={<IWard />}  label="Ward"      value={patient?.ward_name} />
                <InfoRow icon={<IPhone />} label="Phone"     value={patient?.phone_number} />
                <InfoRow icon={<IPhone />} label="Alt Phone" value={patient?.alt_phone} />
              </div>

              {/* last sync */}
              {lastSync && (
                <p className="text-[11px] text-white/25">Last sync · {lastSync}</p>
              )}
            </div>
          </motion.div>

          {/* ── VITALS — all vertical ── */}
          <div className="flex flex-col gap-3">
            {vitals.map((vital, vIndex) => {
              if (vital.title === "AF Warning") {
                return (
                  <AFCard
                    key={vIndex}
                    vital={vital}
                    delay={0.1 + vIndex * 0.07}
                    historyData={h}
                  />
                );
              }
              return (
                <VitalCard
                  key={vIndex}
                  vital={vital}
                  vIndex={vIndex}
                  delay={0.1 + vIndex * 0.07}
                  historyData={h}
                />
              );
            })}
          </div>

          {/* footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-[11px] text-white/18 pt-2"
          >
            VitalVue · Real-time Patient Monitoring
          </motion.p>
        </div>
      )}
    </div>
  );
}
