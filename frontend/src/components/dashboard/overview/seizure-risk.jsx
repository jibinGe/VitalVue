import React, { useEffect, useState } from 'react'
import HeardRateChart from '@/components/dashboard/charts/heardRateChart';
import MotionIntensityChart from '@/components/dashboard/charts/motionIntensityChart';
import { Cricletik, NotePad } from '@/utilities/icons';
import { patientService } from '@/services/patientService';
import { formatToLocalTime } from '@/utilities/dateUtils';

import modal2 from "@/assets/img/modal/modalimg2.png"

export default function SeizureRisk({ userId }) {
    const [loading, setLoading] = useState(true);
    const [seizureData, setSeizureData] = useState(null);
    const [alertId, setAlertId] = useState(null);
    const [acknowledging, setAcknowledging] = useState(false);

    useEffect(() => {
        const fetchRisk = async () => {
            if (!userId) {
                setSeizureData(null);
                return;
            }

            setLoading(true);
            try {
                const response = await patientService.getSeizureRisk(userId);
                if (response.success) {
                    setSeizureData(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch seizure risk:', error);
            } finally {
                setLoading(false);
            }
        };

        const fetchAlertId = async () => {
            if (!userId) return;
            try {
                const res = await patientService.getAlerts(userId, { type: 'Seizure', status: 'Active' });
                if (res.success && Array.isArray(res.data) && res.data.length > 0) {
                    const alert = res.data[0];
                    setAlertId(alert.id || alert.alertId || alert._id || null);
                }
            } catch (e) {
                console.error('Failed to fetch Seizure alert ID:', e);
            }
        };

        fetchRisk();
        fetchAlertId();
    }, [userId]);

    const handleAcknowledge = async () => {
        const idToUse = alertId || seizureData?.alertId;
        if (!idToUse) {
            console.warn('No alertId available for Seizure acknowledge');
            return;
        }

        setAcknowledging(true);
        try {
            const response = await patientService.acknowledgeAlert(idToUse);

            if (response.success) {
                setSeizureData(prev => ({ ...prev, acknowledged: true }));
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
                <p className="text-white">Loading seizure risk data...</p>
            </div>
        );
    }

    if (!seizureData) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <p className="text-white">No seizure risk data available</p>
            </div>
        );
    }

    const riskLevel = seizureData.riskLevel || 'Normal';
    const status = seizureData.status || 'Normal';
    const indicators = seizureData.indicators || {};
    const episodes = seizureData.episodes || [];
    const timestamp = seizureData.timestamp ? new Date(seizureData.timestamp) : null;

    const TimeDurationTitle2 = [
        "Duration", "Motion Level", "HR Response"
    ]

    // Format episodes data
    const formatEpisodes = () => {
        return episodes.slice(0, 3).map((episode, index) => {
            const startTime = episode.startTime ? new Date(episode.startTime) : null;
            const endTime = episode.endTime ? new Date(episode.endTime) : null;
            const duration = episode.duration || (startTime && endTime ? Math.floor((endTime - startTime) / 1000) : 0);

            return {
                title: duration < 60 ? `${duration}` : `${Math.floor(duration / 60)}`,
                subtitle: duration < 60 ? "Sec" : "min",
                motionLevel: indicators.movement?.intensity || "High",
                hrResponse: indicators.heartRate?.status || "Elevated",
            };
        });
    };

    const episodeData = formatEpisodes();

    return (
        <>
            <div className="flex items-center justify-between mb-4 lg:mb-5 xl:mb-6">
                <div className="flex items-center gap-3 lg:gap-4 ">
                    <div className="size-11 lg:size-13 rounded-full"><img src={modal2} className='size-full object-center rounded-full' alt="" /></div>
                    <div className="flex items-center gap-3 lg:gap-4">
                        <span className='text-lg lg:text-xl leading-none text-white'>Seizure Risk</span>
                        <span className={`text-xs lg:text-sm leading-none rounded-full min-h-6 min-w-18.5 flex items-center justify-center max-w-max ${riskLevel === 'High' ? 'text-[#E54D4D] bg-[#E54D4D26]' :
                            riskLevel === 'Medium' ? 'text-[#FFB900] bg-[#FFB90026]' :
                                'text-[#4DE573] bg-[#2CD15526]'
                            }`}>{riskLevel}</span>
                    </div>
                </div>
            </div>
            <div className="w-full h-px border-g mb-4 lg:mb-5 xl:mb-6"></div>
            <div className="bg-[#E54D4D80]/15 border border-[#E54D4D80]/50 rounded-xl lg:rounded-2xl xl:rounded-3xl p-4 lg:p-5 xl:p-6 mb-4 lg:mb-5 xl:mb-6">
                <div className="flex items-center justify-between gap-3 lg:gap-4 mb-4 lg:mb-5">
                    <div>
                        <p className='text-white text-xs lg:text-sm leading-none mb-3'>Overall Probability</p>
                        <p className={`text-xl lg:text-2xl font-medium leading-none ${riskLevel === 'High' ? 'text-[#E54D4D]' :
                            riskLevel === 'Medium' ? 'text-[#FFB900]' :
                                'text-[#2AD354]'
                            }`}>{riskLevel} Probability</p>
                    </div>
                    <div className='text-end'>
                        <p className='text-sm lg:text-base leading-none text-para mb-1'>Last Evaluated</p>
                        <p className='text-sm lg:text-base leading-none text-white mb-1'>
                            {timestamp ? (() => {
                                const now = new Date();
                                const diffMs = now - timestamp;
                                const diffMins = Math.floor(diffMs / 60000);
                                if (diffMins < 1) return 'Just now';
                                if (diffMins < 60) return `${diffMins}m ago`;
                                return formatToLocalTime(seizureData.timestamp);
                            })() : 'N/A'}
                        </p>
                    </div>
                </div>
                <div>
                    <div className="flex items-center justify-between mb-3 lg:mb-4">
                        <p className='text-xs lg:text-sm leading-none text-[#E2E4E9]'>EDA Status</p>
                        <p className='text-xs lg:text-sm leading-none text-[#E2E4E9]'>{status}</p>
                    </div>
                    <div className="w-full h-1.5 bg-[#57575B] rounded-full">
                        <div className={`h-full rounded-full ${riskLevel === 'High' ? 'bg-[#C14F50]' :
                            riskLevel === 'Medium' ? 'bg-[#FFB900]' :
                                'bg-[#2AD354]'
                            }`} style={{ width: `${riskLevel === 'High' ? 88 : riskLevel === 'Medium' ? 60 : 30}%` }}></div>
                    </div>
                </div>
            </div>
            <div className="bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl mb-4 lg:mb-5 xl:mb-6">
                <MotionIntensityChart />
            </div>
            <div className="bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl mb-4 lg:mb-5 xl:mb-6">
                <HeardRateChart />
            </div>
            {episodeData.length > 0 ? episodeData.map((episode, index) => {
                const episodeInfo = episodes[index];
                const startTime = episodeInfo?.startTime ? new Date(episodeInfo.startTime) : null;
                const durationMinutes = episodeInfo?.duration ? Math.floor(episodeInfo.duration / 60) : 0;

                return (
                    <div key={index} className="bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl mb-4 lg:mb-5 xl:mb-6">
                        <div className="flex items-center justify-between mb-4 lg:mb-5 xl:mb-6">
                            <h3 className='text-white text-lg lg:text-xl font-medium leading-none'>Episode #{index + 1}</h3>
                            <p className='text-white text-xs lg:text-sm max-w-max leading-none flex items-center justify-center py-1 px-3 bg-[#57575B] rounded-full'>
                                {durationMinutes > 0 ? `${durationMinutes} min` : `${episode.title} ${episode.subtitle}`}
                            </p>
                        </div>
                        <div className="w-full h-px border-g mb-4 lg:mb-5 xl:mb-6"></div>
                        <div>
                            <div className='flex items-center mb-2 gap-2'>
                                {TimeDurationTitle2.map((item, idx) => <p key={idx} className='w-[33%] text-xs lg:text-sm font-medium text-para'>{item}</p>)}
                            </div>
                            <div className="flex items-center gap-2">
                                <p className='w-[33%] text-base md:text-lg lg:text-2xl font-semibold leading-none text-white'>
                                    {episode.title}
                                    {episode.subtitle && <span className='text-para leading-none text-xs'> {episode.subtitle}</span>}
                                </p>
                                <p className='w-[33%] text-base md:text-lg lg:text-2xl font-semibold leading-none text-white'>
                                    {episode.motionLevel}
                                </p>
                                <p className='w-[33%] text-base md:text-lg lg:text-2xl font-semibold leading-none text-white'>
                                    {episode.hrResponse}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            }) : (
                <div className="bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl mb-4 lg:mb-5 xl:mb-6">
                    <p className='text-white text-sm'>No episodes detected</p>
                </div>
            )}
            <div className="flex flex-wrap md:flex-nowrap items-center gap-4 lg:gap-5 xl:gap-6 bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl">
                <button className='btn flex-1 text-white!'><NotePad className='size-5 lg:size-6' />Add Clinical Note</button>
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
