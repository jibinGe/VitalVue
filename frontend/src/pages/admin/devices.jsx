import React, { useEffect, useState } from "react";
import { Watch, RefreshCw, Plus, Copy, KeyRound, Power, Unlink, MapPin, RotateCw } from "lucide-react";
import { adminService } from "../../services/adminService";
import { useAdmin } from "../../contexts/AdminContext";
import MonitoringScheduleForm from "../../components/monitoring/MonitoringScheduleForm";

// 4G watches (Veepoo over MQTT; Wonlex and CLOC BPW8 over TCP): default measurement schedules
// (per hospital, or the global one), registration, status and schedule delivery per watch.

const CONFIG_BADGE = {
  applied: "text-[#2CD155] bg-[rgba(44,209,85,0.10)]",
  sent: "text-[#FFBB33] bg-[rgba(255,187,51,0.12)]",
  pending: "text-[#FFBB33] bg-[rgba(255,187,51,0.12)]",
  failed: "text-[#E54D4D] bg-[rgba(229,77,77,0.12)]",
  unsupported: "text-white/60 bg-white/5",
};
const ID_PLACEHOLDER = { veepoo_4g: "F1F2F3F4F5F6_9999", wonlex_4g: "15-digit IMEI", bpw8_4g: "15-digit IMEI" };

function when(iso) {
  if (!iso) return "—";
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1500); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(() => {});
  };
  return (
    <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 text-xs text-[#E5C48B] hover:underline">
      <Copy className="size-3.5" /> {copied ? "Copied" : "Copy"}
    </button>
  );
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
        <CopyButton text={text} />
        <span className="text-[11px] text-white/45">
          Write these to the watch with the Veepoo provisioning app. If lost, use "Reset password".
        </span>
      </div>
    </div>
  );
}

// Wonlex and BPW8 have no password: they're identified by IMEI and pointed at the gateway.
function SetupBox({ setup, onClose }) {
  const isBpw8 = setup.type === "bpw8_4g";
  const address = isBpw8 ? (setup.ip || "(set GATEWAY_PUBLIC_IP)") : (setup.host || "(set GATEWAY_PUBLIC_HOST)");
  return (
    <div className="rounded-2xl border border-[#CCA166]/40 bg-[#CCA166]/[0.06] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[#E5C48B]">Watch registered: point it at VitalVue</h4>
        <button onClick={onClose} className="text-xs text-white/50 hover:text-white">Done</button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
        <dt className="text-white/45">IMEI</dt><dd className="font-mono text-white/85">{setup.imei}</dd>
        <dt className="text-white/45">{isBpw8 ? "Server IP" : "Server host"}</dt><dd className="font-mono text-white/85">{address}</dd>
        <dt className="text-white/45">Port</dt><dd className="font-mono text-white/85">{setup.port} (TCP)</dd>
      </dl>
      {isBpw8 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-white/70">Send this text message to the watch's SIM card:</span>
          <div className="flex items-center gap-3">
            <code className="text-sm text-white bg-black/30 rounded-lg px-3 py-1.5 font-mono">{setup.sms}</code>
            <CopyButton text={setup.sms} />
          </div>
        </div>
      ) : (
        <p className="text-xs text-white/70">
          Ask Wonlex to set this watch to TCP mode with the host and port above. It appears as online here when it connects.
        </p>
      )}
      <p className="text-[11px] text-white/45">There is no password: only registered, enabled IMEIs are accepted.</p>
    </div>
  );
}

