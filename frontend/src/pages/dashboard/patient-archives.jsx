import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import MainBody from '@/components/dashboard/main-body'
import Footer from '@/components/dashboard/footer'
import { Link } from 'react-router-dom'
import { Angle, Download, Eye } from '@/utilities/icons'
import Input from '@/components/ui/input'
import Checkbox from '@/components/ui/checkbox'
import Dropdown from '@/components/ui/dropdown'
import DatePicker from '@/components/ui/date-picker';
import { patientService } from '@/services/patientService';

export default function PatientArchives() {
    const [quick_filter, set_quick_filter] = useState(true)
    const [doctors, setDoctors] = useState([]);

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                // Fetch the logged-in user profile to get org_id
                const profileRes = await patientService.getUserProfile();
                const orgId = profileRes?.data?.organization_id;

                if (!orgId) {
                    console.error('Could not determine organization_id for archives doctor filter');
                    return;
                }

                const response = await patientService.getDoctors(orgId);
                if (response.success && Array.isArray(response.data)) {
                    setDoctors(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch doctors for archives filter:', error);
            }
        };
        fetchDoctors();
    }, []);

    const TableHeading = [
        "Patient Name", "UHID", "Ward / Bed", "Monitoring Start", "Monitoring End", "Duration", "Final NEWS2", "Action"
    ]

    const [archivedPatients, setArchivedPatients] = useState([]);
    const [loadingArchives, setLoadingArchives] = useState(false);

    useEffect(() => {
        const fetchArchives = async () => {
            setLoadingArchives(true);
            try {
                // Placeholder for future backend integration
                // const response = await patientService.getArchivedPatients();
                // if (response.success) setArchivedPatients(response.data);
                setArchivedPatients([]); 
            } catch (error) {
                console.error('Failed to fetch archived patients:', error);
            } finally {
                setLoadingArchives(false);
            }
        };
        fetchArchives();
    }, []);

    return (
        <>
            <MainBody>
                <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4 mb-4 lg:mb-5 xl:mb-6">
                    <div className="flex items-center gap-3 lg:gap-4">
                        <Link to="/dashboard/home" className='size-12 lg:size-14 rounded-full bg-[#373739] flex items-center flex-[0_0_auto] justify-center'>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9.71297 6L4 12L9.71297 18" stroke="white" strokeWidth="1.2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M20.0002 12H4.16016" stroke="white" strokeWidth="1.2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </Link>
                        <div>
                            <h2 className='text-xl lg:text-2xl font-medium leading-none text-white mb-1'>Patient Archives</h2>
                            <p className='text-xs md:text-sm leading-none text-white'>Discharged / Ended Monitoring Records</p>
                        </div>
                    </div>
                    <button className='flex items-center gap-2 bg-secondary/8 hover:bg-primary text-white border border-solid border-secondary/35 rounded-full px-6 min-h-12'> <Download className='size-5 lg:size-6' /> Download PDF</button>
                </div>
                <div className="bg-[#2F2F31] rounded-xl md:rounded-2xl lg:rounded-3xl mb-4 md:mb-5 lg:mb-6">
                    <Input
                        className='py-5 lg:py-6 px-5 lg:px-6'
                        label="Search archived patients"
                        placeholder="Name, UHID, or bed number..."
                        inputClass='pl-15! min-h-12 lg:min-h-16 bg-white/10!'
                        leftIcon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.501 20.9995C16.7477 20.9995 21.001 16.7462 21.001 11.4995C21.001 6.25281 16.7477 1.99951 11.501 1.99951C6.25427 1.99951 2.00098 6.25281 2.00098 11.4995C2.00098 16.7462 6.25427 20.9995 11.501 20.9995Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M22.001 21.9995L20.001 19.9995" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        }
                    />
                    <div className="w-full">
                        <button onClick={() => set_quick_filter((prev) => !prev)} className={`bg-white/14 w-full py-4 px-5 lg:px-6 cursor-pointer flex items-center justify-between ${quick_filter ? 'rounded-b-none' : 'rounded-b-xl md:rounded-b-2xl lg:rounded-b-3xl'}`}>
                            <span className='text-white text-sm md:text-base leading-none'>Quick Filters</span>
                            <span className={`flex-none ${quick_filter ? '-scale-y-100' : 'scale-y-100'}`}>
                                <Angle className='size-5 rotate-90' />
                            </span>
                        </button>
                        <AnimatePresence>
                            {quick_filter && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 md:p-6">
                                        <DatePicker
                                            label="Monitoring End (From)"
                                            placeholder="mm / dd / yyyyy"
                                        />
                                        <DatePicker
                                            label="Monitoring End (To)"
                                            placeholder="mm / dd / yyyyy"
                                        />
                                        <Dropdown
                                            label="Ward"
                                            items={[{ name: 'ICU' }, { name: 'CPU' }, { name: 'HDU' }, { name: 'General' }]}
                                            placeholder={'All Words'}
                                        />
                                        <Dropdown
                                            label="Doctor"
                                            items={[
                                                { name: 'All Doctors' },
                                                ...doctors.map(d => ({ name: d.full_name }))
                                            ]}
                                            placeholder={'All Doctors'}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                <div className="bg-[#2F2F31] rounded-xl md:rounded-2xl lg:rounded-3xl p-4 lg:p-5 xl:p-6">
                    <div className="mx-auto overflow-hidden rounded-lg lg:rounded-xl mb-3 lg:mb-4">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-max text-left">
                                <thead className="bg-[#3E3E41] ">
                                    <tr>
                                        <th className="p-3 lg:p-4 rounded-l-xl">
                                            <Checkbox id={20} />
                                        </th>
                                        {TableHeading.map((item, idx) => <th key={idx} className={` last:rounded-r-xl! p-3 lg:p-4 text-sm md:text-base text-white leading-none font-normal`}>{item}</th>)}

                                    </tr>
                                </thead>
                                <tbody>
                                    {archivedPatients.length > 0 ? (
                                        archivedPatients.map((patient, index) => (
                                            <tr key={index} className="hover:bg-[#3E3E41] transition-colors duration-300">
                                                <td className="p-3 lg:p-4 rounded-l-xl">
                                                    <Checkbox id={index + 1} />
                                                </td>
                                                <td className="p-3 lg:p-4 text-sm md:text-base leading-none font-medium text-white">{patient.name}</td>
                                                <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white">{patient.uhid}</td>
                                                <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white">{patient.ward}</td>
                                                <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white">{patient.monitoringStart}</td>
                                                <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white">{patient.monitoringEnd}</td>
                                                <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white">{patient.duration}</td>
                                                <td className={`p-3 lg:p-4 text-sm md:text-base leading-none text-white font-semibold`}>
                                                    {patient.risk}
                                                </td>
                                                <td className="p-3 lg:p-4 text-center rounded-r-xl w-20 lg:w-30">
                                                    <div className="flex items-center  gap-4 lg:gap-5">
                                                        <button className='text-para hover:text-primary'>
                                                            <Download className='size-5 lg:size-6' />
                                                        </button>
                                                        <button className='text-para hover:text-primary'>
                                                            <Eye className='size-4 lg:size-6' />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={TableHeading.length + 1} className="p-10 text-center text-para italic">
                                                {loadingArchives ? "Loading records..." : "No archived patient records found."}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="w-full h-px border-g mb-3 lg:mb-4"></div>
                    <div className="flex items-center justify-between">
                        <button className='bg-[#FFFFFF14] rounded-[10px] text-white text-sm md:text-base leading-none flex items-center justify-center min-h-10 min-w-22.5' >1 Page</button>
                        <div className="flex items-center gap-5 lg:gap-6 xl:gap-8">
                            <button className='bg-[#CCA16614] border border-[#CCA16659] rounded-[10px] text-white text-sm md:text-base leading-none flex items-center justify-center min-h-10 min-w-22.5' >1 Page</button>
                            <div className="flex items-center gap-2">
                                <button className='bg-[#CCA16614] border border-[#CCA16659] hover:bg-primary rounded-[10px]  flex items-center justify-center min-h-10 min-w-12'>
                                    <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M6.75 12.75L1.2382 7.81061C0.587267 7.22727 0.587267 6.27273 1.2382 5.68939L6.75 0.75" stroke="white" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <button className='bg-[#CCA16614] border border-[#CCA16659] hover:bg-primary rounded-[10px]  flex items-center justify-center min-h-10 min-w-12'>
                                    <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M0.75 12.75L6.2618 7.81061C6.91273 7.22727 6.91273 6.27273 6.2618 5.68939L0.75 0.75" stroke="white" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </MainBody>
            <Footer />
        </>
    )
}
