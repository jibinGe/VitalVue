import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { startAlarm, stopAlarm, startWarningAlarm, startCriticalVoiceAlert, startBandRemovedAlert, startBluetoothDisconnectAlert } from "@/utilities/alarmSound";

function CriticalAlarmCard({ alarmData, onDismiss, onSnooze, onTakeAction, onViewPatient, isTvMode }) {
  const {
    patientName,
    room,
    ward,
    phoneNumber,
    vitals = {},
    alert = null,
    isConnected = true,
    isRemoved = false,
  } = alarmData;

  const isWarning = alert?.severity?.toLowerCase() === 'warning';
  const isAlertBandRemoved = alert?.vital_type === "Band Status" && alert?.triggered_value === "Removed";
  const isNetworkDisconnected = alert?.vital_type === "Connectivity" && alert?.triggered_value === "Network Disconnected";
  const isAlertBluetoothDisconnected = alert?.vital_type === "Connectivity" && alert?.triggered_value === "Disconnected";

  const currentIsConnected = isAlertBandRemoved ? true : (isAlertBluetoothDisconnected ? false : (isConnected !== false && !isNetworkDisconnected));
  const currentIsRemoved = isAlertBandRemoved || isRemoved === true;

  const isDeviceAlarm = !currentIsConnected || currentIsRemoved;
  const isBlueAlert = isNetworkDisconnected || isAlertBluetoothDisconnected;
  const themeColor = isBlueAlert ? '#3B9EFF' : isDeviceAlarm ? '#F8FD1E' : (isWarning ? '#E5A54D' : '#E54D4D');
  const themeColorRgba = isBlueAlert ? '59,158,255' : isDeviceAlarm ? '248,253,30' : (isWarning ? '229,165,77' : '229,77,77');

  const borderStyle = isBlueAlert
    ? '6px solid rgb(59 158 255)'
    : isDeviceAlarm
      ? '6px solid rgb(248 253 30)'
      : `6px solid rgba(${themeColorRgba},0.4)`;

  const hr = vitals?.heartRate?.value != null ? Math.round(vitals.heartRate.value) : vitals?.heartRate != null && vitals.heartRate !== "—" ? Math.round(vitals.heartRate) : "—";
  const spo2 = vitals?.spo2?.value != null ? Math.round(vitals.spo2.value) : vitals?.spo2 != null && vitals.spo2 !== "—" ? Math.round(vitals.spo2) : "—";
  const systolic = vitals?.bloodPressure?.systolic != null ? Math.round(vitals.bloodPressure.systolic) : "—";
  const diastolic = vitals?.bloodPressure?.diastolic != null ? Math.round(vitals.bloodPressure.diastolic) : "—";
  const temp = vitals?.temperature?.value != null ? Math.round(vitals.temperature.value) : vitals?.temperature != null && vitals.temperature !== "—" ? Math.round(vitals.temperature) : "—";

  return (
    <motion.div
      initial={{ scale: 0.92, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.95, opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative w-full max-w-[480px] rounded-[28px] overflow-hidden shrink-0"
      style={{
        background: "linear-gradient(145deg, #1a0a0a, #1e1010)",
        border: borderStyle,
        boxShadow:
          `0 0 0 1px rgba(${themeColorRgba},0.15), 0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(${themeColorRgba},0.12)`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <motion.div
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        style={{
          height: 4,
          width: "100%",
          background: `linear-gradient(90deg, transparent, ${themeColor}, transparent)`,
        }}
      />
      <div className="p-7 flex flex-col items-center text-center">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          className="mb-5 flex items-center justify-center rounded-full"
          style={{
            width: 72,
            height: 72,
            background: `rgba(${themeColorRgba},0.12)`,
            border: `1.5px solid rgba(${themeColorRgba},0.4)`,
            boxShadow: `0 0 30px rgba(${themeColorRgba},0.2)`,
          }}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 8.12695V12.9072"
              stroke={themeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M11.9994 19.9904H5.93944C2.46944 19.9904 1.01944 17.6194 2.69944 14.7226L5.81944 9.34962L8.75944 4.30169C10.5394 1.23277 13.4594 1.23277 15.2394 4.30169L18.1794 9.35918L21.2994 14.7322C22.9794 17.629 21.5194 20 18.0594 20H11.9994V19.9904Z"
              stroke={themeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M11.9961 15.7754H12.0051"
              stroke={themeColor}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </motion.div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <motion.p
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className={`${isTvMode ? 'text-base' : 'text-lg'} font-semibold tracking-[0.2em] uppercase`}
            style={{ color: themeColor }}
          >
            {isDeviceAlarm ? "🔔 Device Alert" : isWarning ? "⚠️ Warning Alert" : "🚨 Vital Alert"}
          </motion.p>
          {isDeviceAlarm && currentIsConnected && currentIsRemoved && (
            <motion.span
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(248,253,30,0.15)',
                border: '1px solid rgba(248,253,30,0.5)',
                color: '#F8FD1E',
              }}
            >
              Band Removed
            </motion.span>
          )}
        </div>

        <h2 className={`${isTvMode ? 'text-xl' : 'text-2xl'} font-bold text-white mb-2`}>
          {patientName || "Patient"}
        </h2>
        {(room || ward) && (
          <div className="flex items-center justify-center gap-2 mb-2">
            {room && (
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{
                  background: `rgba(${themeColorRgba},0.1)`,
                  border: `1px solid rgba(${themeColorRgba},0.3)`,
                }}
              >
                <span className="text-base font-semibold" style={{ color: themeColor }}>Ward: {ward}</span>
                <span className="text-base font-semibold ml-4" style={{ color: themeColor }}>Room No: {room}</span>
              </div>
            )}
            {!room && ward && (
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                style={{
                  background: `rgba(${themeColorRgba},0.1)`,
                  border: `1px solid rgba(${themeColorRgba},0.3)`,
                }}
              >
                <span className="text-base font-semibold" style={{ color: themeColor }}>Ward No: {ward}</span>
              </div>
            )}
          </div>
        )}
        {phoneNumber && (
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{
                background: `rgba(${themeColorRgba},0.08)`,
                border: `1px solid rgba(${themeColorRgba},0.25)`,
              }}
            >
              <span className={`${isTvMode ? 'text-base' : 'text-xl'} font-semibold`} >{phoneNumber}</span>
            </div>
          </div>
        )}
        {!phoneNumber && !(room || ward) && <div className="mb-5" />}

        <div
          className="w-full h-px mb-5"
          style={{
            background: `linear-gradient(90deg,transparent,rgba(${themeColorRgba},0.3),transparent)`,
          }}
        />

        {!isDeviceAlarm && (alert?.vital_type || vitals?._alertVitalType) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-xl px-4 py-3 mb-4 flex items-center justify-between"
            style={{
              background: `rgba(${themeColorRgba},0.1)`,
              border: `1px solid rgba(${themeColorRgba},0.35)`,
            }}
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: themeColor,
                  flexShrink: 0,
                }}
              />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: themeColor }}>
                Triggered Alert
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#888] mb-0.5">
                {alert?.vital_type ?? vitals?._alertVitalType}
              </p>
              <p className="text-sm font-bold" style={{ color: themeColor }}>
                {(() => {
                  const val = alert?.triggered_value ?? vitals?._alertTriggeredVal;
                  if (val == null) return "—";
                  if (typeof val === 'number') return Math.round(val);
                  return String(val);
                })()}
              </p>
            </div>
          </motion.div>
        )}

        {isDeviceAlarm ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl px-5 py-5 mb-6 flex flex-col items-center gap-3 text-center"
            style={{
              background: isBlueAlert ? 'rgba(59,158,255,0.08)' : 'rgba(248,253,30,0.06)',
              border: isBlueAlert ? '1px solid rgba(59,158,255,0.3)' : '1px solid rgba(248,253,30,0.25)',
            }}
          >
            <p className={`${isTvMode ? 'text-sm' : 'text-sm'} font-bold`} style={{ color: isBlueAlert ? '#3B9EFF' : '#F8FD1E' }}>
              {isNetworkDisconnected ? "Network Disconnected" : currentIsConnected === false ? "Bluetooth Disconnected" : "Band Removed"}
            </p>
            <p className={`${isTvMode ? 'text-base' : 'text-lg'} text-[#aaa] leading-relaxed`}>
              {isNetworkDisconnected
                ? "The device has lost its network connection. Please check the WiFi or network settings."
                : currentIsConnected === false
                  ? "Please check the Bluetooth connection and ensure the device is within range."
                  : "Please ensure the band is properly placed on the patient."}
            </p>
          </motion.div>
        ) : (
          <>
            <p className="text-xs text-[#888] uppercase tracking-wider mb-3">
              Current Vitals
            </p>
            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              {[
                { label: "Heart Rate", value: hr !== "—" ? `${hr} bpm` : "—", critical: hr !== "—" && hr > 120 },
                { label: "SpO₂", value: spo2 !== "—" ? `${spo2}%` : "—", critical: spo2 !== "—" && spo2 < 94 },
                { label: "Blood Pressure", value: systolic !== "—" ? `${systolic}/${diastolic} mmHg` : "—", critical: systolic !== "—" && systolic > 140 },
                { label: "Skin Temp", value: temp !== "—" ? `${temp}°C` : "—", critical: temp !== "—" && temp > 38 },
              ].map(({ label, value, critical }) => (
                <div
                  key={label}
                  className="rounded-xl px-3 py-2.5 text-left"
                  style={{
                    background: critical ? `rgba(${themeColorRgba},0.08)` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${critical ? `rgba(${themeColorRgba},0.3)` : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <p className="text-[10px] text-[#888] mb-1">{label}</p>
                  <p
                    className="text-base font-semibold"
                    style={{ color: critical ? themeColor : "#fff" }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-3 w-full">
          {!isTvMode && (
            <button
              onClick={() => onSnooze(alarmData)}
              className="flex-1 py-3 rounded-2xl text-sm font-medium transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#aaa",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontSize: isTvMode ? '14px' : '16px',
                fontWeight: 600,
                fontFamily: "Open Sans",
              }}
            >
              SNOOZE
            </button>
          )}
          {!isTvMode && (
            <button
              onClick={() => onTakeAction(alarmData)}
              className="flex-1 py-3 rounded-2xl text-sm font-medium transition-all"
              style={{
                background: `rgba(${themeColorRgba},0.2)`,
                border: `1px solid rgba(${themeColorRgba},0.4)`,
                color: themeColor,
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontSize: '16px',
                fontWeight: 600,
                fontFamily: "Open Sans",
              }}
            >
              TAKE ACTION
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function CriticalAlarmModal({
  alarms = [],
  onDismiss,
  onSnooze,
  onTakeAction,
  onViewPatient,
  isTvMode = false,
  // Legacy props:
  isOpen,
  patientName,
  patientId,
  room,
  ward,
  phoneNumber,
  vitals,
  alert,
  isConnected,
  isRemoved,
}) {
  // Reconstruct alarms array from legacy props if 'alarms' is empty but 'isOpen' is true
  const activeAlarms = alarms.length > 0 ? alarms : (isOpen && alert ? [{
    patientName,
    patientId,
    room,
    ward,
    phoneNumber,
    vitals,
    alert,
    isConnected,
    isRemoved,
  }] : []);

  // ── Unified sound controller ───────────────────────────────────────────────
  // Priority (first match wins — only ONE mode plays at a time):
  //   1. Bluetooth Disconnect → voice: "Patient Outbound. {name}, Room No is {room}."
  //   2. Band Removed         → voice: "Patient Band Removed. Please attend {name}, Room No {room}."
  //   3. Critical vital        → voice: "Patient Critical Alert. Please attend {name}, Room No {room} immediately."
  //   4. Warning only          → beep-only (no TTS)
  //   5. No alarms             → silence
  useEffect(() => {
    if (!activeAlarms || activeAlarms.length === 0) {
      stopAlarm();
      return () => stopAlarm();
    }

    // Helper to extract name + room from the first matching alarm
    const pick = (alarm) => ({
      name: alarm.patientName || alarm.name || 'Patient',
      room: alarm.room ?? '',
    });

    // 1. Bluetooth disconnect
    const btAlarm = activeAlarms.find(
      a => a.alert?.vital_type === 'Connectivity' && a.alert?.triggered_value === 'Disconnected'
    );
    if (btAlarm) {
      const { name, room } = pick(btAlarm);
      startBluetoothDisconnectAlert(name, room);
      return () => stopAlarm();
    }

    // 2. Band removed
    const bandAlarm = activeAlarms.find(
      a => a.alert?.vital_type === 'Band Status' && a.alert?.triggered_value === 'Removed'
    );
    if (bandAlarm) {
      const { name, room } = pick(bandAlarm);
      startBandRemovedAlert(name, room);
      return () => stopAlarm();
    }

    // 3. Critical vital alert
    const criticalAlarm = activeAlarms.find(
      a => a.alert?.severity?.toLowerCase() === 'critical'
    );
    if (criticalAlarm) {
      const { name, room } = pick(criticalAlarm);
      startCriticalVoiceAlert(name, room);
      return () => stopAlarm();
    }

    // 4. Warning only — beeps, no TTS
    startWarningAlarm();
    return () => stopAlarm();
  }, [activeAlarms]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!activeAlarms || activeAlarms.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="alarm-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black/85"
      />

      <div
        className="fixed inset-0 z-[101] flex flex-col items-center justify-start p-4 overflow-y-auto gap-6 pt-[10vh] pb-[10vh]"
        onClick={() => {
           // Optional: you could dismiss all by clicking background, but safer to let user act on each
        }}
      >
        <AnimatePresence>
          {activeAlarms.map((alarm, idx) => (
            <CriticalAlarmCard
              key={alarm.alert?.id || alarm.alert?.alert_id || idx}
              alarmData={alarm}
              onDismiss={onDismiss}
              onSnooze={onSnooze}
              onTakeAction={onTakeAction}
              onViewPatient={onViewPatient}
              isTvMode={isTvMode}
            />
          ))}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
