import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { patientService } from '@/services/patientService';

/* Icons */
const ArrowLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Configuration moved outside to prevent infinite re-renders in useEffect
const config = {
  'heart-rate': { title: 'Heart Rate', metricKeys: ['heart_rate'], unit: 'bpm', color: '#2CD155' },
  'spo2':       { title: 'SpO2', metricKeys: ['spo2'], unit: '%', color: '#8b5cf6' },
  'bp-trend':   { title: 'Blood Pressure', metricKeys: ['bp_systolic', 'bp_diastolic'], unit: 'mmHg', color: '#2CD155' },
};

export default function ShareVitalDetailPage() {
  const { patientId, metric } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [bpData, setBpData] = useState([]); 
  
  const [filterTab, setFilterTab] = useState('DAY');
  const [latestReading, setLatestReading] = useState(null);

  const currentConfig = config[metric] || config['heart-rate'];
  // We extract metricKeys to use as a stable dependency
  const metricKeys = currentConfig.metricKeys;

  useEffect(() => {
    if (!patientId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const intervalMap = { 'DAY': '24h', 'WEEK': '7d', 'MONTH': '30d' };
        const interval = intervalMap[filterTab];

        if (metric === 'bp-trend') {
          const [sysRes, diaRes] = await Promise.all([
            patientService.getSharedMetricHistory(Number(patientId), 'bp_systolic', { interval }),
            patientService.getSharedMetricHistory(Number(patientId), 'bp_diastolic', { interval })
          ]);
          
          if (sysRes.success && diaRes.success) {
            const sysList = sysRes.data || [];
            const diaList = diaRes.data || [];
            
            const merged = sysList.map((sItem) => {
              const dItem = diaList.find(d => d.timestamp === sItem.timestamp) || {};
              return {
                timestamp: sItem.timestamp,
                systolic: sItem.value ? Math.round(sItem.value) : '--',
                diastolic: dItem.value ? Math.round(dItem.value) : '--',
              };
            }).reverse();

            setBpData(merged);
            if (merged.length > 0) {
              setLatestReading(merged[0]);
            } else {
              setLatestReading(null);
            }
          }
        } else {
          const mKey = metricKeys[0];
          const res = await patientService.getSharedMetricHistory(Number(patientId), mKey, { interval });
          if (res.success) {
            const list = (res.data || []).map(item => ({
              timestamp: item.timestamp,
              value: item.value ? Math.round(item.value) : '--'
            })).reverse();

            setData(list);
            if (list.length > 0) {
              setLatestReading(list[0]);
            } else {
              setLatestReading(null);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching detail data", error);
      }
      setLoading(false);
    };

    fetchData();
  }, [patientId, metric, filterTab, metricKeys]);

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-[#111113] font-sans pb-10" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* App Bar */}
      <div className="flex items-center gap-4 p-5 pt-8 sticky top-0 bg-[#111113] z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
          <ArrowLeft />
        </button>
        <h1 className="text-[20px] font-bold text-white">{currentConfig.title}</h1>
      </div>

      <div className="px-5 flex flex-col gap-5">
        
        {/* Main Value Card */}
        <div className="bg-[#1E1E20] rounded-[24px] p-6 flex flex-col items-center">
          {metric === 'bp-trend' ? (
            <>
              <div className="text-[48px] font-bold leading-tight" style={{ color: currentConfig.color, textShadow: `0 0 16px ${currentConfig.color}40` }}>
                {latestReading ? `${latestReading.systolic}/${latestReading.diastolic}` : '--/--'}
              </div>
              <p className="text-[14px] text-white/40 font-medium mb-3">{currentConfig.unit}</p>
              
              <div className="flex items-center justify-center gap-12 w-full mt-2">
                <div className="flex flex-col items-center">
                  <span className="text-[18px] font-bold text-[#A855F7]">{latestReading?.systolic || '--'}</span>
                  <span className="text-[12px] text-white/40 font-medium">Systolic</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[18px] font-bold text-[#A855F7]">{latestReading?.diastolic || '--'}</span>
                  <span className="text-[12px] text-white/40 font-medium">Diastolic</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="text-[48px] font-bold leading-tight" style={{ color: currentConfig.color, textShadow: `0 0 16px ${currentConfig.color}40` }}>
                {latestReading?.value || '--'}
              </div>
              <p className="text-[14px] text-white/40 font-medium">{currentConfig.unit}</p>
            </>
          )}
        </div>

        {/* Time Toggles */}
        <div className="flex items-center justify-center gap-2 my-2">
          {['DAY', 'WEEK', 'MONTH'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-5 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                filterTab === tab
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'bg-[#1E1E20] text-white/30 border border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* History List */}
        <div>
          <h3 className="text-[14px] font-medium text-white/40 mb-3 ml-1">
            {filterTab === 'DAY' ? 'Today' : filterTab === 'WEEK' ? 'This Week' : 'This Month'}
          </h3>
          
          <div className="flex flex-col gap-2.5">
            {loading ? (
              <div className="flex justify-center p-10">
                <div className="size-8 rounded-full border-4 border-white/10 border-t-[#CCA166] animate-spin" />
              </div>
            ) : metric === 'bp-trend' && bpData.length > 0 ? (
              bpData.map((item, idx) => (
                <div key={idx} className="bg-[#2F2F31] rounded-[16px] p-4 flex items-center justify-between">
                  <span className="text-[16px] font-bold" style={{ color: currentConfig.color }}>
                    {item.systolic}/{item.diastolic} <span className="text-white/40 text-[13px] font-medium ml-1">mmHg</span>
                  </span>
                  <span className="text-[13px] text-white/40 font-medium">{formatTime(item.timestamp)}</span>
                </div>
              ))
            ) : metric !== 'bp-trend' && data.length > 0 ? (
              data.map((item, idx) => (
                <div key={idx} className="bg-[#2F2F31] rounded-[16px] p-4 flex items-center justify-between">
                  <span className="text-[16px] font-bold" style={{ color: currentConfig.color }}>
                    {item.value} <span className="text-white/40 text-[13px] font-medium ml-1">{currentConfig.unit}</span>
                  </span>
                  <span className="text-[13px] text-white/40 font-medium">{formatTime(item.timestamp)}</span>
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-white/30 text-sm">No data available.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
