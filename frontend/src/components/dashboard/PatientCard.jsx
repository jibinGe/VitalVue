import React, { memo, useState } from "react";
import { Link } from "react-router-dom";
import { Bp } from "@/utilities/icons";
import { motion, AnimatePresence } from "framer-motion";

const BatteryIcon = ({ percent, color = "currentColor" }) => (
    <svg width="14" height="8" viewBox="0 0 24 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0.5" y="0.5" width="20" height="11" rx="1.5" stroke={color} strokeWidth="1" />
        <path d="M22 4V8" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <rect x="2" y="2" width={(17 * percent) / 100} height="8" rx="0.5" fill={color} />
    </svg>
);

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
    setTakeActionIsDeviceAlert,
    flagDoctor,
    setFlagDoctor,
    isTvMode = false
}) => {
    // --- ADDED STATE FOR TOGGLING ---
    const [isExpanded, setIsExpanded] = useState(false);

    // --- EXACT ORIGINAL FUNCTIONS ---
    const getCardGlowClass = (status) => {
        const s = status.toLowerCase();
        if (s === "critical") {
            return "border-4 border-[#E54D4D] shadow-[0_0_20px_4px_rgba(229,77,77,0.2)]";
        }
        if (s === "warning") {
            return "border-4 border-[#E5DB4C] shadow-[0_0_20px_4px_rgba(229,219,76,0.2)]";
        }
        if (s === "stable") {
            return "border-4 border-[#2CD155] shadow-[0_0_20px_4px_rgba(44,209,85,0.15)]";
        }
        return "";
    };

    const renderHalfVital = (half, halfKey) => {
        if (!half) return null;
        const valueStr = String(half.value ?? '--');
        const isBp = valueStr.includes("/");
        return (
            <div key={halfKey} className={`flex-1 min-h-0 flex flex-col justify-center ${isTvMode ? 'px-1.5 py-1' : 'px-2.5 py-1.5'}`}>
                <div className={`flex items-center ${isTvMode ? 'gap-1 mb-0.5' : 'gap-1.5 mb-1'}`}>
                    <div className={`${isTvMode ? 'size-4 [&_svg]:size-2.5' : 'size-6 [&_svg]:size-3.5'} rounded-full flex items-center justify-center shrink-0 ${half.iconBg || 'bg-blue'}`}>
                        {half.icon}
                    </div>
                    <span className={`${isTvMode ? 'text-[10px]' : 'text-xs'} text-white/70 font-medium truncate`}>{half.title}</span>
                </div>
                <div className={`${isTvMode ? 'text-sm' : 'text-base xl:text-lg'} font-medium text-white leading-tight [text-shadow:1px_1px_5px_rgba(255,0,0,0.16),-1px_-1px_5px_rgba(0,170,255,0.16)]`}>
                    {isBp ? (
                        <>
                            <span>{valueStr.split("/")[0]}</span>
                            <span className="text-xs text-white/60 font-normal">/{valueStr.split("/")[1]}</span>
                        </>
                    ) : (
                        valueStr
                    )}
                    {half.unit ? <span className="text-[10px] text-para ml-1 font-normal">{half.unit}</span> : null}
                </div>
            </div>
        );
    };

    const getBatteryColor = (percent) => {
        if (percent > 60) return "#2CD155";
        if (percent > 30) return "#E5DB4C";
        return "#E54D4D";
    };

    const batteryValue = parseInt(item.deviceBattery) || 0;
    const batteryColor = getBatteryColor(batteryValue);

    const phoneBatteryRaw = item.phoneBattery !== undefined && item.phoneBattery !== null ? item.phoneBattery : null;
    const phoneBatteryValue = (phoneBatteryRaw !== null && phoneBatteryRaw !== "" && !isNaN(parseInt(phoneBatteryRaw)))
        ? parseInt(phoneBatteryRaw)
        : null;
    const phoneBatteryColor = phoneBatteryValue !== null ? getBatteryColor(phoneBatteryValue) : "#9CA3AF";

    // 4G watch patients: the watch talks to the server itself (no BLE band, no phone), so the
    // device card shows the watch's own online state, battery and when it last sent data.
    const watch = item.watch || null;
    const watchOnline = !!watch?.is_online;
    const watchBattery = watch?.battery_percent ?? null;
    const watchBatteryColor = watchBattery !== null ? getBatteryColor(watchBattery) : "#9CA3AF";
    const watchLastData = watch?.last_seen_at
        ? new Date(String(watch.last_seen_at).endsWith("Z") ? watch.last_seen_at : `${watch.last_seen_at}Z`)
        : null;
    const watchLastDataText = watchLastData
        ? (new Date().toDateString() === watchLastData.toDateString()
            ? watchLastData.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
            : watchLastData.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }))
        : "--";

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.98 }}
            transition={{
                type: "spring",
                stiffness: 120,
                damping: 20,
                opacity: { duration: 0.2 }
            }}
            className={`relative bg-[#252527] rounded-3xl overflow-visible shadow-2xl border ${!isTvMode ? 'cursor-pointer' : ''} transition-all duration-300 ${isTvMode ? 'min-h-0' : isExpanded ? 'min-h-[300px]' : 'min-h-[185px]'} ${getCardGlowClass(item.status)}`}
            onClick={() => !isTvMode && setIsExpanded(!isExpanded)}
        >
            <div className={`flex flex-col ${isTvMode ? 'p-2' : 'p-5'} text-white w-full min-h-full`}>
                {/* --- TOP ROW: Patient Info (Left) & Vitals Grid (Right) --- */}
                <div className={`flex ${isTvMode ? 'flex-row items-center' : 'flex-col xl:flex-row'} gap-4 ${isTvMode ? 'lg:gap-6' : 'xl:gap-12'} w-full`}>

                    {/* LEFT SUB-SECTION: Patient Info */}
                    <div className={`flex flex-col shrink-0 relative gap-4 ${isTvMode ? 'w-[160px] lg:w-[180px] pr-4 lg:pr-6' : 'w-full xl:w-[270px] xl:pr-12'}`}>
                        {/* Vertical Divider for xl+ */}
                        <div className={`${isTvMode ? 'block' : 'hidden xl:block'} absolute right-0 top-0 bottom-0 w-[1px] bg-[linear-gradient(180deg,rgba(102,102,102,0)_0%,#CCA166_49.52%,rgba(102,102,102,0)_100%)]`}></div>
                        <div className="flex flex-col gap-3.5 mt-2 text-nowrap relative">
                            <div className="flex items-center justify-between">
                                <span className={`text-white font-lufga font-medium ${isTvMode ? 'text-[14px]' : 'text-[20px]'}`}>{item.name}</span>
                                {!isTvMode && (
                                    <button onClick={(e) => { e.stopPropagation(); setCardMenu(cardMenu === index + 1 ? null : index + 1) }} className="relative z-20 hover:bg-white/10 p-1.5 rounded-full transition-colors cursor-pointer">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white opacity-80"><circle cx="12" cy="5" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="19" r="1.5" fill="currentColor" /></svg>
                                    </button>
                                )}
                                <AnimatePresence>
                                    {cardMenu === index + 1 && (
                                        <motion.div ref={card_ref} initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }} transition={{ duration: 0.15 }} className="absolute top-8 right-0 min-w-[200px] bg-[#222225] border border-white/16 rounded-2xl shadow-2xl z-[90] overflow-hidden">
                                            {CardMenu.map((menuItem, menuIndex) => {
                                                const isAction = menuItem.text === "Patient Discharge";
                                                const text = (isAction && !item.isConnected) ? "Patient Discharge" : menuItem.text;
                                                return (
                                                    <button key={menuIndex} onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isAction) {
                                                            setSelectedUserId(item.id);
                                                            setSelectedUserName(item.name);
                                                            setEndMonitoring(true);
                                                        } else if (menuItem.text === "View Details") {
                                                            window.open(`/dashboard/overview/${item.id}`, '_blank');
                                                        }
                                                        setCardMenu(null);
                                                    }} className={`flex items-center hover:bg-white/5 gap-3 font-normal py-3.5 px-4 text-[15px] relative z-1 w-full text-nowrap transition-colors ${isAction ? "text-[#E86363] hover:bg-[#E86363]/10" : "text-white"}`}>
                                                        {menuItem.icon} {text} {menuIndex !== CardMenu.length - 1 && <span className="absolute bottom-0 left-0 w-full bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0)_100%)] h-[1px]" />}
                                                    </button>
                                                )
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className={`text-white font-lufga font-medium ${isTvMode ? 'text-[13px]' : 'text-[20px]'} whitespace-nowrap`}>Id:</span>
                                <span className={`text-white font-lufga font-medium ${isTvMode ? 'text-[13px]' : 'text-[20px]'}`}>{item.patientId || item.userId?.toString().slice(0, 5)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className={`text-white font-lufga font-medium ${isTvMode ? 'text-[13px]' : 'text-[20px]'} whitespace-nowrap`}>R.No:</span>
                                <span className={`text-white font-lufga font-medium ${isTvMode ? 'text-[13px]' : 'text-[20px]'}`}>{item.room}</span>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SUB-SECTION: Vitals Grid */}
                    <div className="flex-1">
                        <div className={`grid ${isTvMode ? 'grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5'} ${isTvMode ? 'gap-2' : 'gap-4'}`}>
                            {/* Vitals items — paired half-tiles + NEWS2 */}
                            {item.vitals.map((vital, vIndex) => {
                                if (vital.isPair) {
                                    return (
                                        <Link
                                            key={vIndex}
                                            to={`/dashboard/overview/${item.id}`}
                                            target="_blank"
                                            state={{
                                                patientName: item.name,
                                                patientId: item.patientId || item.userId,
                                                room: item.room,
                                                ward: item.ward,
                                                phone: item.phone_number,
                                                altPhone: item.alt_phone
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`bg-[#2F2F31] rounded-[20px] overflow-hidden flex flex-col relative z-1 ${isTvMode ? 'min-h-[90px]' : 'min-h-[140px]'}`}
                                        >
                                            {renderHalfVital(vital.top, `${vIndex}-top`)}
                                            <div className="h-px mx-2.5 bg-white/10 shrink-0" />
                                            {renderHalfVital(vital.bottom, `${vIndex}-bottom`)}
                                        </Link>
                                    );
                                }

                                if (vital.title === "NEWS2") {
                                    const color = vital.news2Color || "#4DE573";
                                    const status = vital.news2Status || "Normal";
                                    const borderColorClass =
                                        status === "High" ? "border-[#E54D4D]"
                                            : status === "Warning" ? "border-[#E5DB4C]"
                                                : "border-[#4DE573]";
                                    const iconBgClass =
                                        status === "High" ? "bg-froly"
                                            : status === "Warning" ? "bg-yellow"
                                                : "bg-green";

                                    return (
                                        <Link
                                            key={vIndex}
                                            to={`/dashboard/overview/${item.id}`}
                                            target="_blank"
                                            state={{
                                                patientName: item.name,
                                                patientId: item.patientId || item.userId,
                                                room: item.room,
                                                ward: item.ward,
                                                phone: item.phone_number,
                                                altPhone: item.alt_phone
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`border relative z-1 overflow-hidden rounded-[20px] bg-[#2f2f31] shadow-[0_0_100px_0_rgba(0,0,0,0.08)] flex flex-col justify-between ${isTvMode ? 'min-h-[90px] p-2' : 'min-h-[140px] p-2.5'} ${borderColorClass}`}
                                        >
                                            <div className="flex items-start justify-between gap-2 relative z-10">
                                                <div className="flex flex-col gap-1 mt-1 ml-1">
                                                    <h4 className={`${isTvMode ? 'text-xs' : 'text-lg'} text-white/60 font-lufga mb-0.5`}>
                                                        NEWS2
                                                    </h4>
                                                    <div className={`${isTvMode ? 'text-base' : 'text-2xl'} text-white font-medium`} style={{ textShadow: `0 0 10px ${color}40` }}>
                                                        {vital.news2Score ?? '--'}
                                                    </div>
                                                    <p className="text-[11px] text-para mt-0.5">
                                                        {vital.news2Risk || "Low"} Risk
                                                    </p>
                                                </div>
                                                <div className={`${isTvMode ? 'size-5 [&_svg]:size-3' : 'size-9'} rounded-full flex items-center justify-center shrink-0 ${iconBgClass}`}>
                                                    <Bp className={isTvMode ? "size-3" : "size-4.5"} />
                                                </div>
                                            </div>

                                            <div className="absolute bottom-0 right-0 -z-1 pointer-events-none">
                                                <svg width="81" height="73" viewBox="0 0 116 104" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <circle cx="104" cy="104" r="102" stroke={color} strokeOpacity="0.08" strokeWidth="4" />
                                                    <path
                                                        d="M21.4803 44.0459C12.0189 57.0684 5.77386 72.1452 3.25579 88.0437C0.737717 103.942 2.01809 120.211 6.99223 135.52C11.9664 150.829 20.493 164.743 31.8751 176.125C43.2572 187.507 57.1714 196.034 72.4803 201.008C87.7891 205.982 104.058 207.262 119.956 204.744C135.855 202.226 150.932 195.981 163.954 186.52C176.977 177.058 187.575 164.649 194.883 150.307C202.19 135.965 206 120.097 206 104"
                                                        stroke={color}
                                                        strokeWidth="4"
                                                        strokeLinecap="round"
                                                    />
                                                    <rect x="12" y="33" width="20" height="20" rx="10" fill="#2F2F31" />
                                                    <circle cx="22" cy="43" r="4" fill={color} />
                                                </svg>
                                            </div>
                                        </Link>
                                    );
                                }

                                return null;
                            })}

                            {/* Device card — Status, WiFi indicator (header), Battery, Phone Battery */}
                            <div className={`bg-[#2F2F31] rounded-[20px] ${isTvMode ? 'p-2' : 'p-2.5 pb-7'} flex flex-col justify-between items-start overflow-hidden relative shadow-[0px_0px_50px_0px_rgba(0,0,0,0.08)] z-2 ${isTvMode ? 'min-h-[90px]' : 'min-h-[140px]'}`}>
                                <div className="w-full relative z-10">
                                    {/* Header row: Device icon + label + WiFi status icon */}
                                    <div className={`flex items-center justify-between gap-2 ${isTvMode ? 'mb-1' : 'mb-1.5'}`}>
                                        <div className="flex items-center gap-2">
                                            <div className={`${isTvMode ? 'size-5 [&_svg]:size-3' : 'size-8'} rounded-full flex items-center justify-center shrink-0 bg-yellow`}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M4 7C4 5.34315 5.34315 4 7 4H17C18.6569 4 20 5.34315 20 7V17C20 18.6569 18.6569 20 17 20H7C5.34315 20 4 18.6569 4 17V7Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M12 16V16.01" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M8 4V2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M16 4V2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M8 22V20" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M16 22V20" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M4 8H2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M4 16H2" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M22 8H20" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <path d="M22 16H20" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                            <span className={`${isTvMode ? 'text-xs' : 'text-lg'} text-white font-medium`}>{watch ? (watch.type_label || '4G Watch') : 'Device'}</span>
                                        </div>
                                        {watch ? (
                                            /* 4G badge instead of the WiFi icon: green online, grey offline */
                                            <span title={watchOnline ? '4G watch online' : '4G watch offline'}
                                                className={`font-lufga font-semibold ${isTvMode ? 'text-[9px]' : 'text-[10px]'} px-1.5 py-[1px] rounded border ${watchOnline ? 'text-[#4DE573] border-[#4DE573]/50' : 'text-white/40 border-white/20'}`}>
                                                4G
                                            </span>
                                        ) : (
                                        /* WiFi status indicator — icon only, no extra row */
                                        <div title={item.isConnected ? 'WiFi Connected' : 'WiFi — No Signal'} style={{ color: item.isConnected ? '#4DE573' : '#E54D4D' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                {item.isConnected ? (
                                                    <>
                                                        <path d="M1.5 8.5C5.5 4.5 10.5 2.5 12 2.5C13.5 2.5 18.5 4.5 22.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M5 12C7.5 9.5 10 8 12 8C14 8 16.5 9.5 19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M8.5 15.5C9.8 14.2 11 13.5 12 13.5C13 13.5 14.2 14.2 15.5 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                                                    </>
                                                ) : (
                                                    <>
                                                        <path d="M1.5 8.5C5.5 4.5 10.5 2.5 12 2.5C13.5 2.5 18.5 4.5 22.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2" />
                                                        <path d="M5 12C7.5 9.5 10 8 12 8C14 8 16.5 9.5 19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2" />
                                                        <path d="M8.5 15.5C9.8 14.2 11 13.5 12 13.5C13 13.5 14.2 14.2 15.5 15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2" />
                                                        <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                                                        <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                                    </>
                                                )}
                                            </svg>
                                        </div>
                                        )}
                                    </div>
                                    {watch ? (
                                    <div className={`flex flex-col ${isTvMode ? 'gap-1' : 'gap-1.5'} w-full`}>
                                        <div className="flex items-center gap-1.5 w-full justify-between xl:justify-start">
                                            <span className="font-lufga font-medium text-[13px] xl:text-[14px] text-white">Status</span>
                                            <div title={`Last data ${watchLastDataText}`} className={`px-2 py-[2px] flex items-center justify-center font-lufga font-normal rounded-full ${isTvMode ? 'text-[10px]' : 'text-[11px] xl:text-[12px]'} whitespace-nowrap mt-0.5 gap-1 ${watchOnline ? 'text-[#4DE573] bg-[#4DE573]/10' : 'text-[#E54D4D] bg-[#E54D4D]/20'}`}>
                                                <span className={`inline-block size-1.5 rounded-full ${watchOnline ? 'bg-[#4DE573]' : 'bg-[#E54D4D]'}`} />
                                                {watchOnline ? 'Online' : 'Offline'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 w-full justify-between xl:justify-start">
                                            <span className="font-lufga font-medium text-[13px] xl:text-[14px] text-white">Battery</span>
                                            <div className={`bg-white/10 px-2 py-[2px] mt-0.5 flex items-center justify-center rounded-full ${isTvMode ? 'text-[10px]' : 'text-[11px] xl:text-[12px]'} font-lufga gap-1.5`}>
                                                {watchBattery !== null ? (
                                                    <>
                                                        <BatteryIcon percent={watchBattery} color={watchBatteryColor} />
                                                        <span style={{ color: watchBatteryColor }}>{watchBattery}%</span>
                                                    </>
                                                ) : (
                                                    <span className="text-white/40">--</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 w-full justify-between xl:justify-start">
                                            <span className="font-lufga font-medium text-[13px] xl:text-[14px] text-white whitespace-nowrap">Last data</span>
                                            <div className={`bg-white/10 px-2 py-[2px] mt-0.5 flex items-center justify-center rounded-full ${isTvMode ? 'text-[10px]' : 'text-[11px] xl:text-[12px]'} font-lufga whitespace-nowrap ${watchOnline ? 'text-white/80' : 'text-white/50'}`}>
                                                {watchLastDataText}
                                            </div>
                                        </div>
                                    </div>
                                    ) : (
                                    <div className={`flex flex-col ${isTvMode ? 'gap-1' : 'gap-1.5'} w-full`}>
                                        <div className="flex items-center gap-1.5 w-full justify-between xl:justify-start">
                                            <span className="font-lufga font-medium text-[13px] xl:text-[14px] text-white flex items-center gap-1">
                                                Status
                                            </span>
                                            <div className={`px-2 py-[2px] flex items-center justify-center font-lufga font-normal rounded-full ${isTvMode ? 'text-[10px]' : 'text-[11px] xl:text-[12px]'} whitespace-nowrap mt-0.5 gap-1 ${item.isConnected ? 'text-[#4DE573] bg-[#4DE573]/10' : 'text-[#E54D4D] bg-[#E54D4D]/20'}`}>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                                    <path d="M7 7l10 10-5 5V2l5 5L7 17" />
                                                </svg>
                                                {item.isConnected ? 'Connected' : 'Disconnected'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 w-full justify-between xl:justify-start">
                                            <span className="font-lufga font-medium text-[13px] xl:text-[14px] text-white">Battery</span>
                                            <div className={`bg-white/10 px-2 py-[2px] mt-0.5 flex items-center justify-center rounded-full ${isTvMode ? 'text-[10px]' : 'text-[11px] xl:text-[12px]'} font-lufga gap-1.5`}>
                                                <BatteryIcon percent={batteryValue} color={batteryColor} />
                                                <span style={{ color: batteryColor }}>{item.deviceBattery || "80%"}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 w-full justify-between xl:justify-start">
                                            <span className="font-lufga font-medium text-[13px] xl:text-[14px] text-white" title="Phone Battery">Phone</span>
                                            <div className={`bg-white/10 px-2 py-[2px] mt-0.5 flex items-center justify-center rounded-full ${isTvMode ? 'text-[10px]' : 'text-[11px] xl:text-[12px]'} font-lufga gap-1.5`}>
                                                {phoneBatteryValue !== null ? (
                                                    <>
                                                        <BatteryIcon percent={phoneBatteryValue} color={phoneBatteryColor} />
                                                        <span style={{ color: phoneBatteryColor }}>{phoneBatteryValue}%</span>
                                                    </>
                                                ) : (
                                                    <span className="text-white/40">--</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    )}
                                </div>
                                {!isTvMode && (
                                    <button className="bg-white/10 hover:bg-white/20 transition-all w-full h-6 absolute bottom-0 left-0 flex items-center justify-center border-t border-white/5" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={`size-4 opacity-80 transition-transform ${isExpanded ? 'rotate-180' : ''}`}><path d="M19.92 8.95L13.4 15.47C12.63 16.24 11.37 16.24 10.6 15.47L4.07996 8.95" stroke="white" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </button>
                                )}
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
                            <div className={`flex ${isTvMode ? 'flex-row items-center' : 'flex-col xl:flex-row items-center'} gap-4 ${isTvMode ? 'lg:gap-6' : 'xl:gap-12'} mt-8 pb-1`}>
                                {/* Flag Doctor (aligned with Name/ID/Room) */}
                                <div className={`shrink-0 ${isTvMode ? 'w-[160px] lg:w-[180px]' : 'w-full xl:w-[270px]'}`}>
                                    <button
                                        className="w-full btn min-h-[58px] px-0 btn-gradient rounded-xl"
                                        onClick={(e) => { e.stopPropagation(); setFlagDoctor(true); setSelectedUserId(item.id); setSelectedUserName(item.name); }}
                                    >
                                        Flag Doctor
                                    </button>
                                </div>

                                {/* Alerts Grid + Take Action (aligned with Vitals Grid) */}
                                <div className={`flex-1 flex ${isTvMode ? 'flex-row' : 'flex-col xl:flex-row'} gap-4 w-full h-full justify-between`}>
                                    <div className={`flex-1 w-full grid grid-cols-2 ${isTvMode ? 'lg:grid-cols-3' : 'xl:grid-cols-3'} gap-4`}>
                                        {item.alerts.map((alert, aIndex) => (
                                            <div key={aIndex} className="rounded-xl flex items-center justify-between overflow-hidden bg-white/5 border-r border-r-[px] px-3.5 py-2.5 relative z-1 min-h-[58px]" style={{ borderColor: alert.color }}>
                                                <div className="">
                                                    <p className="text-xs font-medium mb-1 text-para">{alert.type} </p>
                                                    <p className="text-xs font-medium mb-1 text-para" style={{ color: alert.color }}>{alert.status} </p>
                                                </div>
                                                <div className="">{alert.icon}</div>
                                                <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-12.5 h-8 rounded-[100%] blur-md opacity-25" style={{ backgroundColor: alert.color }} />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Take Action Button */}
                                    <div className={`shrink-0 flex items-center ${isTvMode ? 'w-[200px] lg:w-[250px]' : 'w-full xl:w-[270px]'}`}>
                                        <button
                                            className="w-full btn min-h-[58px] px-0 bg-transparent border border-white/20 hover:bg-white/5 rounded-xl text-white font-medium text-sm transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (setTakeActionIsDeviceAlert) {
                                                    setTakeActionIsDeviceAlert(!item.isConnected || item.isRemoved);
                                                }
                                                setTakeAction(true);
                                                setSelectedUserId(item.id);
                                                setSelectedUserName(item.name);
                                            }}
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