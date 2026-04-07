import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { patientService } from '@/services/patientService'

export default function TopTitle({ className = "mb-4 md:mb-6", title, children, des = true, patientName, userId, room }) {
    const navigate = useNavigate();
    const { userId: paramUserId } = useParams();
    const [patientInfo, setPatientInfo] = useState(null);

    useEffect(() => {
        const fetchPatientInfo = async () => {
            const id = userId || paramUserId;
            if (!id) return;

            try {
                const response = await patientService.getPatientById(id);
                if (response.success && response.data) {
                    setPatientInfo({
                        userId: response.data.patient_id || response.data.id, 
                        patientName: response.data.full_name || 'Unknown Patient',
                        room: response.data.room_no || 'N/A'
                    });
                }
            } catch (error) {
                console.error('Failed to fetch patient info:', error);
            }
        };

        fetchPatientInfo();
    }, [userId, paramUserId]);

    const displayName = patientName || patientInfo?.patientName || 'Unknown Patient';
    const displayId = userId || paramUserId || patientInfo?.userId || 'N/A';
    const displayRoom = room || patientInfo?.room || 'N/A';

    return (
        <div className={`flex items-center flex-wrap justify-between gap-4 ${className}`}>
            <div className="flex items-center flex-wrap gap-4">
                <button onClick={() => navigate(-1)} className='size-12 lg:size-15 flex items-center justify-center text-white bg-[#373739] hover:bg-primary/20 shadow-[0px_4px_50px_0px_rgba(0,0,0,.08)] rounded-full'>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9.71297 6L4 12L9.71297 18" stroke="currentColor" strokeWidth="1.2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M20.0002 12H4.16016" stroke="currentColor" strokeWidth="1.2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div className="flex flex-col gap-y-1">
                    <h4 className='text-xl lg:text-2xl'>{title}</h4>
                    {des &&
                        <div className="flex items-center gap-2">
                            <p className='text-sm text-para'>{displayName}</p>
                            <span className='flex items-center gap-2 min-h-6.5 rounded-full bg-white/8 px-3 text-sm text-white'>
                                <span>ID: {displayId}</span>
                                <span className='block size-1 bg-para rounded-full'></span>
                                <span>{displayRoom}</span>
                            </span>
                        </div>
                    }
                </div>
            </div>
            {children ? children :
                <button className='flex items-center gap-2 bg-secondary/8 hover:bg-primary text-white border border-solid border-secondary/35 rounded-full px-6 min-h-12'>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16.6716 9.07812C20.4551 9.39607 22 11.2935 22 15.4472V15.5806C22 20.1651 20.1188 22.0009 15.4209 22.0009H8.57909C3.88124 22.0009 2 20.1651 2 15.5806V15.4472C2 11.3242 3.52391 9.42684 7.24435 9.08838" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12.0039 2V15.21" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M15.522 12.9238L12.0012 16.3597L8.48047 12.9238" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg> Download PDF
                </button>
            }
        </div>
    )
}
