import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { startAlarm, stopAlarm } from "@/utilities/alarmSound";

/**
 * CriticalAlarmModal
 * Shows a full-screen critical alarm overlay with pulsing red UI.
 * Plays a repeating medical beep via Web Audio API (no packages needed).
 *
 * Props:
 *  - isOpen        : boolean
 *  - patientName   : string
 *  - patientId     : string
 *  - vitals        : object  (latest vitals snapshot)
 *  - onDismiss     : fn()   — called when user acknowledges the alarm
 *  - onViewPatient : fn()   — navigate to patient overview
 */
export default function CriticalAlarmModal({
  isOpen,
  patientName,
  patientId,
  vitals = {},
  alert = null,   // { vital_type, triggered_value, ... } from the SSE stream
  onDismiss,
  onViewPatient,
}) {
  // Start / stop alarm sound when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      startAlarm();
    } else {
      stopAlarm();
    }
    return () => stopAlarm();
  }, [isOpen]);

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
                border: "1px solid rgba(229,77,77,0.4)",
                boxShadow:
                  "0 0 0 1px rgba(229,77,77,0.15), 0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(229,77,77,0.12)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Pulsing red glow top bar */}
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  height: 4,
                  width: "100%",
                  background: "linear-gradient(90deg, transparent, #E54D4D, transparent)",
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
                    background: "rgba(229,77,77,0.12)",
                    border: "1.5px solid rgba(229,77,77,0.4)",
                    boxShadow: "0 0 30px rgba(229,77,77,0.2)",
                  }}
                >
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 8.12695V12.9072"
                      stroke="#E54D4D"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M11.9994 19.9904H5.93944C2.46944 19.9904 1.01944 17.6194 2.69944 14.7226L5.81944 9.34962L8.75944 4.30169C10.5394 1.23277 13.4594 1.23277 15.2394 4.30169L18.1794 9.35918L21.2994 14.7322C22.9794 17.629 21.5194 20 18.0594 20H11.9994V19.9904Z"
                      stroke="#E54D4D"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M11.9961 15.7754H12.0051"
                      stroke="#E54D4D"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </motion.div>

                {/* Title */}
                <motion.p
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-xs font-semibold tracking-[0.2em] uppercase mb-2"
                  style={{ color: "#E54D4D" }}
                >
                  🚨 Critical Alarm
                </motion.p>

                <h2 className="text-2xl font-bold text-white mb-1">
                  {patientName || "Patient"}
                </h2>
                {patientId && (
                  <p className="text-xs text-[#888] mb-5">ID: {patientId}</p>
                )}

                {/* Divider */}
                <div
                  className="w-full h-px mb-5"
                  style={{
                    background:
                      "linear-gradient(90deg,transparent,rgba(229,77,77,0.3),transparent)",
                  }}
                />

                {/* Triggered vital banner — shown when the alert came from the SSE stream */}
                {(alert?.vital_type || vitals?._alertVitalType) && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full rounded-xl px-4 py-3 mb-4 flex items-center justify-between"
                    style={{
                      background: "rgba(229,77,77,0.1)",
                      border: "1px solid rgba(229,77,77,0.35)",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: "#E54D4D",
                          flexShrink: 0,
                        }}
                      />
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#E54D4D" }}>
                        Triggered Alert
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#888] mb-0.5">
                        {alert?.vital_type ?? vitals?._alertVitalType}
                      </p>
                      <p className="text-sm font-bold" style={{ color: "#E54D4D" }}>
                        {alert?.triggered_value != null
                          ? Math.round(parseFloat(alert.triggered_value))
                          : vitals?._alertTriggeredVal != null
                            ? Math.round(parseFloat(vitals._alertTriggeredVal))
                            : "—"}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Vitals snapshot */}
                <p className="text-xs text-[#888] uppercase tracking-wider mb-3">
                  Current Vitals
                </p>
                <div className="grid grid-cols-2 gap-3 w-full mb-6">
                  {[
                    { label: "Heart Rate", value: hr !== "—" ? `${hr} bpm` : "—", critical: hr !== "—" && hr > 120 },
                    { label: "SpO₂", value: spo2 !== "—" ? `${spo2}%` : "—", critical: spo2 !== "—" && spo2 < 94 },
                    { label: "Blood Pressure", value: systolic !== "—" ? `${systolic}/${diastolic} mmHg` : "—", critical: systolic !== "—" && systolic > 140 },
                    { label: "Temperature", value: temp !== "—" ? `${temp}°C` : "—", critical: temp !== "—" && temp > 38 },
                  ].map(({ label, value, critical }) => (
                    <div
                      key={label}
                      className="rounded-xl px-3 py-2.5 text-left"
                      style={{
                        background: critical
                          ? "rgba(229,77,77,0.08)"
                          : "rgba(255,255,255,0.04)",
                        border: `1px solid ${critical ? "rgba(229,77,77,0.3)" : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      <p className="text-[10px] text-[#888] mb-1">{label}</p>
                      <p
                        className="text-base font-semibold"
                        style={{ color: critical ? "#E54D4D" : "#fff" }}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3 w-full">
                  <button
                    onClick={onDismiss}
                    className="flex-1 py-3 rounded-2xl text-sm font-medium transition-all"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#aaa",
                    }}
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() => {
                      onDismiss?.();
                      onViewPatient?.();
                    }}
                    className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all"
                    style={{
                      background:
                        "linear-gradient(135deg, #E54D4D, #c0392b)",
                      boxShadow: "0 4px 20px rgba(229,77,77,0.35)",
                      color: "#fff",
                    }}
                  >
                    View Patient →
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
