import React, { useEffect, useState } from 'react'
import { Cricletik, NotePad } from '@/utilities/icons';
import TrendChart from '@/components/dashboard/charts/trendChart';
import modal4 from "@/assets/img/modal/modalimg4.png"
import { patientService } from '@/services/patientService';
import { formatToLocalTime } from '@/utilities/dateUtils';

export default function NewsScore({ userId }) {
    const [loading, setLoading] = useState(true);
    const [score, setScore] = useState(null); // Changed from news2Data to score
    const [alertId, setAlertId] = useState(null);
    const [acknowledging, setAcknowledging] = useState(false);

    // Fetch score and alert ID
    const fetchScore = async () => {
        if (!userId) {
            setScore(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const response = await patientService.getNews2Score(userId);
            if (response.success) {
                setScore(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch NEWS2 score:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchAlertId = async () => {
            if (!userId) return;
            try {
                const res = await patientService.getAlerts(userId, { type: 'NEWS2', status: 'Active' });
                if (res.success && Array.isArray(res.data) && res.data.length > 0) {
                    const alert = res.data[0];
                    setAlertId(alert.id || alert.alertId || alert._id || null);
                }
            } catch (e) {
                console.error('Failed to fetch NEWS2 alert ID:', e);
            }
        };

        fetchScore();
        fetchAlertId();
    }, [userId]);

    const handleAcknowledge = async () => {
        const idToUse = alertId || score?.alertId;
        if (!idToUse) {
            console.warn('No alertId available for NEWS2 acknowledge');
            return;
        }

        setAcknowledging(true);
        try {
            const response = await patientService.acknowledgeAlert(idToUse);

            if (response.success) {
                setTimeout(async () => {
                    await fetchScore();
                }, 500);
            }
        } catch (error) {
            console.error('Failed to acknowledge alert:', error);
        } finally {
            setAcknowledging(false);
        }
    };

    // Format components data from API
    const formatParameters = () => {
        if (!score?.components) return [];

        const components = score.components;
        return [
            {
                name: 'Respiratory Rate',
                value: `${components.respiratoryRate?.value || 'N/A'} /min`,
                score: components.respiratoryRate?.score || 0,
                color: 'bg-orange-500'
            },
            {
                name: 'SpO₂',
                value: `${components.oxygenSaturation?.value || 'N/A'}%`,
                score: components.oxygenSaturation?.score || 0,
                color: 'bg-yellow-500'
            },
            {
                name: 'Temperature',
                value: `${components.temperature?.value ? parseFloat(components.temperature.value).toFixed(1) : 'N/A'}°C`,
                score: components.temperature?.score || 0,
                color: 'bg-green-500'
            },
            {
                name: 'Heart Rate',
                value: `${components.heartRate?.value || 'N/A'} bpm`,
                score: components.heartRate?.score || 0,
                color: 'bg-yellow-500'
            },
            {
                name: 'Blood Pressure',
                value: `${components.systolicBP?.value || 'N/A'} / ${score.components?.diastolicBP?.value || 'N/A'} mmHg`,
                score: components.systolicBP?.score || 0,
                color: 'bg-green-500'
            },
            {
                name: 'Consciousness',
                value: components.consciousness?.value || 'Alert',
                score: components.consciousness?.score || 0,
                color: 'bg-green-500'
            },
        ];
    };

    const Parameters = formatParameters();
    const currentScore = score?.score || 0;
    const riskLevel = score?.riskLevel || 'Unknown';
    const clinicalRisk = score?.clinicalRisk || 'Unknown';
    const timestamp = score?.timestamp ? new Date(score.timestamp) : null;
    const worstScore = score?.history?.length > 0
        ? Math.max(...score.history.map(h => h.score || 0))
        : currentScore;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <p className="text-white">Loading NEWS2 score...</p>
            </div>
        );
    }

    if (!score) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <p className="text-white">No NEWS2 data available</p>
            </div>
        );
    }

    return (
        <>
            <div className="flex items-center justify-between mb-4 lg:mb-5 xl:mb-6">
                <div className="flex items-center gap-3 lg:gap-4 ">
                    <div className="size-11 lg:size-13 rounded-full"><img src={modal4} className='size-full object-center rounded-full' alt="" /></div>
                    <div className="flex items-center gap-3 lg:gap-4">
                        <span className='text-lg lg:text-xl leading-none text-white'>NEWS2 Breakdown</span>
                        <span className={`text-xs lg:text-sm leading-none rounded-full min-h-6.5 min-w-20 flex items-center justify-center max-w-max ${riskLevel === 'High' ? 'text-[#E54D4D] bg-[#E54D4D26]' :
                            riskLevel === 'Medium' ? 'text-[#FFB900] bg-[#CCA16626]' :
                                'text-[#2AD354] bg-[#2AD35426]'
                            }`}>{riskLevel}</span>
                    </div>
                </div>
            </div>
            <div className="w-full h-px border-g mb-4 lg:mb-5 xl:mb-6"></div>
            <div className="bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl mb-3 lg:mb-4">
                <h3 className='text-white text-lg lg:text-xl font-medium leading-none mb-4 lg:mb-5'>Patient List</h3>
                <div className="bg-[#4B4642] border border-[#E1A04A59] rounded-xl lg:rounded-2xl xl:rounded-[20px] p-4 lg:p-5">
                    <div className="flex items-center justify-between gap-3 lg:gap-4">
                        <div>
                            <p className='text-white text-lg lg:text-xl leading-none mb-2'>Sarah Johson</p>
                            <p className='text-[#E2E4E9] text-xs leading-none flex items-center gap-2'>Bay 3, Bed 12 <span className='flex items-center gap-1'>
                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="4" cy="4" r="4" fill="#2AD354" />
                                </svg>
                                <span className='font-medium text-white'>AMU</span></span></p>
                        </div>
                        <div className='text-end'>
                            <p className='text-xs font-medium leading-none text-white mb-2'>NEWS2 Score: {currentScore}</p>
                            <p className={`text-xs lg:text-sm font-medium flex items-center ml-auto py-1.5 px-5 leading-none border rounded-full max-w-max ${riskLevel === 'High' ? 'text-[#E54D4D] border-[#E54D4D59] bg-[#E54D4D14]' :
                                riskLevel === 'Medium' ? 'text-[#FFB900] border-[#CCA16659] bg-[#CCA16614]' :
                                    'text-[#2AD354] border-[#2AD35459] bg-[#2AD35414]'
                                }`}>{riskLevel}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[#3E3E41] border border-[#616163] rounded-xl lg:rounded-2xl xl:rounded-3xl mb-4 lg:mb-5 xl:mb-6">
                <div className="grid grid-cols-3 py-4  lg:py-5 xl:py-6.5 px-4 md:px-7 lg:px-10 gap-4 bg-[#27272B] rounded-t-xl lg:rounded-t-2xl xl:rounded-t-3xl">
                    <div className="text-[#CAD5E2] text-xs md:text-base font-medium leading-none">Parameter</div>
                    <div className="text-[#CAD5E2] text-xs md:text-base font-medium leading-none text-center">Current Value</div>
                    <div className="text-[#CAD5E2] text-xs md:text-base font-medium leading-none text-end">NEWS2 Score</div>
                </div>
                <div>
                    {Parameters.map((param, index) => (
                        <div
                            key={index}
                            className=" group flex px-4 md:px-7 lg:px-10 py-3 lg:py-3.5 cursor-pointer items-center hover:bg-[#494950] transition last:rounded-b-xl last:lg:rounded-b-2xl last:xl:rounded-b-3xl duration-300"
                        >
                            <div className="w-[42%] text-[#CAD5E2] text-sm md:text-base font-medium leading-none">
                                {param.name}
                            </div>
                            <div className="w-[47%] text-[#CAD5E2] text-start! text-sm md:text-base font-medium leading-none">
                                {param.value}
                            </div>
                            <div className=" ml-auto rounded-lg size-7.5 border border-[#2E6D3E] group-hover:border-[#7F6E59] group-hover:bg-[#565252] bg-[#2F3733] flex items-center justify-center">
                                <span
                                    className={`text-sm md:text-base font-medium text-[#CAD5E2] group-hover:text-[#FFB900]`}
                                >
                                    {param.score}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl mb-4 lg:mb-5 xl:mb-6">
                <h3 className='text-white text-lg lg:text-xl font-medium leading-none mb-3 lg:mb-4'>Episodes & Events</h3>
                <ul>
                    <li className='text-sm md:text-base text-white leading-none flex  md:items-center gap-2 mb-3 lg:mb-4'><span className='flex-[0_0_auto] size-2 rounded-full bg-[#00C950] block '></span>This NEWS2 score reflects current deviations from normal physiological ranges.</li>
                    <li className='text-sm md:text-base text-white leading-none flex  md:items-center gap-2'><span className='flex-[0_0_auto] size-2 rounded-full bg-[#D9FCD4] block '></span>Scores are calculated per NEWS2 standards using the latest validated observations.</li>
                </ul>
            </div>
            <div className="bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl mb-4 lg:mb-5 xl:mb-6">
                <TrendChart />
            </div>
            <div className="flex items-center gap-4 lg:gap-5 xl:gap-6 mb-4 lg:mb-5 xl:mb-6">
                <div className="bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-[20px] flex-1">
                    <p className='text-sm md:text-base leading-none text-white mb-3 lg:mb-4'>Worst NEWS2 in last 12 hours</p>
                    <h5 className='text-xl lg:text-2xl font-medium leading-none text-[#FF3932]'>{worstScore}</h5>
                </div>
                <div className="bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-[20px] flex-1">
                    <p className='text-sm md:text-base leading-none text-white mb-3 lg:mb-4'>Current score calculated at</p>
                    <h5 className='text-xl lg:text-2xl font-medium leading-none text-[#2AD354]'>
                        {timestamp ? formatToLocalTime(score.timestamp) : 'N/A'}
                    </h5>
                </div>
            </div>
            <div className="bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl mb-4 lg:mb-5 xl:mb-6">
                <p className='text-sm  text-white font-medium leading-none flex items-center gap-2 mb-3 lg:mb-4'><span className='size-3 rounded-full bg-[#00C950] block '></span>All vitals updated within last 2 minutes ago</p>
                <div className="bg-[#27272B] rounded-xl lg:rounded-2xl p-4 lg:p-5 flex flex-wrap md:flex-nowrap gap-2">
                    <p className='text-sm font-medium leading-none text-[#CAD5E2] text-nowrap'>Decision-support only:</p>
                    <p className='text-sm font-medium leading-none text-[#CAD5E2]'>This information supports clinical review and audit and does not replace clinical judgment.</p>
                </div>
            </div>
            <div className="flex flex-wrap md:flex-nowrap items-center gap-4 lg:gap-5 xl:gap-6 bg-[#3E3E41] p-5 lg:p-6 rounded-xl lg:rounded-2xl xl:rounded-3xl">
                <button className='btn flex-1 '><NotePad className='size-5 lg:size-6' />Add Clinical Note</button>
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
