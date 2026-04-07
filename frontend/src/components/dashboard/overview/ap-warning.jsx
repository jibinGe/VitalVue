import React, { useEffect, useState } from "react";
import modal1 from "@/assets/img/modal/modalimg1.png";
import { Cricletik, NotePad } from "@/utilities/icons";
import RRIntervalChart from "../charts/RRIntervalChart";
import { patientService } from "@/services/patientService";
import { formatToLocalTime } from "@/utilities/dateUtils";

export default function APWarning({ userId }) {
  const [loading, setLoading] = useState(true);
  const [hasWarning, setHasWarning] = useState(false);
  const [details, setDetails] = useState(null);
  const [alertId, setAlertId] = useState(null);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    const fetchAFStatus = async () => {
      if (!userId) {
        setHasWarning(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await patientService.getAfWarning(userId);
        if (response.success && response.data) {
          setHasWarning(response.data.hasWarning);
          setDetails(response.data);
          if (response.data.status === 'Active') {
            setAcknowledging(false);
          }
        } else {
          setHasWarning(false);
          setDetails(null);
        }
      } catch (error) {
        console.error('Failed to fetch AF warning:', error);
        setHasWarning(false);
        setDetails(null);
      } finally {
        setLoading(false);
      }
    };

    const fetchAlertId = async () => {
      if (!userId) return;
      try {
        const res = await patientService.getAlerts(userId, { type: 'AF', status: 'Active' });
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const alert = res.data[0];
          setAlertId(alert.id || alert.alertId || alert._id || null);
        }
      } catch (e) {
        console.error('Failed to fetch AF alert ID:', e);
      }
    };

    fetchAFStatus();
    fetchAlertId();
  }, [userId]);

  const handleAcknowledge = async () => {
    const idToUse = alertId || details?.alertId;
    if (!idToUse) {
      console.warn('No alertId available for AF acknowledge');
      return;
    }

    setAcknowledging(true);
    try {
      const response = await patientService.acknowledgeAlert(idToUse);

      if (response.success) {
        setHasWarning(false);
      }
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
    } finally {
      setAcknowledging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-white">Loading AF warning data...</p>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-white">No AF warning data available</p>
      </div>
    );
  }

  const status = details.status || "Normal";
  const detection = details.detection || "Regular";
  const confidence = details.confidence || 0;
  const episodes = details.episodes || [];
  const timestamp = details.timestamp ? new Date(details.timestamp) : null;
  const TimeDurationTitle = ["Duration", "Start", "Ending"];

  const TimeDuration = [
    {
      title: "20",
      subtitle: "minutes",
    },
    {
      title: "06:30 AM",
    },
    {
      title: "06:50 AM",
    },
  ];

  const CrossVital = [
    {
      title: "AF",
      value: "Yes",
    },
    {
      title: "BP",
      value: "Elevated",
    },
    {
      title: "HRV",
      value: "Collapsed",
    },
    {
      title: "Motion",
      value: "Not correlated",
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-4 lg:mb-5 xl:mb-6">
        <div className="flex items-center gap-3 lg:gap-4 ">
          <div className="size-11 lg:size-13 rounded-full">
            <img
              src={modal1}
              className="size-full object-center rounded-full"
              alt=""
            />
          </div>
          <div className="flex items-center gap-3 lg:gap-4">
            <span className="text-lg lg:text-xl leading-none text-white">
              AF Warning
            </span>
            <span
              className={`text-xs lg:text-sm leading-none rounded-full min-h-6 min-w-18.5 flex items-center justify-center max-w-max ${status === "High"
                ? "text-[#E54D4D] bg-[#E54D4D26]"
                : status === "Normal"
                  ? "text-[#2AD354] bg-[#2AD35426]"
                  : "text-[#FFB900] bg-[#FFB90026]"
                }`}
            >
              {status}
            </span>
          </div>
        </div>
      </div>
      <div className="w-full h-px border-g mb-4 lg:mb-5 xl:mb-6"></div>
      <div className="bg-[#E54D4D80]/15 border border-[#E54D4D80]/50 rounded-xl lg:rounded-2xl xl:rounded-3xl p-4 lg:p-5 xl:p-6 mb-4 lg:mb-5 xl:mb-6">
        <div className="flex items-center justify-between gap-3 lg:gap-4 mb-4 lg:mb-5">
          <div>
            <p className="text-white text-xs lg:text-sm leading-none mb-3">
              Overall Probability
            </p>
            <p
              className={`text-xl lg:text-2xl font-medium leading-none ${status === "High"
                ? "text-[#E54D4D]"
                : status === "Normal"
                  ? "text-[#2AD354]"
                  : "text-[#FFB900]"
                }`}
            >
              {status} Probability
            </p>
          </div>
          <div className="text-end">
            <p className="text-sm lg:text-base leading-none text-para mb-1">
              Last Evaluated
            </p>
            <p className="text-sm lg:text-base leading-none text-white mb-1">
              {timestamp
                ? (() => {
                  const now = new Date();
                  const diffMs = now - timestamp;
                  const diffMins = Math.floor(diffMs / 60000);
                  if (diffMins < 1) return "Just now";
                  if (diffMins < 60) return `${diffMins}m ago`;
                  return formatToLocalTime(details.timestamp);
                })()
                : "N/A"}
            </p>
          </div>
        </div>
        <div className="mb-4 lg:mb-5">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <p className="text-xs lg:text-sm leading-none text-[#E2E4E9]">
              Detection Confidence
            </p>
            <p className="text-xs lg:text-sm leading-none text-[#E2E4E9]">
              {confidence}%
            </p>
          </div>
          <div className="w-full h-1.5 bg-[#57575B] rounded-full">
            <div
              className="h-full rounded-full bg-[#C14F50]"
              style={{ width: `${confidence}%` }}
            ></div>
          </div>
        </div>
        <div className="w-full h-px border-g mb-4 lg:mb-5 xl:mb-6"></div>
        <p className="text-sm lg:text-base leading-none text-para mb-1.5">
          {episodes.length} {detection.toLowerCase()} episodes detected
        </p>
        {episodes.length > 0 && (
          <p className="text-sm lg:text-base leading-none text-para">
            Longest episode: {Math.max(...episodes.map((e) => e.duration || 0))}{" "}
            {episodes[0]?.duration > 60 ? "minutes" : "seconds"}
          </p>
        )}
      </div>
      <div className="bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl mb-4 lg:mb-5 xl:mb-6">
        <RRIntervalChart />
      </div>
      <div className="bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl mb-4 lg:mb-5 xl:mb-6">
        <h3 className="text-[#F9FAFB] text-lg lg:text-xl font-medium leading-none mb-4 lg:mb-5">
          Pulse Irregularity Index
        </h3>
        <p className="text-white text-xs lg:text-sm leading-[1.4] mb-4 lg:mb-5">
          <span className="text-2xl lg:text-3xl text-white leading-[1.2]">
            2.8
          </span>{" "}
          moderate irregularity
        </p>
        <p className="text-white text-xs lg:text-sm leading-[1.4]">
          Derived from pulse interval variability analysis
        </p>
      </div>
      <div className="bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl mb-4 lg:mb-5 xl:mb-6">
        <div className="flex items-center justify-between mb-4 lg:mb-5 xl:mb-6">
          <h3 className="text-white text-lg lg:text-xl font-medium leading-none">
            Pulse Irregularity Index
          </h3>
          <p className="text-white text-xs lg:text-sm max-w-max leading-none flex items-center justify-center min-h-6.5 min-w-29 bg-[#57575B] rounded-full">
            Informational
          </p>
        </div>
        <div className="w-full h-px border-g mb-4 lg:mb-5 xl:mb-6"></div>
        <div>
          <div className="flex items-center mb-2 gap-2">
            {TimeDurationTitle.map((item, idx) => (
              <p
                key={idx}
                className="w-[33%] text-xs lg:text-sm font-medium text-para"
              >
                {item}
              </p>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {TimeDuration.map((item, idx) => (
              <p
                key={idx}
                className="w-[33%] text-base md:text-lg lg:text-2xl font-semibold leading-none text-white"
              >
                {item.title}
                {item.subtitle && (
                  <span className="text-para leading-none text-xs">
                    {" "}
                    {item.subtitle}
                  </span>
                )}
              </p>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl mb-4 lg:mb-5 xl:mb-6">
        <h3 className="text-white text-lg lg:text-xl font-medium leading-none mb-4 lg:mb-5 xl:mb-6">
          Pulse Irregularity Index
        </h3>
        <div className="w-full h-px border-g mb-4 lg:mb-5 xl:mb-6"></div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-4 lg:gap-y-5 xl:gap-y-7 2xl:gap-y-8">
          {CrossVital.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 md:py-2.5 px-3 md:px-4 border border-[#434343] rounded-lg bg-white/8 w-full"
            >
              <p className="text-white text-xs lg:text-sm leading-[1.4]">
                {item.title}
              </p>
              <p
                className={`${item.value == "Collapsed" && "text-[#BCB11F]"} ${item.value == "Not correlated" && "text-[#FF3932]"
                  } text-[#2AD354] text-xs lg:text-sm leading-[1.4]`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap md:flex-nowrap items-center gap-4 lg:gap-5 xl:gap-6 bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl">
        <button className="btn flex-1 text-white">
          <NotePad className="size-5 lg:size-6" />
          Add Clinical Note
        </button>
        <button
          className="btn flex-1 bg-primary text-white! hover:bg-[#494644]!"
          onClick={handleAcknowledge}
          disabled={acknowledging}
        >
          <Cricletik className="size-5 lg:size-6" />{" "}
          {acknowledging ? "Acknowledging..." : "Acknowledge"}
        </button>
      </div>
    </>
  );
}
