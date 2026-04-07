import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { patientService } from '@/services/patientService';
import Mainbody from '@/components/dashboard/main-body'
import Footer from '@/components/dashboard/footer'
import TopTitle from '@/components/dashboard/top-title'
import ChartTitle from '@/components/dashboard/chart-title'
import HrvTrendChart from '@/components/dashboard/charts/hrv-trend-chart'
import DateChart from '@/components/dashboard/charts/date-chart'
import AutonomicBalanceChart from '@/components/dashboard/charts/autonomic-balance-chart'
import chartImg from "../../../assets/img/chart/chart1.png"
import AutonomicBalanceChart2 from '../../../components/dashboard/charts/autonomic-balance-chart2'


export default function HrvScore() {
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
          const response = await patientService.getHRVData(patientId, {
            interval: filterTab === '1h' ? '1h' : filterTab === '6h' ? '6h' : filterTab === '24h' ? '24h' : '7d'
          });
          if (response.success) {
            setVitalData(response.data);
            setStatistics(response.data?.statistics || null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch hrv data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, filterTab]);
  const autonomicCards = [
    {
      title: "HRV variability within expected range",
      color: "#41DA67",
      icon: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10.0003 18.3334C14.6027 18.3334 18.3337 14.6025 18.3337 10.0001C18.3337 5.39771 14.6027 1.66675 10.0003 1.66675C5.39795 1.66675 1.66699 5.39771 1.66699 10.0001C1.66699 14.6025 5.39795 18.3334 10.0003 18.3334Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.5 9.99992L9.16667 11.6666L12.5 8.33325" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      )
    },
    {
      title: "Autonomic balance shows sympathetic predominance",
      color: "#37D55E",
      icon: (<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.334 5.83325H18.334V10.8333" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18.3327 5.83325L11.2493 12.9166L7.08268 8.74992L1.66602 14.1666" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      )
    }
  ]
  // Check if data is empty
  const hasNoData = !vitalData?.hrvData || vitalData.hrvData.length === 0 ||
    (statistics?.min === 0 && statistics?.max === 0 && statistics?.average === 0 && statistics?.count === 0);

  if (loading) {
    return (
      <Mainbody>
        <div className="flex items-center justify-center min-h-96">
          <p className="text-white">Loading hrv data...</p>
        </div>
      </Mainbody>
    );
  }

  if (hasNoData) {
    return (
      <Mainbody>
        <TopTitle title="HRV Score" />
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <svg className="mx-auto mb-4 w-16 h-16 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-medium text-white mb-2">No HRV Data Available</h3>
            <p className="text-[#9CA3AF] text-sm">No HRV data found for the selected time range.</p>
            <p className="text-[#9CA3AF] text-xs mt-1">Please try selecting a different time period.</p>
          </div>
        </div>
      </Mainbody>
    );
  }



  return (
    <>
      <Mainbody>
        <TopTitle title="HRV Score" />
        <div className="bg-[#2F2F31] p-4 lg:p-5 rounded-xl lg:rounded-2xl xl:rounded-[28px] mb-4 lg:mb-5 xl:mb-6">
          <ChartTitle
            title="HRV Trend"
            des="Autonomic variability over time"
            filter_items={filter}
            set_active_filter={filter.findIndex(f => f === filterTab)}
            onFilterChange={(item) => setFilterTab(item)}
          />
          <p className='flex items-center gap-2 text-white text-xs leading-none! mb-4 lg:mb-6'> <span className='size-3 rounded-sm bg-[#2B7FFF]  block'></span>HRV Variability - Baseline Reference</p>
          <HrvTrendChart hrvData={vitalData?.hrvData || []} statistics={statistics} />
        </div>
        <div className="mt-4 lg:mt-5 xl:mt-6 flex flex-wrap lg:flex-wrap xl:flex-nowrap gap-3 xl:gap-6 ">
          <div className="flex flex-wrap md:flex-nowrap gap-3 xl:gap-6 w-full xl:w-7/12">
            <div className="w-full bg-[#2F2F31] p-4 lg:p-5 rounded-xl lg:rounded-2xl xl:rounded-[20px]">
              <h4 className='text-lg lg:text-xl font-medium leading-none text-white mb-2'>Autonomic Balance</h4>
              <p className='text-xs md:text-sm text-para leading-none! mb-4 lg:mb-4.5'>Sympathetic vs parasympathetic dominance</p>
              <div className="flex items-center gap-3 mb-4 lg:mb-5 xl:mb-6.5">
                <p className='text-sm md:text-base text-white flex items-center gap-2'> <span className='size-3 rounded-sm bg-[#2B7FFF] block' />Parasympathetic</p>
                <p className='text-sm md:text-base text-white flex items-center gap-2'> <span className='size-3 rounded-sm bg-[#F59E0B] block' />Sympathetic</p>
              </div>
              <div className=" max-w-71.5 mx-auto flex items-center justify-between gap-4 ">
                <AutonomicBalanceChart />
                <AutonomicBalanceChart2 />
              </div>
              <div className="h-px w-full bg-[#434343] mt-3 lg:mt-4"></div>
              <p className='text-xs text-para leading-[1.3] mt-4 lg:mt-5 xl:mt-6'>Instant clinical interpretation of autonomic state</p>
            </div>
          </div>
          <div className="w-full lg:w-7/12 xl:w-5/12 bg-[#2F2F31] p-4 lg:p-5 rounded-xl lg:rounded-2xl xl:rounded-[20px]">
            <h4 className='text-lg lg:text-xl font-medium leading-none text-[#F9FAFB] mb-3 lg:mb-4'>Data Quality</h4>
            <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-5 md:gap-8 lg:gap-10 xl:gap-10 max-w-115 mx-auto">
              <div className='mx-auto md:mx-0'>
                <div>
                  {(() => {
                    // Calculate average quality from HRV data
                    const avgQuality = vitalData?.hrvData?.length > 0
                      ? Math.round(vitalData.hrvData.reduce((sum, item) => sum + (item.quality || 100), 0) / vitalData.hrvData.length)
                      : 100;
                    const qualityStatus = avgQuality >= 80 ? 'Good' : avgQuality >= 60 ? 'Fair' : 'Poor';
                    const qualityColor = avgQuality >= 80 ? 'bg-[#4CAF50]' : avgQuality >= 60 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]';
                    const qualityBgColor = avgQuality >= 80 ? 'bg-[#334236]' : avgQuality >= 60 ? 'bg-[#3D3A2E]' : 'bg-[#3D2E2E]';

                    return (
                      <>
                        <div className={`size-20 lg:size-23 rounded-full ${qualityBgColor} flex items-center justify-center mb-2 lg:mb-3`}>
                          <div className={`size-11 lg:size-13 rounded-full ${qualityColor} flex items-center justify-center`}>
                            {avgQuality >= 80 ? (
                              <span>
                                <svg width="30" height="23" viewBox="0 0 30 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M26.6129 0L10.1613 16.2917L3.3871 9.58333L0 12.9375L10.1613 23L30 3.35417L26.6129 0Z" fill="white" />
                                </svg>
                              </span>
                            ) : (
                              <span className="text-white text-xs font-bold">{avgQuality}%</span>
                            )}
                          </div>
                        </div>
                        <div className="text-center">
                          <p className='text-[#9CA3AF] text-xs md:text-sm leading-none! mb-2'>Signal Quality</p>
                          <h4 className='text-[#F9FAFB] text-xl lg:text-2xl leading-none!'>{qualityStatus}</h4>
                          <p className='text-[#9CA3AF] text-xs mt-1'>{avgQuality}% average</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className='mx-auto md:mx-0'>
                <DateChart />
              </div>
            </div>
          </div>
        </div>
        <div className=" bg-[#2F2F31] p-4 lg:p-5 rounded-xl lg:rounded-2xl xl:rounded-[20px] mt-4 lg:mt-5 xl:mt-6">
          <h4 className='text-lg lg:text-xl font-medium leading-none text-white mb-2'>Autonomic & Stress Indicators</h4>
          <p className='text-xs md:text-sm text-para leading-none! mb-4 lg:mb-5 xl:mb-6'>Clinical analytics summary</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 xl:gap-6">
            {autonomicCards.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 lg:gap-5 border border-[#434343]  bg-white/8  rounded-xl lg:rounded-2xl xl:rounded-[20px] p-4 lg:p-5">
                <div style={{ backgroundColor: item.color }} className="size-9 lg:size-10 rounded-full flex-[0_0_auto] flex items-center justify-center"><span>{item.icon}</span></div>
                <p className='max-w-57 text-[#D1D5DB] text-sm md:text-base '>{item.title}</p>
              </div>
            ))}
          </div>
        </div>
      </Mainbody>
      <Footer />
    </>

  )
}
