import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { patientService } from '@/services/patientService';
import Mainbody from '@/components/dashboard/main-body'
import Footer from '@/components/dashboard/footer'
import TopTitle from '@/components/dashboard/top-title'
import ChartTitle from '@/components/dashboard/chart-title'
import HeartRateChart from '@/components/charts/heart-rate-chart'
import { Growth } from '../../../utilities/icons'
import RangeGauge from '../../../components/range-gauge'

export default function HeartRate() {
    const { userId } = useParams();
    const [loading, setLoading] = useState(true);
    const [vitalData, setVitalData] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [currentVitals, setCurrentVitals] = useState(null);

    const filter = ["1h", "6h", "24h", "7d"];
    const [filterTab, setFilterTab] = useState(filter[2])


    useEffect(() => {
        const fetchData = async () => {
            if (!userId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const patientResponse = await patientService.getPatientById(userId);
                let patientId = null;
                if (patientResponse.success) {
                    setCurrentVitals(patientResponse.data);
                    patientId = patientResponse.data.id;
                }

                if (patientId) {
                    const response = await patientService.getHeartRateData(patientId, {
                        interval: filterTab
                    });
                    if (response.success) {
                        setVitalData(response.data);
                        setStatistics(response.data?.statistics || null);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch heartRate data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId, filterTab]);

    const vitals = [
        {
            icon: <Growth />,
            iconBg: "bg-purple",
            title: "Minimum Heart Rate",
            value: statistics?.min ?? 0,
            extension: "bpm",
            summary: "Minimum HR",
        },
        {
            icon: <Growth className='-scale-y-100' />,
            iconBg: "bg-froly",
            title: "Maximum Heart Rate",
            value: statistics?.max ?? 0,
            extension: "bpm",
            summary: "Maximum HR",
        },
        {
            icon: <Growth className='-scale-y-100' />,
            iconBg: "bg-green",
            title: "Average Heart Rate",
            value: statistics?.average ? Math.round(statistics.average) : 0,
            extension: "bpm",
            summary: "Average HR",
        },
        {
            icon: (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 2.5V15.8333C2.5 16.2754 2.67559 16.6993 2.98816 17.0118C3.30072 17.3244 3.72464 17.5 4.16667 17.5H17.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M15 14.1667V7.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10.834 14.167V4.16699" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6.66602 14.167V11.667" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            iconBg: "bg-yellow",
            title: "Baseline Deviation",
            value: statistics?.baselineDeviation ?? (statistics?.baseline !== undefined && statistics?.current !== undefined
                ? Math.round(statistics.current - statistics.baseline)
                : 0),
            extension: "bpm",
            summary: "Baseline Deviation",
        },
    ]

    const hasNoData = !vitalData?.heartRateData || vitalData.heartRateData.length === 0 ||
        (statistics?.min === 0 && statistics?.max === 0 && statistics?.average === 0 && statistics?.count === 0);

    if (loading) {
        return (
            <Mainbody>
                <div className="flex items-center justify-center min-h-96">
                    <p className="text-white">Loading heartRate data...</p>
                </div>
            </Mainbody>
        );
    }

    if (hasNoData) {
        return (
            <Mainbody>
                <TopTitle title="Heart Rate" />
                <div className="flex items-center justify-center min-h-96 text-center">
                    <div>
                        <svg className="mx-auto mb-4 w-16 h-16 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-xl font-medium text-white mb-2">No Heart Rate Data Available</h3>
                    </div>
                </div>
            </Mainbody>
        );
    }

    return (
        <>
            <Mainbody>
                <TopTitle title="Heart Rate" />

                <div className="rounded-2xl md:rounded-2xl lg:rounded-3xl bg-[#2F2F31] p-4 md:p-5">
                    <div className="flex items-center justify-between mb-6">
                        <ChartTitle title="Heart Rate" />

                        <div className="flex items-center gap-1 bg-[#313135] p-1 rounded-xl">
                            {filter.map((item, index) => (
                                <button
                                    key={index}
                                    className={`text-sm min-h-7 px-3 rounded-lg min-w-12.5 transition-all ${item === filterTab ? "btn btn-gradient" : "text-gray-400"}`}
                                    onClick={() => setFilterTab(item)}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* We pass the formatted data here */}
                    <HeartRateChart heartRateData={vitalData?.heartRateData} />
                </div>

                <div className="flex items-center justify-start gap-4 mt-8 mb-6">
                    <div>
                        <h6 className='text-lg xl:text-xl font-semibold'>Heart Rate Monitoring</h6>
                        <p className='text-sm text-gray-400'>Clinical observation dashboard</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 xl:gap-6">
                    {vitals.map((item, index) => (
                        <div className="bg-[#2F2F31] rounded-3xl overflow-hidden min-h-52 flex flex-col justify-between" key={index}>
                            <div className="p-5">
                                <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                                    <div className={`flex items-center justify-center rounded-xl size-10 md:size-11 lg:size-12 xl:size-13 ${item.iconBg}`}>
                                        {item.icon}
                                    </div>
                                    <span className="text-base md:text-lg xl:text-xl text-white">{item.title}</span>
                                </div>
                                <div className="text-2xl lg:text-3xl xl:text-[36px] text-white font-medium">
                                    {item.value}
                                    <span className="text-base text-gray-400 ml-1.5 font-normal">{item.extension}</span>
                                </div>
                                <div className="my-3 md:my-5">
                                    <RangeGauge value={item.value} />
                                </div>
                                <div className={`min-h-8.5 w-max flex items-center justify-center px-4 text-sm rounded-full ${index === 3 ? "text-[#FF3932]/75 bg-[#FFB5B2]/16" : "text-[#2AD354] bg-[#D4F7DD]/16"}`}>
                                    {item.summary}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="rounded-2xl lg:rounded-[20px] bg-[#27272B] p-4 lg:p-5 mt-4 md:mt-6">
                    <h5 className='mb-3 md:mb-4 text-white font-medium'>Episodes & Events</h5>
                    <div className="rounded-2xl bg-[#DBDBDB]/10 border border-white/5 min-h-15 flex items-center justify-center text-base text-gray-400">
                        No episodes recorded in this time range
                    </div>
                </div>
            </Mainbody>
            <Footer />
        </>
    )
}