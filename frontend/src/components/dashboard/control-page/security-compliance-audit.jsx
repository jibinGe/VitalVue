import React from 'react'
import { Download, Eye } from '../../../utilities/icons';
import Checkbox from '../../ui/checkbox'
import Alert from '../../ui/alert'
import { ShieldCheck } from 'lucide-react';

export default function SecurityComplianceAudit() {
    const items = [
        {
            title: 'Failed Attempts',
            value: '12',
        },
        {
            title: 'Total Logins',
            value: '8,432',
        },
        {
            title: 'Active Seasons',
            value: '2,341',
        },
        {
            title: 'Admin Actions',
            value: '17',
        },
    ]
    // table data
    const region_head = ["Region", "Framework", "Status", "Last Audit", "Next Review", "Action"]
    const region_data = [
        {
            region: 'Norte America',
            framework: 'GDPR',
            status: 'compliant',
            last_audit: '15 Nov 2025',
            next_review: '15 Nov 2026',
        },
        {
            region: 'Europe',
            framework: 'PDPA',
            status: 'compliant',
            last_audit: '14 Nov 2025',
            next_review: '15 Nov 2026',
        },
        {
            region: 'Asia Pacific',
            framework: 'HIPAA',
            status: 'pending',
            last_audit: '15 Nov 2025',
            next_review: '15 Nov 2026',
        },
        {
            region: 'Middle East',
            framework: 'HIPAA',
            status: 'compliant',
            last_audit: '15 Nov 2025',
            next_review: '15 Nov 2026',
        },
    ];

    const global_head = ["User", "Action", "Region", "Timestamp", "IP Address", "Action"]
    const global_data = [
        {
            user: 'sara.chen@vitalvue.com',
            action: 'Enable Region',
            region: 'Global',
            date_stamp: '15 Nov 2025',
            timestamp: '14:32:18',
            ip_address: '203.45.67.89',
        },
        {
            user: 'admin@vitalvue.com',
            action: 'Approved Hospital',
            region: 'Europe',
            date_stamp: '15 Nov 2025',
            timestamp: '14:32:18',
            ip_address: '203.45.67.89',
        },
        {
            user: 'yuki.paul@vitalvue.com',
            action: 'Update Feature Flag',
            region: 'Global',
            date_stamp: '15 Nov 2025',
            timestamp: '14:32:18',
            ip_address: '203.45.67.89',
        },
        {
            user: 'sara.chen@vitalvue.com',
            action: 'Accessed Audit Log',
            region: 'Asia Pacific',
            date_stamp: '15 Nov 2025',
            timestamp: '14:32:18',
            ip_address: '203.45.67.89',
        },
    ];

    const cards = [
        {
            info: 'Deployment Expansion',
            title: 'Hospitals',
            value: '742',
            des: `Avg growth: <span class="text-[#28D353]">+6.4% / month</span>`,
            icon: <svg width="258" height="24" viewBox="0 0 258 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 6H2C0.89543 6 0 6.89543 0 8V22C0 23.1046 0.89543 24 2 24H14C15.1046 24 16 23.1046 16 22V8C16 6.89543 15.1046 6 14 6Z" fill="#3B82F6" />
                <path d="M36 14H24C22.8954 14 22 14.9327 22 16.0833V21.9167C22 23.0673 22.8954 24 24 24H36C37.1046 24 38 23.0673 38 21.9167V16.0833C38 14.9327 37.1046 14 36 14Z" fill="#3B82F6" />
                <path d="M58 2H46C44.8954 2 44 2.91201 44 4.03704V21.963C44 23.088 44.8954 24 46 24H58C59.1046 24 60 23.088 60 21.963V4.03704C60 2.91201 59.1046 2 58 2Z" fill="#3B82F6" />
                <path d="M80 0H68C66.8954 0 66 0.89543 66 2V22C66 23.1046 66.8954 24 68 24H80C81.1046 24 82 23.1046 82 22V2C82 0.89543 81.1046 0 80 0Z" fill="#3B82F6" />
                <path d="M102 10H90C88.8954 10 88 10.8706 88 11.9444V22.0556C88 23.1294 88.8954 24 90 24H102C103.105 24 104 23.1294 104 22.0556V11.9444C104 10.8706 103.105 10 102 10Z" fill="#3B82F6" />
                <path d="M124 10H112C110.895 10 110 10.8706 110 11.9444V22.0556C110 23.1294 110.895 24 112 24H124C125.105 24 126 23.1294 126 22.0556V11.9444C126 10.8706 125.105 10 124 10Z" fill="#3B82F6" />
                <path d="M146 0H134C132.895 0 132 0.89543 132 2V22C132 23.1046 132.895 24 134 24H146C147.105 24 148 23.1046 148 22V2C148 0.89543 147.105 0 146 0Z" fill="#3B82F6" />
                <path d="M168 14H156C154.895 14 154 14.9327 154 16.0833V21.9167C154 23.0673 154.895 24 156 24H168C169.105 24 170 23.0673 170 21.9167V16.0833C170 14.9327 169.105 14 168 14Z" fill="#3B82F6" />
                <path d="M190 10H178C176.895 10 176 10.8706 176 11.9444V22.0556C176 23.1294 176.895 24 178 24H190C191.105 24 192 23.1294 192 22.0556V11.9444C192 10.8706 191.105 10 190 10Z" fill="#3B82F6" />
                <path d="M212 2H200C198.895 2 198 2.91201 198 4.03704V21.963C198 23.088 198.895 24 200 24H212C213.105 24 214 23.088 214 21.963V4.03704C214 2.91201 213.105 2 212 2Z" fill="#3B82F6" />
                <path d="M234 10H222C220.895 10 220 10.8706 220 11.9444V22.0556C220 23.1294 220.895 24 222 24H234C235.105 24 236 23.1294 236 22.0556V11.9444C236 10.8706 235.105 10 234 10Z" fill="#3B82F6" />
                <path d="M256 2H244C242.895 2 242 2.91201 242 4.03704V21.963C242 23.088 242.895 24 244 24H256C257.105 24 258 23.088 258 21.963V4.03704C258 2.91201 257.105 2 256 2Z" fill="#3B82F6" />
            </svg>,
        },
        {
            info: 'Daily Active Usage',
            title: 'Users',
            value: '2,720',
            des: 'Peak on Friday',
            icon: <svg width="258" height="24" viewBox="0 0 258 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 6H2C0.89543 6 0 6.89543 0 8V22C0 23.1046 0.89543 24 2 24H14C15.1046 24 16 23.1046 16 22V8C16 6.89543 15.1046 6 14 6Z" fill="#10B981" />
                <path d="M36 14H24C22.8954 14 22 14.9327 22 16.0833V21.9167C22 23.0673 22.8954 24 24 24H36C37.1046 24 38 23.0673 38 21.9167V16.0833C38 14.9327 37.1046 14 36 14Z" fill="#10B981" />
                <path d="M58 0H46C44.8954 0 44 0.89543 44 2V22C44 23.1046 44.8954 24 46 24H58C59.1046 24 60 23.1046 60 22V2C60 0.89543 59.1046 0 58 0Z" fill="#10B981" />
                <path d="M80 14H68C66.8954 14 66 14.9327 66 16.0833V21.9167C66 23.0673 66.8954 24 68 24H80C81.1046 24 82 23.0673 82 21.9167V16.0833C82 14.9327 81.1046 14 80 14Z" fill="#10B981" />
                <path d="M102 0H90C88.8954 0 88 0.89543 88 2V22C88 23.1046 88.8954 24 90 24H102C103.105 24 104 23.1046 104 22V2C104 0.89543 103.105 0 102 0Z" fill="#10B981" />
                <path d="M124 10H112C110.895 10 110 10.8706 110 11.9444V22.0556C110 23.1294 110.895 24 112 24H124C125.105 24 126 23.1294 126 22.0556V11.9444C126 10.8706 125.105 10 124 10Z" fill="#10B981" />
                <path d="M146 10H134C132.895 10 132 10.8706 132 11.9444V22.0556C132 23.1294 132.895 24 134 24H146C147.105 24 148 23.1294 148 22.0556V11.9444C148 10.8706 147.105 10 146 10Z" fill="#10B981" />
                <path d="M168 2H156C154.895 2 154 2.91201 154 4.03704V21.963C154 23.088 154.895 24 156 24H168C169.105 24 170 23.088 170 21.963V4.03704C170 2.91201 169.105 2 168 2Z" fill="#10B981" />
                <path d="M190 10H178C176.895 10 176 10.8706 176 11.9444V22.0556C176 23.1294 176.895 24 178 24H190C191.105 24 192 23.1294 192 22.0556V11.9444C192 10.8706 191.105 10 190 10Z" fill="#10B981" />
                <path d="M212 2H200C198.895 2 198 2.91201 198 4.03704V21.963C198 23.088 198.895 24 200 24H212C213.105 24 214 23.088 214 21.963V4.03704C214 2.91201 213.105 2 212 2Z" fill="#10B981" />
                <path d="M234 10H222C220.895 10 220 10.8706 220 11.9444V22.0556C220 23.1294 220.895 24 222 24H234C235.105 24 236 23.1294 236 22.0556V11.9444C236 10.8706 235.105 10 234 10Z" fill="#10B981" />
                <path d="M256 2H244C242.895 2 242 2.91201 242 4.03704V21.963C242 23.088 242.895 24 244 24H256C257.105 24 258 23.088 258 21.963V4.03704C258 2.91201 257.105 2 256 2Z" fill="#10B981" />
            </svg>,
        },
        {
            info: 'Weekly Engagement',
            title: 'Users',
            value: '9,680',
            des: 'Week-over-week increase',
            icon: <svg width="258" height="24" viewBox="0 0 258 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 6H2C0.89543 6 0 6.89543 0 8V22C0 23.1046 0.89543 24 2 24H14C15.1046 24 16 23.1046 16 22V8C16 6.89543 15.1046 6 14 6Z" fill="#FFBC38" />
                <path d="M36 14H24C22.8954 14 22 14.9327 22 16.0833V21.9167C22 23.0673 22.8954 24 24 24H36C37.1046 24 38 23.0673 38 21.9167V16.0833C38 14.9327 37.1046 14 36 14Z" fill="#FFBC38" />
                <path d="M58 0H46C44.8954 0 44 0.89543 44 2V22C44 23.1046 44.8954 24 46 24H58C59.1046 24 60 23.1046 60 22V2C60 0.89543 59.1046 0 58 0Z" fill="#FFBC38" />
                <path d="M80 14H68C66.8954 14 66 14.9327 66 16.0833V21.9167C66 23.0673 66.8954 24 68 24H80C81.1046 24 82 23.0673 82 21.9167V16.0833C82 14.9327 81.1046 14 80 14Z" fill="#FFBC38" />
                <path d="M102 10H90C88.8954 10 88 10.8706 88 11.9444V22.0556C88 23.1294 88.8954 24 90 24H102C103.105 24 104 23.1294 104 22.0556V11.9444C104 10.8706 103.105 10 102 10Z" fill="#FFBC38" />
                <path d="M124 2H112C110.895 2 110 2.91201 110 4.03704V21.963C110 23.088 110.895 24 112 24H124C125.105 24 126 23.088 126 21.963V4.03704C126 2.91201 125.105 2 124 2Z" fill="#FFBC38" />
                <path d="M146 10H134C132.895 10 132 10.8706 132 11.9444V22.0556C132 23.1294 132.895 24 134 24H146C147.105 24 148 23.1294 148 22.0556V11.9444C148 10.8706 147.105 10 146 10Z" fill="#FFBC38" />
                <path d="M168 2H156C154.895 2 154 2.91201 154 4.03704V21.963C154 23.088 154.895 24 156 24H168C169.105 24 170 23.088 170 21.963V4.03704C170 2.91201 169.105 2 168 2Z" fill="#FFBC38" />
                <path d="M190 0H178C176.895 0 176 0.89543 176 2V22C176 23.1046 176.895 24 178 24H190C191.105 24 192 23.1046 192 22V2C192 0.89543 191.105 0 190 0Z" fill="#FFBC38" />
                <path d="M212 10H200C198.895 10 198 10.8706 198 11.9444V22.0556C198 23.1294 198.895 24 200 24H212C213.105 24 214 23.1294 214 22.0556V11.9444C214 10.8706 213.105 10 212 10Z" fill="#FFBC38" />
                <path d="M234 10H222C220.895 10 220 10.8706 220 11.9444V22.0556C220 23.1294 220.895 24 222 24H234C235.105 24 236 23.1294 236 22.0556V11.9444C236 10.8706 235.105 10 234 10Z" fill="#FFBC38" />
                <path d="M256 2H244C242.895 2 242 2.91201 242 4.03704V21.963C242 23.088 242.895 24 244 24H256C257.105 24 258 23.088 258 21.963V4.03704C258 2.91201 257.105 2 256 2Z" fill="#FFBC38" />
            </svg>,
        },
        {
            info: 'Hospital Engagement Score',
            title: 'Engagement',
            value: '80%',
            des: 'Strong operational usage',
            icon: <svg width="112" height="24" viewBox="0 0 112 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 24C4.65685 24 6 22.6569 6 21C6 19.3431 4.65685 18 3 18C1.34315 18 0 19.3431 0 21C0 22.6569 1.34315 24 3 24Z" fill="#56F6F6" />
                <path d="M16.1992 6C17.8561 6 19.1992 4.65685 19.1992 3C19.1992 1.34315 17.8561 0 16.1992 0C14.5424 0 13.1992 1.34315 13.1992 3C13.1992 4.65685 14.5424 6 16.1992 6Z" fill="#56F6F6" />
                <path d="M29.1992 24C30.8561 24 32.1992 22.6569 32.1992 21C32.1992 19.3431 30.8561 18 29.1992 18C27.5424 18 26.1992 19.3431 26.1992 21C26.1992 22.6569 27.5424 24 29.1992 24Z" fill="#56F6F6" />
                <path d="M42 6C43.6569 6 45 4.65685 45 3C45 1.34315 43.6569 0 42 0C40.3431 0 39 1.34315 39 3C39 4.65685 40.3431 6 42 6Z" fill="#56F6F6" />
                <path d="M55.1992 24C56.8561 24 58.1992 22.6569 58.1992 21C58.1992 19.3431 56.8561 18 55.1992 18C53.5424 18 52.1992 19.3431 52.1992 21C52.1992 22.6569 53.5424 24 55.1992 24Z" fill="#56F6F6" />
                <path d="M67.5996 6.5C69.2565 6.5 70.5996 5.15685 70.5996 3.5C70.5996 1.84315 69.2565 0.5 67.5996 0.5C65.9428 0.5 64.5996 1.84315 64.5996 3.5C64.5996 5.15685 65.9428 6.5 67.5996 6.5Z" fill="#56F6F6" />
                <path d="M81 24C82.6569 24 84 22.6569 84 21C84 19.3431 82.6569 18 81 18C79.3431 18 78 19.3431 78 21C78 22.6569 79.3431 24 81 24Z" fill="#56F6F6" />
                <path d="M94.5996 6.5C96.2565 6.5 97.5996 5.15685 97.5996 3.5C97.5996 1.84315 96.2565 0.5 94.5996 0.5C92.9428 0.5 91.5996 1.84315 91.5996 3.5C91.5996 5.15685 92.9428 6.5 94.5996 6.5Z" fill="#56F6F6" />
                <path d="M108.199 24C109.856 24 111.199 22.6569 111.199 21C111.199 19.3431 109.856 18 108.199 18C106.542 18 105.199 19.3431 105.199 21C105.199 22.6569 106.542 24 108.199 24Z" fill="#56F6F6" />
            </svg>,
        },
    ]

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-[repeat(auto-fill,332px)] gap-4 mb-4 md:mb-5 lg:mb-6">
                {items.map((item, index) => (
                    <div className="bg-[#2F2F31] rounded-2xl p-4 md:p-5 lg:p-6" key={index}>
                        <span className='block mb-1.5 text-sm'>{item.title}</span>
                        <strong className='text-xl md:text-2xl font-medium text-white'>{item.value}</strong>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-y-4 md:gap-y-6">
                <div className="bg-[#2F2F31] rounded-xl md:rounded-2xl lg:rounded-3xl p-4 lg:p-5 xl:p-6">
                    <h4 className='text-base md:text-lg text-white font-medium mb-4 md:mb-6'>Regularity Config by Region</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-max text-left">
                            <thead className="bg-[#3E3E41] ">
                                <tr>
                                    <th className="p-3 lg:p-4 rounded-l-xl">
                                        <Checkbox id={20} />
                                    </th>
                                    {region_head.map((item, idx) => <th key={idx} className={` last:rounded-r-xl! p-3 lg:p-4 text-sm md:text-base text-white leading-none font-normal`}>{item}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {region_data.map((item, index) => (
                                    <tr key={index} className="hover:bg-[#3E3E41] transition-colors duration-300">
                                        <td className="p-3 lg:p-4 rounded-l-xl">
                                            <Checkbox id={item.region} />
                                        </td>
                                        <td className="p-3 lg:p-4 text-sm md:text-base leading-none font-medium text-white">{item.region}</td>
                                        <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white">{item.framework}</td>
                                        <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white">
                                            <Alert
                                                className='rounded-full'
                                                text={item.status}
                                                variant={item.status.toLowerCase() === 'compliant' ? 'success' : item.status}
                                            />
                                        </td>
                                        <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white">{item.last_audit}</td>
                                        <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white">{item.next_review}</td>

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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-y-4 md:gap-y-6">
                <div className="bg-[#2F2F31] rounded-xl md:rounded-2xl lg:rounded-3xl p-4 lg:p-5 xl:p-6">
                    <h4 className='text-base md:text-lg text-white font-medium mb-4 md:mb-6'>Global Audit Log (Recent Activity)</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-max text-left">
                            <thead className="bg-[#3E3E41] ">
                                <tr>
                                    <th className="p-3 lg:p-4 rounded-l-xl">
                                        <Checkbox id={20} />
                                    </th>
                                    {global_head.map((item, idx) => <th key={idx} className={` last:rounded-r-xl! p-3 lg:p-4 text-sm md:text-base text-white leading-none font-normal`}>{item}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {global_data.map((item, index) => (
                                    <tr key={index} className="hover:bg-[#3E3E41] transition-colors duration-300">
                                        <td className="p-3 lg:p-4 rounded-l-xl">
                                            <Checkbox id={item.user} />
                                        </td>
                                        <td className="p-3 lg:p-4 text-sm md:text-base leading-none font-medium text-white">{item.user}</td>
                                        <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white">{item.action}</td>
                                        <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white">
                                            <Alert
                                                className='rounded-full'
                                                text={item.region}
                                            />
                                        </td>
                                        <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white">
                                            <div className="flex items-center gap-2">
                                                <span>{item.date_stamp}</span>
                                                <span className='size-1 rounded-full bg-[#D9D9D9]'></span>
                                                <span>{item.timestamp}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 lg:p-4 text-sm md:text-base leading-none text-white">{item.ip_address}</td>

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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="bg-[#2F2F31] rounded-xl md:rounded-2xl lg:rounded-3xl p-4 lg:p-5 xl:p-6 flex flex-wrap items-center gap-4 md:gap-6 lg:gap-8">
                <div className="size-14 md:size-16 lg:size-18 flex items-center justify-center rounded-xl bg-[#1C3622] border border-solid border-[#386B46]">
                    <ShieldCheck className='size-8 md:size-10 lg:size-12 text-[#2AD354]' />
                </div>
                <div className="flex flex-col gap-y-1">
                    <h4 className='text-xl md:text-2xl'>ALCOA++ Compliance Enabled</h4>
                    <p className='text-sm'>All system activities are recorded, traceable and auditable in accordance with ALCOA++ data integrity standards.</p>
                </div>
                <div className="ml-auto">
                    <span className='rounded-full bg-[#1C3622] border border-solid border-[#386B46] text-[#28D353] text-sm md:text-base font-normal inline-flex items-center min-h-8 px-3 gap-2'>
                        <span className='size-2 rounded-full bg-current' /> Enable
                    </span>
                </div>
            </div>

            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-[repeat(auto-fill,326px)]">
                {cards.map((item, index) => (
                    <div key={index} className=" bg-[#2F2F31] rounded-2xl md:rounded-3xl p-4 md:p-5 text-center flex flex-col gap-y-2">
                        <span className='text-sm md:text-base leading-normal'>{item.info}</span>
                        <h4 className='text-2xl leading-tight'>{item.value} {item.title}</h4>
                        <span className='flex items-center justify-center my-1 md:my-3'>{item.icon}</span>
                        <p className='text-sm leading-normal' dangerouslySetInnerHTML={{ __html: item.des }} />
                    </div>
                ))}
            </div>

        </>
    )
}
