import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { patientService } from '@/services/patientService';
import Mainbody from '@/components/dashboard/main-body'
import Footer from '@/components/dashboard/footer'
import TopTitle from '@/components/dashboard/top-title'
import { Growth } from '@/utilities/icons'
import ChartTitle from '@/components/dashboard/chart-title'
import SleepStagesChart from '@/components/dashboard/charts/sleep-stage-chart'
import NightHearRateChart from '@/components/dashboard/charts/night-heart-rate-chart'
import NightSpoChart from '@/components/dashboard/charts/night-spo-chart'
import RangeGauge from '@/components/range-gauge'

export default function SleepPattern() {
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [vitalData, setVitalData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [currentVitals, setCurrentVitals] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today's date in YYYY-MM-DD format
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

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

        // Fetch specific vital data - sleep endpoint uses date parameter
        if (patientId) {
          const response = await patientService.getSleepPatternData(patientId, {
            date: selectedDate
          });
          if (response.success) {
            setVitalData(response.data);
            setStatistics(response.data?.statistics || null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch sleepPattern data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, selectedDate]);
  const status = [
    { name: 'Deep Sleep', color: '#2B7FFF' },
    { name: 'Light Sleep', color: '#2AD354' },
    { name: 'Awake / Disrupted', color: '#F59E0B' },
  ]

  const bpTrend = [
    {
      icon: <Growth className='-scale-y-100' />,
      iconBg: "bg-froly",
      title: "Stage Fragmentation",
      value: "High",
      progressValue: 70,
      progressStatus: ["Below", "Baseline", "Above"],
      extension: null,
      des: "Stage transitions detected"
    },
    {
      icon: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.3307 9.99935H16.2641C15.8999 9.99857 15.5454 10.1171 15.255 10.3368C14.9645 10.5565 14.7541 10.8653 14.6557 11.216L12.6974 18.1827C12.6848 18.226 12.6585 18.264 12.6224 18.291C12.5863 18.3181 12.5425 18.3327 12.4974 18.3327C12.4523 18.3327 12.4085 18.3181 12.3724 18.291C12.3363 18.264 12.31 18.226 12.2974 18.1827L7.6974 1.81602C7.68477 1.77274 7.65846 1.73473 7.6224 1.70768C7.58633 1.68064 7.54247 1.66602 7.4974 1.66602C7.45232 1.66602 7.40846 1.68064 7.3724 1.70768C7.33633 1.73473 7.31002 1.77274 7.2974 1.81602L5.33906 8.78268C5.24112 9.13198 5.03188 9.43978 4.74312 9.65936C4.45435 9.87894 4.10183 9.99831 3.73906 9.99935H1.66406" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>),
      iconBg: "bg-purple",
      title: "Deep vs Light Sleep",
      value: "18% / 82%",
      progressValue: 82,
      extension: null,
      des: "Deep sleep is low"
    },
    {
      icon: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.3307 9.99935H16.2641C15.8999 9.99857 15.5454 10.1171 15.255 10.3368C14.9645 10.5565 14.7541 10.8653 14.6557 11.216L12.6974 18.1827C12.6848 18.226 12.6585 18.264 12.6224 18.291C12.5863 18.3181 12.5425 18.3327 12.4974 18.3327C12.4523 18.3327 12.4085 18.3181 12.3724 18.291C12.3363 18.264 12.31 18.226 12.2974 18.1827L7.6974 1.81602C7.68477 1.77274 7.65846 1.73473 7.6224 1.70768C7.58633 1.68064 7.54247 1.66602 7.4974 1.66602C7.45232 1.66602 7.40846 1.68064 7.3724 1.70768C7.33633 1.73473 7.31002 1.77274 7.2974 1.81602L5.33906 8.78268C5.24112 9.13198 5.03188 9.43978 4.74312 9.65936C4.45435 9.87894 4.10183 9.99831 3.73906 9.99935H1.66406" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>),
      iconBg: "bg-green",
      title: "Sleep Efficiency",
      value: "78%",
      progressValue: 78,
      progressStatus: ["Low", "Normal", "High"],
      extension: null,
      des: "Time asleep vs time in bed"
    },
    {
      icon: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.3307 9.99935H16.2641C15.8999 9.99857 15.5454 10.1171 15.255 10.3368C14.9645 10.5565 14.7541 10.8653 14.6557 11.216L12.6974 18.1827C12.6848 18.226 12.6585 18.264 12.6224 18.291C12.5863 18.3181 12.5425 18.3327 12.4974 18.3327C12.4523 18.3327 12.4085 18.3181 12.3724 18.291C12.3363 18.264 12.31 18.226 12.2974 18.1827L7.6974 1.81602C7.68477 1.77274 7.65846 1.73473 7.6224 1.70768C7.58633 1.68064 7.54247 1.66602 7.4974 1.66602C7.45232 1.66602 7.40846 1.68064 7.3724 1.70768C7.33633 1.73473 7.31002 1.77274 7.2974 1.81602L5.33906 8.78268C5.24112 9.13198 5.03188 9.43978 4.74312 9.65936C4.45435 9.87894 4.10183 9.99831 3.73906 9.99935H1.66406" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>),
      iconBg: "bg-yellow",
      title: "Total Sleep Duration",
      value: "6h 24m",
      progressValue: 60,
      progressStatus: ["Stable", "Fluctuating", "Unstable"],
      extension: null,
      des: "Below recommended (7-9h)",
      get_number_count: ['1h', '2h', '3h', '4h', '5h', '6h', '7h', '8h']
    },
  ]



  if (loading) {




    return (




      <Mainbody>




        <div className="flex items-center justify-center min-h-96">




          <p className="text-white">Loading sleepPattern data...</p>




        </div>




      </Mainbody>




    );




  }









  return (
    <>
      <Mainbody>
        <TopTitle title="Sleep Pattern" />
        <div className="bg-[#2F2F31] p-4 lg:p-5 rounded-xl lg:rounded-2xl xl:rounded-[28px] mb-4 lg:mb-5 xl:mb-6">
          <div className="flex items-center justify-between mb-4 lg:mb-5">
            <ChartTitle title="Sleep Stage Timeline" des="Stage distribution across the night." />
            <div className="flex items-center gap-2">
              <label className="text-sm text-para">Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-[#3D3D42] border border-[#555555] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#2B7FFF]"
              />
            </div>
          </div>
          <div className="flex items-center gap-5 mb-4 lg:mb-6">
            {status.map((item, index) => (
              <div className="flex items-center gap-2" key={index}>
                <span className='size-3 rounded-sm' style={{ backgroundColor: item.color }}></span>
                <span className='text-base font-normal text-para'>{item.name}</span>
              </div>
            ))}
          </div>
          <SleepStagesChart sleepSummary={vitalData?.sleepSummary} date={vitalData?.date} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 xl:gap-6 mb-4 lg:mb-6">
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
                  <RangeGauge value={item.progressValue} status={item.progressStatus} get_number_count={item.get_number_count} />
                </div>
                <span className='text-sm text-para bg-white/8 rounded-full min-h-8.5 inline-flex items-center px-3 lg:px-3'>{item.des}</span>
              </div>

            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2  gap-4 lg:gap-5xl:gap-6">
          <div className="bg-[#2F2F31] p-4 lg:p-5 rounded-xl lg:rounded-2xl xl:rounded-3xl relative z-1">
            <ChartTitle title="Sleep Stage Timeline" des="Stage distribution across the night." />
            <p className='-rotate-90 text-[10px] text-[#6EA7F7] leading-none! absolute -left-3 top-1/2 -translate-y-1/2'>Heart Rate (bpm)</p>
            <NightHearRateChart />
            <div className="bg-white/8 p-3 rounded-lg lg:rounded-xl mt-3 lg:mt-4">
              <p className='text-xs text-[#E2E4E9] leading-none! flex md:items-center gap-2'>
                <svg width="12" height="7" viewBox="0 0 12 7" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.59961 0.600098H10.5996V3.6001" stroke="#6EA7F7" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10.5996 0.600098L6.34958 4.8501L3.84959 2.3501L0.599609 5.6001" stroke="#6EA7F7" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Mild night-time heart rate variability observed during sleep stage transitions.</p>
            </div>
          </div>
          <div className="bg-[#2F2F31] p-4 lg:p-5 rounded-xl lg:rounded-2xl xl:rounded-3xl relative z-1">
            <ChartTitle title="Night SpO₂" des="Overnight oxygen saturation trend analysis" />
            <p className='-rotate-90 text-[10px] text-[#6EA7F7] leading-none! absolute left-2 top-1/2 -translate-y-1/2'>SpO₂ (%)</p>
            <NightSpoChart />
            <div className="bg-white/8 p-3 rounded-lg lg:rounded-xl mt-3 lg:mt-4">
              <p className='text-xs text-[#E2E4E9] leading-none! flex md:items-center gap-2'>
                <svg width="12" height="7" viewBox="0 0 12 7" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.59961 0.600098H10.5996V3.6001" stroke="#7F6CE0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10.5996 0.600098L6.34958 4.8501L3.84959 2.3501L0.599609 5.6001" stroke="#7F6CE0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Night SpO₂ remained largely stable, with brief desaturation periods observed during sleep.</p>
            </div>
          </div>
        </div>

      </Mainbody>
      <Footer />
    </>
  )
}
