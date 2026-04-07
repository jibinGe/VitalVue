import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { patientService } from '@/services/patientService';
import { formatToLocalTime } from '@/utilities/dateUtils';
import Mainbody from '@/components/dashboard/main-body'
import Footer from '@/components/dashboard/footer'
import TopTitle from '@/components/dashboard/top-title'
import { Growth, } from '../../../utilities/icons'
import RangeGauge from '../../../components/range-gauge'
import SpoTrend from '../../../components/dashboard/spo/spo-trend'
import ChartTitle from "@/components/dashboard/chart-title"

export default function Spo() {
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
        let patientId = null;
        if (vitalsResponse.success) {
          setCurrentVitals(vitalsResponse.data);
          patientId = vitalsResponse.data.id;
        }

        // Fetch specific vital data
        if (patientId) {
          const response = await patientService.getSpO2Data(patientId, {
            interval: filterTab === '1h' ? '1h' : filterTab === '6h' ? '6h' : filterTab === '24h' ? '24h' : '7d'
          });
          if (response.success) {
            setVitalData(response.data);
            setStatistics(response.data?.statistics || null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch spo2 data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, filterTab]);

  const spoIcon = (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.2663 8.93331H15.1996C14.8354 8.93253 14.481 9.05106 14.1905 9.27078C13.9001 9.4905 13.6896 9.79931 13.5913 10.15L11.6329 17.1166C11.6203 17.1599 11.594 17.1979 11.5579 17.225C11.5219 17.252 11.478 17.2666 11.4329 17.2666C11.3879 17.2666 11.344 17.252 11.3079 17.225C11.2719 17.1979 11.2456 17.1599 11.2329 17.1166L6.63294 0.749976C6.62032 0.706702 6.594 0.668688 6.55794 0.641642C6.52188 0.614596 6.47802 0.599976 6.43294 0.599976C6.38787 0.599976 6.344 0.614596 6.30794 0.641642C6.27188 0.668688 6.24556 0.706702 6.23294 0.749976L4.27461 7.71664C4.17666 8.06594 3.96743 8.37374 3.67866 8.59332C3.3899 8.8129 3.03738 8.93227 2.67461 8.93331H0.599609" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>

  )

  const analyticsSummary = [
    {
      icon: <Growth />,
      iconBg: "bg-froly",
      title: "Lowest SpO₂ Recorded",
      value: `${statistics?.min !== undefined && statistics?.min !== null ? statistics.min : (currentVitals?.vitals?.spo2?.value ?? 0)}%`,
      progress: statistics?.min !== undefined && statistics?.min !== null ? statistics.min : (currentVitals?.vitals?.spo2?.value ?? 0),
      summary: "Lowest reading",

    },
    {
      icon: (spoIcon),
      iconBg: "bg-purple",
      title: "Average SpO₂",
      value: `${Math.round(statistics?.average !== undefined && statistics?.average !== null
        ? statistics.average
        : (currentVitals?.vitals?.spo2?.value ?? 0))}%`,
      progress: Math.round(statistics?.average !== undefined && statistics?.average !== null
        ? statistics.average
        : (currentVitals?.vitals?.spo2?.value ?? 0)),
      summary: `${filterTab} period`,
    },
    {
      icon: <Growth className='-scale-y-100' />,
      iconBg: "bg-green",
      title: "Maximum SpO₂",
      value: `${statistics?.max !== undefined && statistics?.max !== null ? statistics.max : (currentVitals?.vitals?.spo2?.value ?? 0)}%`,
      progress: statistics?.max !== undefined && statistics?.max !== null ? statistics.max : (currentVitals?.vitals?.spo2?.value ?? 0),
      summary: "Peak reading",
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
      title: "Deviation from Baseline",
      value: statistics?.baselineDeviation !== undefined && statistics?.baselineDeviation !== null
        ? `${statistics.baselineDeviation}%`
        : (statistics?.baseline !== undefined && statistics?.current !== undefined
          ? `${Math.round(statistics.current - statistics.baseline)}%`
          : "0%"),
      progress: statistics?.baselineDeviation !== undefined && statistics?.baselineDeviation !== null
        ? statistics.baselineDeviation
        : (statistics?.baseline !== undefined && statistics?.current !== undefined
          ? Math.round(statistics.current - statistics.baseline)
          : 0),
      summary: "Baseline deviation",
    },
  ]

  const card = [
    {
      title: 'Desaturation Episodes',
      list: [
        {
          title: 'Desaturation',
          time: '09:12 AM - 09:17 AM',
          duration: "5 min",
          value: '88.2%',
        },
        {
          title: 'Desaturation',
          time: '12:12 PM - 12:15 PM',
          duration: "3 min",
          value: '91.5%',
        },
      ]
    },
    {
      title: 'Sudden SpO₂ Drops',
      list: [
        {
          title: 'Sudden Drop',
          time: 'Dec 16, 12:12 PM',
          icon: (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.667 11.333H14.667V7.33301" stroke="white" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14.6663 11.3337L8.99967 5.66699L5.66634 9.00033L1.33301 4.66699" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          ),
          value: '−6.8%',
        },
        {
          title: 'Sudden Drop',
          time: 'Dec 16, 12:12 PM',
          icon: (<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.667 11.333H14.667V7.33301" stroke="white" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14.6663 11.3337L8.99967 5.66699L5.66634 9.00033L1.33301 4.66699" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          ),
          value: '-4.2%',
        },
      ]
    },
  ]

  // Check if data is empty
  const hasNoData = !vitalData?.spo2Data || vitalData.spo2Data.length === 0 ||
    (statistics?.min === 0 && statistics?.max === 0 && statistics?.average === 0 && statistics?.count === 0);

  if (loading) {
    return (
      <Mainbody>
        <div className="flex items-center justify-center min-h-96">
          <p className="text-white">Loading spo2 data...</p>
        </div>
      </Mainbody>
    );
  }

  if (hasNoData) {
    return (
      <Mainbody>
        <TopTitle title="SpO₂" />
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <svg className="mx-auto mb-4 w-16 h-16 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-medium text-white mb-2">No SpO₂ Data Available</h3>
            <p className="text-[#9CA3AF] text-sm">No SpO₂ data found for the selected time range.</p>
            <p className="text-[#9CA3AF] text-xs mt-1">Please try selecting a different time period.</p>
          </div>
        </div>
      </Mainbody>
    );
  }





  return (
    <>
      <Mainbody>
        <TopTitle title="Spo" />
        <div className="flex flex-col gap-4 md:gap-5 xl:gap-6">
          <div className="flex items-center justify-between gap-3 flex-wrap bg-[#9D8A71]/8 p-5 rounded-2xl">
            <div className="">
              <h6 className='text-lg md:text-xl lg:text-2xl text-white font-medium mb-2'>SpO₂ Timeline Overview</h6>
              <div className="flex items-center gap-1 text-sm">
                <span>Sarah Mitchell</span>
                <div className="flex items-center gap-1">
                  <span className='size-2 rounded-full bg-[#2AD354]' />
                  <span className='font-medium'>Bed 12A </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className='size-2 rounded-full bg-[#2AD354]' />
                  <span className='font-medium'>ICU Ward - 03 </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <span className='text-2xl xl:text-3xl 2xl:text-[40px] text-white font-medium block mb-1'>
                  {currentVitals?.vitals?.spo2?.value || vitalData?.spo2Data?.[vitalData.spo2Data.length - 1]?.value || 96.3}%
                </span>
                <div class="rounded-full relative z-1 bg-white/8 text-xs min-h-8 w-max min-w-20 md:min-w-27 overflow-hidden flex items-center justify-center gap-2 font-normal text-white px-3 border border-solid border-[#2CD155]/35">
                  <span class="h-8.5 w-36 rounded-[100%] bg-[#2CD155]/50 blur-2xl absolute -right-10 -top-3 -z-10"></span>
                  {currentVitals?.vitals?.spo2?.status || 'Normal'}
                </div>
              </div>
              <div className='h-8 border border-white' />
              <div className="flex items-center gap-2 text-sm">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.3337 9.99996C18.3337 14.6 14.6003 18.3333 10.0003 18.3333C5.40033 18.3333 1.66699 14.6 1.66699 9.99996C1.66699 5.39996 5.40033 1.66663 10.0003 1.66663C14.6003 1.66663 18.3337 5.39996 18.3337 9.99996Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12.4 13.3917L9.81667 11.85C9.36667 11.5833 9 10.9417 9 10.4167V7" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Last updated: <span className='text-white '>
                  {currentVitals?.timestamp ? formatToLocalTime(currentVitals.timestamp) : '02:12 PM'}
                </span></span>
              </div>
            </div>
          </div>
          <div className="p-4 lg:p-5 bg-[#2F2F31] rounded-2xl lg:rounded-3xl xl:rounded-[30px] mb-4 lg:mb-5 xl:mb-6">
            <ChartTitle title="SpO₂ Trend" filter_items={["Last 6h", "24h"]} />
            <SpoTrend spo2Data={vitalData?.spo2Data || []} />
          </div>
          <h5 className=''>Analytics Summary</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 xl:gap-6">
            {analyticsSummary.map((item, index) => (
              <div className="bg-[#2F2F31] rounded-3xl overflow-hidden min-h-52  flex flex-col justify-between" key={index}>
                <div className="p-5">
                  <div className="flex items-start flex-row-reverse justify-between gap-3 md:gap-4 ">
                    <div className={`size-10 md:size-11 lg:size-12 xl:size-13 ${item.iconBg}`}>
                      {item.icon}
                    </div>
                    <div className="">
                      <span className="block text-base mb-2 text-white">{item.title} </span>
                      <span className="block text-2xl  text-white font-medium [text-shadow:1px_1px_5px_rgba(255,0,0,0.16),-1px_-1px_5px_rgba(0,170,255,0.16)]">
                        {item.value}
                      </span>
                    </div>
                  </div>
                  <div className="my-3 md:my-5">
                    <RangeGauge value={item.progress} />
                  </div>
                  <div className={`min-h-8.5 w-max flex items-center justify-center px-4 text-sm rounded-full  ${index === 3 ? "text-[#FF3932]/75 bg-[#FFB5B2]/16" : "text-[#2AD354] bg-[#D4F7DD]/16"}`}>{item.summary} </div>
                </div>

              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 xl:gap-6">
            {card.map((item, index) => (
              <div className="p-4 md:p-5 bg-[#27272B] rounded-[20px] cursor-pointer" key={index}>
                <h5 className='mb-3 md:mb-4'>{item.title} </h5>
                <div className="flex flex-col gap-4">
                  {item.list.map((item, index) => (
                    <div className="p-4 md:p-5 bg-[#736F6A]/10 border border-secondary/10 rounded-[20px] transition-all duration-500 hover:bg-secondary/10 hover:border-secondary/10" key={index}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {item.icon &&
                            <div className='size-8 flex items-center justify-center rounded-full bg-[#D9D9D9]/10'>
                              {item.icon}
                            </div>
                          }
                          <p className='text-[#E2E4E9] text-base'>{item.title} </p>
                        </div>
                        <p className='text-[#E2E4E9] text-base'>{item.value} </p>
                      </div>
                      <div className="flex items-center gap-3 md:gap-4 ">
                        <div className="flex items-center gap-2 text-xs md:text-sm text-para ">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18.3337 10.0001C18.3337 14.6001 14.6003 18.3334 10.0003 18.3334C5.40033 18.3334 1.66699 14.6001 1.66699 10.0001C1.66699 5.40008 5.40033 1.66675 10.0003 1.66675C14.6003 1.66675 18.3337 5.40008 18.3337 10.0001Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12.4 13.3917L9.81667 11.85C9.36667 11.5833 9 10.9417 9 10.4167V7" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {item.time}
                        </div>
                        {item.duration &&
                          <div class="rounded-full relative z-1 bg-white/8 text-xs min-h-7 overflow-hidden flex items-center justify-center gap-2 font-normal text-white px-3 border border-solid border-[#2CD155]/35">
                            <span class="h-8.5 w-36 rounded-[100%] bg-[#2CD155]/50 blur-2xl absolute -right-10 -top-3 -z-10"></span>
                            Duration: {item.duration}
                          </div>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap bg-[#27272B] p-4 md:p-5 rounded-2xl text-xs md:text-sm">
            <div className="flex items-center gap-2 text-nowrap md:gap-4">
              <div className="flex items-center gap-2">
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="30" height="30" rx="15" fill="#D9D9D9" fillOpacity="0.1" />
                  <path d="M15.0003 23.3337C19.6027 23.3337 23.3337 19.6027 23.3337 15.0003C23.3337 10.398 19.6027 6.66699 15.0003 6.66699C10.398 6.66699 6.66699 10.398 6.66699 15.0003C6.66699 19.6027 10.398 23.3337 15.0003 23.3337Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 11.667V15.0003" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 18.333H15.0083" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className='font-medium'>Signal Quality:</span>
              </div>
              <div class="rounded-full relative z-1 bg-white/8  min-h-7 md:min-h-8 w-max overflow-hidden flex items-center justify-center gap-2 font-normal text-white px-3 border border-solid border-[#2CD155]/35">
                <span class="h-8.5 w-36 rounded-[100%] bg-[#2CD155]/50 blur-2xl absolute -right-10 -top-3 -z-10"></span>
                Fair
              </div>
              93.1% data completeness
            </div>
            <p>For clinical decision support only. Interpret in clinical context.</p>
          </div>
        </div>
      </Mainbody >
      <Footer />
    </>
  )
}
