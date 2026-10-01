# Wonlex and CLOC BPW8 watches: runbook

How to deploy the `device-gateway`, onboard a watch, check it's working, and fix the common problems. Design and background: `docs/tcp-watches-integration-plan.md` (kept locally; root `docs/` is gitignored).

## What runs

| Service | What it does |
|---|---|
| `device-gateway` (`python -m app.gateway`) | Holds every Wonlex (port **7700**) and BPW8 (port **7701**) TCP connection. Stores each frame, replies, and turns readings into vitals through the shared ingest pipeline. Run **exactly one**. |
| `backend` | API: register / link watches, schedules, measure now. Sends commands to the gateway through the Redis list `gateway:commands`. |
| `mqtt-worker` | Veepoo watches only. Ignores TCP watches. |

Readings land in `vitals` with `source` = `wonlex` or `bpw8`. Values that don't feed NEWS2 go to `patient_metrics` (respiratory rate, glucose, lipids, uric acid, steps, kcal, ambient/surface temperature, raw RR intervals). Sleep goes to `sleep_sessions` (one row per watch per night), positions to `device_locations` (30 days). HRV for BPW8 is computed by us (RMSSD) from its RR intervals. Every frame is in `mqtt_raw_messages` with `transport = 'tcp'` for 30 days.

## Feature flag (who sees the screens)

All 4G watch screens (Veepoo, Wonlex and BPW8) are behind the frontend flag `watches4g`: the admin **4G Watches** page and menu item, the patient **4G Watch** tab (with Watch data), and the watch picker in patient registration.

- **Off by default.** To turn it on in your browser, open any VitalVue page with `?ff=watches4g` (e.g. `https://vitalvue.genesysailabs.com/admin/devices?ff=watches4g`). It's remembered in that browser (`localStorage["vv.ff.watches4g"] = "1"`). `?ff=-watches4g` turns it off again.
- **Make it public** for everyone: set `VITE_FF_WATCHES_4G=true` in the frontend build environment and redeploy the frontend.
- The flag only hides the UI. The watch API keeps its normal role checks, and the backend services (gateway, mqtt-worker) run either way. The NEWS2 and "latest vitals" fixes are not behind the flag.

## One-time production setup

1. **Fixed IP.** Attach an Elastic IP to the server. BPW8 watches are given the server's IP by SMS, so if it changes, every BPW8 has to be re-sent the SMS.
2. **DNS** for Wonlex: a DNS-only record (no CloudFront, no proxy) such as `devices.vitalvue.genesysailabs.com` → the Elastic IP.
3. **Security group:** open **7700/tcp** and **7701/tcp**. If the SIMs use a private APN, allow only the carrier's range.
4. **`.env` on the server** (`~/vitalvue/.env`):
   ```
   GATEWAY_PUBLIC_HOST=devices.vitalvue.genesysailabs.com   # given to Wonlex
   GATEWAY_PUBLIC_IP=<elastic ip>                            # given to BPW8 (in the SMS)
   WONLEX_SIGN_KEY=<key from Wonlex>                         # empty = signatures not checked
   WONLEX_SIGNATURE=warn                                     # warn → enforce once real frames verify
   # optional: GATEWAY_WONLEX_PORT / GATEWAY_BPW8_PORT (0 disables a type), GATEWAY_IDLE_TIMEOUT_S=600
   ```
5. **Deploy** with `backend/deploy.sh`. It builds, runs `alembic upgrade head` (migrations `c3e5a7b9d1f3`, `e7a9c1b3d5f7` and `f8b0d2e4a6c8`, all additive), and starts `device-gateway` with the other services. Take a `pg_dump` first.
6. **Check it's listening:** `docker logs vitalvue_device_gateway | head` should show `listening on port 7700` and `7701`.

## Onboarding a watch

**Wonlex**
1. Admin → **4G Watches** → *Register a watch* → type **Wonlex 4G**, enter the IMEI (box, or `*#06#`), pick the hospital.
2. Ask Wonlex to set the watch to **TCP mode** with the host and port shown. (Wonlex watches ship pointed at the vendor's own cloud.)
3. When it connects, the list shows it **Online**, with model and firmware.
4. On the patient's **4G Watch** tab, link it. The schedule goes out at once and shows **Applied** when the watch confirms.

**CLOC BPW8**
1. Register it as **CLOC BPW8** with its IMEI.
2. Text the SMS shown (`BY,SSAR,<ip>,7701`) to the watch's SIM.
3. It shows **Online** after it restarts and sends `VER`.
4. Link it on the patient's tab. The schedule shows **Sent (this watch doesn't confirm settings)**. That's normal: BPW8 never acknowledges, and the gateway resends the schedule on every reconnect.

