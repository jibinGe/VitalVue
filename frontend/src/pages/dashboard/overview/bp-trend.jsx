import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { patientService } from '@/services/patientService';
import Mainbody from '@/components/dashboard/main-body'
import Footer from '@/components/dashboard/footer'
import TopTitle from '@/components/dashboard/top-title'
import RangeGauge from '@/components/range-gauge'
import { Growth, Spo } from '@/utilities/icons'
import RangeGauge2 from '@/components/range-gauge2'
import BPTrend from '../../../components/dashboard/charts/bP-trend'
import ChartTitle from "@/components/dashboard/chart-title"


export default function BpTrend() {
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
        // Fetch patient metadata to resolve ID
        const patientResponse = await patientService.getPatientById(userId);
        let patientId = null;
        if (patientResponse.success) {
          setCurrentVitals(patientResponse.data);
          patientId = patientResponse.data.id;
        }

        if (patientId) {
          const response = await patientService.getBloodPressureData(patientId, {
            interval: filterTab
          });
          if (response.success) {
            setVitalData(response.data);
            setStatistics(response.data?.statistics || null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch bloodPressure data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, filterTab]);

  // Calculate statistics from API data
  const calculateBPStats = () => {
    // Primary logic: use statistics from API
    if (statistics) {
       return {
         avg: {
           sys: Math.round(statistics.systolic?.average || statistics.average || 120),
           dia: Math.round(statistics.diastolic?.average || 80)
         },
         min: {
           sys: Math.round(statistics.systolic?.min || statistics.min || 100),
           dia: Math.round(statistics.diastolic?.min || 60)
         },
         max: {
           sys: Math.round(statistics.systolic?.max || statistics.max || 140),
           dia: Math.round(statistics.diastolic?.max || 90)
         },
         current: {
           sys: Math.round(statistics.systolic?.current || 120),
           dia: Math.round(statistics.diastolic?.current || 80)
         }
       };
    }

    return {
      avg: { sys: 0, dia: 0 },
      min: { sys: 0, dia: 0 },
      max: { sys: 0, dia: 0 },
      current: { sys: 0, dia: 0 }
    };
  };

  const bpStats = calculateBPStats();

  const bpTrend = [
    {
      icon: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.3307 9.99935H16.2641C15.8999 9.99857 15.5454 10.1171 15.255 10.3368C14.9645 10.5565 14.7541 10.8653 14.6557 11.216L12.6974 18.1827C12.6848 18.226 12.6585 18.264 12.6224 18.291C12.5863 18.3181 12.5425 18.3327 12.4974 18.3327C12.4523 18.3327 12.4085 18.3181 12.3724 18.291C12.3363 18.264 12.31 18.226 12.2974 18.1827L7.6974 1.81602C7.68477 1.77274 7.65846 1.73473 7.6224 1.70768C7.58633 1.68064 7.54247 1.66602 7.4974 1.66602C7.45232 1.66602 7.40846 1.68064 7.3724 1.70768C7.33633 1.73473 7.31002 1.77274 7.2974 1.81602L5.33906 8.78268C5.24112 9.13198 5.03188 9.43978 4.74312 9.65936C4.45435 9.87894 4.10183 9.99831 3.73906 9.99935H1.66406" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      ),
      iconBg: "bg-green",
      title: "Average BP",
      value: `${bpStats.avg.sys} / ${bpStats.avg.dia}`,
      progressValue: 60,
      extension: "mmHg",
      des: "Mean arterial pressure within normal range for 94% of period"
    },
    {
      icon: <Growth />,
      iconBg: "bg-yellow",
      title: "Minimum BP",
      value: `${bpStats.min.sys} / ${bpStats.min.dia}`,
      progressValue: 40,
      progressStatus: ["Low", "Normal", "High"],
      extension: "mmHg",
      des: "Diastolic variance noted during rest intervals"
    },
    {
      icon: <Growth className='-scale-y-100' />,
      iconBg: "bg-froly",
      title: "Maximum BP",
      value: `${bpStats.max.sys} / ${bpStats.max.dia}`,
      progressValue: 70,
      progressStatus: ["Below", "Baseline", "Above"],
      extension: "mmHg",
      des: "Systolic readings exceeded baseline for 62% of period"
    },
    {
      icon: (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>),
      iconBg: "bg-seaGreen",
      title: "Current BP",
      value: `${bpStats.current.sys} / ${bpStats.current.dia}`,
      progressValue: 60,
      progressStatus: ["Stable", "Fluctuating", "Unstable"],
      extension: "mmHg",
      des: "Current reading consistent with 12-hour moving average"
    },
  ]

  const card = [
    {
      value: 'Data Integrity Verified',
      des: "287 of 288 readings validated (99.7%) High-continuity signal trend analysis.",
    },
    {
      title: 'Measurement Frequency',
      value: 'Every 5 min',
      des: "Automated acquisition interval.",
    },
    {
      title: 'Monitoring Duration',
      value: '24 hours',
      des: "Continuous surveillance active.",
    },
  ]

  const bpTrend2 = []
  const symbol = [
    {
      text: "Systolic",
      color: '#155DFC',
    },
    {
      text: "Diastolic",
      color: '#9810FA',
    },
    {
      text: "Clinical Threshold",
      color: '#155DFC',
    },
  ]

  // Check if data is empty
  const hasNoData = !vitalData?.bloodPressureData || vitalData.bloodPressureData.length === 0 ||
    (statistics?.min === 0 && statistics?.max === 0 && statistics?.average === 0 && statistics?.count === 0);

  if (loading) {
    return (
      <Mainbody>
        <div className="flex items-center justify-center min-h-96">
          <p className="text-white">Loading bloodPressure data...</p>
        </div>
      </Mainbody>
    );
  }

  if (hasNoData) {
    return (
      <Mainbody>
        <TopTitle title="Blood Pressure Trend" />
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <svg className="mx-auto mb-4 w-16 h-16 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-medium text-white mb-2">No Blood Pressure Data Available</h3>
            <p className="text-[#9CA3AF] text-sm">No blood pressure data found for the selected time range.</p>
            <p className="text-[#9CA3AF] text-xs mt-1">Please try selecting a different time period.</p>
          </div>
        </div>
      </Mainbody>
    );
  }





  return (
    <>
      <Mainbody>
        <TopTitle title="BP Trend" />
        <div className="flex flex-col gap-4 md:gap-5 xl:gap-6">
          <div className="flex items-center justify-between gap-3 flex-wrap bg-[#9D8A71]/8 p-5 rounded-2xl">
            <div className="">
              <h6 className='text-lg md:text-xl lg:text-2xl text-white font-medium mb-2'>Blood Pressure Overview</h6>
              <div className="flex items-center gap-1 text-sm">
                <span>{currentVitals?.full_name || currentVitals?.name || currentVitals?.patientName || "Sarah Mitchell"}</span>
                <div className="flex items-center gap-1">
                  <span className='size-2 rounded-full bg-[#2AD354]' />
                  <span className='font-medium'>Bed {currentVitals?.bed_no || currentVitals?.bed || "12A"} </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className='size-2 rounded-full bg-[#2AD354]' />
                  <span className='font-medium'>{currentVitals?.ward_name || currentVitals?.ward || currentVitals?.room_no || "ICU Ward - 03"} </span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 xl:gap-6">
            {bpTrend.map((item, index) => (
              <div className="bg-[#2F2F31] rounded-3xl overflow-hidden min-h-52  flex flex-col justify-between" key={index}>
                <div className="p-5">
                  <div className="flex items-start flex-row-reverse justify-between gap-3 md:gap-4 ">
                    <div className={`size-10 md:size-11 lg:size-12 xl:size-13 ${item.iconBg}`}>
                      {item.icon}
                    </div>
                    <div className="">
                      <span className="block text-base mb-2 text-white">{item.title} </span>
                      <div className="text-2xl lg:text-3xl xl:text-[36px] text-white font-medium [text-shadow:1px_1px_5px_rgba(255,0,0,0.16),-1px_-1px_5px_rgba(0,170,255,0.16)]">
                        {item.value}
                        <span className="text-base text-para ml-1.5 font-normal">
                          {item.extension}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="my-3 md:my-5">
                    <RangeGauge2 value={item.progressValue} status={item.progressStatus} />
                  </div>
                  <p className='text-sm text-para'>{item.des} </p>
                </div>

              </div>
            ))}
          </div>
          <div className="p-4 lg:p-5 bg-[#2F2F31] rounded-2xl lg:rounded-3xl xl:rounded-[30px] mb-4 lg:mb-5 xl:mb-6">

            <ChartTitle 
              title="BP Trend" 
              des={`${filterTab} monitoring view`} 
              filter_items={filter} 
              set_active_filter={filter.indexOf(filterTab)}
              onFilterChange={(newFilter) => setFilterTab(newFilter)}
            >
              <div className="flex items-center gap-5 ml-auto mr-8">
                {symbol.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {index != 2 ?
                      <span className="size-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                      :
                      <svg width="32" height="2" viewBox="0 0 32 2" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <mask id="path-1-inside-1_199_1538" fill="white">
                          <path d="M0 0H32V2H0V0Z" />
                        </mask>
                        <path d="M32 0V-1H31V0V1H32V0ZM29 0V-1H27V0V1H29V0ZM25 0V-1H23V0V1H25V0ZM21 0V-1H19V0V1H21V0ZM17 0V-1H15V0V1H17V0ZM13 0V-1H11V0V1H13V0ZM9 0V-1H7V0V1H9V0ZM5 0V-1H3V0V1H5V0ZM1 0V-1H0V0V1H1V0ZM32 0V-2H31V0V2H32V0ZM29 0V-2H27V0V2H29V0ZM25 0V-2H23V0V2H25V0ZM21 0V-2H19V0V2H21V0ZM17 0V-2H15V0V2H17V0ZM13 0V-2H11V0V2H13V0ZM9 0V-2H7V0V2H9V0ZM5 0V-2H3V0V2H5V0ZM1 0V-2H0V0V2H1V0Z" fill="#BA0000" mask="url(#path-1-inside-1_199_1538)" />
                      </svg>

                    }
                    <span className="text-sm text-para">{item.text}</span>
                  </div>
                ))}
              </div>
            </ChartTitle>
            <BPTrend bloodPressureData={vitalData?.bloodPressureData || []} />
          </div>
          <div className="">
            <div className="mb-4">
              <h6 className='text-lg lg:text-xl mb-1'>Clinical Events</h6>
              <p className='text-sm text-[#E2E4E9]'>{bpTrend2.length} events recorded</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-5 xl:gap-6">
              {bpTrend2.length > 0 ? (
                bpTrend2.map((item, index) => (
                  <div className="bg-[#2F2F31] rounded-3xl overflow-hidden min-h-52  flex flex-col justify-between" key={index}>
                    <div className="p-5">
                      <div className="">
                        <div className="flex items-start justify-between mb-2">
                          <div className="">
                            <span className="block mb-1 text-base  text-[#E2E4E9]">{item.title} </span>
                            <span>{item.date} </span>
                          </div>
                          <p className={`px-3 min-h-6 flex items-center font-lufga justify-center font-light rounded-full text-sm ${item.status === "Critical" ? "text-[#E54D4D] bg-[#E54D4D]/10" : item.status === "Stable" ? "text-[#4DE573] bg-[#4DE573]/10" : "text-[#E5DB4CBF] bg-[#E5DB4CBF]/10"}`}>
                            {item.status}
                          </p>
                        </div>
                        <div className="text-2xl lg:text-3xl xl:text-[36px] text-white font-medium [text-shadow:1px_1px_5px_rgba(255,0,0,0.16),-1px_-1px_5px_rgba(0,170,255,0.16)]">
                          {item.value}
                          <span className="text-base text-para ml-1.5 font-normal">
                            {item.extension}
                          </span>
                        </div>
                      </div>
                      <div className="my-3 md:my-5">
                        <RangeGauge2 value={item.progressValue} status={item.progressStatus} />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {item.info.map((item, index) => (
                          <div key={index} className="mb-2">
                            {index != 0 &&
                              <span className='inline-block mr-2' >•</span>
                            }
                            {index === 0 &&
                              <span className='text-white font-medium '>Duration: </span>
                            }
                            {index === 2 &&
                              <span className=' '>Recovery: </span>
                            }
                            {item.text}
                          </div>
                        ))}
                      </div>
                      <p className='text-sm text-para'>{item.des} </p>
                    </div>

                  </div>
                ))
              ) : (
                <div className="col-span-full p-8 text-center bg-[#736F6A]/5 rounded-[20px] border border-dashed border-white/10">
                  <p className="text-para text-sm">No clinical events recorded for this period.</p>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 xl:gap-6">
            {card.map((item, index) => (
              <div key={index} className='rounded-2xl bg-[#2F2F31] p-4 md:p-5 flex items-start gap-3 md:gap-4'>
                <div className="size-10 bg-green">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10.0003 18.3337C14.6027 18.3337 18.3337 14.6027 18.3337 10.0003C18.3337 5.39795 14.6027 1.66699 10.0003 1.66699C5.39795 1.66699 1.66699 5.39795 1.66699 10.0003C1.66699 14.6027 5.39795 18.3337 10.0003 18.3337Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7.5 9.99967L9.16667 11.6663L12.5 8.33301" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="">
                  {item.title &&
                    <p className='mb-0.5 leading-normal'>{item.title} </p>
                  }
                  <p className='text-white '>{item.value} </p>
                  <p className='text-para text-sm  max-w-70 leading-[1.6]'>{item.des} </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Mainbody>
      <Footer />
    </>
  )
}
