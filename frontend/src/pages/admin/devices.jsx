import React, { useEffect, useState } from "react";
import { Watch, RefreshCw, Plus, Copy, KeyRound, Power, Unlink } from "lucide-react";
import { adminService } from "../../services/adminService";
import { useAdmin } from "../../contexts/AdminContext";
import MonitoringScheduleForm from "../../components/monitoring/MonitoringScheduleForm";

// Veepoo 4G watches: default measurement schedule, registration (credentials shown once),
// status and schedule delivery per watch.

const CONFIG_BADGE = {
  applied: "text-[#2CD155] bg-[rgba(44,209,85,0.10)]",
  sent: "text-[#FFBB33] bg-[rgba(255,187,51,0.12)]",
  pending: "text-[#FFBB33] bg-[rgba(255,187,51,0.12)]",
  failed: "text-[#E54D4D] bg-[rgba(229,77,77,0.12)]",
  unsupported: "text-white/60 bg-white/5",
};

function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function CredentialsBox({ creds, onClose }) {
  const text = `Host: ${creds.host || "(set MQTT_PUBLIC_HOST)"}\nPort: ${creds.port} (TLS)\nClient ID: ${creds.client_id}\nUsername: ${creds.username}\nPassword: ${creds.password}`;
  return (
    <div className="rounded-2xl border border-[#CCA166]/40 bg-[#CCA166]/[0.06] p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[#E5C48B]">Watch credentials: shown only once</h4>
        <button onClick={onClose} className="text-xs text-white/50 hover:text-white">Done</button>
      </div>
      <pre className="text-xs text-white/85 bg-black/30 rounded-lg p-3 overflow-x-auto">{text}</pre>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigator.clipboard?.writeText(text)}
          className="inline-flex items-center gap-1.5 text-xs text-[#E5C48B] hover:underline"
        >
          <Copy className="size-3.5" /> Copy
        </button>
        <span className="text-[11px] text-white/45">
          Write these to the watch with the Veepoo provisioning app. If lost, use "Reset password".
        </span>
      </div>
    </div>
  );
}

