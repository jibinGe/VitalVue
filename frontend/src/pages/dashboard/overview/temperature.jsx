import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { patientService } from '@/services/patientService';
import Mainbody from '@/components/dashboard/main-body'
import Footer from '@/components/dashboard/footer'
import TopTitle from '@/components/dashboard/top-title'
import ChartTitle from '@/components/dashboard/chart-title'
import TemperatureTrendChart from '@/components/dashboard/charts/temperature-trend-chart'
import Episode from '@/components/dashboard/chartui/episode'
import Peak from '@/components/dashboard/chartui/peak'
import Baseline from '@/components/dashboard/chartui/baseline'
import Resolution from '@/components/dashboard/chartui/resolution'
import RangeGauge3 from '@/components/range-gauge3'

export default function Temperature() {
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [vitalData, setVitalData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [currentVitals, setCurrentVitals] = useState(null);
  const filter = ["1h", "6h", "24h", "7d"];
  const [filterTab, setFilterTab] = useState(filter[2]); // Default to 24h

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
          const response = await patientService.getTemperatureData(patientId, {
            interval: filterTab
          });
          if (response.success) {
            setVitalData(response.data);
            setStatistics(response.data?.statistics || null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch temperature data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, filterTab]);
  // Calculate baseline deviation
  const currentTemp = currentVitals?.vitals?.temperature?.value || statistics?.average || 36.5;
  const baseline = 36.5; // Normal body temperature baseline
  const baselineDeviation = currentTemp - baseline;
  const baselineDeviationStr = baselineDeviation >= 0
    ? `+${baselineDeviation.toFixed(1)}°C`
    : `${baselineDeviation.toFixed(1)}°C`;

  // Calculate temperature stability (coefficient of variation)
  const calculateStability = () => {
    if (!statistics || !vitalData?.temperatureData || vitalData.temperatureData.length === 0) {
      return 78; // Default
    }
    const values = vitalData.temperatureData.map(d => d.value);
    const mean = statistics.average;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / mean) * 100;
    // Convert to stability percentage (lower CV = higher stability)
    return Math.max(0, Math.min(100, 100 - cv * 10));
  };

  const bpTrend = [
    {
      icon: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10.0011 18.3327C10.9507 18.3328 11.8769 18.0381 12.6517 17.489C13.4265 16.94 14.0117 16.1639 14.3263 15.268C14.6409 14.372 14.6695 13.4004 14.4081 12.4875C14.1466 11.5746 13.6081 10.7654 12.8669 10.1718C12.7559 10.0877 12.6653 9.97947 12.602 9.85538C12.5386 9.73128 12.5041 9.59448 12.5011 9.45518V4.16602C12.5011 3.50297 12.2377 2.86709 11.7688 2.39825C11.3 1.92941 10.6641 1.66602 10.0011 1.66602C9.33802 1.66602 8.70213 1.92941 8.23329 2.39825C7.76445 2.86709 7.50106 3.50297 7.50106 4.16602V9.45602C7.50106 9.73768 7.35522 9.99602 7.13522 10.1727C6.39435 10.7664 5.85612 11.5755 5.59488 12.4882C5.33365 13.401 5.36232 14.3723 5.67691 15.2681C5.99151 16.1639 6.57651 16.9398 7.35111 17.4888C8.1257 18.0378 9.05166 18.3326 10.0011 18.3327Z" stroke="white" strokeWidth="1.2" />
        <path d="M10.0013 11.6654C9.44877 11.6654 8.91886 11.8849 8.52816 12.2756C8.13746 12.6663 7.91797 13.1962 7.91797 13.7487C7.91797 14.3012 8.13746 14.8311 8.52816 15.2218C8.91886 15.6125 9.44877 15.832 10.0013 15.832C10.5538 15.832 11.0837 15.6125 11.4744 15.2218C11.8651 14.8311 12.0846 14.3012 12.0846 13.7487C12.0846 13.1962 11.8651 12.6663 11.4744 12.2756C11.0837 11.8849 10.5538 11.6654 10.0013 11.6654ZM10.0013 11.6654V8.33203" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      </svg>

      ),
      iconBg: "bg-bluesky",
      title: "Current Temperature",
      value: `${currentTemp.toFixed(1)}°C`,
      progressValue: currentTemp > 37.5 ? 75 : currentTemp > 37 ? 50 : 25,
      des: currentTemp > 37.5 ? "Fever detected" : currentTemp > 37 ? "Elevated temperature" : "Normal temperature",
      progressStatus: ["Normal", "Elevated", "High Fever"],
      type: "normal",
    },
    {
      icon: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.3359 5.83398H18.3359V10.834" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.3307 5.83268L11.2474 12.916L7.08073 8.74935L1.66406 14.166" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      ),
      iconBg: "bg-froly",
      title: "Baseline Deviation",
      value: baselineDeviationStr,
      progressValue: baselineDeviation > 0 ? 50 + (baselineDeviation * 10) : 50 + (baselineDeviation * 10),
      progressStatus: ["Below", "Baseline", "Above"],
      des: baselineDeviation > 0 ? "Above patient baseline" : baselineDeviation < 0 ? "Below patient baseline" : "At baseline",
      type: "baseline",
    },
    {
      icon: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.3307 9.99935H16.2641C15.8999 9.99857 15.5454 10.1171 15.255 10.3368C14.9645 10.5565 14.7541 10.8653 14.6557 11.216L12.6974 18.1827C12.6848 18.226 12.6585 18.264 12.6224 18.291C12.5863 18.3181 12.5425 18.3327 12.4974 18.3327C12.4523 18.3327 12.4085 18.3181 12.3724 18.291C12.3363 18.264 12.31 18.226 12.2974 18.1827L7.6974 1.81602C7.68477 1.77274 7.65846 1.73473 7.6224 1.70768C7.58633 1.68064 7.54247 1.66602 7.4974 1.66602C7.45232 1.66602 7.40846 1.68064 7.3724 1.70768C7.33633 1.73473 7.31002 1.77274 7.2974 1.81602L5.33906 8.78268C5.24112 9.13198 5.03188 9.43978 4.74312 9.65936C4.45435 9.87894 4.10183 9.99831 3.73906 9.99935H1.66406" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      ),
      iconBg: "bg-green",
      title: "Temperature Stability",
      value: `${Math.round(calculateStability())}%`,
      progressValue: calculateStability(),
      progressStatus: ["Stable", "Fluctuating", "Unstable"],
      des: "Temperature variability over time",
      type: "normal",
    },
    {
      icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2C17.52 2 22 6.48 22 12Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15.7099 15.18L12.6099 13.33C12.0699 13.01 11.6299 12.24 11.6299 11.61V7.51001" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      ),
      iconBg: "bg-yellow",
      title: "Average Temperature",
      value: statistics?.average !== undefined && statistics?.average !== null
        ? `${statistics.average.toFixed(1)}°C`
        : `${currentTemp.toFixed(1)}°C`,
      progressValue: statistics?.average !== undefined && statistics?.average !== null
        ? Math.max(0, Math.min(100, ((statistics.average - 35) / 5) * 100))
        : Math.max(0, Math.min(100, ((currentTemp - 35) / 5) * 100)),
      progressStatus: ["35°C", "Average", "40°C"],
      des: `Range: ${statistics?.min !== undefined && statistics?.min !== null ? statistics.min.toFixed(1) : 'N/A'}°C - ${statistics?.max !== undefined && statistics?.max !== null ? statistics.max.toFixed(1) : 'N/A'}°C`,
      type: "fever",
    },
  ]

  const feverEpisode = [
    {
      title: "2",
      des: "Fever episodes today",
      subdes: "Avg duration: 32m",
      para: "Both resolved",
      component: <Episode />
    },
    {
      title: "1h 18m",
      des: "Longest fever duration",
      subdes: "Total fever time: 6h 10m",
      para: "Episode at 03:00",
      component: <Peak />
    },
    {
      title: "36.4°C",
      des: "Lowest temperature",
      subdes: "Below baseline: −0.6°C",
      para: "Recorded at 23:45",
      component: <Baseline />
    },
    {
      title: "25 min ago",
      des: "Last abnormal reading",
      subdes: "Total fever time: 6h 10m",
      para: "Episode at 03:00",
      component: <Resolution />
    },
  ]

  // Check if data is empty
  const hasNoData = !vitalData?.temperatureData || vitalData.temperatureData.length === 0 ||
    (statistics?.min === 0 && statistics?.max === 0 && statistics?.average === 0 && statistics?.count === 0);

  if (loading) {
    return (
      <Mainbody>
        <div className="flex items-center justify-center min-h-96">
          <p className="text-white">Loading temperature data...</p>
        </div>
      </Mainbody>
    );
  }

  if (hasNoData) {
    return (
      <Mainbody>
        <TopTitle title="Temperature" />
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <svg className="mx-auto mb-4 w-16 h-16 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-medium text-white mb-2">No Temperature Data Available</h3>
            <p className="text-[#9CA3AF] text-sm">No temperature data found for the selected time range.</p>
            <p className="text-[#9CA3AF] text-xs mt-1">Please try selecting a different time period.</p>
          </div>
        </div>
      </Mainbody>
    );
  }

  return (
    <>
      <Mainbody>
        <TopTitle title="Temperature" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 xl:gap-6 mb-4 lg:mb-5 xl:mb-6">
          {bpTrend?.map((item, idx) => (
            <div className="bg-[#2F2F31] rounded-3xl overflow-hidden min-h-52  flex flex-col justify-between" key={idx}>
              <div className="p-5">
                <div className="flex items-start flex-row-reverse justify-between gap-3 md:gap-4 ">
                  <div className={`size-10 md:size-11 lg:size-12 xl:size-13 ${item.iconBg}`}>
                    {item.icon}
                  </div>
                  <div className="">
                    <span className="block text-base mb-2 text-white">{item.title} </span>
                    <div className="text-2xl lg:text-3xl xl:text-[36px] text-white font-medium [text-shadow:1px_1px_5px_rgba(255,0,0,0.16),-1px_-1px_5px_rgba(0,170,255,0.16)]">
                      {item.value}
                    </div>
                  </div>
                </div>
                <div className="my-3 md:my-5">
                  <RangeGauge3
                    value={item.progressValue}
                    status={item.progressStatus}
                    type={item.type}
                  />
                </div>
                <p className='text-sm text-para'>{item.des} </p>
              </div>

            </div>
          ))}
        </div>
        <div className="p-4 lg:p-5 bg-[#2F2F31] rounded-2xl lg:rounded-3xl xl:rounded-[30px] mb-4 lg:mb-5 xl:mb-6">
          <ChartTitle
            title="Temperature Trend"
            des={`${filterTab === '1h' ? '1-hour' : filterTab === '6h' ? '6-hour' : filterTab === '24h' ? '24-hour' : '7-day'} monitoring view`}
            filter_items={filter}
            set_active_filter={filter.indexOf(filterTab)}
            onFilterChange={(item) => setFilterTab(item)}
          />
          <TemperatureTrendChart temperatureData={vitalData?.temperatureData} />
        </div>
        <div className="">
          <h5 className='text-white text-lg lg:text-xl font-medium mb-1'>Fever Episode Summary</h5>
          <p className='text-[#E2E4E9] text-xs md:text-sm leading-none!'>24-hour activity overview</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 xl:gap-6 mt-4 lg:mt-5">
            {feverEpisode.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 lg:gap-3 p-4 lg:p-5 bg-[#2F2F31] rounded-xl lg:rounded-2xl xl:rounded-3xl">
                <div className=" w-1/2  lg:w-7/12 xl:w-8/12">
                  <h2 className='text-3xl lg:text-[40px] xl:text-[50px] font-medium text-white mb-3 lg:mb-4'>{item.title}</h2>
                  <p className='text-white text-sm md:text-base'>{item.des}</p>
                  <p className='text-para text-sm md:text-base  pb-2.5 border-b border-b-white/20 mb-2.5'>{item.subdes}</p>
                  <p className='text-para text-sm md:text-base leading-normal!'>{item.para}</p>
                </div>
                <div className='h-full  w-1/2  lg:w-5/12 xl:w-4/12 relative z-1 flex items-center justify-center'>
                  <div className=" w-px h-full bg-white/20 absolute z-2 left-0 top-0"></div>
                  {item.component}
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
