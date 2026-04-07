import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { patientService } from '@/services/patientService';
import Mainbody from '@/components/dashboard/main-body'
import Footer from '@/components/dashboard/footer'
import TopTitle from '@/components/dashboard/top-title'
import { ArrowRight, SuccessTik } from '../../../utilities/icons'
import img1 from "../../../assets/img/overflow/img1.png"
import img2 from "../../../assets/img/overflow/img2.png"
import DateChart from '../../../components/dashboard/charts/date-chart'
import StressPatternChart from '../../../components/dashboard/charts/stress-pattern-chart'
import AddNotesModal from '../../../components/ui/AddNotesModal'
import ConfirmationModal from '../../../components/ui/ConfirmationModal'


export default function Stress() {
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [vitalData, setVitalData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [currentVitals, setCurrentVitals] = useState(null);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

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
        const response = await patientService.getRespiratoryRateData(userId, {
          interval: filterTab === '1h' ? '1h' : filterTab === '6h' ? '6h' : filterTab === '24h' ? '24h' : '7d'
        });
        if (response.success) {
          setVitalData(response.data);
          setStatistics(response.data?.statistics || null);
        }
      } catch (error) {
        console.error('Failed to fetch stress data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, filterTab]);

  const handleEpisodeClick = (episode) => {
    setSelectedEpisode(episode);
    setIsNotesModalOpen(true);
  };

  const handleSaveNotes = (data) => {
    // Here you would typically save the notes to the backend
    console.log('Saving notes for episode:', selectedEpisode, data);
    setIsNotesModalOpen(false);
    setIsSuccessModalOpen(true);
  };

  const RespiratoryCards = [
    {
      title: "High Stress Episode",
      date: "13:25",
      minuit: "12 min",
      img: img1
    },
    {
      title: "Medium Stress Episode",
      date: "06:33",
      minuit: "8 min",
      img: img2
    },
    {
      title: "High Stress Episode",
      date: "00:25",
      minuit: "25 min",
      img: img1
    },
  ]
  const MetricsSummary = [
    {
      title: 'Average Stress',
      value: "Moderate"
    },
    {
      title: 'Peak Stress',
      value: "High"
    },
    {
      title: 'Current Stress',
      value: "Moderate"
    },
    {
      title: 'Stress Spikes',
      value: "3"
    },
  ]
  // Check if data is empty
  const hasNoData = !vitalData?.respiratoryRateData || vitalData.respiratoryRateData.length === 0 ||
    (statistics?.min === 0 && statistics?.max === 0 && statistics?.average === 0 && statistics?.count === 0);

  if (loading) {
    return (
      <Mainbody>
        <div className="flex items-center justify-center min-h-96">
          <p className="text-white">Loading stress data...</p>
        </div>
      </Mainbody>
    );
  }

  if (hasNoData) {
    return (
      <Mainbody>
        <TopTitle title="Stress Level" />
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <svg className="mx-auto mb-4 w-16 h-16 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-medium text-white mb-2">No Stress Data Available</h3>
            <p className="text-[#9CA3AF] text-sm">No stress data found for the selected time range.</p>
            <p className="text-[#9CA3AF] text-xs mt-1">Please try selecting a different time period.</p>
          </div>
        </div>
      </Mainbody>
    );
  }



  return (
    <>
      <Mainbody>
        <TopTitle title="Stress Level" />
        <div className="bg-[#2F2F31] p-4 lg:p-5 rounded-xl lg:rounded-2xl xl:rounded-[28px]">
          <h4 className='text-lg lg:text-xl font-medium leading-none text-[#F9FAFB] mb-5 lg:mb-6 xl:mb-7'>Stress Pattern</h4>
          <StressPatternChart className="w-full h-80" />
        </div>
        <div className="mt-4 lg:mt-5 xl:mt-6 flex flex-wrap lg:flex-wrap xl:flex-nowrap gap-3 xl:gap-6 ">
          <div className="flex flex-wrap md:flex-nowrap gap-3 xl:gap-6 w-full xl:w-7/12">
            <div className="w-full lg:w-1/2 xl:w-5/12 bg-[#2F2F31] p-4 lg:p-5 rounded-xl lg:rounded-2xl xl:rounded-[20px]">
              <h4 className='text-lg lg:text-xl font-medium leading-none text-[#F9FAFB] mb-5 lg:mb-6 xl:mb-7'>Stress Episodes</h4>
              {RespiratoryCards.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 justify-between cursor-pointer pb-4 lg:pb-5 xl:pb-6 last:pb-0 mb-4 lg:mb-5 xl:mb-6 last:mb-0 last:border-b-0 border-b border-b-[#434343] hover:opacity-80 transition-opacity"
                  onClick={() => handleEpisodeClick(item)}
                >
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="size-9 lg:size-11 rounded-full flex-[0_0_auto]"><img src={item.img} className='size-full object-center rounded-full' alt="" /></div>
                    <div>
                      <h5 className='text-[#F9FAFB] text-sm md:text-base fme\ leading-none mb-2'>{item.title}</h5>
                      <p className='text-[#9CA3AF] text-xs md:text-sm leading-none flex items-center gap-2 md:gap-3'>{item.date}
                        <span className='flex items-center gap-1'>
                          <span className='size-1.5 rounded-full bg-[#D5D5D5] flex-[0_0_auto] block' ></span>{item.minuit}</span>
                      </p>
                    </div>
                  </div>
                  <button><ArrowRight className='size-5 lg:size-6' /></button>
                </div>
              ))}
            </div>
            <div className="w-full lg:w-1/2 xl:w-7/12 bg-[#2F2F31] p-4 lg:p-5 rounded-xl lg:rounded-2xl xl:rounded-[20px]">
              <h4 className='text-lg lg:text-xl font-medium leading-none text-[#F9FAFB] mb-5 lg:mb-6 xl:mb-7'>Metrics Summary</h4>
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                {MetricsSummary.map((item, idx) => (
                  <div key={idx} className="bg-[#434343] rounded-lg lg:rounded-xl p-4 lg:p-7">
                    <h6 className='text-white text-base md:text-lg leading-none! mb-2'>{item.title}</h6>
                    <p className='text-[#9CA3AF] text-xs md:text-sm leading-none flex items-end gap-1'>
                      <span className='text-2xl lg:text-[28px] font-medium text-[#F9FAFB] leading-none'>{item.value}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="w-full md:w-8/12 lg:w-7/12 xl:w-5/12 bg-[#2F2F31] p-4 lg:p-5 rounded-xl lg:rounded-2xl xl:rounded-[20px]">
            <h4 className='text-lg lg:text-xl font-medium leading-none text-[#F9FAFB] mb-3 lg:mb-4'>Data Quality</h4>
            <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-5 md:gap-8 lg:gap-10 xl:gap-10 max-w-115 mx-auto">
              <div className="mx-auto md:mx-0">
                {(() => {
                  // Calculate average quality from respiratory rate data
                  const avgQuality = vitalData?.respiratoryRateData?.length > 0
                    ? Math.round(vitalData.respiratoryRateData.reduce((sum, item) => sum + (item.quality || 100), 0) / vitalData.respiratoryRateData.length)
                    : 100;
                  const qualityStatus = avgQuality >= 80 ? 'Good' : avgQuality >= 60 ? 'Fair' : 'Poor';
                  const qualityColor = avgQuality >= 80 ? 'bg-[#4CAF50]' : avgQuality >= 60 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]';
                  const qualityBgColor = avgQuality >= 80 ? 'bg-[#334236]' : avgQuality >= 60 ? 'bg-[#3D3A2E]' : 'bg-[#3D2E2E]';

                  return (
                    <div>
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
                    </div>
                  );
                })()}
              </div>
              <div className='mx-auto md:mx-0'>
                <DateChart />
              </div>
            </div>
          </div>
        </div>
      </Mainbody>
      <AddNotesModal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        onSave={handleSaveNotes}
        title={selectedEpisode ? `Add Notes: ${selectedEpisode.title}` : 'Add Notes'}
      />
      <ConfirmationModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        onConfirm={() => setIsSuccessModalOpen(false)}
        title="Success"
        message="Notes have been saved successfully and the episode has been flagged for doctor review."
        confirmText="OK"
        icon={<SuccessTik className="size-6 text-[#D4A362]" />}
      />
      <Footer />
    </>
  )
}
