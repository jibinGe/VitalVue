import React, { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Angle, Bp, Hart, Spo, Temp, Search, High, Brain, Face } from "@/utilities/icons";
import Modal from "@/components/ui/modal";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import CriticalAlarmModal from "@/components/ui/CriticalAlarmModal";
import Input from "@/components/ui/input";
import Spo2Gauge from "@/components/animation/overview/spo2Gauge";
import { motion, AnimatePresence } from "framer-motion";

// Charts
import SiteVerstion from "../../components/dashboard/site-verstion";
import PatientCard from "@/components/dashboard/PatientCard";

// Services
import { patientService } from "@/services/patientService";
import { authService } from "@/services/authService";
import { formatToLocalTime } from "@/utilities/dateUtils";
import { useWard } from "@/contexts/WardContext";
import { usePatients } from "@/hooks/usePatients";
import { useDoctors } from "@/hooks/useDoctors";
import { useDashboardStore } from "@/store/useDashboardStore";
export default function Home() {
  const navigate = useNavigate();
  const { selectedWard } = useWard();
  const {
    criticalAlarmData,
    setCriticalAlarmData,
    clearCriticalAlarm,
    triageFilter,
    setTriageFilter,
    selectedUserId,
    setSelectedUserId,
    selectedUserName,
    setSelectedUserName,
    liveVitals,
  } = useDashboardStore();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const previousCriticalPatients = useRef(new Set());


  // --- Fetch Data via Hooks ---
  const { data: rawPatients = [], isLoading: loading } = usePatients(selectedWard?.id, refreshTrigger);
  const { data: doctors = [], isLoading: doctorsLoading } = useDoctors();

  // --- Static Data for UI ---
  const defaultAlerts = [
    {
      type: "NEWS2",
      status: "Score 5",
      color: "#2CD155BF",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M2 12.625H6L8.33333 8.875L12 17L16 7L18.6667 12.625H22"
            stroke="#2CD155"
            strokeOpacity="0.75"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      type: "NEWS2",
      status: "High",
      color: "#E54D4D",
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5.91038 13.2799H9.09511V20.4793C9.09511 22.1591 10.033 22.4991 11.177 21.2392L18.9791 12.6399C19.9376 11.59 19.5357 10.7201 18.0824 10.7201H14.8977V3.52074C14.8977 1.84089 13.9598 1.50092 12.8158 2.76081L5.0137 11.3601C4.0655 12.42 4.46745 13.2799 5.91038 13.2799Z"
            stroke="#E54D4D"
            strokeWidth="1.2"
            strokeMiterlimit="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      type: "NEWS2",
      status: "Low",
      color: "#FFF133BF",
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 18.0001V5.00013M12 5.00013C12 4.53996 12.1058 4.08595 12.3093 3.67322C12.5129 3.2605 12.8086 2.90012 13.1737 2.61998C13.5387 2.33983 13.9634 2.14743 14.4147 2.05765C14.866 1.96787 15.332 1.98312 15.7765 2.10223C16.221 2.22133 16.6321 2.44109 16.9781 2.74451C17.324 3.04793 17.5956 3.42687 17.7717 3.85203C17.9478 4.27718 18.0237 4.73714 17.9936 5.19633C17.9635 5.65551 17.8281 6.10162 17.598 6.50013M12 5.00013C12 4.53996 11.8942 4.08595 11.6907 3.67322C11.4871 3.2605 11.1914 2.90012 10.8263 2.61998C10.4613 2.33983 10.0366 2.14743 9.5853 2.05765C9.13396 1.96787 8.66803 1.98312 8.22353 2.10223C7.77904 2.22133 7.3679 2.44109 7.02193 2.74451C6.67596 3.04793 6.40442 3.42687 6.22833 3.85203C6.05224 4.27718 5.97632 4.73714 6.00643 5.19633C6.03655 5.65551 6.17189 6.10162 6.402 6.50013M15 13.0001C14.1348 12.7472 13.3748 12.2208 12.834 11.4996C12.2932 10.7785 12.0005 9.90154 12 9.00013C11.9995 9.90154 11.7068 10.7785 11.166 11.4996C10.6252 12.2208 9.8652 12.7472 9 13.0001"
            stroke="#FFF133"
            strokeOpacity="0.75"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17.9963 5.125C18.5841 5.27614 19.1298 5.55905 19.5921 5.95231C20.0544 6.34557 20.4211 6.83887 20.6645 7.39485C20.9079 7.95082 21.0216 8.55489 20.997 9.16131C20.9723 9.76773 20.81 10.3606 20.5223 10.895"
            stroke="#FFF133"
            strokeOpacity="0.75"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18.0002 17.9992C18.8807 17.9991 19.7366 17.7086 20.4352 17.1725C21.1337 16.6365 21.6359 15.8849 21.8638 15.0344C22.0917 14.1839 22.0326 13.282 21.6956 12.4685C21.3587 11.655 20.7628 10.9754 20.0002 10.5352"
            stroke="#FFF133"
            strokeOpacity="0.75"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19.9672 17.4824C20.0373 18.0247 19.9955 18.5755 19.8444 19.1009C19.6932 19.6264 19.4359 20.1153 19.0885 20.5374C18.741 20.9595 18.3106 21.3059 17.824 21.5552C17.3374 21.8045 16.8049 21.9514 16.2593 21.9868C15.7137 22.0222 15.1666 21.9453 14.6519 21.761C14.1371 21.5767 13.6656 21.2889 13.2665 20.9152C12.8674 20.5415 12.5491 20.09 12.3313 19.5885C12.1135 19.087 12.0008 18.5462 12.0002 17.9994C11.9997 18.5462 11.887 19.087 11.6692 19.5885C11.4514 20.09 11.1331 20.5415 10.734 20.9152C10.3349 21.2889 9.86337 21.5767 9.34863 21.761C8.83388 21.9453 8.28682 22.0222 7.74122 21.9868C7.19562 21.9514 6.66307 21.8045 6.17646 21.5552C5.68985 21.3059 5.25952 20.9595 4.91203 20.5374C4.56454 20.1153 4.30728 19.6264 4.15613 19.1009C4.00498 18.5755 3.96316 18.0247 4.03324 17.4824"
            stroke="#FFF133"
            strokeOpacity="0.75"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.00007 17.9992C5.11957 17.9991 4.26368 17.7086 3.56514 17.1725C2.8666 16.6365 2.36444 15.8849 2.13655 15.0344C1.90865 14.1839 1.96775 13.282 2.30469 12.4685C2.64162 11.655 3.23755 10.9754 4.00007 10.5352"
            stroke="#FFF133"
            strokeOpacity="0.75"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.00415 5.125C5.41635 5.27614 4.87065 5.55905 4.40838 5.95231C3.94611 6.34557 3.57939 6.83887 3.33599 7.39485C3.0926 7.95082 2.97891 8.55489 3.00354 9.16131C3.02817 9.76773 3.19047 10.3606 3.47815 10.895"
            stroke="#FFF133"
            strokeOpacity="0.75"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      type: "NEWS2",
      status: "Normal",
      color: "#2CD155BF",
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8.66667 9.77778H8.65556M15.3333 9.77778H15.3222M12 22C10.6868 22 9.38642 21.7413 8.17317 21.2388C6.95991 20.7363 5.85752 19.9997 4.92893 19.0711C4.00035 18.1425 3.26375 17.0401 2.7612 15.8268C2.25866 14.6136 2 13.3132 2 12C2 10.6868 2.25866 9.38642 2.7612 8.17317C3.26375 6.95991 4.00035 5.85752 4.92893 4.92893C5.85752 4.00035 6.95991 3.26375 8.17317 2.7612C9.38642 2.25866 10.6868 2 12 2C14.6522 2 17.1957 3.05357 19.0711 4.92893C20.9464 6.8043 22 9.34784 22 12C22 14.6522 20.9464 17.1957 19.0711 19.0711C17.1957 20.9464 14.6522 22 12 22Z"
            stroke="#2CD155"
            strokeOpacity="0.75"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 16L9 15L10.5 16L12 15L13.5 16L15 15L16 16"
            stroke="#2CD155"
            strokeOpacity="0.75"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ];

  const action = [
    { text: " Patient Examinated", color: "#F2685A" },
    { text: "Informed Doctor", color: "#47B4EB" },
    { text: "Medication Given", color: "#E06CE0" },
    { text: "Oxygen Started", color: "#09AA59" },
    { text: "Other Action", color: "#D2A92D" },
  ];

  // Doctors are fetched from the API — see useEffect below

  const CardMenu = [
    {
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M8 12.2002H15"
            stroke="white"
            strokeWidth="1.2"
            strokeMiterlimit="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 16.2002H12.38"
            stroke="white"
            strokeWidth="1.2"
            strokeMiterlimit="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 6H14C16 6 16 5 16 4C16 2 15 2 14 2H10C9 2 8 2 8 4C8 6 9 6 10 6Z"
            stroke="white"
            strokeWidth="1.2"
            strokeMiterlimit="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 4.01953C19.33 4.19953 21 5.42953 21 9.99953V15.9995C21 19.9995 20 21.9995 15 21.9995H9C4 21.9995 3 19.9995 3 15.9995V9.99953C3 5.43953 4.67 4.19953 8 4.01953"
            stroke="white"
            strokeWidth="1.2"
            strokeMiterlimit="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      text: "View Details",
    },
    {
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7.63259 21H16.3674C17.3308 21 18.2548 20.6412 18.936 20.0026C19.6173 19.3639 20 18.4978 20 17.5946V12.2141C20.0003 11.311 19.6181 10.4448 18.9372 9.80595L12.7421 3.9973C12.4047 3.68108 12.0043 3.43026 11.5635 3.25914C11.1228 3.08802 10.6504 2.99997 10.1733 3H7.63259C6.66917 3 5.7452 3.35878 5.06396 3.99742C4.38272 4.63606 4 5.50224 4 6.40541V17.5946C4 18.4978 4.38272 19.3639 5.06396 20.0026C5.7452 20.6412 6.66917 21 7.63259 21Z"
            stroke="white"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 3.5V8.91158C12 9.46555 12.22 9.99684 12.6116 10.3886C13.0032 10.7803 13.5344 11.0003 14.0882 11.0003H19.708"
            stroke="white"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.95801 16.5V15.5M6.95801 15.5V13.5H7.95801C8.22322 13.5 8.47758 13.6054 8.66511 13.7929C8.85265 13.9804 8.95801 14.2348 8.95801 14.5C8.95801 14.7652 8.85265 15.0196 8.66511 15.2071C8.47758 15.3946 8.22322 15.5 7.95801 15.5H6.95801ZM14.958 16.5V15.25M14.958 15.25V13.5H16.458M14.958 15.25H16.458M10.958 16.5V13.5H11.458C11.8558 13.5 12.2374 13.658 12.5187 13.9393C12.8 14.2206 12.958 14.6022 12.958 15C12.958 15.3978 12.8 15.7794 12.5187 16.0607C12.2374 16.342 11.8558 16.5 11.458 16.5H10.958Z"
            stroke="white"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      text: "Generate PDF",
    },
    {
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9.32031 6.50043L11.8803 3.94043L14.4403 6.50043"
            stroke="#E86363"
            strokeWidth="1.2"
            strokeMiterlimit="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11.8799 14.1798V4.00977"
            stroke="#E86363"
            strokeWidth="1.2"
            strokeMiterlimit="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 12C4 16.42 7 20 12 20C17 20 20 16.42 20 12"
            stroke="#E86363"
            strokeWidth="1.2"
            strokeMiterlimit="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      text: "End Monitoring",
    },
  ];

  const [takeAction, setTakeAction] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [activeAction, setActiveAction] = useState(null);
  const [actionTime, setActionTime] = useState("");
  const [staffName, setStaffName] = useState("");
  const [actionDoctorSearch, setActionDoctorSearch] = useState("");
  const [actionDoctorDropdownOpen, setActionDoctorDropdownOpen] = useState(false);
  const [isLoggingEvent, setIsLoggingEvent] = useState(false);

  // Auto-fill name & time when Action Capture modal opens
  useEffect(() => {
    if (takeAction) {
      // Auto-fill current time
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      setActionTime(`${hh}:${mm}`);

      // Fetch full_name from the profile API
      patientService.getUserProfile().then((res) => {
        let name = "";
        if (res?.data?.full_name) {
          name = res.data.full_name;
        } else {
          // Fallback to cached localStorage user
          const currentUser = authService.getCurrentUser();
          name = currentUser?.name || currentUser?.full_name || "";
        }
        setStaffName(name);
        setActionDoctorSearch(name);
      }).catch(() => {
        const currentUser = authService.getCurrentUser();
        const name = currentUser?.name || currentUser?.full_name || "";
        setStaffName(name);
        setActionDoctorSearch(name);
      });
    }
  }, [takeAction]);
  const [flagDoctor, setFlagDoctor] = useState(false);
  const [endMonitoring, setEndMonitoring] = useState(false);
  const [endingMonitoring, setEndingMonitoring] = useState(false);
  // Doctor Flagging State
  const [selectedDoctors, setSelectedDoctors] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [doctorFilterTab, setDoctorFilterTab] = useState("All");
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [patientSearchQuery, setPatientSearchQuery] = useState("");

  const card_ref = useRef(null);
  const [cardMenu, setCardMenu] = useState(null);

  // --- Transform API Data to UI Structure ---
  // Helper functions moved above useMemo to avoid ReferenceError
  const formatTemperature = (temp) => {
    if (temp === undefined || temp === null) return 0;
    const numTemp = typeof temp === "object" ? temp.value : temp;
    return parseFloat(numTemp).toFixed(1);
  };

  const getPatientStatusFromVitals = (vitalsData) => {
    const hasCritical =
      vitalsData.heartRate?.status?.toLowerCase() === "critical" ||
      vitalsData.spo2?.status?.toLowerCase() === "critical" ||
      vitalsData.bloodPressure?.status?.toLowerCase() === "critical";
    if (hasCritical) return "Critical";

    const hasWarning =
      vitalsData.heartRate?.status?.toLowerCase() === "high" ||
      vitalsData.heartRate?.status?.toLowerCase() === "low" ||
      vitalsData.spo2?.status?.toLowerCase() === "high" ||
      vitalsData.spo2?.status?.toLowerCase() === "low" ||
      vitalsData.bloodPressure?.status?.toLowerCase() === "high" ||
      vitalsData.bloodPressure?.status?.toLowerCase() === "low" ||
      vitalsData.temperature?.status?.toLowerCase() === "high" ||
      vitalsData.temperature?.status?.toLowerCase() === "low";
    if (hasWarning) return "Warning";

    return "Stable";
  };

  const mapAssessmentsToAlerts = (assessments) => {
    if (!assessments) return defaultAlerts;
    const alerts = [];

    // NEWS2 Score
    if (assessments.news2 || assessments.news2_score !== undefined) {
      const score = assessments.news2_score ?? assessments.news2?.score ?? 0;
      const riskLevel = assessments.news2?.riskLevel || (score >= 7 ? "High" : score >= 5 ? "Medium" : "Low");
      const color = riskLevel === "High" ? "#E54D4D" : riskLevel === "Medium" ? "#FFF133BF" : "#2CD155BF";
      alerts.push({
        type: "NEWS2",
        status: `Score ${score}`,
        color: color,
        icon: (
          <svg className="size-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
            <path d="M2 12.625H6L8.33333 8.875L12 17L16 7L18.6667 12.625H22" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      });
    }

    // AF Warning
    if (assessments.af_warning !== undefined) {
      const afVal = assessments.af_warning;
      const afStatus = (afVal === "Normal" || afVal === 0 || afVal === false) ? "Normal" : "High";
      const color = afStatus === "Normal" ? "#2CD155BF" : "#E54D4D";
      alerts.push({
        type: "AF Warning",
        status: afStatus,
        color: color,
        icon: (
          <svg className="size-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 15 20" fill="none">
            <path d="M2.01243 11.88H5.19716V19.0794C5.19716 20.7592 6.13506 21.0992 7.27909 19.8393L15.0812 11.24C16.0397 10.1901 15.6377 9.32021 14.1845 9.32021H10.9998V2.12084C10.9998 0.440986 10.0619 0.101015 8.91783 1.36091L1.11575 9.96015C0.167548 11.0201 0.569505 11.88 2.01243 11.88Z" stroke={color} strokeWidth="1.2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      });
    }

    // Stroke Risk
    if (assessments.stroke_risk !== undefined) {
      const strokeRisk = assessments.stroke_risk?.riskLevel || assessments.stroke_risk || "Low";
      const color = strokeRisk === "High" ? "#E54D4D" : strokeRisk === "Medium" ? "#FFF133BF" : "#2CD155BF";
      alerts.push({
        type: "Stroke Risk",
        status: strokeRisk,
        color: color,
        icon: (
          <svg className="size-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none">
            <path d="M10.5999 16.6002V3.60023M10.5999 3.60023C10.5998 3.14005 10.7057 2.68604 10.9092 2.27332C11.1127 1.86059 11.4084 1.50022 11.7735 1.22007C12.1386 0.939931 12.5632 0.747526 13.0146 0.657747C13.4659 0.567967 13.9318 0.583219 14.3763 0.702323C14.8208 0.821427 15.232 1.04119 15.5779 1.34461C15.9239 1.64803 16.1954 2.02697 16.3715 2.45212C16.5476 2.87727 16.6235 3.33724 16.5934 3.79642C16.5633 4.25561 16.428 4.70172 16.1979 5.10023M10.5999 3.60023C10.5999 3.14005 10.494 2.68604 10.2905 2.27332C10.087 1.86059 9.79126 1.50022 9.42619 1.22007C9.06111 0.939931 8.63648 0.747526 8.18515 0.657747C7.73382 0.567967 7.26788 0.583219 6.82339 0.702323C6.37889 0.821427 5.96776 1.04119 5.62178 1.34461C5.27581 1.64803 5.00427 2.02697 4.82818 2.45212C4.65209 2.87727 4.57617 3.33724 4.60628 3.79642C4.6364 4.25561 4.77175 4.70172 5.00185 5.10023M13.5999 11.6002C12.7347 11.3473 11.9747 10.8209 11.4339 10.0997C10.893 9.3786 10.6004 8.50164 10.5999 7.60023C10.5993 8.50164 10.3067 9.3786 9.76585 10.0997C9.22501 10.8209 8.46505 11.3473 7.59985 11.6002" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16.5962 3.7251C17.184 3.87623 17.7297 4.15915 18.192 4.55241C18.6542 4.94567 19.021 5.43897 19.2643 5.99495C19.5077 6.55092 19.6214 7.15499 19.5968 7.76141C19.5722 8.36783 19.4099 8.96069 19.1222 9.4951" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16.6001 16.5993C17.4806 16.5992 18.3365 16.3086 19.035 15.7726C19.7336 15.2366 20.2357 14.485 20.4636 13.6345C20.6915 12.784 20.6324 11.8821 20.2955 11.0686C19.9585 10.2551 19.3626 9.57554 18.6001 9.13525" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18.5671 16.0825C18.6372 16.6248 18.5954 17.1756 18.4442 17.701C18.2931 18.2265 18.0358 18.7154 17.6883 19.1375C17.3408 19.5596 16.9105 19.906 16.4239 20.1553C15.9373 20.4046 15.4047 20.5514 14.8591 20.5869C14.3135 20.6223 13.7665 20.5454 13.2517 20.3611C12.737 20.1768 12.2655 19.8889 11.8663 19.5153C11.4672 19.1416 11.1489 18.6901 10.9311 18.1886C10.7133 17.6871 10.6007 17.1463 10.6001 16.5995C10.5995 17.1463 10.4868 17.6871 10.2691 18.1886C10.0513 18.6901 9.73298 19.1416 9.33386 19.5153C8.93473 19.8889 8.46323 20.1768 7.94848 20.3611C7.43374 20.5454 6.88667 20.6223 6.34107 20.5869C5.79547 20.5514 5.26292 20.4046 4.77631 20.1553C4.28971 19.906 3.85937 19.5596 3.51188 19.1375C3.16439 18.7154 2.90713 18.2265 2.75598 17.701C2.60484 17.1756 2.56301 16.6248 2.6331 16.0825" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4.59992 16.5993C3.71942 16.5992 2.86353 16.3086 2.16499 15.7726C1.46645 15.2366 0.964294 14.485 0.736399 13.6345C0.508505 12.784 0.567607 11.8821 0.904539 11.0686C1.24147 10.2551 1.83741 9.57554 2.59992 9.13525" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4.604 3.7251C4.01621 3.87623 3.47051 4.15915 3.00823 4.55241C2.54596 4.94567 2.17924 5.43897 1.93585 5.99495C1.69245 6.55092 1.57876 7.15499 1.60339 7.76141C1.62802 8.36783 1.79032 8.96069 2.078 9.4951" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      });
    }

    // Seizure Risk
    if (assessments.seizure_risk !== undefined) {
      const seizureRisk = assessments.seizure_risk.riskLevel || assessments.seizure_risk || "Normal";
      const color = seizureRisk === "High" ? "#E54D4D" : seizureRisk === "Medium" ? "#FFF133BF" : "#2CD155BF";
      alerts.push({
        type: "Seizure Risk",
        status: seizureRisk,
        color: color,
        icon: (
          <svg className="size-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="none">
            <path d="M7.26676 8.37788H7.25565M13.9334 8.37788H13.9223M10.6001 20.6001C9.28688 20.6001 7.98652 20.3414 6.77326 19.8389C5.56001 19.3363 4.45762 18.5998 3.52903 17.6712C2.60044 16.7426 1.86385 15.6402 1.3613 14.4269C0.858755 13.2137 0.600098 11.9133 0.600098 10.6001C0.600098 9.28688 0.858755 7.98652 1.3613 6.77326C1.86385 5.56001 2.60044 4.45762 3.52903 3.52903C4.45762 2.60044 5.56001 1.86385 6.77326 1.3613C7.98652 0.858755 9.28688 0.600098 10.6001 0.600098C13.2523 0.600098 15.7958 1.65367 17.6712 3.52903C19.5465 5.40439 20.6001 7.94793 20.6001 10.6001C20.6001 13.2523 19.5465 15.7958 17.6712 17.6712C15.7958 19.5465 13.2523 20.6001 10.6001 20.6001Z" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6.6001 14.6001L7.6001 13.6001L9.1001 14.6001L10.6001 13.6001L12.1001 14.6001L13.6001 13.6001L14.6001 14.6001" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      });
    }

    return alerts.length > 0 ? alerts : defaultAlerts;
  };

  const cardData = useMemo(() => {
    return rawPatients.map((p) => {
      // Get the latest vitals from history (fallback)
      const latestHistoryVitals = p.vitals_history && p.vitals_history.length > 0
        ? p.vitals_history[p.vitals_history.length - 1]
        : null;

      // Merge with live stream data if available
      const live = liveVitals[p.id] || {};

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

      // Merge assessments for clinical alerts
      const liveAssessments = {
        news2_score: live.news2_score,
        af_warning: live.af_warning,
        stroke_risk: live.stroke_risk,
        seizure_risk: live.seizure_risk
      };

      // We only merge if we have live assessment data
      const finalAssessments = (liveAssessments.news2_score !== undefined || liveAssessments.af_warning !== undefined)
        ? { ...p.assessments, ...liveAssessments }
        : p.assessments;

      // --- Triage Classification (NEWS2 + Risk Formula) ---
      const news2Score = finalAssessments?.news2_score ?? finalAssessments?.news2?.score ?? 0;
      const afWarning = finalAssessments?.af_warning;
      const strokeRisk = finalAssessments?.stroke_risk?.riskLevel || finalAssessments?.stroke_risk || "Low";
      const seizureRisk = finalAssessments?.seizure_risk?.riskLevel || finalAssessments?.seizure_risk || "Low";

      // Check if no vitals are present at all (all values are 0 or missing)
      const hasNoVitals =
        (!vitals.heartRate?.value || vitals.heartRate.value === 0) &&
        (!vitals.spo2?.value || vitals.spo2.value === 0) &&
        (!vitals.bloodPressure?.systolic || vitals.bloodPressure.systolic === 0) &&
        (!vitals.temperature?.value || vitals.temperature.value === 0);

      // Critical: any vital in "critical" status, or NEWS2 >= 7, or high stroke/seizure risk + abnormal HR
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

      // Warning: NEWS2 score 5-6, or any vital "high"/"low", or medium risks
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

      let status = "Stable";
      if (hasNoVitals || hasCriticalVital || hasCriticalScore || hasCriticalRisk) {
        status = "Critical";
      } else if (hasWarningVital || hasWarningScore || hasWarningRisk) {
        status = "Warning";
      }

      return {
        status: status,
        id: p.id,
        userId: p.user_id,
        patientId: p.user_id, // For UI display
        name: p.full_name || "Unknown Patient",
        room: p.room_no || "General",
        lastSync: live.recorded_at || latestHistoryVitals?.recorded_at || new Date().toISOString(),
        vitals: [
          { icon: <Hart />, title: "Heart Rate", heartRate: vitals.heartRate?.value || 0, historyData: p.vitals_history || [] },
          { icon: <Spo />, title: "SpO2", spo2: vitals.spo2?.value ? Math.round(vitals.spo2.value) : 0, historyData: p.vitals_history || [] },
          { icon: <Bp />, title: "BP Trend", bp: `${vitals.bloodPressure?.systolic || '--'}/${vitals.bloodPressure?.diastolic || '--'}`, historyData: p.vitals_history || [] },
          { icon: <Temp />, title: "Temp", temp: vitals.temperature?.value ? formatTemperature(vitals.temperature?.value) : '--', historyData: p.vitals_history || [] },
        ],
        alerts: mapAssessmentsToAlerts(finalAssessments),
        deviceBattery: live.battery_percent !== undefined ? `${live.battery_percent}%` : (latestHistoryVitals?.battery_percent !== undefined ? `${latestHistoryVitals.battery_percent}%` : (p.device_battery || "80%")),
        isConnected: live.is_connected ?? latestHistoryVitals?.is_connected ?? true,
      };
    });
  }, [rawPatients, liveVitals]);

  const filteredAndSortedCards = useMemo(() => {
    let result = [...cardData];

    // 1. Sort: Critical > Warning > Stable
    const getStatusWeight = (status) => {
      const s = status?.toLowerCase();
      if (s === 'critical') return 3;
      if (s === 'warning') return 2;
      return 1; // Stable or others
    };

    result.sort((a, b) => {
      return getStatusWeight(b.status) - getStatusWeight(a.status);
    });

    // 2. Filter
    if (triageFilter !== "All") {
      result = result.filter(item => item.status === triageFilter);
    }

    return result;
  }, [cardData, triageFilter]);

  // Helper function to recalculate triage data from card data
  const recalculateTriageData = (cardDataArray) => {
    const criticalPatients = cardDataArray.filter(
      (p) => p.status?.toLowerCase() === "critical",
    );
    const warningPatients = cardDataArray.filter(
      (p) => p.status?.toLowerCase() === "warning",
    );
    const stablePatients = cardDataArray.filter(
      (p) => p.status?.toLowerCase() === "stable",
    );

    return [
      {
        icon: (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M20 18C21.26 16.33 22 14.25 22 12C22 9.75 21.26 7.67 20 6"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 6C2.74 7.67 2 9.75 2 12C2 14.25 2.74 16.33 4 18"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16.8008 15.6004C17.5508 14.6004 18.0008 13.3504 18.0008 12.0004C18.0008 10.6504 17.5508 9.40039 16.8008 8.40039"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7.20001 8.40039C6.45001 9.40039 6 10.6504 6 12.0004C6 13.3504 6.45001 14.6004 7.20001 15.6004"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
        status: "Critical",
        patients: criticalPatients.length,
        color: "#fc0000ff",
        beds: criticalPatients.map((p) => p.room || "N/A"),
      },
      {
        icon: (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 8.12695V12.9072"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M11.9994 19.9904H5.93944C2.46944 19.9904 1.01944 17.6194 2.69944 14.7226L5.81944 9.34962L8.75944 4.30169C10.5394 1.23277 13.4594 1.23277 15.2394 4.30169L18.1794 9.35918L21.2994 14.7322C22.9794 17.629 21.5194 20 18.0594 20H11.9994V19.9904Z"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M11.9961 15.7754H12.0051"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ),
        status: "Warning",
        patients: warningPatients.length,
        color: "#ffee00ff",
        beds: warningPatients.map((p) => p.room || "N/A"),
      },
      {
        icon: (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12.6044 20.71C12.2644 20.83 11.7044 20.83 11.3644 20.71C8.46438 19.72 1.98438 15.59 1.98438 8.59C1.98438 5.5 4.47438 3 7.54437 3C9.36437 3 10.9744 3.88 11.9844 5.24C12.9944 3.88 14.6144 3 16.4244 3C19.4944 3 21.9844 5.5 21.9844 8.59C21.9844 15.59 15.5044 19.72 12.6044 20.71Z"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18.5 8.5H16.5M16.5 8.5H14.5M16.5 8.5V6.5M16.5 8.5V10.5"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        ),
        status: "Stable",
        patients: stablePatients.length,
        color: "#00ff40ff",
        beds: stablePatients.map((p) => p.room || "N/A"),
      },
    ];
  };

  // --- Helper: Status Priority Sorting ---
  const getStatusPriority = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "critical") return 1;
    if (s === "warning" || s === "high" || s === "low") return 2;
    if (s === "stable") return 3;
    return 4; // Unknown or other
  };

  const triageData = useMemo(() => recalculateTriageData(cardData), [cardData]);

  // Clear alarm store when Home unmounts so stale home-page alarms
  // never appear on the Overview page (and vice-versa).
  useEffect(() => {
    return () => {
      clearCriticalAlarm();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Critical Alarm logic — tag with source:'home' so the
  // Overview page's modal ignores alarms raised here.
  useEffect(() => {
    const criticals = cardData.filter(p => p.status?.toLowerCase() === "critical");
    criticals.forEach(p => {
      if (!previousCriticalPatients.current.has(p.userId)) {
        setCriticalAlarmData({
          name: p.name,
          userId: p.userId,
          vitals: p.vitals || {},
          source: 'home',
        });
      }
    });
    previousCriticalPatients.current = new Set(criticals.map(p => p.userId));
  }, [cardData, setCriticalAlarmData]);

  // click outside to close card menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (card_ref.current && !card_ref.current.contains(event.target)) {
        setCardMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [card_ref]);


  return (
    <>
      <div className="flex flex-wrap gap-0 h-[calc(100vh-160px)]">
        <div className="flex flex-col gap-8 w-full h-[calc(100vh-160px)] px-5 py-8 overflow-y-auto">
          {/* --- TOP SECTION: Triage Status Panel (Horizontal) --- */}
          {/* --- TOP SECTION: Triage Status Panel (Horizontal) --- */}
          <div className="w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
              <h4 className="text-xl lg:text-2xl text-white">
                Patient Details Cards
              </h4>

            </div>
            <div className="bg-[#27272b] border-[#0f0f0f] border-y-[1.2px] flex flex-col md:flex-row items-center justify-between p-5 mb-8 rounded-[12px] shadow-[0_0_50px_rgba(0,0,0,0.08)] gap-4">
              {loading ? (
                <p className="text-white/50">Loading Triage...</p>
              ) : (
                <>
                  <div className="flex gap-4 items-center overflow-x-auto w-full md:w-auto snap-x hidden-scrollbar">
                    {triageData.map((item, index) => (
                      <div
                        key={index}
                        onClick={() => setTriageFilter(triageFilter === item.status ? "All" : item.status)}
                        className={`flex gap-2.5 items-center px-4 py-.5 rounded-[50px] shrink-0 cursor-pointer transition-colors border ${triageFilter === item.status ? "border-white/40 shadow-inner" : "border-transparent text-white"
                          } ${item.status === "Critical" ? "bg-[#4a4a4c]" : "bg-[#373739]"
                          }`}
                        style={{ borderColor: triageFilter === item.status ? item.color : (item.status === "Critical" ? "#969696" : "transparent") }}
                      >
                        <div className="size-6 shrink-0 flex items-center justify-center [&_path]:!stroke-current [&_svg]:!stroke-current [&_svg]:!fill-none" style={{ color: item.color }}>
                          {item.icon}
                        </div>
                        <p className="font-lufga text-2xl whitespace-nowrap">
                          {item.status}
                        </p>
                        <p className="font-lufga font-medium text-[28px] whitespace-nowrap text-white">
                          {item.patients}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4 items-center shrink-0 w-full md:w-auto overflow-x-auto">
                    <button
                      className="h-12 bg-[linear-gradient(94.82deg,#b2884d_0%,#cca166_48.98%,#b2884d_98.92%)] text-white px-6 rounded-xl font-lufga font-medium hover:opacity-90 transition-opacity text-[16px] whitespace-nowrap"
                      onClick={() => setTriageFilter("All")}
                    >
                      Show All Patients
                    </button>
                    <Link
                      to="/dashboard/patient-archives"
                      className="h-12 flex items-center gap-2 border border-white/20 px-6 rounded-xl text-white hover:bg-white/5 transition-colors font-lufga text-[16px] whitespace-nowrap"
                    >
                      View Archives
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="size-4"><path d="M9 5L16 12L9 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* --- BOTTOM SECTION: Patient Details Grid --- */}
          <div className="w-full mt-2">
            <div className="flex flex-col gap-5 3xl:gap-6 w-full">              {loading ? (
              <div className="col-span-full text-white p-5">Loading Patients...</div>
            ) : (
              <AnimatePresence mode="popLayout">
                {(() => {
                  const displayData = (triageFilter !== "All" ? cardData.filter(item => item.status === triageFilter) : cardData)
                    .filter(item => {
                      if (!patientSearchQuery.trim()) return true;
                      const q = patientSearchQuery.toLowerCase();
                      return (
                        (item.name && item.name.toLowerCase().includes(q)) ||
                        (item.patientId && String(item.patientId).toLowerCase().includes(q)) ||
                        (item.room && String(item.room).toLowerCase().includes(q))
                      );
                    })
                    .slice()
                    .sort((a, b) => getStatusPriority(a.status) - getStatusPriority(b.status));

                  if (displayData.length === 0) {
                    return (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="col-span-full flex flex-col items-center justify-center p-10 mt-10 text-center"
                      >
                        <div className="size-20 mb-4 bg-white/5 rounded-full flex items-center justify-center">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8 12H16" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <h3 className="text-xl text-white font-medium mb-2">No Patients Found</h3>
                        <p className="text-para">There are currently no patients checked into this ward.</p>
                      </motion.div>
                    );
                  }

                  return displayData.map((item, index) => (
                    <PatientCard
                      key={item.userId || item.id || `patient-${index}`}
                      item={item}
                      index={index}
                      cardMenu={cardMenu}
                      setCardMenu={setCardMenu}
                      card_ref={card_ref}
                      CardMenu={CardMenu}
                      setSelectedUserId={setSelectedUserId}
                      setSelectedUserName={setSelectedUserName}
                      setEndMonitoring={setEndMonitoring}
                      takeAction={takeAction}
                      setTakeAction={setTakeAction}
                      flagDoctor={flagDoctor}
                      setFlagDoctor={setFlagDoctor}
                    />
                  ));
                })()}
              </AnimatePresence>
            )}
            </div>
          </div>
        </div>
      </div>

      <SiteVerstion />

      {/* for take action */}
      <Modal
        onClick={() => setTakeAction(false)}
        modalCondition={takeAction}
        innerClass="max-w-123!"
        title="Action Capture"
      >
        <div className="flex flex-col gap-4 md:gap-5 xl:gap-6">
          {/* Searchable Doctor Dropdown */}
          <div className="relative z-20 hidden">
            <label className="block mb-2 text-sm text-white/80">Staff Name / ID</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search doctor..."
                value={actionDoctorSearch}
                onChange={(e) => { setActionDoctorSearch(e.target.value); setActionDoctorDropdownOpen(true); }}
                onFocus={() => setActionDoctorDropdownOpen(true)}
                className="w-full min-h-13 px-4 pr-12 text-base font-normal text-white placeholder:text-para bg-secondary/6 border border-secondary/35 rounded-[14px] focus:outline-none focus:border-primary/50"
              />
              {/* Auto-filled badge */}
              {staffName && actionDoctorSearch === staffName && (
                <span className="absolute right-10 top-1/2 -translate-y-1/2 bg-[#3E3E41] px-2 min-h-6 rounded-lg text-xs flex items-center justify-center pointer-events-none">
                  Auto-filled
                </span>
              )}
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-para pointer-events-none">
                <Search />
              </span>
            </div>
            {/* Dropdown list */}
            {actionDoctorDropdownOpen && (() => {
              const filtered = doctors.filter(d =>
                d.full_name?.toLowerCase().includes(actionDoctorSearch.toLowerCase()) ||
                (d.employee_id || '').toLowerCase().includes(actionDoctorSearch.toLowerCase())
              );
              if (filtered.length === 0) return null;
              return (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#2A2A2D] border border-white/10 rounded-[14px] shadow-2xl overflow-hidden max-h-48 overflow-y-auto z-50">
                  {filtered.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setStaffName(doc.full_name);
                        setActionDoctorSearch(doc.full_name);
                        setActionDoctorDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                    >
                      <div className="size-8 rounded-full bg-gradient-to-br from-[#e0e0e0] to-[#b0b0b0] flex items-center justify-center flex-shrink-0">
                        <span className="text-[#323234] font-bold text-xs">
                          {doc.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{doc.full_name}</p>
                        <p className="text-para text-xs">{doc.employee_id || 'Specialist'} · {doc.is_on_call ? <span className="text-[#2CD155]">On-call</span> : 'Off-call'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
          <div className="">
            <p className="mb-4">Action Taken</p>
            <div className="flex flex-wrap gap-4">
              {action.map((item, index) => (
                <button
                  key={index}
                  onClick={() => setActiveAction(item.text)}
                  className={`min-h-12 px-4 lg:px-5 rounded-full flex items-center justify-center text-base md:text-lg transition-all ${activeAction === item.text
                    ? "bg-white text-black"
                    : "bg-[#FCEBEA]/12"
                    }`}
                  style={{ color: activeAction === item.text ? "#000" : item.color }}
                >
                  {item.text}{" "}
                </button>
              ))}
            </div>
          </div>

          {activeAction === "Other Action" && (
            <div className="">
              <label htmlFor="notes" className="block mb-3">
                Clinical Notes
              </label>
              <textarea
                id="notes"
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Enter additional details..."
                className="w-full min-h-32 p-4 text-base font-normal text-white placeholder:text-para bg-secondary/6 border border-secondary/35 rounded-[14px] resize-none focus:outline-none focus:border-primary/50"
              />
            </div>
          )}
          <div className="hidden">
            <label htmlFor="time" className="block mb-3">
              Time
            </label>
            <input
              id="time"
              type="time"
              value={actionTime}
              onChange={(e) => setActionTime(e.target.value)}
              className="w-full min-h-13 px-4 text-base font-normal text-para placeholder:text-para bg-secondary/6 border border-secondary/35 rounded-[14px] "
            />
          </div>
          <div className="flex items-center justify-end gap-4 relative z-1 pt-4">
            <div className="absolute top-0 left-0 w-full h-px bg-[linear-gradient(to_left,#ffffff00_0%,#ffffff40_50%,#ffffff00_100%)] " />
            <button
              className="btn min-h-14 rounded-2xl px-8 bg-transparent"
              onClick={() => setTakeAction(!takeAction)}
            >
              Cancel
            </button>
            <button
              className={`btn min-h-14 rounded-2xl px-8 btn-gradient ${!activeAction || isLoggingEvent ? "opacity-60 cursor-not-allowed" : ""}`}
              disabled={!activeAction || isLoggingEvent}
              onClick={async () => {
                if (!activeAction || !selectedUserId || isLoggingEvent) return;

                setIsLoggingEvent(true);
                try {
                  // Build ISO timestamp from state `actionTime`, fallback to now
                  let isoActionTime;
                  if (actionTime) {
                    const today = new Date();
                    const [hours, minutes] = actionTime.split(":");
                    today.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
                    isoActionTime = today.toISOString();
                  } else {
                    isoActionTime = new Date().toISOString();
                  }

                  // Get current staff ID from auth
                  const currentUser = authService.getCurrentUser();
                  const staffId = currentUser?.employeeId || currentUser?.id || '';

                  const otherDetails =
                    activeAction === " Patient Examinated" || activeAction.trim() === "Other Action"
                      ? clinicalNotes.trim()
                      : "";

                  const response = await patientService.captureAction({
                    patientId: selectedUserId,
                    actionType: activeAction.trim(),
                    alertId: 0,
                    otherDetails,
                    actionTime: isoActionTime,
                  });

                  if (response.success) {
                    setToast({
                      visible: true,
                      message: `${activeAction.trim()} captured successfully.`,
                    });
                  } else {
                    setToast({
                      visible: true,
                      message: response.message || "Failed to capture action.",
                    });
                  }
                } catch (error) {
                  console.error("Error capturing action:", error);
                  setToast({ visible: true, message: "Error capturing action." });
                } finally {
                  setIsLoggingEvent(false);
                  setTimeout(() => setToast({ visible: false, message: "" }), 3000);
                  setTakeAction(false);
                  setClinicalNotes("");
                  setActiveAction(null);
                  setActionTime("");
                  setStaffName("");
                }
              }}
            >
              {isLoggingEvent ? "Logging..." : "Confirm"}
            </button>
          </div>
        </div>
      </Modal >
      {/* for take action */}

      {/* for flag doctor */}
      <Modal
        modalCondition={flagDoctor}
        onClick={() => {
          setFlagDoctor(false);
          setSearchQuery("");
          setSelectedDoctors([]);
        }}
        title="Select Doctor to Notify"
        titleClass="text-base!"
        des="Choose the responsible or on-call doctor"
        innerClass="max-w-123!"
      >
        <div className="flex flex-col gap-4 md:gap-5 xl:gap-6">
          <div className="relative z-1">
            <Input
              placeholder={"Search by doctor name..."}
              leftIcon={<Search />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            {["All", "On-call", "Off-call"].map((tab) => (
              <button
                key={tab}
                className={`px-6 min-h-10 rounded-[12px] text-[15px] font-medium transition-all ${doctorFilterTab === tab ? "btn-gradient text-white border-transparent" : "border border-[#4A4A5A] text-[#A0A0A0] bg-transparent"
                  }`}
                onClick={() => setDoctorFilterTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {doctorsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-[#A0A0A0]">
                  <svg className="animate-spin size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span>Loading doctors...</span>
                </div>
              </div>
            ) : (() => {
              const filteredDoctors = doctors.filter((item) => {
                const matchesSearch = item.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (item.employee_id || '').toLowerCase().includes(searchQuery.toLowerCase());
                let matchesTab = true;
                if (doctorFilterTab === "On-call") matchesTab = item.is_on_call === true;
                if (doctorFilterTab === "Off-call") matchesTab = item.is_on_call === false;
                return matchesSearch && matchesTab;
              });
              if (filteredDoctors.length === 0) {
                return (
                  <div className="text-center py-8 text-[#A0A0A0]">
                    {searchQuery || doctorFilterTab !== "All" ? 'No doctors found matching criteria.' : 'No doctors available.'}
                  </div>
                )
              }
              return filteredDoctors.map((item) => {
                const isSelected = selectedDoctors.some(d => d.id === item.id);
                return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedDoctors(prev => prev.filter(d => d.id !== item.id));
                    } else {
                      setSelectedDoctors(prev => [...prev, item]);
                    }
                  }}
                  className={`bg-[#323234] rounded-[20px] py-4.5 px-5 flex items-center justify-between cursor-pointer border transition-all ${isSelected
                    ? "border-[#CCA166] bg-[#CCA166]/10"
                    : "border-transparent hover:border-[#4A4A5A]"
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`size-5 rounded flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-[#CCA166] border-[#CCA166]" : "border border-[#A0A0A0]"}`}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#27272B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                    <div className="size-12 overflow-hidden bg-gradient-to-br from-[#e0e0e0] to-[#b0b0b0] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-[#323234] font-bold text-lg">
                        {item.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h6 className="text-[15px] font-medium text-white tracking-wide">{item.full_name}</h6>
                      <p className="text-[13px] text-[#A0A0A0]">{item.employee_id || 'Specialist'}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 text-[13px] ${item.is_on_call ? 'text-[#2CD155]' : 'text-[#A0A0A0]'}`}>
                    {item.is_on_call ? (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="9" cy="9" r="8" stroke="#2CD155" strokeWidth="1.5" />
                        <circle cx="9" cy="9" r="4" fill="#2CD155" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="9" cy="9" r="8" stroke="#A0A0A0" strokeWidth="1.5" />
                      </svg>
                    )}
                    <span>{item.is_on_call ? 'On-call' : 'Off-call'}</span>
                  </div>
                </div>
              );
              });
            })()}
          </div>

          <div className="flex items-center justify-end gap-4 relative z-1 pt-4">
            <div className="absolute top-0 left-0 w-full h-px bg-[linear-gradient(to_left,#ffffff00_0%,#ffffff40_50%,#ffffff00_100%)]" />
            <button
              className="btn grow min-h-13.5 rounded-2xl px-8 bg-transparent"
              onClick={() => {
                setFlagDoctor(false);
                setSearchQuery("");
                setDoctorFilterTab("All");
                setSelectedDoctors([]);
              }}
            >
              Cancel
            </button>
            <button
              className={`btn grow min-h-13.5 rounded-2xl px-8 btn-gradient ${selectedDoctors.length === 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              disabled={selectedDoctors.length === 0}
              onClick={async () => {
                const patientName = selectedUserName || "Patient";
                const doctorNames = selectedDoctors.map(d => d.full_name).join(", ") || "Doctor";

                try {
                  await Promise.all(selectedDoctors.map(doctor =>
                    patientService.flagDoctorForReview({
                      patientId: selectedUserId,
                      doctorId: doctor.id,
                      message: `Manual urgent clinical assistance requested. Patient: ${patientName}`,
                      priority: 'High',
                    })
                  ));
                } catch (error) {
                  console.error("Error flagging doctors for review:", error);
                }

                setFlagDoctor(false);
                setSearchQuery("");
                setDoctorFilterTab("All");
                setSelectedDoctors([]);
                setToast({
                  visible: true,
                  message: `${patientName} vitals have been sent to ${doctorNames}`
                });
                setTimeout(() => setToast({ visible: false, message: "" }), 3000);
              }}
            >
              Send Alert
            </button>
          </div>
        </div>
      </Modal>
      {/* for flag doctor */}

      {/* Toast Notification */}
      {
        toast.visible && (
          <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-5 duration-300">
            <div className="bg-[#333333] text-white px-6 py-4 rounded-xl shadow-lg border border-white/10 flex items-center gap-3 min-w-[300px]">
              <div className="bg-green/20 p-2 rounded-full">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="#2CD155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-sm">Success</h4>
                <p className="text-sm text-gray-300">{toast.message}</p>
              </div>
              <button
                onClick={() => setToast({ ...toast, visible: false })}
                className="ml-auto text-gray-400 hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        )
      }

      {/* for flag end monitoring */}
      <ConfirmationModal
        isOpen={endMonitoring}
        onClose={() => {
          if (!endingMonitoring) {
            setEndMonitoring(false);
            setSelectedUserId(null);
            setSelectedUserName(null);
          }
        }}
        title="End Patient Monitoring"
        message={`Are you absolutely sure you want to end active monitoring for ${selectedUserName ? `${selectedUserName} (ID: ${selectedUserId})` : `ID: ${selectedUserId || "N/A"}`}? Please confirm the necessary archival steps.`}
        confirmText={endingMonitoring ? "Ending..." : "Confirm"}
        cancelText="Cancel"
        icon={
          <svg width="24" height="24" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="scale-150">
            <path d="M29.6716 22.0781C33.4551 22.3961 35 24.2935 35 28.4472V28.5806C35 33.1651 33.1188 35.0009 28.4209 35.0009H21.5791C16.8812 35.0009 15 33.1651 15 28.5806V28.4472C15 24.3242 16.5239 22.4268 20.2444 22.0884" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M25.0039 15V28.21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M28.522 25.9238L25.0012 29.3597L21.4805 25.9238" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }
        onConfirm={async () => {
          if (!selectedUserId || endingMonitoring) return;

          setEndingMonitoring(true);
          try {
            const response = await patientService.endMonitoring(selectedUserId);

            if (response.success) {
              setEndMonitoring(false);
              setSelectedUserId(null);
              setSelectedUserName(null);

              // Trigger refresh
              setRefreshTrigger(prev => prev + 1);

              setToast({
                visible: true,
                message: "Monitoring ended successfully."
              });
            } else {
              setToast({
                visible: true,
                message: response.message || "Failed to end monitoring."
              });
            }
          } catch (error) {
            console.error("Error ending monitoring:", error);
            setToast({
              visible: true,
              message: "Error ending monitoring."
            });
          } finally {
            setEndingMonitoring(false);
            setTimeout(() => setToast({ visible: false, message: "" }), 3000);
          }
        }}
      />
      {/* for flag end monitoring */}



      {/* 🚨 Critical Alarm Modal — only shows alarms originating from this
          page (source:'home'). Overview-sourced alarms are filtered out. */}
      <CriticalAlarmModal
        isOpen={!!criticalAlarmData && criticalAlarmData?.source !== 'overview'}
        patientName={criticalAlarmData?.name}
        patientId={criticalAlarmData?.userId}
        vitals={criticalAlarmData?.vitals}
        alert={criticalAlarmData?.alert}
        onDismiss={() => clearCriticalAlarm()}
        onViewPatient={() => {
          if (criticalAlarmData?.userId) {
            navigate(`/dashboard/overview/${criticalAlarmData.userId}`);
          }
        }}
      />
    </>
  );
}
