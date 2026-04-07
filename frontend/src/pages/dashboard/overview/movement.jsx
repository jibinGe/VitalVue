import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { patientService } from '@/services/patientService';
import Mainbody from '@/components/dashboard/main-body'
import Footer from '@/components/dashboard/footer'
import TopTitle from '@/components/dashboard/top-title'
import ChartTitle from '@/components/dashboard/chart-title'
import MovementActivityChart from '@/components/dashboard/charts/movement-activity-chart'
import FallRiskNdicator from '@/components/dashboard/charts/fall-risk-ndicator'
import ImmobilityDurationChart from '@/components/dashboard/charts/immobility-duration-chart'

export default function Movement() {
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
        const response = await patientService.getMovementData(userId, {
          interval: filterTab === '1h' ? '1h' : filterTab === '6h' ? '6h' : filterTab === '24h' ? '24h' : '7d'
        });
        if (response.success) {
          setVitalData(response.data);
          setStatistics(response.data?.statistics || null);
        }
      } catch (error) {
        console.error('Failed to fetch movement data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, filterTab]);
  const status = [
    { name: 'Deep Sleep', color: '#2B7FFF' },
    { name: 'Light Sleep', color: '#57575B' },
    { name: 'Awake / Disrupted', color: '#F59E0B' },
  ]
  const status2 = [
    { name: 'Sudden movement detected', color: '#E54D4D' },
    { name: 'Movement Intensity', color: '#FE9A00' },
  ]
  const status3 = [
    { name: 'Movement', color: '#FE9A00' },
    { name: 'Immobility Period', color: '#B686F9' },
  ]
  const cardList = [
    {
      title: "Extended",
      des: "Immobility Duration",
      color: "#FFF13380"
    },
    {
      title: "Prolonged",
      des: "Continuous Immobility",
      color: "#E54D4D"
    },
    {
      title: "Sustained",
      des: "Immobility Pattern",
      color: "#2CD155BF"
    },
  ]
  // Check if data is empty
  const hasNoData = !vitalData?.movementData || vitalData.movementData.length === 0 ||
    (statistics?.min === 0 && statistics?.max === 0 && statistics?.average === 0 && statistics?.count === 0);

  if (loading) {
    return (
      <Mainbody>
        <div className="flex items-center justify-center min-h-96">
          <p className="text-white">Loading movement data...</p>
        </div>
      </Mainbody>
    );
  }

  if (hasNoData) {
    return (
      <Mainbody>
        <TopTitle title="Movement" />
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <svg className="mx-auto mb-4 w-16 h-16 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-medium text-white mb-2">No Movement Data Available</h3>
            <p className="text-[#9CA3AF] text-sm">No movement data found for the selected time range.</p>
            <p className="text-[#9CA3AF] text-xs mt-1">Please try selecting a different time period.</p>
          </div>
        </div>
      </Mainbody>
    );
  }



  return (
    <>
      <Mainbody>
        <TopTitle title="Movement" />
        <div className="bg-[#2F2F31] p-4 lg:p-5 rounded-xl lg:rounded-2xl xl:rounded-[28px] mb-4 lg:mb-5 xl:mb-6">
          <ChartTitle
            title="Movement Activity Timeline"
            des="Activity and inactivity patterns across the monitoring period."
            filter_items={filter}
            set_active_filter={filter.findIndex(f => f === filterTab)}
            onFilterChange={(item) => setFilterTab(item)}
          />
          <div className="flex items-center gap-5 mb-4 lg:mb-6">
            {status.map((item, index) => (
              <div className="flex items-center gap-2" key={index}>
                <span className='size-3 rounded-sm' style={{ backgroundColor: item.color }}></span>
                <span className='text-base font-normal text-para'>{item.name}</span>
              </div>
            ))}
          </div>
          <MovementActivityChart movementData={vitalData?.movementData || []} statistics={statistics} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2  gap-4 lg:gap-5xl:gap-6">
          <div className="bg-[#2F2F31] p-4 lg:p-5 rounded-xl lg:rounded-2xl xl:rounded-3xl">
            <div className="flex flex-wrap md:flex-nowrap gap-3 justify-between items-center mb-4 lg:mb-6">
              <div>
                <h3 className="text-lg lg:text-xl font-medium leading-none text-white mb-1.5">Fall Risk Indicator</h3>
                <p className='text-sm lg:text-base text-[#E2E4E9]  leading-none'>Fall risk assessment based on movement behavior patterns.</p>
              </div>
              <button className='text-[#2CD155] hover:text-white text-sm md:text-base leading-none! min-h-10 min-w-30 flex items-center justify-center gap-1 border bg-[#2CD155]/8 border-[#2CD155]/35 rounded-lg lg:rounded-xl'>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 18C14.4 18 18 14.4 18 10C18 5.6 14.4 2 10 2C5.6 2 2 5.6 2 10C2 14.4 5.6 18 10 18Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6.60156 10.0003L8.86556 12.2643L13.4016 7.73633" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>Low Risk</button>
            </div>
            <div className="bg-[#3E3E41] p-3 lg:p-4 rounded-xl lg:rounded-[20px]">
              <FallRiskNdicator />
              <div className="flex flex-wrap md:flex-nowrap items-center md:gap-5">
                {status2.map((item, index) => (
                  <div className="flex items-center gap-2 mt-2 md:mt-3 ml-1" key={index}>
                    <span className='size-1.5 rounded-full' style={{ backgroundColor: item.color }}></span>
                    <span className='text-xs font-normal text-para'>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 md:mt-5 lg:mt-6">
              <div className="flex items-center justify-between gap-4 mb-3 lg:mb-4">
                <p className='text-xs md:text-sm text-white leading-none!'>Fall Risk Assessment Confidence</p>
                <h4 className='text-white text-base md:text-lg font-medium leading-none!'>High</h4>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#564B3E] mb-3 lg:mb-4">
                <div className="h-full w-[80%] bg-primary rounded-full"></div>
              </div>
              <p className='text-xs text-[#E2E4E9] leading-none!'>Fall risk level derived from movement variability and immobility patterns.</p>
            </div>
          </div>
          <div className="bg-[#2F2F31] p-4 lg:p-5 rounded-xl lg:rounded-2xl xl:rounded-3xl">
            <div className="flex flex-wrap md:flex-nowrap gap-3 justify-between items-center mb-4 lg:mb-6">
              <div>
                <h3 className="text-lg lg:text-xl font-medium leading-none text-white mb-1.5">Immobility Duration</h3>
                <p className='text-sm lg:text-base text-[#E2E4E9]  leading-none'>Analysis of minimal movement.</p>
              </div>
              <button className='text-[#FFF133E5]/90 hover:text-white text-sm md:text-base leading-none! py-2.5 px-3 flex items-center justify-center gap-1 border bg-[#FFF133]/8 border-[#FFF133]/35 rounded-lg lg:rounded-xl'>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 17.5C14.4 17.5 18 13.9 18 9.5C18 5.1 14.4 1.5 10 1.5C5.6 1.5 2 5.1 2 9.5C2 13.9 5.6 17.5 10 17.5Z" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 6.30078V10.3008" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9.99609 12.6992H10.0033" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Extended Duration</button>
            </div>
            <ImmobilityDurationChart />
            <div className="mt-4 xl:mt-5">
              <div className="flex flex-wrap md:flex-nowrap items-center md:gap-5 mb-4 lg:mb-5">
                {status3.map((item, index) => (
                  <div className="flex items-center gap-2" key={index}>
                    <span className='w-3 h-px rounded-full' style={{ backgroundColor: item.color }}></span>
                    <span className='text-xs font-normal text-white'>{item.name}</span>
                  </div>
                ))}
                <p className='text-xs font-normal text-white flex  items-center gap-1'> <span className='flex-[0_0_auto] size-1.5 rounded-full bg-[#E54D4D] border-[1.5px] border-[#59595A]'></span> Movement Resumption</p>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
                {cardList.map((item, idx) => (
                  <div key={idx} style={{ borderColor: item.color }} className="bg-white/8 rounded-lg lg:rounded-xl py-3 px-3  text-center  border-b border-b-[#FFF133]">
                    <p className='text-white text-xs leading-none! mb-1.5'>{item.des}</p>
                    <h5 style={{ color: item.color }} className=' text-lg lg:text-xl leading-none! font-medium'>{item.title}</h5>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </Mainbody>
      <Footer />
    </>
  )
}
