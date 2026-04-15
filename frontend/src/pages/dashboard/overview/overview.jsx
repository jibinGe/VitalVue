import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { patientService } from "@/services/patientService";
import { authService } from "@/services/authService";
import MainBody from "@/components/dashboard/main-body";
import Modal from "@/components/ui/modal-right";
import Modal2 from "@/components/ui/modal";
import AddNotesModal from "@/components/ui/AddNotesModal";
import EventLogModal from "@/components/ui/EventLogModal";
import BaselineDeviationModal from "@/components/ui/BaselineDeviationModal";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import CriticalAlarmModal from "@/components/ui/CriticalAlarmModal";
import { usePatientHistory } from "@/hooks/usePatientHistory";
import { useVitalsStream } from "@/hooks/useVitalsStream";
import { useDashboardStore } from "@/store/useDashboardStore";

import {
  Bp,
  Brain,
  Face,
  Hart,
  High,
  Hrv,
  Moon,
  Spo,
  Temp,
  SuccessTik,
} from "@/utilities/icons";

// overview card modal
import NewsScore from "@/components/dashboard/overview/news-score";
import APWarning from "@/components/dashboard/overview/ap-warning";
import StrokeRisk from "@/components/dashboard/overview/stroke-risk";
import SeizureRisk from "@/components/dashboard/overview/seizure-risk";
import { Link } from "react-router-dom";

import SpO2Gauge from "@/components/animation/overview/spo2Gauge";
import BPTrend from "@/components/animation/overview/BPTrend";
import HrvScore from "@/components/animation/overview/hrv-score";
import TempWave from "../../../components/animation/overview/tempWave";
import SleepPattern from "@/components/animation/overview/sleep-pattern";
import StressPatternChart from "@/components/dashboard/charts/stress-pattern-chart";
import DoctorReview from "../../../components/dashboard/overview/doctor-review";
import HeartRateLive from "../../../components/charts/HeartRateLive";
import Movement from "../../../components/animation/overview/movement";
import ArcProgress from "../../../components/arc-progress";
import HistoryTable from "@/components/dashboard/HistoryTable";