## Retiring a watch (archive)

A watch that's lost, broken or returned is **archived**, not deleted: deleting it would lose which patient wore it when. On Admin → 4G Watches, use the archive icon on its row (with an optional reason). It's unlinked, disconnected if online, disabled and hidden from the list and the bedside picker; its readings and link history stay. **Show archived** lists archived watches; **Restore** makes one active again (unlinked). Re-registering an archived IMEI is refused with a pointer to Restore.

## Schedules in one paragraph

Patient override → hospital default → global default. Doctors and admins set the patient level, the hospital's default is set on the admin page with that hospital selected, and the global default with "All hospitals" selected. Each vital is then either measured **by the watch**, **requested by the server** (the gateway sends "measure now" when due; only while connected and worn; more battery), or **raised to the watch's minimum** (BPW8: 10 min). The patient's tab shows which.

## Is it working?

```sql
-- watches and their state
select type, client_id, is_online, last_seen_at, last_ip, battery_percent, duplicate_login_at
from devices where transport = 'tcp' order by last_seen_at desc nulls last;

-- what one watch has sent in the last hour, and how each frame was handled
select received_at, topic, parse_status, parse_error from mqtt_raw_messages
where client_id = '<imei>' and received_at > now() at time zone 'utc' - interval '1 hour'
order by id desc limit 50;

-- readings stored from 4G TCP watches today
select source, count(*) from vitals where source in ('wonlex','bpw8')
and created_at > date_trunc('day', now() at time zone 'utc') group by source;
```

`parse_status` values: `parsed` (used), `stored` (acknowledged, kept for later, e.g. sleep), `duplicate` (a resend, ignored), `rejected` (refused: wrong IMEI in the frame, bad signature in enforce mode), `unknown_device` (IMEI not registered, disabled, or registered as another type), `error` (failed; the message has the reason).

## Troubleshooting

| Symptom | Check | Fix |
|---|---|---|
| Watch never shows Online | Any `unknown_device` rows for its IMEI? The note says why: *not registered*, *disabled*, or *registered as …* (wrong type or wrong port). No rows at all means it isn't reaching us | Register it or enable it with the right type. No rows: check the SMS / Wonlex config, the security group, DNS (Wonlex), and that the watch's SIM has data |
| Online but no vitals | Is it linked to a patient? Raw rows `parsed` but no `vitals`? `parse_error` like `implausible: …`? | Link it. Implausible values are dropped on purpose (sensor errors). A wrong watch clock is replaced with the receive time automatically |
| Schedule **Failed** (Wonlex) | Three sends without an answer | Check the watch is online, then save the schedule again. If it keeps failing, ask Wonlex whether this firmware supports `deviceMeasuringFrequency` |
| "Duplicate connection" warning | Two connections used the same IMEI | Normal once after a quick reconnect. If it repeats, the IMEI may be cloned or faked: disable the watch and investigate |
| "Refused messages today" | `rejected` / `error` rows for the IMEI | Read `parse_error`. Signature mismatches: check `WONLEX_SIGN_KEY` with Wonlex before switching to `enforce` |
| Patient flips to offline between readings | Watch heartbeats arriving? | The patient stays online while any frame arrives within `GATEWAY_IDLE_TIMEOUT_S` (+ grace). If the watch's heartbeat interval is longer, raise it |
| No "Watch data" on the patient tab | Any `patient_metrics` / `sleep_sessions` rows for the patient? Raw `parse_error` like `implausible: resp_rate=…`? | The panel shows only what the watch sends. Wonlex sends sleep after the night ends (around the set wake time); implausible values are dropped on purpose |
| Measure now does nothing | Watch online? A 429 means a request in the last 2 minutes | Wait, or check the watch is worn (server-requested measurements pause while it's off the wrist) |

Restarting the gateway is safe: watches reconnect by themselves within a minute or two, and anything they couldn't send is resent (dedupe prevents duplicates).

## Testing without real watches

```bash
# a simulated watch against a running gateway (scenarios: normal, sos, removed, resend)
python -m simulators.tcp_watch_sim --type bpw8 --imei 867956070000018 --every 20

# end-to-end check (API, gateway, both watch types, database, live stream): 59 checks
DATABASE_URL=postgresql://… REDIS_URL=redis://… python -m simulators.e2e_tcp_check

# load: 500 watches, one report per minute each
DATABASE_URL=… REDIS_URL=… python -m simulators.load_test --watches 500 --every 60
```

The last two write and delete test rows: **never run them against production.** They never contact MSG91 or FCM.

## Rollback

Stop the gateway (`docker-compose stop device-gateway`). Veepoo and BLE are unaffected. The migration is additive. Its downgrade removes the new columns and tables, and also any hospital-level default schedules.
