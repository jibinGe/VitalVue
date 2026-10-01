import React, { useEffect, useState } from "react";
import { patientService } from "@/services/patientService";

// Extra data from a patient's 4G watch that isn't part of the vitals tiles: respiratory rate,
// glucose, steps, last night's sleep and the last known location. Only what the watch reports
// is shown. These values don't feed NEWS2 or alerts.

const SLEEP_STAGES = [
  { key: "deep_min", label: "Deep", color: "#5B6CFF" },
  { key: "light_min", label: "Light", color: "#8FA0FF" },
  { key: "rem_min", label: "REM", color: "#CCA166" },
  { key: "awake_min", label: "Awake", color: "rgba(255,255,255,0.25)" },
];

function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function hm(min) {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h ? `${h} h ${m} min` : `${m} min`;
}

function Sparkline({ points }) {
  if (!points || points.length < 2) return null;
  const vals = points.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 120;
  const h = 28;
  const d = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - 2 - ((v - min) / range) * (h - 4)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-1" aria-hidden="true">
      <polyline points={d} fill="none" stroke="#CCA166" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function Tile({ label, value, unit, at, children }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 flex flex-col gap-1 min-w-0">
      <div className="text-[11px] text-white/45">{label}</div>
      <div className="text-white">
        <span className="text-2xl tabular-nums">{value}</span>
        {unit && <span className="text-xs text-white/50 ml-1">{unit}</span>}
      </div>
      {children}
      {at && <div className="text-[11px] text-white/35">{when(at)}</div>}
    </div>
  );
}

export default function WatchDataPanel({ patientId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!patientId) return undefined;
    let cancelled = false;
    const load = () => patientService.getPatientWatchData(patientId).then((res) => {
      if (cancelled) return;
      if (res.success) { setData(res.data); setError(null); } else setError(res.message);
    });
    load();
    const timer = setInterval(load, 60000);               // these change slowly
    return () => { cancelled = true; clearInterval(timer); };
  }, [patientId]);

  if (error) return <p className="text-xs text-[#FF9A9A]">Couldn't load watch data: {error}</p>;
  if (!data) return <div className="rounded-[20px] bg-[#2f2f31] h-32 animate-pulse" />;

  const { latest, series, sleep, location } = data;
  const night = sleep?.[0];
  const hasAny = Object.keys(latest || {}).length > 0 || night || location;

  return (
    <section className="rounded-[20px] bg-[#2f2f31] p-5 flex flex-col gap-4">
      <div>
        <h4 className="text-base text-white">Watch data</h4>
        <p className="text-xs text-white/45">
          Other readings from this watch in the last 24 hours. They don't change the NEWS2 score or raise alerts.
        </p>
      </div>

      {!hasAny ? (
        <p className="text-sm text-white/40">
          Nothing yet. Respiratory rate, glucose, steps, sleep and location appear here when the watch sends them.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {latest.resp_rate && (
            <Tile label="Respiratory rate" value={Math.round(latest.resp_rate.value)} unit="breaths/min" at={latest.resp_rate.measured_at}>
              <Sparkline points={series?.resp_rate} />
              <div className="text-[11px] text-white/35">Estimated by the watch; count by hand before acting on it.</div>
            </Tile>
          )}
          {latest.glucose && (
            <Tile label="Blood glucose" value={latest.glucose.value?.toFixed(1)} unit="mmol/L" at={latest.glucose.measured_at}>
              <Sparkline points={series?.glucose} />
            </Tile>
          )}
          {latest.steps && (
            <Tile label="Steps (watch's count)" value={Math.round(latest.steps.value).toLocaleString()} at={latest.steps.measured_at}>
              <Sparkline points={series?.steps} />
            </Tile>
          )}
          {night && (
            <Tile label={`Sleep · night ending ${new Date(`${night.night}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
              value={hm(night.total_min)} at={night.end_at}>
              {night.total_min > 0 && (
                <>
                  <div className="flex h-2 rounded-full overflow-hidden mt-1" aria-hidden="true">
                    {SLEEP_STAGES.map((st) => night[st.key] > 0 && (
                      <span key={st.key} style={{ flex: night[st.key], background: st.color }} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white/55">
                    {SLEEP_STAGES.filter((st) => night[st.key] > 0).map((st) => (
                      <span key={st.key}>
                        <span className="inline-block size-2 rounded-full mr-1 align-middle" style={{ background: st.color }} />
                        {st.label} {hm(night[st.key])}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </Tile>
          )}
          {location && (
            <Tile label="Last known location" value={`${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`} at={location.recorded_at}>
              <a href={`https://www.google.com/maps?q=${location.lat},${location.lon}`} target="_blank" rel="noreferrer"
                className="text-xs text-[#E5C48B] hover:underline">Open in Maps</a>
            </Tile>
          )}
          {latest.lipids && (
            <Tile label="Blood lipids" value={latest.lipids.text} unit="mmol/L" at={latest.lipids.measured_at} />
          )}
          {latest.uric_acid && (
            <Tile label="Uric acid" value={Math.round(latest.uric_acid.value)} unit="µmol/L" at={latest.uric_acid.measured_at} />
          )}
        </div>
      )}
    </section>
  );
}
