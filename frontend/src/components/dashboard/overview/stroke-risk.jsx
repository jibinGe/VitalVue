import React, { useEffect, useState } from 'react'
import { Cricletik, NotePad, SuccessTik, FailTik } from '@/utilities/icons';
import { patientService } from '@/services/patientService';

import modal3 from "@/assets/img/modal/modalimg3.png"
import card1 from "@/assets/img/modal/card1.png"
import card2 from "@/assets/img/modal/card2.png"
import card3 from "@/assets/img/modal/card3.png"
import card4 from "@/assets/img/modal/card4.png"

export default function StrokeRisk({ userId }) {
    const [loading, setLoading] = useState(true);
    const [riskData, setRiskData] = useState(null);
    const [alertId, setAlertId] = useState(null);
    const [acknowledging, setAcknowledging] = useState(false);

    useEffect(() => {
        const fetchRisk = async () => {
            if (!userId) {
                setRiskData(null);
                return;
            }

            setLoading(true);
            try {
                const response = await patientService.getStrokeRisk(userId);
                if (response.success) {
                    setRiskData(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch stroke risk:', error);
            } finally {
                setLoading(false);
            }
        };

        const fetchAlertId = async () => {
            if (!userId) return;
            try {
                const res = await patientService.getAlerts(userId, { type: 'Stroke', status: 'Active' });
                if (res.success && Array.isArray(res.data) && res.data.length > 0) {
                    const alert = res.data[0];
                    setAlertId(alert.id || alert.alertId || alert._id || null);
                }
            } catch (e) {
                console.error('Failed to fetch Stroke alert ID:', e);
            }
        };

        fetchRisk();
        fetchAlertId();
    }, [userId]);

    const handleAcknowledge = async () => {
        const idToUse = alertId || riskData?.alertId;
        if (!idToUse) {
            console.warn('No alertId available for Stroke acknowledge');
            return;
        }

        setAcknowledging(true);
        try {
            const response = await patientService.acknowledgeAlert(idToUse);

            if (response.success) {
                setRiskData(prev => ({ ...prev, acknowledged: true }));
            }
        } catch (error) {
            console.error('Failed to acknowledge alert:', error);
        } finally {
            setAcknowledging(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <p className="text-white">Loading stroke risk data...</p>
            </div>
        );
    }

    if (!riskData) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <p className="text-white">No stroke risk data available</p>
            </div>
        );
    }

    const riskLevel = riskData.riskLevel || 'Low';
    const score = riskData.score || 0;
    const neuroSigns = riskData.neuroSigns || 'Normal neuro sign';
    const indicators = riskData.indicators || {};
    const recommendations = riskData.recommendations || [];

    const ContributingCards = [
        {
            img: card1,
            title: "AF Present",
            subtitle: "Based on multi-vital correlation",
            status: indicators.heartRate?.status === 'Irregular' ? "Yes" : "No",
        },
        {
            img: card2,
            title: "BP Elevation",
            subtitle: indicators.bloodPressure?.status || "Sudden BP elevation beyond baseline",
            status: indicators.bloodPressure?.status === 'Elevated' ? "Yes" : "No",
        },
        {
            img: card3,
            title: "HRV Collapse",
            subtitle: "Reduced autonomic variability",
            status: indicators.neurological?.status === 'Abnormal' ? "Yes" : "No",
        },
        {
            img: card4,
            title: "Neurological Signs",
            subtitle: indicators.neurological?.assessment || "Motion + HR correlation pattern",
            status: indicators.neurological?.status === 'Abnormal' ? "Yes" : "No",
        },
    ]

    const FlaggedLists = recommendations.length > 0
        ? recommendations
        : [
            "AF pattern detected during monitoring window",
            "BP surges coinciding with rhythm irregularity",
            "HRV collapse observed during flagged periods"
        ];

    const CrossVital = [
        {
            title: "AF",
            value: indicators.heartRate?.status === 'Irregular' ? "Yes" : "No"
        },
        {
            title: "BP",
            value: indicators.bloodPressure?.status || "Elevated"
        },
        {
            title: "HRV",
            value: indicators.neurological?.status === 'Abnormal' ? "Collapsed" : "Normal"
        },
        {
            title: "Motion",
            value: indicators.neurological?.status === 'Abnormal' ? "Not correlated" : "Correlated"
        },
    ]

    return (
        <>
            <div className="flex items-center justify-between mb-4 lg:mb-5 xl:mb-6">
                <div className="flex items-center gap-3 lg:gap-4 ">
                    <div className="size-11 lg:size-13 rounded-full flex-[0_0_auto]"><img src={modal3} className='size-full object-center rounded-full' alt="" /></div>
                    <div className="flex items-center gap-3 lg:gap-4">
                        <span className='text-lg lg:text-xl leading-none text-white'>Stroke-Related Indicators</span>
                        <span className={`text-xs lg:text-sm leading-none rounded-full py-1 px-3 flex items-center justify-center max-w-max ${riskLevel === 'High' ? 'text-[#E54D4D] bg-[#FF393226]' :
                            riskLevel === 'Medium' ? 'text-[#FFF026] bg-[#FFF02626]' :
                                'text-[#2AD354] bg-[#2AD35426]'
                            }`}>Risk Assessment</span>
                    </div>
                </div>
            </div>
            <div className="w-full h-px border-g mb-4 lg:mb-5 xl:mb-6"></div>
            <div className="bg-[#E54D4D80]/15 border border-[#E54D4D80]/50 rounded-xl lg:rounded-2xl xl:rounded-3xl p-4 lg:p-5 xl:p-6 mb-4 lg:mb-5 xl:mb-6">
                <div className='flex items-center justify-between gap-3 lg:gap-4 mb-4 lg:mb-5'>
                    <p className='text-white text-lg lg:text-xl font-medium leading-none mb-3'>Overall Stroke Risk</p>
                    <p className={`max-w-max rounded-full py-1 px-3 text-sm lg:text-base leading-none ${riskLevel === 'High' ? 'text-[#E54D4D] bg-[#E54D4D26]' :
                        riskLevel === 'Medium' ? 'text-[#FFF026] bg-[#FFF02626]' :
                            'text-[#2AD354] bg-[#2AD35426]'
                        }`}>{riskLevel}</p>
                </div>
                <div className="mb-4 lg:mb-5">
                    <div className="flex items-center justify-between mb-3 lg:mb-4">
                        <p className='text-xs lg:text-sm leading-none text-[#E2E4E9]'>Risk Score</p>
                        <p className='text-xs lg:text-sm leading-none text-[#E2E4E9]'>{score}</p>
                    </div>
                    <div className="w-full h-1.5 bg-[#57575B] rounded-full">
                        <div className={`h-full rounded-full ${riskLevel === 'High' ? 'bg-[#C14F50]' :
                            riskLevel === 'Medium' ? 'bg-[#FFB900]' :
                                'bg-[#2AD354]'
                            }`} style={{ width: `${Math.min(100, (score / 10) * 100)}%` }}></div>
                    </div>
                </div>
                <p className='text-sm lg:text-base leading-none text-para mb-1.5'>{neuroSigns}</p>
            </div>

            <div className="bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl mb-4 lg:mb-5 xl:mb-6">
                <h3 className='text-[#F9FAFB] text-lg lg:text-xl font-medium leading-none mb-4 lg:mb-5'>Contributing Factors</h3>
                <div className="w-full h-px border-g mb-4 lg:mb-5 xl:mb-6"></div>
                {ContributingCards.map((item, idx) => (
                    <div className="mb-4 lg:mb-5 last:mb-0" key={idx}>
                        <div className="flex items-center justify-between ">
                            <div className="flex items-center gap-2 lg:gap-3">
                                <img src={item.img} className='size-10 lg:size-12 rounded-full' alt="" />
                                <div className="">
                                    <p className='text-base lg:text-lg font-medium text-[#F9FAFB] leading-none mb-1.5'>{item.title}</p>
                                    <p className='text-para text-xs lg:text-sm leading-none'>{item.subtitle}</p>
                                </div>
                            </div>
                            {item.status === "Yes" ? <span className='text-xs md:text-sm leading-none flex items-center justify-center gap-1 min-h-6.5 min-w-15 bg-[#2AD35426] text-[#2AD354] border border-[#2AD354] rounded-md' > <SuccessTik className='size-3.5' />{item.status}</span>
                                : <span className='text-xs md:text-sm leading-none flex items-center justify-center gap-1 min-h-6.5 min-w-15 bg-[#FF393226] text-[#FF3932] border border-[#FF3932] rounded-md' > <FailTik className='size-3.5' />{item.status}</span>}
                        </div>
                        {idx !== ContributingCards.length - 1 && <div className="w-full h-px border-g mt-4 lg:mt-5"></div>}
                    </div>
                ))}
            </div>

            <div className="bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl mb-4 lg:mb-5 xl:mb-6">
                <h3 className='text-white text-lg lg:text-xl font-medium leading-none mb-4 lg:mb-5 xl:mb-6'>Why this risk is flagged</h3>
                <div className="w-full h-px border-g mb-4 lg:mb-5 xl:mb-6"></div>
                <div>
                    <ul>
                        {FlaggedLists.map((item, idx) => <li key={idx} className='text-xs md:text-sm leading-[1.4] mb-4 lg:mb-5 last:mb-0 text-[#F9FAFB] flex items-center gap-3 lg:gap-4'><span className='size-3 rounded-full bg-[#FF3932] border-2 border-[#FFE5D6] block'></span>{item}</li>)}
                    </ul>
                </div>
            </div>
            <div className="bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl mb-4 lg:mb-5 xl:mb-6">
                <h3 className='text-white text-lg lg:text-xl font-medium leading-none mb-4 lg:mb-5 xl:mb-6'>Cross-Vital Context</h3>
                <div className="w-full h-px border-g mb-4 lg:mb-5 xl:mb-6"></div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-4 lg:gap-y-5 xl:gap-y-7 2xl:gap-y-8">
                    {CrossVital.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 md:py-2.5 px-3 md:px-4 border border-[#434343] rounded-lg bg-white/8 w-full">
                            <p className='text-white text-xs lg:text-sm leading-[1.4]'>{item.title}</p>
                            <p className={`${item.value == "Collapsed" && "text-[#BCB11F]"} ${item.value == "Not correlated" && "text-[#FF3932]"} ${item.value === "Yes" || item.value === "Normal" || item.value === "Correlated" ? "text-[#2AD354]" : "text-[#FF3932]"} text-xs lg:text-sm leading-[1.4]`}>{item.value}</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-[#3E3E41] p-5 lg:p-6 flex gap-2.5 rounded-xl lg:rounded-2xl xl:rounded-3xl mb-4 lg:mb-5 xl:mb-6">
                <span className='size-5 rounded-full block'>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g clipPath="url(#clip0_229_4150)">
                            <path d="M10 18.75C14.8325 18.75 18.75 14.8325 18.75 10C18.75 5.16751 14.8325 1.25 10 1.25C5.16751 1.25 1.25 5.16751 1.25 10C1.25 14.8325 5.16751 18.75 10 18.75Z" stroke="#FF7765" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 6.66602V9.99935" stroke="#FF7765" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 13.334H10.0069" stroke="#FF7765" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </g>
                        <defs>
                            <clipPath id="clip0_229_4150">
                                <rect width="20" height="20" fill="white" />
                            </clipPath>
                        </defs>
                    </svg>
                </span>
                <div className="max-w-82.5">
                    <h4 className='text-[#FF7765] text-lg lg:text-xl font-medium leading-none mb-2'>Safety Note</h4>
                    <p className='text-xs md:text-sm text-[#FFC4AD] leading-[1.4]'>This panel provides decision-support only. Stroke risk indicators require full clinical correlation.</p>
                </div>
            </div>
            <div className="flex flex-wrap md:flex-nowrap items-center gap-4 lg:gap-5 xl:gap-6 bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl">
                <button className='btn flex-1 text-white'><NotePad className='size-5 lg:size-6' />Add Clinical Note</button>
                <button
                    className='btn flex-1 bg-primary text-white! hover:bg-[#494644]!'
                    onClick={handleAcknowledge}
                    disabled={acknowledging}
                >
                    <Cricletik className='size-5 lg:size-6' /> {acknowledging ? 'Acknowledging...' : 'Acknowledge'}
                </button>
            </div>
        </>
    )
}