export default function Overview() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const {
    criticalAlarmData,
    setCriticalAlarmData,
    clearCriticalAlarm,
    setSelectedUserId,
    setSelectedUserName
  } = useDashboardStore();

  const filter = ["Live", "1h", "24h"];
  const [filterTab, setFilterTab] = useState(filter[0]);

  const parsedUserId = parseInt(userId, 10);
  const { data: patientHistory, isLoading: loading } = usePatientHistory(parsedUserId, filterTab);
  const { streamData, criticalAlert } = useVitalsStream(parsedUserId);
  const currentVitals = patientHistory ? patientHistory[patientHistory.length - 1] : null; 
  const patientData = currentVitals; // Map for legacy compatibility

  const prevVitalsRaw = useRef("");
  const [chartsReady, setChartsReady] = useState(false);

  // UI Modal States
  const [news_scrore, set_news_score] = useState(false);
  const [ap_warning, set_ap_warning] = useState(false);
  const [stroke_risk, set_stroke_risk] = useState(false);
  const [seizure_risk, set_seizure_risk] = useState(false);
  const [flag_doctor_review, set_flag_doctor_review] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isEventLogModalOpen, setIsEventLogModalOpen] = useState(false);
  const [isBaselineDeviationModalOpen, setIsBaselineDeviationModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');


  // ── Clear alarm store on mount and unmount ──────────────────────────────
  // On mount: clears any stale alarm from the Home page so it doesn't
  // immediately pop up when navigating to Overview.
  // On unmount: clears any overview alarm so Home doesn't inherit it.
  useEffect(() => {
    clearCriticalAlarm();
    return () => {
      clearCriticalAlarm();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading) {
      // Let the browser paint the page layout and navigation before executing heavy chart logic
      const timer = setTimeout(() => setChartsReady(true), 60);
      return () => clearTimeout(timer);
    } else {
      setChartsReady(false);
    }
  }, [loading]);

  const handleSaveNotes = async (data) => {
    try {
      const response = await patientService.addClinicalNote({
        patientId: userId,
        content: data.notes,
        flagForReview: data.isFlagged ?? false,
      });

      setIsNotesModalOpen(false);

      if (response.success) {
        setSuccessMessage('Clinical note has been saved and synced successfully to the patient\'s record.');
      } else {
        setSuccessMessage(response.message || 'Failed to save clinical note.');
      }
      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error('Error saving clinical note:', error);
      setIsNotesModalOpen(false);
      setSuccessMessage('An error occurred while saving the clinical note.');
      setIsSuccessModalOpen(true);
    }
  };

  const handleSaveEventLog = async (data) => {
    try {
      // Convert datetime-local string to ISO 8601 (e.g. "2026-03-02T06:34" -> ISO string)
      const isoTimestamp = data.timestamp
        ? new Date(data.timestamp).toISOString()
        : new Date().toISOString();

      const response = await patientService.logClinicalEvent({
        patientId: userId,
        eventType: data.eventType,
        timestamp: isoTimestamp,
        description: data.description,
      });

      setIsEventLogModalOpen(false);

      if (response.success) {
        setSuccessMessage(`Event "${data.eventType}" has been logged successfully for the patient.`);
      } else {
        setSuccessMessage(response.message || `Failed to log event "${data.eventType}".`);
      }
      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error("Error logging clinical event:", error);
      setIsEventLogModalOpen(false);
      setSuccessMessage("An error occurred while logging the event.");
      setIsSuccessModalOpen(true);
    }
  };

  const handleSaveBaselineDeviation = async (data) => {
    try {
      const response = await patientService.manageBaselineDeviation({
        patientId: userId,
        baselineMetrics: {
          vitalParameter: data.vitalParameter,
          baselineValue: parseFloat(data.baselineValue),
          currentValue: parseFloat(data.currentValue),
          deviation: data.deviation !== null ? parseFloat(data.deviation) : null,
          notes: data.notes || '',
        },
      });

      setIsBaselineDeviationModalOpen(false);

      if (response.success) {
        setSuccessMessage(`Baseline deviation for ${data.vitalParameter} (${data.deviation}%) has been recorded successfully.`);
      } else {
        setSuccessMessage(response.message || 'Failed to record baseline deviation.');
      }
      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error('Error saving baseline deviation:', error);
      setIsBaselineDeviationModalOpen(false);
      setSuccessMessage('An error occurred while recording the baseline deviation.');
      setIsSuccessModalOpen(true);
    }
  };

  // Helper function to map API assessments to triageStatus format
  const mapAssessmentsToTriageStatus = (assessments) => {
    if (!assessments) return [];

    const statusMap = [];

    // NEWS2 Score
    if (assessments.news2_score !== undefined || assessments.news2 !== undefined) {
      const score = assessments.news2_score ?? assessments.news2?.score ?? 0;
      const riskLevel = score >= 7 ? "High" : score >= 5 ? "Medium" : "Low";
      statusMap.push({
        title: "NEWS2 Score",
        position: score,
        status: riskLevel === "High" ? "High" : riskLevel === "Medium" ? "Warning" : "Normal",
        description: `${riskLevel} Clinical Risk`,
        color: riskLevel === "High" ? "#E54D4D" : riskLevel === "Medium" ? "#FFBB33" : "#2CD155",
      });
    }

    // AF Warning
    const afWarningStr = assessments.af_warning; // could be boolean, int, or object
    let afStatus = "Normal";
    if (afWarningStr && afWarningStr !== "Normal" && afWarningStr !== 0 && afWarningStr !== false) {
      afStatus = "High";
    }
    statusMap.push({
      title: "AF Warning",
      position: afStatus === "Normal" ? "Normal" : "High",
      status: afStatus === "Normal" ? "Normal" : "High",
      description: afStatus === "Normal" ? "Regular Rhythm" : "Irregular Rhythm",
      color: afStatus === "Normal" ? "#2CD155" : "#E54D4D",
    });

    // Stroke Risk
    const strokeRisk = assessments.stroke_risk?.riskLevel || assessments.stroke_risk || "Low";
    statusMap.push({
      title: "Stroke Risk",
      position: strokeRisk,
      status: strokeRisk === "High" ? "High" : strokeRisk === "Medium" ? "Warning" : "Normal",
      description: strokeRisk === "High" ? "Elevated risk" : strokeRisk === "Medium" ? "Moderate risk" : "Normal neuro sign",
      color: strokeRisk === "High" ? "#E54D4D" : strokeRisk === "Medium" ? "#FFBB33" : "#2CD155",
    });

    // Seizure Risk
    const seizureRisk = assessments.seizure_risk?.riskLevel || assessments.seizure_risk || "Normal";
    statusMap.push({
      title: "Seizure Risk",
      position: seizureRisk,
      status: seizureRisk === "High" ? "High" : seizureRisk === "Medium" ? "Warning" : "Normal",
      description: seizureRisk === "High" ? "Elevated EDA levels" : seizureRisk === "Normal" ? "Normal EDA levels" : "Moderate EDA levels",
      color: seizureRisk === "High" ? "#E54D4D" : seizureRisk === "Medium" ? "#FFBB33" : "#2CD155",
    });

    return statusMap;
  };

  // Get triage status from API assessments or use defaults - memoized to combine polling + live stream
  const apiAssessments = useMemo(() => {
    // Start with the polling data (currentVitals or patientData)
    let assessments = currentVitals?.clinical_risks || currentVitals?.assessments || patientData?.assessments || {};
    
    // If we have live stream data, override with the latest clinical risks
    if (streamData) {
      const liveRisks = {};
      if (streamData.news2_score !== undefined) liveRisks.news2_score = streamData.news2_score;
      if (streamData.af_warning !== undefined) liveRisks.af_warning = streamData.af_warning;
      if (streamData.stroke_risk !== undefined) liveRisks.stroke_risk = streamData.stroke_risk;
      if (streamData.seizure_risk !== undefined) liveRisks.seizure_risk = streamData.seizure_risk;

      // Only merge if we actually have at least one risk value in the stream
      if (Object.keys(liveRisks).length > 0) {
        assessments = { ...assessments, ...liveRisks };
      }
    }
    return assessments;
  }, [currentVitals, patientData, streamData]);

  const apiTriageStatus = apiAssessments ? mapAssessmentsToTriageStatus(apiAssessments) : [];

  const triageStatus = apiTriageStatus.map((item, index) => ({
    icon:
      item.title === "NEWS2 Score" ? (
        <Bp className="size-4.5" />
      ) : item.title === "AF Warning" ? (
        <High />
      ) : item.title === "Stroke Risk" ? (
        <Brain />
      ) : (
        <Face />
      ),
    status: item.status,
    title: item.title,
    position: item.position,
    des: item.description,
    color: item.color,
    progress: (
      <svg
        width="116"
        height="104"
        viewBox="0 0 116 104"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="104"
          cy="104"
          r="102"
          stroke={item.color}
          strokeOpacity="0.08"
          strokeWidth="4"
        />
        <path
          d="M21.4803 44.0459C12.0189 57.0684 5.77386 72.1452 3.25579 88.0437C0.737717 103.942 2.01809 120.211 6.99223 135.52C11.9664 150.829 20.493 164.743 31.8751 176.125C43.2572 187.507 57.1714 196.034 72.4803 201.008C87.7891 205.982 104.058 207.262 119.956 204.744C135.855 202.226 150.932 195.981 163.954 186.52C176.977 177.058 187.575 164.649 194.883 150.307C202.19 135.965 206 120.097 206 104"
          stroke={item.color}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <rect
          x="12"
          y="33"
          width="20"
          height="20"
          rx="10"
          fill="#2F2F31"
        />
        <circle cx="22" cy="43" r="4" fill={item.color} />
      </svg>
    ),
    action:
      item.title === "NEWS2 Score"
        ? () => set_news_score(true)
        : item.title === "AF Warning"
          ? () => set_ap_warning(true)
          : item.title === "Stroke Risk"
            ? () => set_stroke_risk(true)
            : () => set_seizure_risk(true),
  }));

  // Helper function to format temperature to 1 decimal place
  const formatTemperature = (temp) => {
    if (temp === undefined || temp === null) return 37.2;
    return parseFloat(temp).toFixed(1);
  };

  // Get vitals from API or use defaults - memoized to update when currentVitals changes
  const vitals = useMemo(() => {
    const historyData = patientHistory || currentVitals?.vitals_history || [];
    const latestVitals = currentVitals?.vitals_history && currentVitals.vitals_history.length > 0
      ? currentVitals.vitals_history[currentVitals.vitals_history.length - 1]
      : (historyData.length > 0 ? historyData[historyData.length - 1] : null);

    let hrVal = latestVitals?.primary_vitals?.heart_rate ?? latestVitals?.heart_rate;
    let spo2Val = latestVitals?.primary_vitals?.spo2 ?? latestVitals?.spo2;
    let sysVal = latestVitals?.primary_vitals?.blood_pressure ? latestVitals.primary_vitals.blood_pressure.split('/')[0] : (latestVitals?.systolic || latestVitals?.bp_systolic);
    let diaVal = latestVitals?.primary_vitals?.blood_pressure ? latestVitals.primary_vitals.blood_pressure.split('/')[1] : (latestVitals?.diastolic || latestVitals?.bp_diastolic);
    let tempVal = latestVitals?.primary_vitals?.temp ?? (latestVitals?.temperature || latestVitals?.temp);
    let hrvVal = latestVitals?.advanced_metrics?.hrv_score ?? (latestVitals?.hrv || latestVitals?.hrv_score || currentVitals?.derived_metrics?.hrv);
    let movementVal = latestVitals?.advanced_metrics?.movement_index ?? latestVitals?.movement;
    let sleepVal = latestVitals?.sleep_pattern;
    let stressVal = latestVitals?.advanced_metrics?.stress_level ?? latestVitals?.stress_level;

    if (streamData) {
      if (streamData.heart_rate !== undefined) hrVal = streamData.heart_rate;
      if (streamData.spo2 !== undefined) spo2Val = streamData.spo2;
      if (streamData.bp_systolic !== undefined && streamData.bp_diastolic !== undefined) {
        sysVal = streamData.bp_systolic;
        diaVal = streamData.bp_diastolic;
      }
      if (streamData.temp !== undefined) tempVal = streamData.temp;
      if (streamData.hrv_score !== undefined) hrvVal = streamData.hrv_score;
      if (streamData.movement_index !== undefined) movementVal = streamData.movement_index;
      if (streamData.stress_level !== undefined) stressVal = streamData.stress_level;
    }

    // Round values to remove decimals as requested
    if (hrVal !== undefined && hrVal !== null) hrVal = Math.round(hrVal);
    if (spo2Val !== undefined && spo2Val !== null) spo2Val = Math.round(spo2Val);
    if (hrvVal !== undefined && hrvVal !== null) hrvVal = Math.round(hrvVal);
    if (movementVal !== undefined && movementVal !== null) movementVal = Math.round(movementVal);

    const noGraphPlaceholder = <div className="flex items-center justify-center h-full min-h-[200px] text-white/20 font-lufga italic">no graph</div>;

    return [
      {
        icon: <Hart />,
        iconBg: "bg-green",
        title: "Heart Rate",
        value: hrVal ?? '--',
        extension: "bpm",
        img: (hrVal === 0 || !hrVal) ? noGraphPlaceholder : <HeartRateLive className="p-4 md:p-6" width={360} historyData={historyData} />,
        path: `/dashboard/heart-rate/${userId || ""}`,
      },
      {
        icon: <Spo />,
        iconBg: "bg-purple",
        title: "SpO2",
        value: spo2Val ? `${spo2Val}%` : '--',
        extension: "",
        img: (spo2Val === 0 || !spo2Val) ? noGraphPlaceholder : <SpO2Gauge value={spo2Val ?? 98} />,
        path: `/dashboard/spo/${userId || ""}`,
      },
      {
        icon: <Bp />,
        iconBg: "bg-pink",
        title: "BP Trend",
        value: (sysVal || diaVal) ? `${sysVal ?? '--'}/${diaVal ?? '--'}` : '--/--',
        extension: "mmHg",
        img: (sysVal === 0 || sysVal === '0' || !sysVal) ? noGraphPlaceholder : <BPTrend historyData={historyData} />,
        path: `/dashboard/bp-trend/${userId || ""}`,
      },
      {
        icon: <Temp />,
        iconBg: "bg-blue",
        title: "Temperature",
        value: tempVal ? formatTemperature(tempVal) : '--',
        extension: "°C",
        img: (tempVal === 0 || tempVal === '0' || !tempVal) ? noGraphPlaceholder : <TempWave historyData={historyData} />,
        path: `/dashboard/temperature/${userId || ""}`,
      },
      {
        icon: <Hrv />,
        iconBg: "bg-yellow",
        title: "HRV Score",
        value: hrvVal ?? '--',
        extension: "ms",
        img: (hrvVal === 0 || !hrvVal) ? noGraphPlaceholder : <HrvScore historyData={historyData} />,
        path: `/dashboard/hrv-score/${userId || ""}`,
      },
      {
        icon: <Brain />,
        iconBg: "bg-aqua",
        title: "Movement",
        value: movementVal ?? '--',
        extension: "",
        img: (movementVal === 0 || !movementVal) ? noGraphPlaceholder : <Movement historyData={historyData} />,
        path: `/dashboard/movement/${userId || ""}`,
      },
      {
        icon: <Moon />,
        iconBg: "bg-burnt",
        title: "Sleep Pattern",
        value: latestVitals?.sleep_pattern ?? '--',
        extension: "",
        img: (latestVitals?.sleep_pattern === "Unknown" || !latestVitals?.sleep_pattern || latestVitals?.sleep_pattern === '--') ? noGraphPlaceholder : <SleepPattern />,
        path: `/dashboard/sleep-pattern/${userId || ""}`,
      },
      {
        icon: <Brain />,
        iconBg: "bg-deepBlue",
        title: "Stress Level",
        value: latestVitals?.stress_level ?? '--',
        extension: "",
        img: (latestVitals?.stress_level === "Normal" && (hrVal === 0 || !hrVal)) ? noGraphPlaceholder : <StressPatternChart historyData={historyData} />,
        path: `/dashboard/stress/${userId || ""}`,
      },
    ];
  }, [currentVitals, patientData, userId, patientHistory]);

  const btn = [
    "Add Note",
    "Event Log",
    "Baseline Deviation",
    "Export Summary PDF",
  ];

  // ── Trigger alarm from SSE critical_alert events ─────────────────────
  // criticalAlert updates every time the server pushes a critical_alert event.
  // The object always has a new _ts so the dependency detects every alert.
  useEffect(() => {
    if (!criticalAlert) return;

    // Build a vitals snapshot for the modal. Merge stream vitals + alert info.
    const vitalsSnapshot = {
      // Current live vitals (may be populated from prior patient_vital_update events)
      heartRate: streamData?.heart_rate ?? undefined,
      spo2:      streamData?.spo2       ?? undefined,
      bloodPressure: (streamData?.bp_systolic && streamData?.bp_diastolic)
        ? { systolic: streamData.bp_systolic, diastolic: streamData.bp_diastolic }
        : undefined,
      temperature: streamData?.temp ?? undefined,
      // Pass the specific vital that triggered this alert so the modal can
      // highlight it (CriticalAlarmModal uses the vitals prop for display).
      _alertVitalType:    criticalAlert.vital_type,
      _alertTriggeredVal: criticalAlert.triggered_value,
    };

    setCriticalAlarmData({ vitals: vitalsSnapshot, alert: criticalAlert, source: 'overview' });
  }, [criticalAlert]); // eslint-disable-line react-hooks/exhaustive-deps

  // (Removed: fallback polling alarm from clinical_risks — the SSE-based
  //  criticalAlert effect above is sufficient and avoids re-triggering the
  //  modal on every 5-second data refresh.)

  useEffect(() => {
    if (
      news_scrore ||
      ap_warning ||
      stroke_risk ||
      seizure_risk ||
      flag_doctor_review
    ) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
  }, [news_scrore, ap_warning, stroke_risk, seizure_risk, flag_doctor_review]);


  if (loading) {
    return (
      <MainBody>
        <div className="flex items-center justify-center min-h-96">
          <p className="text-white">Loading patient data...</p>
        </div>
      </MainBody>
    );
  }

  return (
    <>
      <MainBody>
        {/* Back Button */}
        <div className="mb-6">
          <Link
            to="/dashboard/home"
            className="inline-flex items-center gap-2 text-white hover:text-primary transition-colors duration-200"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-base font-medium">Back to Home</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[repeat(auto-fit,325px)] gap-4 md:gap-5 xl:gap-6">
          {triageStatus.map((item, index) => (
            <div
              key={index}
              onClick={item.action}
              className={`border cursor-pointer relative z-1 overflow-hidden rounded-[20px] bg-[#2f2f31] shadow-[0_0_100px_0_rgba(0,0,0,0.08)] flex flex-col gap-5 ${item.status === "Warning"
                ? "border-yellow"
                : item.status === "High"
                  ? "border-red"
                  : "border-green"
                }`}
            >
              <div className="py-5 px-6.5">
                <div className="flex items-center justify-between gap-4 mb-10">
                  <h4 className="text-lg md:text-xl lg:text-lg xl:text-xl font-normal text-white">
                    {item.title}{" "}
                  </h4>
                  <div
                    className={`size-11 lg:size-10 xl:size-11 ${item.status === "High"
                      ? "bg-froly"
                      : item.status === "Warning"
                        ? "bg-yellow"
                        : "bg-green"
                      }`}
                  >
                    {item.icon}
                  </div>
                </div>
                <div className="">
                  <span className="text-xl md:text-2xl lg:text-xl xl:text-[36px] text-white font-medium mr-3">
                    {item.position}
                  </span>
                  <p className="text-base lg:text-sm xl:text-base text-para">{item.des} </p>
                </div>
                <div className="absolute bottom-0 right-0 -z-1">
                  {item.progress}
                </div>
                <div className="absolute top-0 left-0 -z-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="170"
                    height="170"
                    viewBox="0 0 170 170"
                    fill="none"
                  >
                    <g filter="url(#filter0_f_119_5326)">
                      <ellipse
                        cx="45.6203"
                        cy="45.5834"
                        rx="75"
                        ry="12.5796"
                        transform="rotate(45 45.6203 45.5834)"
                        fill={`${item.color}`}
                        fillOpacity="0.35"
                      />
                      <ellipse
                        cx="75.0855"
                        cy="12.5654"
                        rx="75.0855"
                        ry="12.5654"
                        transform="matrix(0.940523 0.339729 -0.3443 0.93886 -3.04492 -18.8887)"
                        fill={`${item.color}`}
                        fillOpacity="0.35"
                      />
                      <ellipse
                        cx="75.0855"
                        cy="12.5654"
                        rx="75.0855"
                        ry="12.5654"
                        transform="matrix(0.339729 0.940523 -0.93886 0.3443 4.7052 -11.6963)"
                        fill={`${item.color}`}
                        fillOpacity="0.35"
                      />
                    </g>
                    <defs>
                      <filter
                        id="filter0_f_119_5326"
                        x="-45.6946"
                        y="-45.6941"
                        width="215.698"
                        height="215.698"
                        filterUnits="userSpaceOnUse"
                        colorInterpolationFilters="sRGB"
                      >
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend
                          mode="normal"
                          in="SourceGraphic"
                          in2="BackgroundImageFix"
                          result="shape"
                        />
                        <feGaussianBlur
                          stdDeviation="18"
                          result="effect1_foregroundBlur_119_5326"
                        />
                      </filter>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 justify-between my-6">
          <h5 className="">Vitals Timeline</h5>
          <div className="flex items-center gap-1 bg-[#313135] p-1 rounded-xl">
            {filter.map((item, index) => (
              <button
                key={index}
                className={`text-sm min-h-7 px-3 rounded-lg min-w-12.5 ${item === filterTab ? "btn btn-gradient" : ""}`}
                onClick={() => setFilterTab(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-[repeat(auto-fit,325px)] gap-4 md:gap-5 xl:gap-6">
          {vitals.map((item, index) => (
            <Link
              to={item.path}
              className="bg-[#2F2F31] rounded-3xl overflow-hidden min-h-50  flex flex-col justify-between"
              key={index}
            >
              <div className="p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className={`size-10 md:size-11 lg:size-12 xl:size-13 ${item.iconBg}`}
                  >
                    {item.icon}
                  </div>
                  <span className="text-base md:text-lg xl:text-xl text-white">
                    {item.title}{" "}
                  </span>
                </div>
                <div className="text-xl md:text-2xl lg:text-3xl xl:text-[36px] text-white font-medium [text-shadow:1px_1px_5px_rgba(255,0,0,0.16),-1px_-1px_5px_rgba(0,170,255,0.16)]">
                  {String(item.value).includes("/") ? (
                    <>
                      <span>{String(item.value).split("/")[0]}</span>
                      <span className="text-lg md:text-xl lg:text-2xl xl:text-[22px] font-normal text-white/80 align-baseline ml-0.5">
                        /{String(item.value).split("/")[1]}
                      </span>
                    </>
                  ) : (
                    item.value
                  )}

                  <span className="text-sm md:text-base text-para ml-1.5 font-normal">
                    {item.extension}
                  </span>
                </div>

              </div>
              <div className="relative z-1">
                {chartsReady ? item.img : <div className="h-[120px] w-full animate-pulse bg-white/5 opacity-50 rounded-b-3xl"></div>}
              </div>
            </Link>
          ))}
        </div>
        <div className="bg-[#2D2D2F] rounded-3xl border border-[#0F0F0F] flex-wrap gap-3 p-5 xl:py-6.5 xl:px-7.5 mt-6 flex items-center justify-between">
          <div className="flex items-center flex-wrap gap-3 xl:gap-6">
            {btn.map((item, index) => (
              <button
                className="btn xl:px-12 rounded-2xl text-white"
                key={index}
                onClick={() => {
                  if (item === "Add Note") {
                    setIsNotesModalOpen(true);
                  } else if (item === "Event Log") {
                    setIsEventLogModalOpen(true);
                  } else if (item === "Baseline Deviation") {
                    setIsBaselineDeviationModalOpen(true);
                  }
                }}
              >
                {item}{" "}
              </button>
            ))}
          </div>
          <button
            onClick={() => set_flag_doctor_review(true)}
            className="btn xl:px-12 rounded-2xl btn-gradient"
          >
            Flag for Doctor Review
          </button>
        </div>

        {/* --- History Section --- */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xl lg:text-2xl font-medium text-white">Full Vitals History</h4>
            <div className="text-para text-sm">
              Showing all recorded vital signs
            </div>
          </div>
          <HistoryTable history={patientHistory || currentVitals?.vitals_history || []} />
        </div>
      </MainBody>

      {/* new 2 score modal */}
      <Modal
        onClick={() => set_news_score(false)}
        modalCondition={news_scrore}
        innerClass="rounded-3xl! max-w-203! bg-[#2F2F31]! border-0! lg:rounded-4xl! xl:rounded-[48px]! mr-0!"
      >
        <NewsScore userId={userId} />
      </Modal>
      {/* new 2 score modal */}

      {/* ap warning modal */}
      <Modal
        modalCondition={ap_warning}
        onClick={() => set_ap_warning(false)}
        innerClass="rounded-3xl! max-w-203! bg-[#2F2F31]! border-0! lg:rounded-4xl! xl:rounded-[48px]! mr-0!"
      >
        <APWarning userId={userId} />
      </Modal>
      {/* ap warning modal */}

      {/* 3rd modal-- */}
      <Modal
        modalCondition={stroke_risk}
        onClick={() => set_stroke_risk(false)}
        innerClass="rounded-3xl! max-w-203! bg-[#2F2F31]! border-0! lg:rounded-4xl! xl:rounded-[48px]! mr-0!"
      >
        <StrokeRisk userId={userId} />
      </Modal>

      {/* seizure_risk modal */}
      <Modal
        onClick={() => set_seizure_risk(false)}
        modalCondition={seizure_risk}
        innerClass="rounded-3xl! max-w-203! bg-[#2F2F31]! border-0! lg:rounded-4xl! xl:rounded-[48px]! mr-0!"
      >
        <SeizureRisk userId={userId} />
      </Modal>
      {/* seizure_risk modal */}

      {/*  flag for doctor review modal start */}
      <Modal2
        onClick={() => set_flag_doctor_review(false)}
        modalCondition={flag_doctor_review}
        innerClass="max-w-245 [&>div]:!p-0 border border-solid border-white/15"
      >
        <DoctorReview
          onClick={() => set_flag_doctor_review(false)}
          userId={userId}
          patientDetails={{
            name: patientData?.name || currentVitals?.patientName || "Arthur Crane",
            id: patientData?.patientId || currentVitals?.patientId || userId || "P-1049",
            ward: patientData?.ward || currentVitals?.ward || "ICU Ward - 03",
            bed: patientData?.bed || currentVitals?.bed || "12A",
            news2Score: currentVitals?.assessments?.news2?.score || patientData?.assessments?.news2?.score || 1,
            lastSync: "2m ago" // You can calculate this from currentVitals?.timestamp if needed
          }}
        />
      </Modal2>
      {/*  flag for doctor review modal end */}
      {/*  flag for doctor review modal end */}

      <AddNotesModal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        onSave={handleSaveNotes}
        title="Add Clinical Note"
        patientDetails={{
          name: patientData?.name || currentVitals?.patientName || "Arthur Crane",
          id: patientData?.patientId || currentVitals?.patientId || userId || "P-1049",
          bed: patientData?.bed || currentVitals?.bed || "12A",
          ward: patientData?.ward || currentVitals?.ward || "ICU Ward - 03"
        }}
      />

      <EventLogModal
        isOpen={isEventLogModalOpen}
        onClose={() => setIsEventLogModalOpen(false)}
        onSave={handleSaveEventLog}
        title="Log Event"
        patientDetails={{
          name: patientData?.name || currentVitals?.patientName || "Arthur Crane",
          id: patientData?.patientId || currentVitals?.patientId || userId || "P-1049",
          bed: patientData?.bed || currentVitals?.bed || "12A",
          ward: patientData?.ward || currentVitals?.ward || "ICU Ward - 03"
        }}
      />

      <BaselineDeviationModal
        isOpen={isBaselineDeviationModalOpen}
        onClose={() => setIsBaselineDeviationModalOpen(false)}
        onSave={handleSaveBaselineDeviation}
        title="Baseline Deviation"
        patientDetails={{
          name: patientData?.name || currentVitals?.patientName || "Arthur Crane",
          id: patientData?.patientId || currentVitals?.patientId || userId || "P-1049",
          bed: patientData?.bed || currentVitals?.bed || "12A",
          ward: patientData?.ward || currentVitals?.ward || "ICU Ward - 03"
        }}
      />

      <ConfirmationModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        onConfirm={() => setIsSuccessModalOpen(false)}
        title="Saved & Synced"
        message={successMessage}
        confirmText="OK"
        icon={<SuccessTik className="size-6 text-[#2CD155]" />}
      />

      {/* 🚨 Critical Alarm Modal — only shows alarms originating from this
          page (source:'overview'). Home-sourced alarms are filtered out. */}
      <CriticalAlarmModal
        isOpen={!!criticalAlarmData && criticalAlarmData?.source !== 'home'}
        patientName={patientData?.name || patientData?.fullName}
        patientId={userId}
        vitals={criticalAlarmData?.vitals}
        alert={criticalAlarmData?.alert}
        onDismiss={() => clearCriticalAlarm()}
        onViewPatient={() => {
          clearCriticalAlarm();
          // Already on the patient page, just scroll to top
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </>
  );
}
