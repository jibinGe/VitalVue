import React, { useState, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import MainBody from '@/components/dashboard/main-body'
import Footer from '@/components/dashboard/footer'
import { Link } from 'react-router-dom'
import { Angle, Download, Eye } from '@/utilities/icons'
import Input from '@/components/ui/input'
import Checkbox from '@/components/ui/checkbox'
import Dropdown from '@/components/ui/dropdown'
import DatePicker from '@/components/ui/date-picker'
import { patientService } from '@/services/patientService'
import UnarchivePatientModal from '@/components/dashboard/UnarchivePatientModal'

export default function PatientArchives() {
    const [quick_filter, set_quick_filter] = useState(true)
    const [doctors, setDoctors] = useState([])

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState('')
    const [monitoringFrom, setMonitoringFrom] = useState(null)
    const [monitoringTo, setMonitoringTo] = useState(null)
    const [selectedWard, setSelectedWard] = useState('All Wards')
    const [selectedDoctor, setSelectedDoctor] = useState('All Doctors')

    // Table and pagination states
    const [archivedPatients, setArchivedPatients] = useState([])
    const [loadingArchives, setLoadingArchives] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const pageSize = 10
    const [selectedIds, setSelectedIds] = useState(new Set())

    // Modal states
    const [unarchiveModalOpen, setUnarchiveModalOpen] = useState(false)
    const [selectedPatient, setSelectedPatient] = useState(null)
    const [selectedPatientId, setSelectedPatientId] = useState(null)
    const [selectedPatientName, setSelectedPatientName] = useState(null)
    const [refreshTrigger, setRefreshTrigger] = useState(0)

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

    useEffect(() => {
        const fetchArchives = async () => {
            setLoadingArchives(true);
            try {
                const response = await patientService.getLifecycleRegistry({ limit: 100 });
                if (response.success && response.data?.patients) {
                    const formattedData = response.data.patients.map(p => {
                        const start = p.created_at ? new Date(p.created_at) : null;
                        const end = p.discharged_at ? new Date(p.discharged_at) : null;
                        const validStart = start && !isNaN(start.getTime()) ? start : null;
                        const validEnd = end && !isNaN(end.getTime()) ? end : null;
                        
                        let duration = "-";
                        if (validStart && validEnd) {
                            const diffMs = validEnd - validStart;
                            if (diffMs > 0) {
                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                duration = diffDays > 0 ? `${diffDays}d ${diffHours}h` : `${diffHours}h`;
                            }
                        }

                        const docName = p.doctor_name || p.assigned_doctor?.full_name || (p.doctor_id && doctors.find(d => d.id === p.doctor_id)?.full_name) || "-";

                        return {
                            id: p.id,
                            userId: p.user_id,
                            name: p.full_name || "Unknown",
                            uhid: p.user_id || "-",
                            ward: p.room_no || "-",
                            doctorName: docName,
                            doctorId: p.doctor_id || null,
                            monitoringStart: validStart ? validStart.toLocaleString() : "-",
                            monitoringEnd: validEnd ? validEnd.toLocaleString() : "-",
                            startDate: validStart,
                            endDate: validEnd,
                            duration: duration,
                            risk: p.archive_status || "-",
                            raw: p
                        };
                    });
                    setArchivedPatients(formattedData);
                } else {
                    setArchivedPatients([]);
                }
            } catch (error) {
                console.error('Failed to fetch archived patients:', error);
                setArchivedPatients([]);
            } finally {
                setLoadingArchives(false);
            }
        };
        fetchArchives();
    }, [refreshTrigger, doctors]);

    // Build dynamic options for Ward
    const wardOptions = useMemo(() => {
        const standard = ['All Wards', 'ICU', 'CPU', 'HDU', 'General'];
        const extracted = new Set();
        archivedPatients.forEach(p => {
            if (p.ward && p.ward !== '-' && p.ward !== 'Discharged/No Room' && !standard.includes(p.ward)) {
                extracted.add(p.ward);
            }
        });
        return [...standard, ...Array.from(extracted)].map(name => ({ name }));
    }, [archivedPatients]);

    // Build dynamic options for Doctor
    const doctorOptions = useMemo(() => {
        const list = [{ name: 'All Doctors' }];
        doctors.forEach(d => {
            if (d.full_name && !list.some(item => item.name.toLowerCase() === d.full_name.toLowerCase())) {
                list.push({ name: d.full_name, id: d.id });
            }
        });
        archivedPatients.forEach(p => {
            if (p.doctorName && p.doctorName !== '-' && !list.some(item => item.name.toLowerCase() === p.doctorName.toLowerCase())) {
                list.push({ name: p.doctorName });
            }
        });
        return list;
    }, [doctors, archivedPatients]);

    // Compute active filter count
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (searchQuery.trim()) count++;
        if (monitoringFrom) count++;
        if (monitoringTo) count++;
        if (selectedWard && selectedWard !== 'All Wards') count++;
        if (selectedDoctor && selectedDoctor !== 'All Doctors') count++;
        return count;
    }, [searchQuery, monitoringFrom, monitoringTo, selectedWard, selectedDoctor]);

    // Reset all filters
    const handleResetFilters = () => {
        setSearchQuery('');
        setMonitoringFrom(null);
        setMonitoringTo(null);
        setSelectedWard('All Wards');
        setSelectedDoctor('All Doctors');
        setCurrentPage(1);
    };

    // Filtered patients
    const filteredPatients = useMemo(() => {
        return archivedPatients.filter(patient => {
            // 1. Search Query (Name, UHID, Ward / Bed, Doctor)
            if (searchQuery.trim()) {
                const q = searchQuery.trim().toLowerCase();
                const matchName = patient.name?.toLowerCase().includes(q);
                const matchUhid = patient.uhid?.toString().toLowerCase().includes(q);
                const matchWard = patient.ward?.toLowerCase().includes(q);
                const matchDoctor = patient.doctorName && patient.doctorName !== '-' && patient.doctorName.toLowerCase().includes(q);
                if (!matchName && !matchUhid && !matchWard && !matchDoctor) {
                    return false;
                }
            }

            // 2. Monitoring From (Start of selected day: 00:00:00)
            if (monitoringFrom) {
                const fromDate = new Date(monitoringFrom);
                fromDate.setHours(0, 0, 0, 0);
                const fromTime = fromDate.getTime();

                const pStartTime = patient.startDate ? patient.startDate.getTime() : null;
                const pEndTime = patient.endDate ? patient.endDate.getTime() : null;
                const compareTime = pEndTime || pStartTime;

                if (compareTime && compareTime < fromTime) {
                    return false;
                }
            }

            // 3. Monitoring To (End of selected day: 23:59:59)
            if (monitoringTo) {
                const toDate = new Date(monitoringTo);
                toDate.setHours(23, 59, 59, 999);
                const toTime = toDate.getTime();

                const pStartTime = patient.startDate ? patient.startDate.getTime() : null;
                if (pStartTime && pStartTime > toTime) {
                    return false;
                }
            }

            // 4. Ward Filter
            if (selectedWard && selectedWard !== 'All Wards') {
                const wardStr = (patient.ward || '').toLowerCase();
                const filterWard = selectedWard.toLowerCase();
                if (!wardStr.includes(filterWard)) {
                    return false;
                }
            }

            // 5. Doctor Filter
            if (selectedDoctor && selectedDoctor !== 'All Doctors') {
                const docStr = (patient.doctorName || '').toLowerCase();
                const filterDoc = selectedDoctor.toLowerCase();
                if (!docStr.includes(filterDoc) || patient.doctorName === '-') {
                    return false;
                }
            }

            return true;
        });
    }, [archivedPatients, searchQuery, monitoringFrom, monitoringTo, selectedWard, selectedDoctor]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    const paginatedPatients = useMemo(() => {
        const startIdx = (safeCurrentPage - 1) * pageSize;
        return filteredPatients.slice(startIdx, startIdx + pageSize);
    }, [filteredPatients, safeCurrentPage, pageSize]);

    // Selection handlers
    const isAllSelected = paginatedPatients.length > 0 && paginatedPatients.every(p => selectedIds.has(p.id || p.userId));

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(prev => {
                const next = new Set(prev);
                paginatedPatients.forEach(p => next.delete(p.id || p.userId));
                return next;
            });
        } else {
            setSelectedIds(prev => {
                const next = new Set(prev);
                paginatedPatients.forEach(p => next.add(p.id || p.userId));
                return next;
            });
        }
    };

    const handleToggleSelectRow = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Download PDF for entire filtered dataset
    const handleDownloadPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            window.print();
            return;
        }
        const rowsHtml = filteredPatients.map(p => `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>${p.uhid}</td>
                <td>${p.ward}</td>
                <td>${p.doctorName || "-"}</td>
                <td>${p.monitoringStart}</td>
                <td>${p.monitoringEnd}</td>
                <td>${p.duration}</td>
                <td>${p.risk}</td>
            </tr>
        `).join('');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>VitalVue - Patient Archives Report</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; }
                    h1 { font-size: 20px; margin-bottom: 4px; color: #1a1a1c; }
                    p { font-size: 12px; color: #666; margin-top: 0; margin-bottom: 16px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
                    th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: 600; }
                    tr:nth-child(even) { background-color: #fafafa; }
                </style>
            </head>
            <body>
                <h1>VitalVue — Patient Archives Report</h1>
                <p>Generated on ${new Date().toLocaleString()} | Total Records: ${filteredPatients.length}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Patient Name</th>
                            <th>UHID</th>
                            <th>Ward / Bed</th>
                            <th>Doctor</th>
                            <th>Monitoring Start</th>
                            <th>Monitoring End</th>
                            <th>Duration</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    // Download summary for a single patient record
    const handleDownloadSinglePatient = (patient) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            window.print();
            return;
        }
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>VitalVue - Patient Summary: ${patient.name}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #111; line-height: 1.5; }
                    h1 { font-size: 22px; margin-bottom: 4px; color: #1a1a1c; }
                    .meta { font-size: 13px; color: #666; margin-bottom: 24px; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
                    .item { border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px; background: #fafafa; }
                    .label { font-size: 11px; text-transform: uppercase; color: #777; font-weight: 600; margin-bottom: 4px; }
                    .value { font-size: 15px; font-weight: 500; color: #222; }
                </style>
            </head>
            <body>
                <h1>Archived Patient Summary</h1>
                <div class="meta">Generated: ${new Date().toLocaleString()} | VitalVue Clinical Lifecycle</div>
                <div class="grid">
                    <div class="item"><div class="label">Patient Name</div><div class="value">${patient.name}</div></div>
                    <div class="item"><div class="label">UHID / Patient ID</div><div class="value">${patient.uhid}</div></div>
                    <div class="item"><div class="label">Ward / Bed</div><div class="value">${patient.ward}</div></div>
                    <div class="item"><div class="label">Assigned Doctor</div><div class="value">${patient.doctorName || "N/A"}</div></div>
                    <div class="item"><div class="label">Monitoring Started</div><div class="value">${patient.monitoringStart}</div></div>
                    <div class="item"><div class="label">Monitoring Ended</div><div class="value">${patient.monitoringEnd}</div></div>
                    <div class="item"><div class="label">Total Stay Duration</div><div class="value">${patient.duration}</div></div>
                    <div class="item"><div class="label">Archive Status</div><div class="value">${patient.risk}</div></div>
                </div>
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

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
                    <button
                        type="button"
                        onClick={handleDownloadPDF}
                        className='flex items-center gap-2 bg-secondary/8 hover:bg-primary text-white border border-solid border-secondary/35 rounded-full px-6 min-h-12 cursor-pointer transition-colors'
                    >
                        <Download className='size-5 lg:size-6' /> Download PDF
                    </button>
                </div>
                <div className="bg-[#2F2F31] rounded-xl md:rounded-2xl lg:rounded-3xl mb-4 md:mb-5 lg:mb-6">
                    <Input
                        className='py-5 lg:py-6 px-5 lg:px-6'
                        label="Search archived patients"
                        placeholder="Name, UHID, or bed number..."
                        inputClass='pl-15! min-h-12 lg:min-h-16 bg-white/10!'
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        leftIcon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11.501 20.9995C16.7477 20.9995 21.001 16.7462 21.001 11.4995C21.001 6.25281 16.7477 1.99951 11.501 1.99951C6.25427 1.99951 2.00098 6.25281 2.00098 11.4995C2.00098 16.7462 6.25427 20.9995 11.501 20.9995Z" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M22.001 21.9995L20.001 19.9995" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        }
                        rightIcon={
                            searchQuery ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setCurrentPage(1);
                                    }}
                                    className="size-7 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer mr-2 text-xs"
                                    title="Clear search"
                                >
                                    ✕
                                </button>
                            ) : null
                        }
                    />
                    <div className="w-full">
                        <div className={`bg-white/14 w-full py-4 px-5 lg:px-6 flex items-center justify-between ${quick_filter ? 'rounded-b-none' : 'rounded-b-xl md:rounded-b-2xl lg:rounded-b-3xl'}`}>
                            <button
                                type="button"
                                onClick={() => set_quick_filter((prev) => !prev)}
                                className="flex items-center gap-3 cursor-pointer flex-1 text-left"
                            >
                                <span className='text-white text-sm md:text-base leading-none font-medium'>Quick Filters</span>
                                {activeFilterCount > 0 && (
                                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/25 border border-primary/40 text-white font-medium">
                                        {activeFilterCount} Active
                                    </span>
                                )}
                            </button>
                            <div className="flex items-center gap-3">
                                {activeFilterCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleResetFilters();
                                        }}
                                        className="text-xs text-[#CCA166] hover:text-white underline cursor-pointer transition-colors"
                                    >
                                        Reset All
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => set_quick_filter((prev) => !prev)}
                                    className={`flex-none text-white cursor-pointer ${quick_filter ? '-scale-y-100' : 'scale-y-100'} transition-transform duration-200`}
                                >
                                    <Angle className='size-5 rotate-90' />
                                </button>
                            </div>
                        </div>
                        <AnimatePresence>
                            {quick_filter && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-visible"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 md:p-6 bg-white/5 rounded-b-xl md:rounded-b-2xl lg:rounded-b-3xl">
                                        <DatePicker
                                            label="Monitoring From"
                                            placeholder="yyyy-mm-dd"
                                            selected={monitoringFrom}
                                            onChange={(date) => {
                                                setMonitoringFrom(date);
                                                setCurrentPage(1);
                                            }}
                                            isClearable={true}
                                        />
                                        <DatePicker
                                            label="Monitoring To"
                                            placeholder="yyyy-mm-dd"
                                            selected={monitoringTo}
                                            onChange={(date) => {
                                                setMonitoringTo(date);
                                                setCurrentPage(1);
                                            }}
                                            isClearable={true}
                                        />
                                        <Dropdown
                                            label="Ward"
                                            value={selectedWard}
                                            items={wardOptions}
                                            placeholder="All Wards"
                                            onSelect={(item) => {
                                                setSelectedWard(item.name);
                                                setCurrentPage(1);
                                            }}
                                        />
                                        <Dropdown
                                            label="Doctor"
                                            value={selectedDoctor}
                                            items={doctorOptions}
                                            placeholder="All Doctors"
                                            onSelect={(item) => {
                                                setSelectedDoctor(item.name);
                                                setCurrentPage(1);
                                            }}
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
                                <thead className="bg-[#3E3E41]">
                                    <tr>
                                        <th className="p-3 lg:p-4 rounded-l-xl">
                                            <Checkbox
                                                id="archive-select-all"
                                                checked={isAllSelected}
                                                onChange={handleToggleSelectAll}
                                            />
                                        </th>
                                        {TableHeading.map((item, idx) => (
                                            <th key={idx} className="last:rounded-r-xl! p-3 lg:p-4 text-sm md:text-base text-white leading-none font-normal">
                                                {item}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedPatients.length > 0 ? (
                                        paginatedPatients.map((patient, index) => {
                                            const patientKey = patient.id || patient.userId || index;
                                            const isChecked = selectedIds.has(patient.id || patient.userId);

                                            return (
                                                <tr key={patientKey} className="hover:bg-[#3E3E41] transition-colors duration-300">
                                                    <td className="p-3 lg:p-4 rounded-l-xl">
                                                        <Checkbox
                                                            id={`archive-row-${patientKey}`}
                                                            checked={isChecked}
                                                            onChange={() => handleToggleSelectRow(patient.id || patient.userId)}
                                                        />
                                                    </td>
                                                    <td className="p-3 lg:p-4 text-sm md:text-base leading-none font-medium text-white">{patient.name}</td>
                                                    <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white">{patient.uhid}</td>
                                                    <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white">{patient.ward}</td>
                                                    <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white">{patient.monitoringStart}</td>
                                                    <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white">{patient.monitoringEnd}</td>
                                                    <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white">{patient.duration}</td>
                                                    <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white font-semibold">
                                                        <span className="capitalize">{patient.risk}</span>
                                                    </td>
                                                    <td className="p-3 lg:p-4 text-center rounded-r-xl w-20 lg:w-30">
                                                        <div className="flex items-center gap-4 lg:gap-5">
                                                            <button
                                                                type="button"
                                                                className="text-para hover:text-primary transition-colors cursor-pointer"
                                                                title="Download Patient Summary"
                                                                onClick={() => handleDownloadSinglePatient(patient)}
                                                            >
                                                                <Download className='size-5 lg:size-6' />
                                                            </button>
                                                            <Link
                                                                to={`/dashboard/overview/${patient.userId || patient.id}`}
                                                                className="text-para hover:text-primary transition-colors inline-flex items-center justify-center"
                                                                title="View Patient Overview"
                                                            >
                                                                <Eye className='size-4 lg:size-6' />
                                                            </Link>
                                                            <button
                                                                type="button"
                                                                className='text-para hover:text-[#4DE573] transition-colors cursor-pointer'
                                                                title="Unarchive Patient"
                                                                onClick={() => {
                                                                    setSelectedPatient(patient);
                                                                    setSelectedPatientId(patient.id || patient.userId);
                                                                    setSelectedPatientName(patient.name);
                                                                    setUnarchiveModalOpen(true);
                                                                }}
                                                            >
                                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                                                    <path d="M3 3v5h5" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={TableHeading.length + 1} className="p-10 text-center text-para">
                                                {loadingArchives ? (
                                                    <div className="flex items-center justify-center gap-3 py-6">
                                                        <svg className="animate-spin size-6 text-primary" viewBox="0 0 24 24" fill="none">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                                        </svg>
                                                        <span className="text-white text-base">Loading archived records...</span>
                                                    </div>
                                                ) : archivedPatients.length === 0 ? (
                                                    <div className="py-6 italic">
                                                        No archived patient records found.
                                                    </div>
                                                ) : (
                                                    <div className="py-6">
                                                        <p className="text-white text-base font-medium mb-1">No matching archived patients found</p>
                                                        <p className="text-sm text-para mb-4">No records match your active search or filter criteria.</p>
                                                        <button
                                                            type="button"
                                                            onClick={handleResetFilters}
                                                            className="px-4 py-2 text-xs md:text-sm bg-primary hover:bg-primary/80 text-white rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            Clear All Filters
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="w-full h-px border-g mb-3 lg:mb-4"></div>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className='bg-[#FFFFFF14] rounded-[10px] text-white text-sm md:text-base leading-none flex items-center justify-center min-h-10 px-4'>
                            Showing {filteredPatients.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1} - {Math.min(safeCurrentPage * pageSize, filteredPatients.length)} of {filteredPatients.length} records
                        </div>
                        <div className="flex items-center gap-4 lg:gap-6">
                            <span className='bg-[#CCA16614] border border-[#CCA16659] rounded-[10px] text-white text-sm md:text-base leading-none flex items-center justify-center min-h-10 px-4'>
                                Page {safeCurrentPage} of {totalPages}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={safeCurrentPage <= 1}
                                    aria-label="Previous Page"
                                    className='bg-[#CCA16614] border border-[#CCA16659] hover:bg-primary disabled:opacity-30 disabled:hover:bg-[#CCA16614] disabled:cursor-not-allowed cursor-pointer rounded-[10px] flex items-center justify-center min-h-10 min-w-12 transition-colors'
                                >
                                    <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M6.75 12.75L1.2382 7.81061C0.587267 7.22727 0.587267 6.27273 1.2382 5.68939L6.75 0.75" stroke="white" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={safeCurrentPage >= totalPages}
                                    aria-label="Next Page"
                                    className='bg-[#CCA16614] border border-[#CCA16659] hover:bg-primary disabled:opacity-30 disabled:hover:bg-[#CCA16614] disabled:cursor-not-allowed cursor-pointer rounded-[10px] flex items-center justify-center min-h-10 min-w-12 transition-colors'
                                >
                                    <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M0.75 12.75L6.2618 7.81061C6.91273 7.22727 6.91273 6.27273 6.2618 5.68939L0.75 0.75" stroke="white" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </MainBody>
            <UnarchivePatientModal
                isOpen={unarchiveModalOpen}
                onClose={() => {
                    setUnarchiveModalOpen(false);
                    setSelectedPatient(null);
                    setSelectedPatientId(null);
                    setSelectedPatientName(null);
                }}
                patient={selectedPatient || (selectedPatientId ? { id: selectedPatientId, name: selectedPatientName } : null)}
                onSuccess={() => {
                    setRefreshTrigger(prev => prev + 1);
                }}
            />
            <Footer />
        </>
    )
}