export default function DevicesPage() {
  const { organizations, selectedOrgId } = useAdmin();
  const [devices, setDevices] = useState([]);
  const [defaults, setDefaults] = useState(null);
  const [savedDefaults, setSavedDefaults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [creds, setCreds] = useState(null);
  const [form, setForm] = useState({ client_id: "", organization_id: selectedOrgId ? String(selectedOrgId) : "" });
  const [busy, setBusy] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
  const load = () => { setLoading(true); setReloadKey((k) => k + 1); };

  useEffect(() => {
    let cancelled = false;
    Promise.all([adminService.listDevices(), adminService.getMonitoringDefaults()]).then(([d, s]) => {
      if (cancelled) return;
      if (d.success) setDevices(d.data);
      if (s.success) { setDefaults(s.data); setSavedDefaults(s.data); }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const orgName = (id) => organizations.find((o) => o.id === id)?.name || "—";
  const flash = (text, ok = true) => setMessage({ text, ok });

  const saveDefaults = async () => {
    setBusy(true);
    const res = await adminService.setMonitoringDefaults(defaults);
    setBusy(false);
    if (res.success) {
      setSavedDefaults(res.data);
      flash(`Default schedule saved. ${res.data.watches_updating} watch(es) on the default will be updated.`);
      load();
    } else flash(res.message, false);
  };

  const register = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await adminService.registerDevice({
      client_id: form.client_id.trim().toUpperCase(),
      organization_id: form.organization_id ? Number(form.organization_id) : null,
    });
    setBusy(false);
    if (res.success) {
      setCreds(res.data.credentials);
      setForm((f) => ({ ...f, client_id: "" }));
      load();
    } else flash(res.message, false);
  };

  const act = async (fn, okText) => {
    const res = await fn();
    if (res.success) {
      if (res.data?.credentials) setCreds(res.data.credentials);
      flash(okText);
      load();
    } else flash(res.message, false);
  };

  const dirty = JSON.stringify(defaults) !== JSON.stringify(savedDefaults);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#CCA166]/15 text-[#CCA166] flex items-center justify-center">
            <Watch className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">4G Watches</h1>
            <p className="text-xs text-white/45">Veepoo watches that send vitals directly over 4G (MQTT)</p>
          </div>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-2.5 text-sm ${message.ok ? "bg-[rgba(44,209,85,0.10)] text-[#7FE39A]" : "bg-[rgba(229,77,77,0.12)] text-[#FF9A9A]"}`}>
          {message.text}
        </div>
      )}

      {/* Default schedule */}
      <section className="rounded-2xl bg-[#1C1C1F] border border-white/5 p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">Default measurement schedule</h2>
            <p className="text-xs text-white/45">Used by every 4G patient unless a doctor sets a custom schedule for them.</p>
          </div>
          <button
            onClick={saveDefaults} disabled={!dirty || busy}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#CCA166] text-[#1A1A1C] disabled:opacity-40"
          >
            Save default
          </button>
        </div>
        {defaults ? <MonitoringScheduleForm value={defaults} onChange={setDefaults} /> : <div className="h-40 animate-pulse rounded-xl bg-white/5" />}
      </section>

      {/* Register */}
      <section className="rounded-2xl bg-[#1C1C1F] border border-white/5 p-5 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-white">Register a watch</h2>
        <form onSubmit={register} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-white/55">
            Client ID (MAC_DeviceNumber)
            <input
              required value={form.client_id} placeholder="F1F2F3F4F5F6_9999"
              onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
              className="px-3 py-2 bg-[#252528] border border-white/10 rounded-lg text-sm text-white w-64 focus:outline-none focus:border-[#CCA166]/60"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/55">
            Hospital
            <select
              value={form.organization_id}
              onChange={(e) => setForm((f) => ({ ...f, organization_id: e.target.value }))}
              className="px-3 py-2 bg-[#252528] border border-white/10 rounded-lg text-sm text-white w-56"
            >
              <option value="">Select hospital…</option>
              {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#CCA166] text-[#1A1A1C] disabled:opacity-40">
            <Plus className="size-4" /> Register
          </button>
        </form>
        {creds && <CredentialsBox creds={creds} onClose={() => setCreds(null)} />}
      </section>

      {/* List */}
      <section className="rounded-2xl bg-[#1C1C1F] border border-white/5 p-5">
        <h2 className="text-base font-semibold text-white mb-3">Watches</h2>
        {devices.length === 0 ? (
          <p className="text-sm text-white/40">{loading ? "Loading…" : "No watches registered yet."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-white/45">
                <tr>
                  {["Client ID", "Hospital", "Patient", "Status", "Battery", "Schedule", "Last seen", "Firmware", ""].map((h) => (
                    <th key={h} className="text-left font-medium px-3 py-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id} className="border-t border-white/5 text-white/80">
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{d.client_id}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{orgName(d.organization_id)}</td>
                    <td className="px-3 py-2">{d.patient_id ? `#${d.patient_id}` : <span className="text-white/35">Not linked</span>}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {!d.is_active ? <span className="text-white/40">Disabled</span>
                        : d.is_online ? <span className="text-[#2CD155]">● Online</span>
                        : <span className="text-white/50">○ Offline</span>}
                      {d.duplicate_login_at && <div className="text-[11px] text-[#FFBB33]">Duplicate login {when(d.duplicate_login_at)}</div>}
                    </td>
                    <td className="px-3 py-2">{d.battery_percent != null ? `${d.battery_percent}%` : "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {d.config ? (
                        <span title={d.config.last_error || ""} className={`text-[11px] px-2 py-0.5 rounded-full ${CONFIG_BADGE[d.config.status] || "text-white/60"}`}>
                          {d.config.status}
                        </span>
                      ) : <span className="text-white/35">—</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">{when(d.last_seen_at)}</td>
                    <td className="px-3 py-2 text-xs">{d.firmware || "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 justify-end">
                        <button title="Reset password" onClick={() => act(() => adminService.resetDevicePassword(d.id), "New password issued. Re-provision the watch.")} className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white"><KeyRound className="size-4" /></button>
                        {d.patient_id && (
                          <button title="Unlink from patient" onClick={() => act(() => adminService.unassignDevice(d.id), "Watch unlinked.")} className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white"><Unlink className="size-4" /></button>
                        )}
                        <button title={d.is_active ? "Disable" : "Enable"} onClick={() => act(() => adminService.setDeviceStatus(d.id, !d.is_active), d.is_active ? "Watch disabled." : "Watch enabled.")} className={`p-1.5 rounded-lg hover:bg-white/5 ${d.is_active ? "text-white/60 hover:text-[#FF9A9A]" : "text-[#2CD155]"}`}><Power className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
