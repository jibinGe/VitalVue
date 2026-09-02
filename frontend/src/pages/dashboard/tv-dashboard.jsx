import React, { useState, useMemo, useEffect, useRef } from "react";
import { usePatients } from "@/hooks/usePatients";
import { useDashboardStore } from "@/store/useDashboardStore";
import PatientCard from "@/components/dashboard/PatientCard";
import { useWard } from "@/contexts/WardContext";
import { motion, AnimatePresence } from "framer-motion";
import { Hart, Spo, Bp, High } from "@/utilities/icons";
import CriticalAlarmModal from "@/components/ui/CriticalAlarmModal";

export default function TvDashboard() {
  const { selectedWard } = useWard();
  const { liveVitals, liveStatuses, criticalAlarmData, clearCriticalAlarm } = useDashboardStore();
  const { data: rawPatients = [], isLoading: loading } = usePatients(selectedWard?.id, 0, "");

  // Dummy state for PatientCard props that we don't need on TV
  const [cardMenu, setCardMenu] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("All");

  // Helper for real-time HH:mm:ss clock
  const getFormattedTime = () => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const getFormattedDate = () => {
    return new Date().toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short"
    });
  };

  // Real-time running live clock (500ms tick to prevent any interval drift)
  const [currentTime, setCurrentTime] = useState(getFormattedTime);
  const [currentDate, setCurrentDate] = useState(getFormattedDate);

  useEffect(() => {
    const tick = () => {
      setCurrentTime(getFormattedTime());
      setCurrentDate(getFormattedDate());
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, []);

  // Exact same logic from home.jsx for determining cardData
  const cardData = useMemo(() => {
    return rawPatients.map((p) => {
      const latestHistoryVitals = p.vitals_history && p.vitals_history.length > 0
        ? p.vitals_history[p.vitals_history.length - 1]
        : null;

      const live = liveVitals[p.id] || {};
      const isRemoved = live.is_removed === true;

      const vitals = {
        heartRate: {
          value: live.heart_rate ?? latestHistoryVitals?.heart_rate ?? 0,
          status: live.heart_rate_status ?? latestHistoryVitals?.heart_rate_status ?? "Stable"
        },
        spo2: {
          value: live.spo2 ?? latestHistoryVitals?.spo2 ?? 0,
          status: live.spo2_status ?? latestHistoryVitals?.spo2_status ?? "Stable"
        },
        bloodPressure: {
          systolic: live.bp_systolic ?? latestHistoryVitals?.bp_systolic ?? latestHistoryVitals?.systolic ?? 0,
          diastolic: live.bp_diastolic ?? latestHistoryVitals?.bp_diastolic ?? latestHistoryVitals?.diastolic ?? 0,
          status: live.bp_status ?? latestHistoryVitals?.bp_status ?? "Stable"
        },
        temperature: {
          value: live.temp ?? latestHistoryVitals?.temp ?? latestHistoryVitals?.temperature ?? 0,
          status: live.temperature_status ?? latestHistoryVitals?.temperature_status ?? "Stable"
        }
      };

      const liveAssessments = {
        news2_score: live.news2_score,
        af_warning: live.af_warning,
        stroke_risk: live.stroke_risk,
        seizure_risk: live.seizure_risk
      };

      const finalAssessments = (liveAssessments.news2_score !== undefined || liveAssessments.af_warning !== undefined)
        ? { ...p.assessments, ...liveAssessments }
        : p.assessments;

      const news2Score = finalAssessments?.news2_score ?? finalAssessments?.news2?.score ?? 0;
      const afWarning = finalAssessments?.af_warning;
      const strokeRisk = finalAssessments?.stroke_risk?.riskLevel || finalAssessments?.stroke_risk || "Low";
      const seizureRisk = finalAssessments?.seizure_risk?.riskLevel || finalAssessments?.seizure_risk || "Low";

      const hasNoVitals =
        (!vitals.heartRate?.value || vitals.heartRate.value === 0) &&
        (!vitals.spo2?.value || vitals.spo2.value === 0) &&
        (!vitals.bloodPressure?.systolic || vitals.bloodPressure.systolic === 0) &&
        (!vitals.temperature?.value || vitals.temperature.value === 0);

      const hasCriticalVital =
        vitals.heartRate?.status?.toLowerCase() === "critical" ||
        vitals.spo2?.status?.toLowerCase() === "critical" ||
        vitals.bloodPressure?.status?.toLowerCase() === "critical" ||
        vitals.temperature?.status?.toLowerCase() === "critical";
      const hasCriticalScore =
        news2Score >= 7 ||
        (finalAssessments?.news2?.riskLevel?.toLowerCase() === "high");
      const hasCriticalRisk =
        (strokeRisk === "High") ||
        (seizureRisk === "High") ||
        (afWarning !== undefined && afWarning !== "Normal" && afWarning !== 0 && afWarning !== false);

      const hasWarningVital =
        vitals.heartRate?.status?.toLowerCase() === "high" ||
        vitals.heartRate?.status?.toLowerCase() === "low" ||
        vitals.spo2?.status?.toLowerCase() === "high" ||
        vitals.spo2?.status?.toLowerCase() === "low" ||
        vitals.bloodPressure?.status?.toLowerCase() === "high" ||
        vitals.bloodPressure?.status?.toLowerCase() === "low" ||
        vitals.temperature?.status?.toLowerCase() === "high" ||
        vitals.temperature?.status?.toLowerCase() === "low";
      const hasWarningScore = news2Score >= 5 && news2Score < 7;
      const hasWarningRisk =
        strokeRisk === "Medium" ||
        seizureRisk === "Medium";

      const isConnected = live.is_connected ?? latestHistoryVitals?.is_connected ?? (p.vitals_history && p.vitals_history.length > 0 ? true : false);

      let status = "Stable";
      if (hasNoVitals || hasCriticalVital || hasCriticalScore || hasCriticalRisk) {
        status = "Critical";
      } else if (hasWarningVital || hasWarningScore || hasWarningRisk) {
        status = "Warning";
      }

      if (isRemoved || isConnected === false) {
        status = "Critical";
      }

      if (liveStatuses[p.id]) {
        status = liveStatuses[p.id];
      }

      return {
        status: status,
        id: p.id,
        userId: p.user_id,
        patientId: p.user_id,
        name: p.full_name || "Unknown Patient",
        room: p.room_no || "General",
        ward: p.ward_name || p.ward || p.ward_no,
        lastSync: live.recorded_at || latestHistoryVitals?.recorded_at || new Date().toISOString(),
        vitals: [
          { icon: <Hart />, title: "Heart Rate", heartRate: vitals.heartRate?.value || 0, status: vitals.heartRate?.status, historyData: p.vitals_history || [] },
          { icon: <Spo />, title: "SpO2", spo2: vitals.spo2?.value ? Math.round(vitals.spo2.value) : 0, status: vitals.spo2?.status, historyData: p.vitals_history || [] },
          { icon: <Bp />, title: "BP Trend", bp: `${vitals.bloodPressure?.systolic || '--'}/${vitals.bloodPressure?.diastolic || '--'}`, status: vitals.bloodPressure?.status, historyData: p.vitals_history || [] },
          { icon: <High />, title: "AF Warning", afWarning: live.af_warning ?? finalAssessments?.af_warning ?? p.af_warning },
        ],
        alerts: [],
        deviceBattery: live.battery_percent !== undefined ? `${live.battery_percent}%` : (latestHistoryVitals?.battery_percent !== undefined ? `${latestHistoryVitals.battery_percent}%` : (p.device_battery || "80%")),
        phoneBattery: live.phone_battery !== undefined
          ? live.phone_battery
          : (live.phoneBattery !== undefined
              ? live.phoneBattery
              : (latestHistoryVitals?.phone_battery !== undefined
                  ? latestHistoryVitals.phone_battery
                  : (latestHistoryVitals?.phoneBattery !== undefined
                      ? latestHistoryVitals.phoneBattery
                      : (p.phone_battery ?? p.phoneBattery ?? null)))),
        isConnected: isConnected,
        isRemoved: isRemoved,
      };
    });
  }, [rawPatients, liveVitals, liveStatuses]);

  // Priority ranking: Critical (1) > Warning (2) > Stable (3)
  const getStatusPriority = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "critical") return 1;
    if (s === "warning" || s === "high" || s === "low") return 2;
    if (s === "stable") return 3;
    return 4;
  };

  // Triage counts for header badges
  const triageCounts = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let stable = 0;
    cardData.forEach((item) => {
      const s = (item.status || "").toLowerCase();
      if (s === "critical") critical++;
      else if (s === "warning" || s === "high" || s === "low") warning++;
      else stable++;
    });
    return { critical, warning, stable, total: cardData.length };
  }, [cardData]);

  // Show all patients (critical, warning, stable) sorted by clinical priority
  const displayData = useMemo(() => {
    let list = cardData;
    if (selectedFilter !== "All") {
      list = cardData.filter((item) => {
        const s = (item.status || "").toLowerCase();
        if (selectedFilter === "Critical") return s === "critical";
        if (selectedFilter === "Warning") return s === "warning" || s === "high" || s === "low";
        if (selectedFilter === "Stable") return s === "stable";
        return true;
      });
    }

    return [...list].sort((a, b) => {
      const priorityDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
      if (priorityDiff !== 0) return priorityDiff;
      return (a.room || "").localeCompare(b.room || "", undefined, { numeric: true });
    });
  }, [cardData, selectedFilter]);

  // Auto-scroll logic
  const scrollRef = useRef(null);
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let scrollDirection = 1; // 1 for down, -1 for up
    let animationFrameId;
    let lastTime = 0;
    const scrollSpeed = 50; // pixels per second

    const scrollLoop = (time) => {
      if (!lastTime) lastTime = time;
      const deltaTime = time - lastTime;

      if (deltaTime > 16) {
        const maxScrollTop = container.scrollHeight - container.clientHeight;

        if (maxScrollTop > 0) {
          const moveAmount = (scrollSpeed * deltaTime) / 1000;
          container.scrollTop += (moveAmount * scrollDirection);

          // Use a small buffer (1px) for floating point math
          if (container.scrollTop >= maxScrollTop - 1 && scrollDirection === 1) {
            scrollDirection = -1;
            lastTime = time + 3000; // 3 seconds pause at bottom
          } else if (container.scrollTop <= 1 && scrollDirection === -1) {
            scrollDirection = 1;
            lastTime = time + 3000; // 3 seconds pause at top
          } else {
            lastTime = time;
          }
        }
      }
      animationFrameId = requestAnimationFrame(scrollLoop);
    };

    animationFrameId = requestAnimationFrame(scrollLoop);

    return () => cancelAnimationFrame(animationFrameId);
  }, [displayData.length]);

  // Full screen styling for TV
  return (
    <div ref={scrollRef} className="w-screen h-screen bg-[#1A1A1C] overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span
            className={`size-4 rounded-full shrink-0 ${
              triageCounts.critical > 0
                ? "bg-[#E54D4D] animate-pulse shadow-[0_0_12px_#E54D4D]"
                : triageCounts.warning > 0
                ? "bg-[#E5DB4C] shadow-[0_0_12px_#E5DB4C]"
                : "bg-[#4DE573] shadow-[0_0_12px_#4DE573]"
            }`}
          />
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-lufga text-white flex items-center gap-2">
            Patient Vitals Monitor
            {selectedWard?.name && (
              <span className="text-white/40 text-lg md:text-2xl font-normal">
                · {selectedWard.name}
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Triage summary badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedFilter(selectedFilter === "Critical" ? "All" : "Critical")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs md:text-sm font-medium transition-all ${
                selectedFilter === "Critical"
                  ? "bg-[#E54D4D]/25 border-[#E54D4D] text-[#E54D4D] shadow-[0_0_12px_rgba(229,77,77,0.35)]"
                  : "bg-[#E54D4D]/10 border-[#E54D4D]/30 text-[#E54D4D] hover:bg-[#E54D4D]/20"
              }`}
            >
              <span className={`size-2.5 rounded-full bg-[#E54D4D] ${triageCounts.critical > 0 ? "animate-pulse" : ""}`}></span>
              <span>Critical: {triageCounts.critical}</span>
            </button>

            <button
              onClick={() => setSelectedFilter(selectedFilter === "Warning" ? "All" : "Warning")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs md:text-sm font-medium transition-all ${
                selectedFilter === "Warning"
                  ? "bg-[#E5DB4C]/25 border-[#E5DB4C] text-[#E5DB4C] shadow-[0_0_12px_rgba(229,219,76,0.35)]"
                  : "bg-[#E5DB4C]/10 border-[#E5DB4C]/30 text-[#E5DB4C] hover:bg-[#E5DB4C]/20"
              }`}
            >
              <span className="size-2.5 rounded-full bg-[#E5DB4C]"></span>
              <span>Warning: {triageCounts.warning}</span>
            </button>

            <button
              onClick={() => setSelectedFilter(selectedFilter === "Stable" ? "All" : "Stable")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs md:text-sm font-medium transition-all ${
                selectedFilter === "Stable"
                  ? "bg-[#4DE573]/25 border-[#4DE573] text-[#4DE573] shadow-[0_0_12px_rgba(77,229,115,0.35)]"
                  : "bg-[#4DE573]/10 border-[#4DE573]/30 text-[#4DE573] hover:bg-[#4DE573]/20"
              }`}
            >
              <span className="size-2.5 rounded-full bg-[#4DE573]"></span>
              <span>Stable: {triageCounts.stable}</span>
            </button>

            <button
              onClick={() => setSelectedFilter("All")}
              className={`px-3 py-1.5 rounded-full border text-xs md:text-sm font-medium transition-all ${
                selectedFilter === "All"
                  ? "bg-white/20 border-white/40 text-white shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                  : "bg-white/5 border-white/15 text-white/70 hover:bg-white/10"
              }`}
            >
              Total: {triageCounts.total}
            </button>
          </div>

          <div className="text-white/60 text-lg md:text-xl font-lufga shrink-0 ml-2">
            {currentTime}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full">
        {loading ? (
          <div className="text-white text-2xl p-10 flex items-center justify-center h-[50vh]">
            Loading Patients...
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {displayData.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="col-span-full flex flex-col items-center justify-center p-10 mt-20 text-center"
              >
                <div className="size-24 mb-6 bg-white/5 rounded-full flex items-center justify-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeOpacity="0.2" strokeWidth="2" />
                    <path d="M12 8v4M12 16h.01" stroke="white" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="text-3xl text-white font-medium mb-3 font-lufga">
                  {selectedFilter === "All" ? "No Patients Found" : `No ${selectedFilter} Patients`}
                </h3>
                <p className="text-xl text-para">
                  {selectedFilter === "All"
                    ? "There are no patients admitted at this time."
                    : `There are currently no patients in ${selectedFilter.toLowerCase()} status.`}
                </p>
              </motion.div>
            ) : (
              displayData.map((item, index) => (
                <PatientCard
                  key={item.userId || item.id || `patient-${index}`}
                  item={item}
                  index={index}
                  cardMenu={cardMenu}
                  setCardMenu={setCardMenu}
                  card_ref={{ current: null }}
                  CardMenu={[]}
                  setSelectedUserId={() => { }}
                  setSelectedUserName={() => { }}
                  setEndMonitoring={() => { }}
                  takeAction={false}
                  setTakeAction={() => { }}
                  setTakeActionIsDeviceAlert={() => { }}
                  flagDoctor={false}
                  setFlagDoctor={() => { }}
                  isTvMode={true}
                />
              ))
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Critical Alarm Modal Overlay */}
      <CriticalAlarmModal
        isOpen={!!criticalAlarmData}
        patientName={criticalAlarmData?.name}
        patientId={criticalAlarmData?.userId}
        room={criticalAlarmData?.room}
        ward={criticalAlarmData?.ward}
        phoneNumber={criticalAlarmData?.phoneNumber}
        vitals={criticalAlarmData?.vitals}
        alert={criticalAlarmData?.alert}
        isConnected={criticalAlarmData?.isConnected}
        isRemoved={criticalAlarmData?.isRemoved}
        onDismiss={() => clearCriticalAlarm()}
        onSnooze={() => clearCriticalAlarm()}
        onTakeAction={() => clearCriticalAlarm()}
        onViewPatient={() => {}}
        isTvMode={true}
      />
    </div>
  );
}