export default function DevicesPage() {
  const { organizations, selectedOrgId } = useAdmin();
  const [devices, setDevices] = useState([]);
  const [types, setTypes] = useState([]);
  const [defaults, setDefaults] = useState(null);
  const [savedDefaults, setSavedDefaults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [creds, setCreds] = useState(null);
  const [setup, setSetup] = useState(null);
  const [form, setForm] = useState({ type: "veepoo_4g", id: "", organization_id: selectedOrgId ? String(selectedOrgId) : "" });
  const [busy, setBusy] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
  const load = () => { setLoading(true); setReloadKey((k) => k + 1); };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      adminService.listDevices(), adminService.getMonitoringDefaults(selectedOrgId), adminService.getDeviceTypes(),
    ]).then(([d, s, t]) => {
      if (cancelled) return;
      if (d.success) setDevices(d.data);
      if (s.success) { setDefaults(s.data); setSavedDefaults(s.data); }
      if (t.success) setTypes(t.data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reloadKey, selectedOrgId]);

  const orgName = (id) => organizations.find((o) => o.id === id)?.name || "—";
  const typeOf = (key) => types.find((t) => t.key === key);
  const flash = (text, ok = true) => setMessage({ text, ok });
  const hospital = selectedOrgId ? orgName(selectedOrgId) : null;

  const saveDefaults = async () => {
    setBusy(true);
    const res = await adminService.setMonitoringDefaults(defaults, selectedOrgId);
    setBusy(false);
    if (res.success) {
      setSavedDefaults(res.data);
      flash(`${hospital ? `${hospital}'s default` : "The default for all hospitals"} saved. ${res.data.watches_updating} watch(es) will be updated.`);
      load();
    } else flash(res.message, false);
  };

  const resetDefaults = async () => {
    setBusy(true);
    const res = await adminService.resetMonitoringDefaults(selectedOrgId);
    setBusy(false);
    if (res.success) {
      flash(`${hospital} now uses the default for all hospitals. ${res.data.watches_updating} watch(es) will be updated.`);
      load();
    } else flash(res.message, false);
  };

  const register = async (e) => {
    e.preventDefault();
    setBusy(true);
    const isVeepoo = form.type === "veepoo_4g";
    const res = await adminService.registerDevice({
      type: form.type,
      ...(isVeepoo ? { client_id: form.id.trim().toUpperCase() } : { imei: form.id.trim() }),
      organization_id: form.organization_id ? Number(form.organization_id) : null,
    });
    setBusy(false);
    if (res.success) {
      setCreds(res.data.credentials || null);
      setSetup(res.data.setup || null);
      setForm((f) => ({ ...f, id: "" }));
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
  const formType = typeOf(form.type);
  const iconBtn = "p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#CCA166]/15 text-[#CCA166] flex items-center justify-center">
            <Watch className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">4G Watches</h1>
            <p className="text-xs text-white/45">Watches with their own SIM that send vitals directly: Veepoo (MQTT), Wonlex and CLOC BPW8 (TCP)</p>
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

      {/* Default schedule: the selected hospital's, or the one for all hospitals */}
      <section className="rounded-2xl bg-[#1C1C1F] border border-white/5 p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                {hospital ? `Default schedule for ${hospital}` : "Default schedule for all hospitals"}
              </h2>
              {hospital && savedDefaults && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${savedDefaults.inherited ? "bg-white/5 text-white/60" : "bg-[#CCA166]/15 text-[#E5C48B]"}`}>
                  {savedDefaults.inherited ? "Uses the default for all hospitals" : "Set for this hospital"}
                </span>
              )}
            </div>
            <p className="text-xs text-white/45">
              {hospital
                ? "Used by this hospital's 4G patients unless a doctor sets a custom schedule for them. Saving creates this hospital's own default."
                : "Used by every hospital that has no default of its own. Select a hospital at the top to set one for it."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hospital && savedDefaults && !savedDefaults.inherited && (
              <button onClick={resetDefaults} disabled={busy}
                className="px-3 py-2 rounded-xl text-xs border border-white/10 text-white/60 hover:text-white disabled:opacity-40">
                Use the default for all hospitals
              </button>
            )}
            <button onClick={saveDefaults} disabled={!dirty || busy}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#CCA166] text-[#1A1A1C] disabled:opacity-40">
              Save default
            </button>
          </div>
        </div>
        {defaults ? <MonitoringScheduleForm value={defaults} onChange={setDefaults} types={types} />
          : <div className="h-40 animate-pulse rounded-xl bg-white/5" />}
      </section>

      {/* Register */}
      <section className="rounded-2xl bg-[#1C1C1F] border border-white/5 p-5 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-white">Register a watch</h2>
        <form onSubmit={register} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-white/55">
            Watch type
            <select id="register-type" value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value, id: "" }))}
              className="px-3 py-2 bg-[#252528] border border-white/10 rounded-lg text-sm text-white w-44">
              {(types.length ? types : [{ key: "veepoo_4g", label: "Veepoo 4G" }]).map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/55">
            {formType?.id_label || "Client ID (MAC_DeviceNumber)"}
            <input id="register-id" required value={form.id} placeholder={ID_PLACEHOLDER[form.type] || ""}
              inputMode={form.type === "veepoo_4g" ? "text" : "numeric"}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              className="px-3 py-2 bg-[#252528] border border-white/10 rounded-lg text-sm text-white w-64 font-mono focus:outline-none focus:border-[#CCA166]/60" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/55">
            Hospital
            <select id="register-org" value={form.organization_id}
              onChange={(e) => setForm((f) => ({ ...f, organization_id: e.target.value }))}
              className="px-3 py-2 bg-[#252528] border border-white/10 rounded-lg text-sm text-white w-56">
              <option value="">Select hospital…</option>
              {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#CCA166] text-[#1A1A1C] disabled:opacity-40">
            <Plus className="size-4" /> Register
          </button>
        </form>
        {form.type !== "veepoo_4g" && (
          <p className="text-[11px] text-white/40">The IMEI is printed on the box, or dial *#06# on the watch.</p>
        )}
        {creds && <CredentialsBox creds={creds} onClose={() => setCreds(null)} />}
        {setup && <SetupBox setup={setup} onClose={() => setSetup(null)} />}
      </section>

      {/* List */}
      <section className="rounded-2xl bg-[#1C1C1F] border border-white/5 p-5">
        <h2 className="text-base font-semibold text-white mb-3">Watches</h2>
        {devices.length === 0 ? (
          <p className="text-sm text-white/40">{loading ? "Loading…" : "No watches registered yet."}</p>
        ) : (
          // w-0 + min-w-full: scroll inside the card instead of widening the admin layout
          <div className="overflow-x-auto w-0 min-w-full">
            <table className="w-full text-sm">
              <thead className="text-xs text-white/45">
                <tr>
                  {["Type", "ID", "Hospital", "Patient", "Status", "Battery", "Schedule", "Last seen", "Firmware", ""].map((h) => (
                    <th key={h} className="text-left font-medium px-3 py-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => {
                  const tcp = d.transport === "tcp";
                  return (
                    <tr key={d.id} className="border-t border-white/5 text-white/80 align-top">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {d.type_label}
                        {d.model && <div className="text-[11px] text-white/40">{d.model}</div>}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{d.client_id}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{orgName(d.organization_id)}</td>
                      <td className="px-3 py-2">{d.patient_id ? `#${d.patient_id}` : <span className="text-white/35">Not linked</span>}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {!d.is_active ? <span className="text-white/40">Disabled</span>
                          : d.is_online ? <span className="text-[#2CD155]">● Online</span>
                          : <span className="text-white/50">○ Offline</span>}
                        {d.last_ip && <div className="text-[11px] text-white/35 font-mono">{d.last_ip}</div>}
                        {d.duplicate_login_at && (
                          <div className="text-[11px] text-[#FFBB33]" title="Two connections used this ID at once: a cloned or faked watch?">
                            Duplicate connection {when(d.duplicate_login_at)}
                          </div>
                        )}
                        {d.problem_frames_24h > 0 && (
                          <div className="text-[11px] text-[#FFBB33]" title="Messages refused or unreadable in the last 24 hours">
                            {d.problem_frames_24h} refused message{d.problem_frames_24h === 1 ? "" : "s"} today
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">{d.battery_percent != null ? `${d.battery_percent}%` : "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {d.config ? (
                          <span title={d.config.last_error || ""} className={`text-[11px] px-2 py-0.5 rounded-full ${CONFIG_BADGE[d.config.status] || "text-white/60"}`}>
                            {d.config.status === "sent" && tcp && !typeOf(d.type)?.confirms_schedule ? "sent (not confirmed by watch)" : d.config.status}
                          </span>
                        ) : <span className="text-white/35">—</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs">{when(d.last_seen_at)}</td>
                      <td className="px-3 py-2 text-xs">{d.firmware || "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 justify-end">
                          {!tcp && (
                            <button title="Reset password" onClick={() => act(() => adminService.resetDevicePassword(d.id), "New password issued. Re-provision the watch.")} className={iconBtn}><KeyRound className="size-4" /></button>
                          )}
                          {tcp && d.is_online && (
                            <>
                              <button title="Ask for its location" onClick={() => act(() => adminService.deviceCommand(d.id, "locate"), "Location requested.")} className={iconBtn}><MapPin className="size-4" /></button>
                              <button title="Restart the watch" onClick={() => act(() => adminService.deviceCommand(d.id, "reboot"), "Restart sent. The watch reconnects in a minute or two.")} className={iconBtn}><RotateCw className="size-4" /></button>
                            </>
                          )}
                          {d.patient_id && (
                            <button title="Unlink from patient" onClick={() => act(() => adminService.unassignDevice(d.id), "Watch unlinked.")} className={iconBtn}><Unlink className="size-4" /></button>
                          )}
                          <button title={d.is_active ? "Disable (disconnects it now)" : "Enable"} onClick={() => act(() => adminService.setDeviceStatus(d.id, !d.is_active), d.is_active ? "Watch disabled." : "Watch enabled.")} className={`p-1.5 rounded-lg hover:bg-white/5 ${d.is_active ? "text-white/60 hover:text-[#FF9A9A]" : "text-[#2CD155]"}`}><Power className="size-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
