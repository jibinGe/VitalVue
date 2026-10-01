import React, { useEffect, useState } from "react";
import { patientService } from "@/services/patientService";
import { useAuth } from "@/contexts/AuthContext";
import MonitoringScheduleForm from "@/components/monitoring/MonitoringScheduleForm";
import WatchDataPanel from "@/components/dashboard/overview/WatchDataPanel";
import { scheduleSummary, VITAL_LABEL } from "@/components/monitoring/schedule";

// 4G watch for one patient (Veepoo, Wonlex or BPW8): link a watch, see its status, take a
// reading now, and view / change the measurement schedule. Doctors and admins can change the
// schedule; nurses see it read-only but can still ask for a reading.

const EDIT_ROLES = ["doctor", "org_admin", "master_admin"];
const MEASURE_ROLES = ["doctor", "nurse", "org_admin", "master_admin"];
const LEVEL_BADGE = {
  patient: ["Custom for this patient", "bg-[#CCA166]/15 text-[#E5C48B]"],
  hospital: ["Hospital default", "bg-white/5 text-white/60"],
  global: ["Default for all hospitals", "bg-white/5 text-white/60"],
};
const CONFIG_TEXT = {
  applied: ["Applied on the watch", "#2CD155"],
  sent: ["Sent, waiting for the watch to confirm", "#FFBB33"],
  pending: ["Waiting to send (watch offline or not yet ready)", "#FFBB33"],
  failed: ["Not applied", "#E54D4D"],
  unsupported: ["This watch can't change its schedule remotely", "rgba(255,255,255,0.6)"],
};

function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function watchLabel(d) {
  return `${d.type_label || "4G watch"} · ${d.client_id}`;
}

