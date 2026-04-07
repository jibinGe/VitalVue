import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { patientService } from '@/services/patientService';
import Mainbody from '@/components/dashboard/main-body'
import Footer from '@/components/dashboard/footer'
import TopTitle from '@/components/dashboard/top-title'
import ChartTitle from '@/components/dashboard/chart-title'
import HeartRateChart from '@/components/charts/heart-rate-chart'
import { Growth } from '../../../utilities/icons'
import { summary } from 'framer-motion/client'
import RangeGauge from '../../../components/range-gauge'

export default function HeartRate() {
    const { userId } = useParams();
    const [loading, setLoading] = useState(true);
    const [vitalData, setVitalData] = useState(null);
    const [statistics, setStatistics] = useState(null);
    const [currentVitals, setCurrentVitals] = useState(null);

    const filter = [
        "1h",
        "6h",
        "24h",
        "7d",
    ]
    const [filterTab, setFilterTab] = useState(filter[2])

    useEffect(() => {
        const fetchData = async () => {
            if (!userId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Fetch current vitals
                const vitalsResponse = await patientService.getCurrentVitals(userId);
                if (vitalsResponse.success) {
                    setCurrentVitals(vitalsResponse.data);
                }

                // Fetch specific vital data
                const response = await patientService.getHeartRateData(userId, {
                    interval: filterTab === '1h' ? '1h' : filterTab === '6h' ? '6h' : filterTab === '24h' ? '24h' : '7d'
                });
                if (response.success) {
                    setVitalData(response.data);
                    setStatistics(response.data?.statistics || null);
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
            value: statistics?.min !== undefined && statistics?.min !== null ? statistics.min : (currentVitals?.vitals?.heartRate?.value ?? 0),
            extension: "bpm",
            summary: "Minimum HR",

        },
        {
            icon: <Growth className='-scale-y-100' />,
            iconBg: "bg-froly",
            title: "Maximum Heart Rate",
            value: statistics?.max !== undefined && statistics?.max !== null ? statistics.max : (currentVitals?.vitals?.heartRate?.value ?? 0),
            extension: "bpm",
            summary: "Maximum HR",
        },
        {
            icon: <Growth className='-scale-y-100' />,
            iconBg: "bg-green",
            title: "Average Heart Rate",
            value: statistics?.average !== undefined && statistics?.average !== null ? Math.round(statistics.average) : (currentVitals?.vitals?.heartRate?.value ? Math.round(currentVitals.vitals.heartRate.value) : 0),
            extension: "bpm",
            summary: "Average HR",
        },
        {
            icon: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.5 2.5V15.8333C2.5 16.2754 2.67559 16.6993 2.98816 17.0118C3.30072 17.3244 3.72464 17.5 4.16667 17.5H17.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M15 14.1667V7.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10.834 14.167V4.16699" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6.66602 14.167V11.667" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            ),
            iconBg: "bg-yellow",
            title: "Baseline Deviation",
            value: statistics?.baselineDeviation !== undefined && statistics?.baselineDeviation !== null
                ? statistics.baselineDeviation
                : (statistics?.baseline !== undefined && statistics?.current !== undefined
                    ? Math.round(statistics.current - statistics.baseline)
                    : 0),
            extension: "bpm",
            summary: "Baseline Deviation",
        },
    ]

    // Check if data is empty (no data array or all statistics are 0)
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
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <svg className="mx-auto mb-4 w-16 h-16 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-xl font-medium text-white mb-2">No Heart Rate Data Available</h3>
                        <p className="text-[#9CA3AF] text-sm">No heart rate data found for the selected time range.</p>
                        <p className="text-[#9CA3AF] text-xs mt-1">Please try selecting a different time period.</p>
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
                    <ChartTitle
                        title="Heart Rate"
                        titleChildren={
                            <span className="rounded-xl relative z-1 bg-white/8 min-h-8.5 overflow-hidden flex items-center justify-center gap-2 text-sm font-normal text-white px-3 border border-solid border-[#2CD155]/35">
                                <span className='h-8.5 w-36 rounded-[100%] bg-[#2CD155]/50 blur-2xl absolute -right-10 -top-3 -z-10' />
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M11.7931 10.8785C11.0245 10.1471 10.0319 9.74305 9.00362 9.74305C7.9753 9.74305 6.98273 10.1471 6.21414 10.8785M14.0221 8.492C12.6609 7.12922 10.8669 6.37109 9.00326 6.37109C7.13963 6.37109 5.34561 7.12922 3.98438 8.492" stroke="#2CD155" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M16 5.85706C14.0734 4.01694 11.5818 3 9 3C6.41819 3 3.92661 4.01694 2 5.85706" stroke="#2CD155" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M9.0004 14.9999C8.76932 14.9999 8.54343 14.9265 8.35129 14.7891C8.15915 14.6516 8.0094 14.4562 7.92097 14.2277C7.83254 13.9991 7.8094 13.7476 7.85448 13.5049C7.89956 13.2623 8.01084 13.0394 8.17424 12.8644C8.33764 12.6895 8.54582 12.5704 8.77246 12.5221C8.99911 12.4738 9.23403 12.4986 9.44752 12.5933C9.66101 12.6879 9.84348 12.8483 9.97187 13.054C10.1002 13.2597 10.1688 13.5016 10.1688 13.749C10.1688 14.0807 10.0457 14.3989 9.82657 14.6335C9.60745 14.8681 9.31027 14.9999 9.0004 14.9999Z" fill="#2CD155" />
                                </svg>
                                <span className='text-xs'>Good Signal</span>
                                <span className='size-1.5 rounded-full bg-[#28D353]'></span>
                                <span className='text-xs'>2% Loss</span>
                            </span>
                        }
                        filter_items={['Last 6h', '24h',]}
                        set_active_filter={0}
                    />
                    <HeartRateChart heartRateData={vitalData?.heartRateData || []} />
                </div>
                <div className="flex items-center justify-center md:justify-between flex-wrap gap-4  mt-6 mb-4">
                    <div className="">
                        <h6 className='text-lg xl:text-xl'>Heart Rate Monitoring</h6>
                        <p className='text-sm'>Clinical observation dashboard</p>
                    </div>
                    <div className="flex items-center gap-1 bg-[#313135] p-1 rounded-xl">
                        {filter.map((item, index) => (
                            <button key={index} className={`text-sm min-h-7 px-3 rounded-lg min-w-12.5 ${item === filterTab ? "btn btn-gradient" : ""}`} onClick={() => setFilterTab(item)}>{item}</button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 xl:gap-6">
                    {vitals.map((item, index) => (
                        <div className="bg-[#2F2F31] rounded-3xl overflow-hidden min-h-52  flex flex-col justify-between" key={index}>
                            <div className="p-5">
                                <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                                    <div className={`size-10 md:size-11 lg:size-12 xl:size-13 ${item.iconBg}`}>
                                        {item.icon}
                                    </div>
                                    <span className="text-base md:text-lg xl:text-xl text-white">{item.title} </span>
                                </div>
                                <div className="text-2xl lg:text-3xl xl:text-[36px] text-white font-medium [text-shadow:1px_1px_5px_rgba(255,0,0,0.16),-1px_-1px_5px_rgba(0,170,255,0.16)]">
                                    {item.value}

                                    <span className="text-base text-para ml-1.5 font-normal">
                                        {item.extension}
                                    </span>
                                </div>
                                <div className="my-3 md:my-5">
                                    <RangeGauge value={item.value} />
                                </div>
                                <div className={`min-h-8.5 w-max flex items-center justify-center px-4 text-sm rounded-full  ${index === 3 ? "text-[#FF3932]/75 bg-[#FFB5B2]/16" : "text-[#2AD354] bg-[#D4F7DD]/16"}`}>{item.summary} </div>
                            </div>

                        </div>
                    ))}
                </div>
                <div className="rounded-2xl lg:rounded-[20px] bg-[#27272B] p-4 lg:p-5 mt-4 md:mt-6">
                    <h5 className='mb-3 md:mb-4'>Episodes & Events</h5>
                    <div className="rounded-2xl bg-[#DBDBDB]/14 min-h-15 flex items-center justify-center text-base text-white">No episodes recorded in this time range</div>
                </div>
            </Mainbody>
            <Footer />
        </>
    )
}
