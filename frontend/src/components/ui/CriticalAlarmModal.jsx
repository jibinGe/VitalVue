import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { startAlarm, stopAlarm, startWarningAlarm } from "@/utilities/alarmSound";

/**
 * CriticalAlarmModal
 * Shows a full-screen critical alarm overlay.
 *
 * Props:
 *  - isOpen        : boolean
 *  - patientName   : string
 *  - patientId     : string
 *  - vitals        : object  (latest vitals snapshot)
 *  - alert         : object  (SSE alert payload)
 *  - isConnected   : boolean (device connection state)
 *  - isRemoved     : boolean (band/watch removed state)
 *  - onDismiss     : fn()   — called when user acknowledges the alarm
 *  - onViewPatient : fn()   — navigate to patient overview
 */
export default function CriticalAlarmModal({
  isOpen,
  patientName,
  patientId,
  room,
  ward,
  vitals = {},
  alert = null,
  isConnected = true,
  isRemoved = false,
  onDismiss,
  onViewPatient,
}) {
  const isWarning = alert?.severity?.toLowerCase() === 'warning';

  // Device alarm: triggered when watch is disconnected OR band is removed
  // Also check the SSE alert payload for "Band Status" or "Connectivity" alerts
  const isAlertBandRemoved = alert?.vital_type === "Band Status" && alert?.triggered_value === "Removed";
  const isAlertDisconnected = alert?.vital_type === "Connectivity" && alert?.triggered_value === "Disconnected";

  // Priority to alert payload. If it's explicitly a band removed alert, ignore stale `isConnected` false state.
  const currentIsConnected = isAlertBandRemoved ? true : (isConnected !== false && !isAlertDisconnected);
  const currentIsRemoved = isAlertBandRemoved || isRemoved === true;

  const isDeviceAlarm = !currentIsConnected || currentIsRemoved;

  // Theme: yellow for device alarm, orange for warning, red for critical
  const themeColor = isDeviceAlarm ? '#F8FD1E' : (isWarning ? '#E5A54D' : '#E54D4D');
  const themeColorRgba = isDeviceAlarm ? '248,253,30' : (isWarning ? '229,165,77' : '229,77,77');

  // Border: solid yellow for device alarm, else semi-transparent theme color
  const borderStyle = isDeviceAlarm
    ? '6px solid rgb(248 253 30)'
    : `6px solid rgba(${themeColorRgba},0.4)`;

  // Start / stop alarm sound when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (isWarning) {
        startWarningAlarm();
      } else {
        startAlarm();
      }
    } else {
      stopAlarm();
    }
    return () => stopAlarm();
  }, [isOpen, isWarning]);

  const hr = vitals?.heartRate?.value != null ? Math.round(vitals.heartRate.value) : vitals?.heartRate != null && vitals.heartRate !== "—" ? Math.round(vitals.heartRate) : "—";
  const spo2 = vitals?.spo2?.value != null ? Math.round(vitals.spo2.value) : vitals?.spo2 != null && vitals.spo2 !== "—" ? Math.round(vitals.spo2) : "—";
  const systolic = vitals?.bloodPressure?.systolic != null ? Math.round(vitals.bloodPressure.systolic) : "—";
  const diastolic = vitals?.bloodPressure?.diastolic != null ? Math.round(vitals.bloodPressure.diastolic) : "—";
  const temp = vitals?.temperature?.value != null ? Math.round(vitals.temperature.value) : vitals?.temperature != null && vitals.temperature !== "—" ? Math.round(vitals.temperature) : "—";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="alarm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/85"
            onClick={onDismiss}
          />

          {/* Modal */}
          <motion.div
            key="alarm-modal"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div
              className="relative w-full max-w-[480px] rounded-[28px] overflow-hidden"
              style={{
                background: "linear-gradient(145deg, #1a0a0a, #1e1010)",
                border: borderStyle,
                boxShadow:
                  `0 0 0 1px rgba(${themeColorRgba},0.15), 0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(${themeColorRgba},0.12)`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Pulsing glow top bar */}
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
                {/* Pulsing alarm icon */}
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

                {/* Title row: heading + "Band Removed" badge for device alarms */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <motion.p
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-xs font-semibold tracking-[0.2em] uppercase"
                    style={{ color: themeColor }}
                  >
                    {isDeviceAlarm
                      ? "🔔 Device Alarm"
                      : isWarning
                        ? "⚠️ Warning Alert"
                        : "🚨 Critical Alarm"}
                  </motion.p>

                  {/* Band Removed badge — only on device alarms AND if NOT a bluetooth disconnection */}
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

                {/* Patient name + Room number + Ward */}
                <h2 className="text-2xl font-bold text-white mb-2">
                  {patientName || "Patient"}
                </h2>
                {(room || ward) && (
                  <div className="flex items-center justify-center gap-2 mb-5">
                    {room && (
                      <div
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full"
                        style={{
                          background: `rgba(${themeColorRgba},0.1)`,
                          border: `1px solid rgba(${themeColorRgba},0.3)`,
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke={themeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
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
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke={themeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M3 9H21" stroke={themeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M9 21V9" stroke={themeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-base font-semibold" style={{ color: themeColor }}>Ward No: {ward}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Divider */}
                <div
                  className="w-full h-px mb-5"
                  style={{
                    background:
                      `linear-gradient(90deg,transparent,rgba(${themeColorRgba},0.3),transparent)`,
                  }}
                />

                {/* Triggered vital banner — only for non-device alarms from SSE stream */}
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
                          const strVal = String(val);
                          const match = strVal.match(/^([-+]?[0-9]*\.?[0-9]+)\s*(.*)$/);
                          if (match) {
                            const num = parseFloat(match[1]);
                            const unit = match[2];
                            const rounded = Number.isInteger(num) ? num : Number(num.toFixed(1));
                            return `${rounded}${unit ? ' ' + unit : ''}`.trim();
                          }
                          return strVal;
                        })()}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Body: device alarm message OR vitals grid */}
                {isDeviceAlarm ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full rounded-2xl px-5 py-5 mb-6 flex flex-col items-center gap-3 text-center"
                    style={{
                      background: 'rgba(248,253,30,0.06)',
                      border: '1px solid rgba(248,253,30,0.25)',
                    }}
                  >
                    {currentIsConnected === false ? (
                      <svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M12 3L18 7.5L12 12L18 16.5L12 21"
                          stroke="#0004ff"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <line x1="12" y1="3" x2="12" y2="21" stroke="#0004ff" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="6" y1="7.5" x2="12" y2="12" stroke="#0004ff" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="6" y1="16.5" x2="12" y2="12" stroke="#0004ff" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="38" height="38" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="7" y="5" width="10" height="14" rx="3" stroke="#F8FD1E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 5V3H15V5M9 19V21H15V19" stroke="#F8FD1E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="2" stroke="#F8FD1E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    <p className="text-sm font-bold" style={{ color: '#F8FD1E' }}>
                      {currentIsConnected === false ? "Bluetooth Disconnected" : "Band Removed"}
                    </p>
                    <p className="text-lg text-[#aaa] leading-relaxed">
                      {currentIsConnected === false 
                        ? "Please check the internet connection and ensure the device is within range."
                        : "Please ensure the device is properly placed on the patient."}
                    </p>
                  </motion.div>
                ) : (
                  <>
                    {/* Vitals snapshot — only for regular critical/warning alarms */}
                    <p className="text-xs text-[#888] uppercase tracking-wider mb-3">
                      Current Vitals
                    </p>
                    <div className="grid grid-cols-2 gap-3 w-full mb-6">
                      {[
                        { label: "Heart Rate", value: hr !== "—" ? `${hr} bpm` : "—", critical: hr !== "—" && hr > 120 },
                        { label: "SpO₂", value: spo2 !== "—" ? `${spo2}%` : "—", critical: spo2 !== "—" && spo2 < 94 },
                        { label: "Blood Pressure", value: systolic !== "—" ? `${systolic}/${diastolic} mmHg` : "—", critical: systolic !== "—" && systolic > 140 },
                        { label: "Skin Temperature", value: temp !== "—" ? `${temp}°C` : "—", critical: temp !== "—" && temp > 38 },
                      ].map(({ label, value, critical }) => (
                        <div
                          key={label}
                          className="rounded-xl px-3 py-2.5 text-left"
                          style={{
                            background: critical
                              ? `rgba(${themeColorRgba},0.08)`
                              : "rgba(255,255,255,0.04)",
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

                {/* Actions */}
                <div className="flex gap-3 w-full">
                  <button
                    onClick={onDismiss}
                    className="flex-1 py-3 rounded-2xl text-sm font-medium transition-all"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#aaa",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      fontSize: "18px",
                      fontWeight: 600,
                      fontFamily: "Open Sans",
                    }}
                  >
                    ACKNOWLEDGE
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