export default function WatchMonitoringTab({ patientId }) {
  const { user } = useAuth();
  const canEdit = EDIT_ROLES.includes(user?.role);
  const canMeasure = MEASURE_ROLES.includes(user?.role);
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [available, setAvailable] = useState([]);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);
  const load = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (!patientId) return undefined;
    let cancelled = false;
    patientService.getPatientMonitoring(patientId).then(async (res) => {
      if (cancelled) return;
      if (!res.success) { setMessage({ text: res.message, ok: false }); return; }
      setData(res.data);
      setDraft(res.data.schedule);
      // Unlinked watches of the hospital — to link one, or swap the current one.
      const av = await patientService.listAvailableDevices();
      if (!cancelled && av.success) setAvailable(av.data);
    });
    return () => { cancelled = true; };
  }, [patientId, reloadKey]);

  const run = async (fn, okText) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    setMessage({ text: res.success ? okText : res.message, ok: res.success });
    if (res.success) { setEditing(false); setPick(""); load(); }
  };

  if (!data) {
    return <div className="rounded-[20px] bg-[#2f2f31] h-60 animate-pulse" />;
  }

  const device = data.device;
  const dtype = data.device_type;
  const cfg = device?.config;
  const [baseCfgText, cfgColor] = CONFIG_TEXT[cfg?.status] || ["—", "rgba(255,255,255,0.5)"];
  const cfgText = cfg?.status === "sent" && dtype && !dtype.confirms_schedule
    ? "Sent to the watch (this watch doesn't confirm settings)" : baseCfgText;
  const [levelText, levelCls] = LEVEL_BADGE[data.level] || LEVEL_BADGE[data.is_override ? "patient" : "hospital"];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-xl md:text-2xl text-white">4G Watch & Monitoring Schedule</h3>
        <p className="text-sm text-white/45">
          How often this patient's 4G watch measures each vital, and readings on demand. BLE bands aren't affected.
        </p>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-2.5 text-sm ${message.ok ? "bg-[rgba(44,209,85,0.10)] text-[#7FE39A]" : "bg-[rgba(229,77,77,0.12)] text-[#FF9A9A]"}`}>
          {message.text}
        </div>
      )}

      {/* Watch */}
      <section className="rounded-[20px] bg-[#2f2f31] p-5">
        <h4 className="text-base text-white mb-3">Watch</h4>
        {device ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2 text-sm">
              <div><div className="text-[11px] text-white/40">{dtype?.id_label || "Client ID"}</div>
                <div className="font-mono text-white/85">{device.client_id}</div>
                <div className="text-[11px] text-white/45">{device.type_label}{device.model ? ` · ${device.model}` : ""}</div></div>
              <div><div className="text-[11px] text-white/40">Status</div>
                <div style={{ color: device.is_online ? "#2CD155" : "rgba(255,255,255,0.55)" }}>{device.is_online ? "● Online" : "○ Offline"}</div></div>
              <div><div className="text-[11px] text-white/40">Battery</div><div className="text-white/85">{device.battery_percent != null ? `${device.battery_percent}%` : "—"}</div></div>
              <div><div className="text-[11px] text-white/40">Last data</div><div className="text-white/85">{when(device.last_seen_at)}</div></div>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && dtype?.live_mode && (
                <>
                  <button disabled={busy} onClick={() => run(() => patientService.setPatientLiveMode(patientId, true), "Live mode requested: HR, SpO₂ and temperature will stream until stopped.")}
                    className="px-3 py-1.5 rounded-lg text-xs border border-[#CCA166]/50 text-[#E5C48B] hover:bg-[#CCA166]/10">Start live mode</button>
                  <button disabled={busy} onClick={() => run(() => patientService.setPatientLiveMode(patientId, false), "Live mode stopped.")}
                    className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-white/60 hover:text-white">Stop</button>
                </>
              )}
              <button disabled={busy} onClick={() => run(() => patientService.unassignDevice(device.id), "Watch unlinked from this patient.")}
                className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-white/60 hover:text-[#FF9A9A]">Unlink</button>
            </div>
            {/* Measure now: one reading on demand (watches that support it) */}
            {canMeasure && dtype?.measure_now?.length > 0 && (
              <div className="w-full flex flex-wrap items-center gap-2 pt-3 border-t border-white/5">
                <span className="text-xs text-white/55 mr-1">Measure now:</span>
                {dtype.measure_now.map((v) => (
                  <button key={v} disabled={busy || !device.is_online}
                    onClick={() => run(() => patientService.measureNow(device.id, v), `${VITAL_LABEL[v]} requested. The reading appears in a minute or so.`)}
                    className="px-3 py-1.5 rounded-lg text-xs border border-[#CCA166]/50 text-[#E5C48B] hover:bg-[#CCA166]/10 disabled:opacity-40">
                    {VITAL_LABEL[v]}
                  </button>
                ))}
                {!device.is_online && <span className="text-[11px] text-white/40">The watch is offline.</span>}
              </div>
            )}
            {/* Re-attach: swap to another watch (the current one is unlinked automatically) */}
            <div className="w-full flex flex-wrap items-end gap-2 pt-3 border-t border-white/5">
              <label className="flex flex-col gap-1 text-xs text-white/55">
                Change to another watch
                <select value={pick} onChange={(e) => setPick(e.target.value)}
                  className="px-3 py-1.5 bg-[#252528] border border-white/10 rounded-lg text-sm text-white w-72">
                  <option value="">{available.length ? "Select a watch…" : "No other unlinked watches"}</option>
                  {available.map((d) => <option key={d.id} value={d.id}>{watchLabel(d)}</option>)}
                </select>
              </label>
              <button disabled={!pick || busy}
                onClick={() => run(() => patientService.assignDevice(Number(pick), patientId), "Watch changed. The patient's schedule will be sent to the new watch.")}
                className="px-3 py-1.5 rounded-lg text-xs border border-[#CCA166]/50 text-[#E5C48B] hover:bg-[#CCA166]/10 disabled:opacity-40">Change watch</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-white/55">
              No 4G watch linked. Choose one of the hospital's registered watches:
              <select value={pick} onChange={(e) => setPick(e.target.value)}
                className="px-3 py-2 bg-[#252528] border border-white/10 rounded-lg text-sm text-white w-72">
                <option value="">{available.length ? "Select a watch…" : "No unlinked watches available"}</option>
                {available.map((d) => <option key={d.id} value={d.id}>{watchLabel(d)}</option>)}
              </select>
            </label>
            <button disabled={!pick || busy}
              onClick={() => run(() => patientService.assignDevice(Number(pick), patientId), "Watch linked. Its schedule will be sent when it's online.")}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#CCA166] text-[#1A1A1C] disabled:opacity-40">Link watch</button>
          </div>
        )}
      </section>

      {/* Extra data: respiratory rate, glucose, steps, sleep, location */}
      {device && <WatchDataPanel patientId={patientId} />}

      {/* Schedule */}
      <section className="rounded-[20px] bg-[#2f2f31] p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h4 className="text-base text-white">Measurement schedule</h4>
            <span className={`text-[11px] px-2 py-0.5 rounded-full ${levelCls}`}>{levelText}</span>
          </div>
          {canEdit && !editing && (
            <div className="flex items-center gap-2">
              {data.is_override && (
                <button disabled={busy} onClick={() => run(() => patientService.resetPatientMonitoring(patientId), "Back to the default schedule.")}
                  className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-white/60 hover:text-white">Reset to default</button>
              )}
              <button onClick={() => { setDraft(data.schedule); setEditing(true); }}
                className="px-3 py-1.5 rounded-lg text-xs bg-[#CCA166] text-[#1A1A1C] font-semibold">Change schedule</button>
            </div>
          )}
        </div>

        {device && cfg && (
          <div className="text-xs" style={{ color: cfgColor }}>
            {cfgText}{cfg.applied_at && cfg.status === "applied" ? ` · ${when(cfg.applied_at)}` : ""}
            {cfg.last_error && cfg.status !== "applied" ? <span className="text-white/45"> · {cfg.last_error}</span> : null}
          </div>
        )}

        {editing ? (
          <>
            <MonitoringScheduleForm value={draft} onChange={setDraft} deviceType={dtype} />
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => { setEditing(false); setDraft(data.schedule); }} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-white/60">Cancel</button>
              <button disabled={busy} onClick={() => run(() => patientService.setPatientMonitoring(patientId, draft), "Custom schedule saved for this patient.")}
                className="px-4 py-1.5 rounded-lg text-xs bg-[#CCA166] text-[#1A1A1C] font-semibold disabled:opacity-40">Save for this patient</button>
            </div>
          </>
        ) : (
          <>
            <MonitoringScheduleForm value={data.schedule} onChange={() => {}} disabled deviceType={dtype} />
            {data.is_override && (
              <p className="text-[11px] text-white/40">
                {data.default_level === "hospital" ? "Hospital default" : "Default for all hospitals"}: {scheduleSummary(data.default)}
              </p>
            )}
            {!canEdit && <p className="text-[11px] text-white/40">Only a doctor or an admin can change the schedule.</p>}
          </>
        )}
      </section>
    </div>
  );
}
