import React, { memo, useState } from "react";
import { Link } from "react-router-dom";
import { Angle, Bp, Hart, Spo, Temp } from "@/utilities/icons";
import HeartRateLive from "@/components/charts/HeartRateLive";
import BPBars from "@/components/animation/overview/bpBars";
import TempWave from "@/components/animation/overview/tempWave";
import Spo2Gauge from "@/components/animation/overview/spo2Gauge";
import { motion, AnimatePresence } from "framer-motion";

const PatientCard = memo(({
    item,
    index,
    cardMenu,
    setCardMenu,
    card_ref,
    CardMenu,
    setSelectedUserId,
    setSelectedUserName,
    setEndMonitoring,
    wsConnectionStatus,
    signalQualityWarnings,
    takeAction,
    setTakeAction,
    flagDoctor,
    setFlagDoctor
}) => {
    // --- ADDED STATE FOR TOGGLING ---
    const [isExpanded, setIsExpanded] = useState(false);

    // --- EXACT ORIGINAL FUNCTIONS ---
    const getCardGlowClass = (status) => {
        const s = status.toLowerCase();
        if (s === "critical") {
            return "border-2 border-[#E54D4D] shadow-[0_0_20px_4px_rgba(229,77,77,0.2)]";
        }
        if (s === "warning") {
            return "border-2 border-[#E5DB4C] shadow-[0_0_20px_4px_rgba(229,219,76,0.2)]";
        }
        if (s === "stable") {
            return "border-2 border-[#2CD155] shadow-[0_0_20px_4px_rgba(44,209,85,0.15)]";
        }
        return "";
    };

    const getStatusBadgeClass = (status) => {
        const s = status.toLowerCase();
        if (s === "critical") return "text-[#E54D4D] bg-[#E54D4D]/10";
        if (s === "stable") return "text-[#4DE573] bg-[#4DE573]/10";
        return "text-[#E5DB4CBF] bg-[#E5DB4CBF]/10";
    };

    const renderVitalGraph = (vital, index) => {
        if (vital.title === "Heart Rate") {
            return <HeartRateLive width={140} height={26} className="-ml-3 mt-3" historyData={vital.historyData} />;
        }
        if (vital.title === "SpO2") {
            return <Spo2Gauge value={vital.spo2 || 90} className="h-20 w-40 -mt-7 -ml-5" set_height={true} animate={true} />;
        }
        if (vital.title === "BP Trend") {
            return <BPBars className="h-8 scale-130 -mb-2" historyData={vital.historyData} />;
        }
        if (vital.title === "Temp") {
            return <TempWave className="h-11 -ml-3 w-[calc(100%+24px)]! -mb-2" historyData={vital.historyData} />;
        }
        return null;
    };

    const vitalIcons = {
        "Heart Rate": <Hart />,
        "SpO2": <Spo />,
        "BP Trend": <Bp />,
        "Temp": <Temp />
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
                type: "spring",
                stiffness: 120,
                damping: 20,
                opacity: { duration: 0.2 }
            }}
            className={`relative bg-[#252527] rounded-3xl overflow-visible shadow-2xl border cursor-pointer transition-all duration-300 ${isExpanded ? 'min-h-[300px]' : 'min-h-[185px]'} ${getCardGlowClass(item.status)}`}
            onClick={() => setIsExpanded(!isExpanded)}
        >
            <div className={`flex flex-col p-5 text-white w-full min-h-full`}>
                {/* --- TOP ROW: Patient Info (Left) & Vitals Grid (Right) --- */}
                <div className="flex flex-col xl:flex-row gap-4 xl:gap-12 w-full">

                    {/* LEFT SUB-SECTION: Patient Info */}
                    <div className="flex flex-col w-full xl:w-[270px] shrink-0 xl:pr-12 relative gap-4">
                        {/* Vertical Divider for xl+ */}
                        <div className="hidden xl:block absolute right-0 top-0 bottom-0 w-[1px] bg-[linear-gradient(180deg,rgba(102,102,102,0)_0%,#CCA166_49.52%,rgba(102,102,102,0)_100%)]"></div>
                        <div className="flex flex-col gap-3.5 mt-2 text-nowrap">
                            <div className="flex items-center">
                                <span className="text-white font-lufga font-medium text-[28px]">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-white font-lufga font-medium text-[28px] whitespace-nowrap">Id:</span>
                                <span className="text-white font-lufga font-medium text-[28px]">{item.patientId || item.userId?.toString().slice(0, 5)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-white font-lufga font-medium text-[28px] whitespace-nowrap">R.No:</span>
                                <span className="text-white font-lufga font-medium text-[28px]">{item.room}</span>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SUB-SECTION: Vitals Grid */}
                    <div className="flex-1">
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
                            {/* Vitals items */}
                            {item.vitals.map((vital, vIndex) => (
                                <Link
                                    key={vIndex}
                                    to={`/dashboard/overview/${item.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-[#2F2F31] rounded-[20px] overflow-hidden p-2.5 flex flex-col justify-between relative z-1 min-h-[140px]"
                                >
                                    <div className="">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${vIndex === 0 ? "bg-green" : vIndex === 1 ? "bg-purple" : vIndex === 2 ? "bg-pink" : "bg-blue"
                                                }`}>
                                                {vitalIcons[vital.title] || vital.icon}
                                            </div>
                                            <span className="text-xs text-white font-medium">{vital.title}</span>
                                        </div>
                                        <div className="text-2xl font-medium [text-shadow:1px_1px_5px_rgba(255,0,0,0.16),-1px_-1px_5px_rgba(0,170,255,0.16) ]">
                                            {vital.heartRate !== undefined && <>{vital.heartRate || '--'} <span className="text-xs text-para">bpm</span></>}
                                            {vital.spo2 !== undefined && <>{vital.spo2 || '--'}%</>}
                                            {vital.bp && <>{vital.bp.split("/")[0]}<span className="text-sm">/{vital.bp.split("/")[1]}</span> <span className="text-xs text-para">mmHg</span></>}
                                            {vital.temp !== undefined && <>{vital.temp} <span className="text-xs text-para">°C</span></>}
                                        </div>
                                    </div>
                                    <div className="mt-0">{renderVitalGraph(vital, vIndex)}</div>
                                </Link>
                            ))}

                            {/* Status and Battery card */}
                            <div className="bg-[#2F2F31] rounded-[20px] pt-4.5 pb-2.5 px-3 flex flex-col justify-between items-start overflow-hidden relative shadow-[0px_0px_50px_0px_rgba(0,0,0,0.08)] z-2 min-h-[140px]">
                                <div className="flex flex-col gap-3.5 w-full relative z-10">
                                    <div className="flex items-center gap-1.5 w-full justify-between xl:justify-start">
                                        <span className="font-lufga font-medium text-[15px] xl:text-[16px] text-white">Status</span>
                                        <div className={`px-2 py-[3px] flex items-center justify-center font-lufga font-normal rounded-full text-[12px] xl:text-[13px] cursor-pointer whitespace-nowrap mt-0.5 ${getStatusBadgeClass(item.status)}`}
                                            onClick={(e) => { e.stopPropagation(); setCardMenu(cardMenu === index + 1 ? null : index + 1) }}>
                                            {item.status === 'Critical' ? 'Disconnected' : 'Connected'}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 w-full justify-between xl:justify-start">
                                        <span className="font-lufga font-medium text-[15px] xl:text-[16px] text-white">Battery</span>
                                        <div className="bg-white/10 text-white px-2 py-[2px] mt-0.5 flex items-center justify-center rounded-full text-[12px] xl:text-[13px] font-lufga">
                                            🔋 {item.deviceBattery || "80%"}
                                        </div>
                                    </div>
                                </div>
                                <button className="bg-white/10 hover:bg-white/20 transition-all w-full h-6 absolute bottom-0 left-0 flex items-center justify-center border-t border-white/5" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={`size-4 opacity-80 transition-transform ${isExpanded ? 'rotate-180' : ''}`}><path d="M19.92 8.95L13.4 15.47C12.63 16.24 11.37 16.24 10.6 15.47L4.07996 8.95" stroke="white" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </button>
                                <div className="relative z-2 w-full flex justify-center mt-3">
                                    <AnimatePresence>
                                        {cardMenu === index + 1 && (
                                            <motion.div ref={card_ref} initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }} transition={{ duration: 0.15 }} className="absolute top-[0%] right-0 xl:right-full min-w-[200px] bg-[#222225] border border-white/16 rounded-2xl shadow-2xl z-[90] overflow-hidden">
                                                {CardMenu.map((menuItem, menuIndex) => (
                                                    <button key={menuIndex} onClick={(e) => { e.stopPropagation(); if (menuIndex === 2) { setSelectedUserId(item.id); setSelectedUserName(item.name); setEndMonitoring(true); } setCardMenu(null); }} className={`flex items-center hover:bg-white/5 gap-3 font-normal py-3.5 px-4 text-[15px] relative z-1 w-full text-nowrap transition-colors ${menuIndex === 2 ? "text-[#E86363] hover:bg-[#E86363]/10" : "text-white"}`}>
                                                        {menuItem.icon} {menuItem.text} {menuIndex !== CardMenu.length - 1 && <span className="absolute bottom-0 left-0 w-full bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0)_100%)] h-[1px]" />}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- FULL-WIDTH EXPANDED FOOTER --- */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.35, ease: "easeInOut" }}
                            className="overflow-visible flex flex-col w-full"
                        >
                            {/* Unified Horizontal Divider */}
                            <div className="h-[1px] w-full mt-4 bg-[linear-gradient(90deg,rgba(102,102,102,0)_0%,#CCA166_49.52%,rgba(102,102,102,0)_100%)]"></div>

                            {/* Aligned Row: Flag Doctor | Alerts | Take Action */}
                            <div className="flex flex-col xl:flex-row items-center gap-4 xl:gap-12 mt-4 pb-1">
                                {/* Flag Doctor (aligned with Name/ID/Room) */}
                                <div className="w-full xl:w-[270px] shrink-0">
                                    <button
                                        className="w-full btn min-h-[58px] px-0 btn-gradient rounded-xl"
                                        onClick={(e) => { e.stopPropagation(); setFlagDoctor(true); setSelectedUserId(item.id); setSelectedUserName(item.name); }}
                                    >
                                        Flag Doctor
                                    </button>
                                </div>

                                {/* Alerts Grid + Take Action (aligned with Vitals Grid) */}
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 w-full h-full">
                                    {item.alerts.map((alert, aIndex) => (
                                        <div key={aIndex} className="rounded-xl flex items-center justify-between overflow-hidden bg-white/5 border-r border-r-[2px] px-3.5 py-2.5 relative z-1 min-h-[58px]" style={{ borderColor: alert.color }}>
                                            <div className="">
                                                <p className="text-xs font-medium mb-1 text-para">{alert.type} </p>
                                                <p className="text-xs font-medium mb-1 text-para" style={{ color: alert.color }}>{alert.status} </p>
                                            </div>
                                            <div className="">{alert.icon}</div>
                                            <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-12.5 h-8 rounded-[100%] blur-md opacity-25" style={{ backgroundColor: alert.color }} />
                                        </div>
                                    ))}

                                    {/* Spacers to keep Take Action on far right */}
                                    {Array.from({ length: Math.max(0, 4 - item.alerts.length) }).map((_, i) => (
                                        <div key={`empty-${i}`} className="hidden xl:block"></div>
                                    ))}

                                    {/* Take Action Button */}
                                    <div className="flex items-center">
                                        <button
                                            className="w-full btn min-h-[58px] px-0 bg-transparent border border-white/20 hover:bg-white/5 rounded-xl text-white font-medium text-sm"
                                            onClick={(e) => { e.stopPropagation(); setTakeAction(true); setSelectedUserId(item.id); setSelectedUserName(item.name); }}
                                        >
                                            Take Action
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
});

export default PatientCard;