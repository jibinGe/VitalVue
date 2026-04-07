import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TopTitle from '../../components/dashboard/top-title'
import MainBody from '../../components/dashboard/main-body';
import { Angle, Search, Download, Eye } from '../../utilities/icons';
import { ListFilter } from 'lucide-react';
import Input from '../../components/ui/input';
import Dropdown from '../../components/ui/dropdown';
import SiteVerstion from '../../components/dashboard/site-verstion';
import map_image from '@/assets/img/control-page-map.png'
import SystemHealth from '../../components/dashboard/control-page/system-health';
import DeploymentControl from '../../components/dashboard/control-page/deployment-control';
import SecurityComplianceAudit from '../../components/dashboard/control-page/security-compliance-audit';

export default function Control() {
    const [global_filter, set_global_filter] = useState(true)
    const hostpital = [
        { id: "africa", name: "Africa" },
        { id: "americas", name: "Americas" },
        { id: "asia", name: "Asia" },
        { id: "europe", name: "Europe" },
        { id: "oceania", name: "Oceania" },
        { id: "antarctica", name: "Antarctica" }
    ]

    const countries = [
        { name: "Afghanistan" },
        { name: "Albania" },
        { name: "Algeria" },
        { name: "Andorra" },
        { name: "Angola" },
        { name: "Antigua and Barbuda" },
        { name: "Argentina" },
        { name: "Armenia" },
        { name: "Australia" },
        { name: "Austria" },
        { name: "Azerbaijan" },
        { name: "Bahamas" },
        { name: "Bahrain" },
        { name: "Bangladesh" },
        { name: "Barbados" },
        { name: "Belarus" },
        { name: "Belgium" },
        { name: "Belize" },
        { name: "Benin" },
        { name: "Bhutan" },
        { name: "Bolivia" },
        { name: "Bosnia and Herzegovina" },
        { name: "Botswana" },
        { name: "Brazil" },
        { name: "Brunei" },
        { name: "Bulgaria" },
        { name: "Burkina Faso" },
        { name: "Burundi" },
        { name: "Cambodia" },
        { name: "Cameroon" },
        { name: "Canada" },
        { name: "Cape Verde" },
        { name: "Central African Republic" },
        { name: "Chad" },
        { name: "Chile" },
        { name: "China" },
        { name: "Colombia" },
        { name: "Comoros" },
        { name: "Costa Rica" },
        { name: "Croatia" },
        { name: "Cuba" },
        { name: "Cyprus" },
        { name: "Czech Republic" },
        { name: "Denmark" },
        { name: "Djibouti" },
        { name: "Dominica" },
        { name: "Dominican Republic" },
        { name: "Ecuador" },
        { name: "Egypt" },
        { name: "El Salvador" },
        { name: "Equatorial Guinea" },
        { name: "Eritrea" },
        { name: "Estonia" },
        { name: "Eswatini" },
        { name: "Ethiopia" },
        { name: "Fiji" },
        { name: "Finland" },
        { name: "France" },
        { name: "Gabon" },
        { name: "Gambia" },
        { name: "Georgia" },
        { name: "Germany" },
        { name: "Ghana" },
        { name: "Greece" },
        { name: "Grenada" },
        { name: "Guatemala" },
        { name: "Guinea" },
        { name: "Guinea-Bissau" },
        { name: "Guyana" },
        { name: "Haiti" },
        { name: "Honduras" },
        { name: "Hungary" },
        { name: "Iceland" },
        { name: "India" },
        { name: "Indonesia" },
        { name: "Iran" },
        { name: "Iraq" },
        { name: "Ireland" },
        { name: "Israel" },
        { name: "Italy" },
        { name: "Jamaica" },
        { name: "Japan" },
        { name: "Jordan" },
        { name: "Kazakhstan" },
        { name: "Kenya" },
        { name: "Kiribati" },
        { name: "Kuwait" },
        { name: "Kyrgyzstan" },
        { name: "Laos" },
        { name: "Latvia" },
        { name: "Lebanon" },
        { name: "Lesotho" },
        { name: "Liberia" },
        { name: "Libya" },
        { name: "Liechtenstein" },
        { name: "Lithuania" },
        { name: "Luxembourg" },
        { name: "Madagascar" },
        { name: "Malawi" },
        { name: "Malaysia" },
        { name: "Maldives" },
        { name: "Mali" },
        { name: "Malta" },
        { name: "Marshall Islands" },
        { name: "Mauritania" },
        { name: "Mauritius" },
        { name: "Mexico" },
        { name: "Micronesia" },
        { name: "Moldova" },
        { name: "Monaco" },
        { name: "Mongolia" },
        { name: "Montenegro" },
        { name: "Morocco" },
        { name: "Mozambique" },
        { name: "Myanmar" },
        { name: "Namibia" },
        { name: "Nauru" },
        { name: "Nepal" },
        { name: "Netherlands" },
        { name: "New Zealand" },
        { name: "Nicaragua" },
        { name: "Niger" },
        { name: "Nigeria" },
        { name: "North Korea" },
        { name: "North Macedonia" },
        { name: "Norway" },
        { name: "Oman" },
        { name: "Pakistan" },
        { name: "Palau" },
        { name: "Panama" },
        { name: "Papua New Guinea" },
        { name: "Paraguay" },
        { name: "Peru" },
        { name: "Philippines" },
        { name: "Poland" },
        { name: "Portugal" },
        { name: "Qatar" },
        { name: "Romania" },
        { name: "Russia" },
        { name: "Rwanda" },
        { name: "Saudi Arabia" },
        { name: "Senegal" },
        { name: "Serbia" },
        { name: "Seychelles" },
        { name: "Sierra Leone" },
        { name: "Singapore" },
        { name: "Slovakia" },
        { name: "Slovenia" },
        { name: "Solomon Islands" },
        { name: "Somalia" },
        { name: "South Africa" },
        { name: "South Sudan" },
        { name: "Spain" },
        { name: "Sri Lanka" },
        { name: "Sudan" },
        { name: "Suriname" },
        { name: "Sweden" },
        { name: "Switzerland" },
        { name: "Syria" },
        { name: "Taiwan" },
        { name: "Tajikistan" },
        { name: "Tanzania" },
        { name: "Thailand" },
        { name: "Timor-Leste" },
        { name: "Togo" },
        { name: "Tonga" },
        { name: "Trinidad and Tobago" },
        { name: "Tunisia" },
        { name: "Turkey" },
        { name: "Turkmenistan" },
        { name: "Tuvalu" },
        { name: "Uganda" },
        { name: "Ukraine" },
        { name: "United Arab Emirates" },
        { name: "United Kingdom" },
        { name: "United States" },
        { name: "Uruguay" },
        { name: "Uzbekistan" },
        { name: "Vanuatu" },
        { name: "Vatican City" },
        { name: "Venezuela" },
        { name: "Vietnam" },
        { name: "Yemen" },
        { name: "Zambia" },
        { name: "Zimbabwe" }
    ];

    const map_info = [
        {
            name: 'Operational',
            color: '#28D353',
            value: '1,200',
        },
        {
            name: 'Partial Outage',
            color: '#FFF026',
            value: 35,
        },
        {
            name: 'Critical Down',
            color: '#FF3833',
            value: 5,
        },
    ]

    // Infrastructure items
    const infrastructure = [
        {
            icon: (<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="24" fill="url(#paint0_linear_369_178)" />
                <path d="M22 24H26" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M22 20H26" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M26 33V30C26 29.4696 25.7893 28.9609 25.4142 28.5858C25.0391 28.2107 24.5304 28 24 28C23.4696 28 22.9609 28.2107 22.5858 28.5858C22.2107 28.9609 22 29.4696 22 30V33" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M18 22H16C15.4696 22 14.9609 22.2107 14.5858 22.5858C14.2107 22.9609 14 23.4696 14 24V31C14 31.5304 14.2107 32.0391 14.5858 32.4142C14.9609 32.7893 15.4696 33 16 33H32C32.5304 33 33.0391 32.7893 33.4142 32.4142C33.7893 32.0391 34 31.5304 34 31V21C34 20.4696 33.7893 19.9609 33.4142 19.5858C33.0391 19.2107 32.5304 19 32 19H30" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M18 33V17C18 16.4696 18.2107 15.9609 18.5858 15.5858C18.9609 15.2107 19.4696 15 20 15H28C28.5304 15 29.0391 15.2107 29.4142 15.5858C29.7893 15.9609 30 16.4696 30 17V33" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <defs>
                    <linearGradient id="paint0_linear_369_178" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#99D0FF" />
                        <stop offset="0.495192" stop-color="#66B8FF" />
                        <stop offset="1" stop-color="#99D0FF" />
                    </linearGradient>
                </defs>
            </svg>),
            meta: '+4 This Month',
            title: '909',
            sub_title: 'Active Nodes',
            des: 'Hospitals Onboarded',
        },
        {
            icon: (<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24Z" fill="url(#paint0_linear_369_193)" />
                <path d="M30 32.0001C30.5304 32.0001 31.0391 31.7894 31.4142 31.4144C31.7893 31.0393 32 30.5306 32 30.0001V18.0001C32 17.4697 31.7893 16.961 31.4142 16.5859C31.0391 16.2109 30.5304 16.0001 30 16.0001M16 18.8481V29.1521C16 30.7451 16 31.5421 16.465 32.0981C16.929 32.6531 17.715 32.7961 19.285 33.0811L22.285 33.6251C24.47 34.0221 25.563 34.2201 26.281 33.6221C27 33.0231 27 31.9141 27 29.6971V18.3031C27 16.0861 27 14.9771 26.281 14.3781C25.563 13.7801 24.471 13.9781 22.284 14.3751L19.284 14.9191C17.714 15.2041 16.929 15.3471 16.464 15.9021C16 16.4581 16 17.2551 16 18.8481Z" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M23.5 23.9983V23.9883" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <defs>
                    <linearGradient id="paint0_linear_369_193" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#B686F9" />
                        <stop offset="0.504808" stop-color="#9855F7" />
                        <stop offset="1" stop-color="#B686F9" />
                    </linearGradient>
                </defs>
            </svg>),
            meta: null,
            title: '4,287',
            sub_title: null,
            des: 'Active Wards',
        },
        {
            icon: (<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="24" fill="url(#paint0_linear_369_202)" />
                <path d="M14 16V32" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M14 20H32C32.5304 20 33.0391 20.2107 33.4142 20.5858C33.7893 20.9609 34 21.4696 34 22V32" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M14 29H34" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M18 20V29" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <defs>
                    <linearGradient id="paint0_linear_369_202" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#FF80B5" />
                        <stop offset="0.495192" stop-color="#FF4D97" />
                        <stop offset="1" stop-color="#FF80B5" />
                    </linearGradient>
                </defs>
            </svg>),
            meta: null,
            title: '87,562',
            sub_title: null,
            des: 'Active Beds',
        },
        {
            icon: (<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24Z" fill="url(#paint0_linear_369_212)" />
                <path d="M28.25 19.7617C29.373 20.8866 30.0037 22.4112 30.0037 24.0007C30.0037 25.5902 29.373 27.1148 28.25 28.2397" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M31.0781 16.9336C32.951 18.8086 34.003 21.3504 34.003 24.0006C34.003 26.6508 32.951 29.1926 31.0781 31.0676" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M16.9249 31.0676C15.052 29.1926 14 26.6508 14 24.0006C14 21.3504 15.052 18.8086 16.9249 16.9336" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M19.7537 28.2397C18.6307 27.1148 18 25.5902 18 24.0007C18 22.4112 18.6307 20.8866 19.7537 19.7617" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M24 26C25.1046 26 26 25.1046 26 24C26 22.8954 25.1046 22 24 22C22.8954 22 22 22.8954 22 24C22 25.1046 22.8954 26 24 26Z" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <defs>
                    <linearGradient id="paint0_linear_369_212" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#63E984" />
                        <stop offset="0.495192" stop-color="#1DC948" />
                        <stop offset="1" stop-color="#63E984" />
                    </linearGradient>
                </defs>
            </svg>),
            meta: null,
            title: '124,389',
            sub_title: null,
            des: 'Device Deployed',
        },
        {
            icon: (<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="24" fill="url(#paint0_linear_369_223)" />
                <path d="M18.0901 25.2809H21.1801V32.4809C21.1801 34.1609 22.0901 34.5009 23.2001 33.2409L30.7701 24.6409C31.7001 23.5909 31.3101 22.7209 29.9001 22.7209H26.8101V15.5209C26.8101 13.8409 25.9001 13.5009 24.7901 14.7609L17.2201 23.3609C16.3001 24.4209 16.6901 25.2809 18.0901 25.2809Z" stroke="white" stroke-width="1.2" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" />
                <defs>
                    <linearGradient id="paint0_linear_369_223" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#ECC679" />
                        <stop offset="0.495192" stop-color="#DF9F20" />
                        <stop offset="1" stop-color="#ECC679" />
                    </linearGradient>
                </defs>
            </svg>),
            meta: null,
            title: '18,562',
            sub_title: null,
            des: 'Alerts Generated',
        },
    ]

    // Clinical Activity items
    const clinical = [
        {
            icon: (<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24Z" fill="url(#paint0_linear_369_239)" />
                <path d="M22.3 32.9949C22.4674 33.2993 22.7135 33.5531 23.0125 33.7299C23.3116 33.9067 23.6526 34 24 34C24.3475 34 24.6885 33.9067 24.9876 33.7299C25.2866 33.5531 25.5327 33.2993 25.7 32.9949M16 14C14.8 15.6995 14 17.699 14 19.9984M34 19.9984C34 17.699 33.2 15.6995 32 14M18 19.9984C18 18.4075 18.6321 16.8818 19.7574 15.7569C20.8826 14.632 22.4087 14 24 14C25.5913 14 27.1174 14.632 28.2426 15.7569C29.3679 16.8818 30 18.4075 30 19.9984C30 26.9965 33 28.996 33 28.996H15C15 28.996 18 26.9965 18 19.9984Z" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <defs>
                    <linearGradient id="paint0_linear_369_239" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#ECC679" />
                        <stop offset="0.495192" stop-color="#DF9F20" />
                        <stop offset="1" stop-color="#ECC679" />
                    </linearGradient>
                </defs>
            </svg>),
            meta: '+12% vs 7d avg',
            title: '12,402',
            sub_title: 'Last 24h',
            des: 'Alerts Generated',
        },
        {
            icon: (<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24Z" fill="url(#paint0_linear_369_250)" />
                <path d="M24 20.125V24.9052" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M23.9994 31.9904H17.9394C14.4694 31.9904 13.0194 29.6194 14.6994 26.7226L17.8194 21.3496L20.7594 16.3017C22.5394 13.2328 25.4594 13.2328 27.2394 16.3017L30.1794 21.3592L33.2994 26.7322C34.9794 29.629 33.5194 32 30.0594 32H23.9994V31.9904Z" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M24 27.7734H24.009" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <defs>
                    <linearGradient id="paint0_linear_369_250" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#63E984" />
                        <stop offset="0.495192" stop-color="#1DC948" />
                        <stop offset="1" stop-color="#63E984" />
                    </linearGradient>
                </defs>
            </svg>),
            meta: null,
            title: '842',
            sub_title: 'Level 1 Priority',
            des: 'Critical Alerts',
        },
        {
            icon: (<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="24" fill="url(#paint0_linear_369_265)" />
                <path d="M32.75 25.25C32.75 30.08 28.83 34 24 34C19.17 34 15.25 30.08 15.25 25.25C15.25 20.42 19.17 16.5 24 16.5C28.83 16.5 32.75 20.42 32.75 25.25Z" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M24 20V25" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M21 14H27" stroke="white" stroke-width="1.2" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" />
                <defs>
                    <linearGradient id="paint0_linear_369_265" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#FF80B5" />
                        <stop offset="0.495192" stop-color="#FF4D97" />
                        <stop offset="1" stop-color="#FF80B5" />
                    </linearGradient>
                </defs>
            </svg>),
            meta: null,
            title: '1m 42s',
            sub_title: 'Target < 2m',
            des: 'Avg Response Time',
        },
        {
            icon: (<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 24C0 10.7452 10.7452 0 24 0C37.2548 0 48 10.7452 48 24C48 37.2548 37.2548 48 24 48C10.7452 48 0 37.2548 0 24Z" fill="url(#paint0_linear_369_279)" />
                <path d="M28.96 18.1719C30.96 19.5619 32.34 21.7719 32.62 24.3219" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M15.4902 24.3688C15.7502 21.8288 17.1102 19.6187 19.0902 18.2188" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M20.1895 32.9414C21.3495 33.5314 22.6695 33.8614 24.0595 33.8614C25.3995 33.8614 26.6595 33.5614 27.7895 33.0114" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M24.0603 19.7006C25.5956 19.7006 26.8403 18.456 26.8403 16.9206C26.8403 15.3853 25.5956 14.1406 24.0603 14.1406C22.5249 14.1406 21.2803 15.3853 21.2803 16.9206C21.2803 18.456 22.5249 19.7006 24.0603 19.7006Z" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M16.8298 31.9194C18.3652 31.9194 19.6098 30.6747 19.6098 29.1394C19.6098 27.604 18.3652 26.3594 16.8298 26.3594C15.2945 26.3594 14.0498 27.604 14.0498 29.1394C14.0498 30.6747 15.2945 31.9194 16.8298 31.9194Z" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M31.1696 31.9194C32.705 31.9194 33.9496 30.6747 33.9496 29.1394C33.9496 27.604 32.705 26.3594 31.1696 26.3594C29.6343 26.3594 28.3896 27.604 28.3896 29.1394C28.3896 30.6747 29.6343 31.9194 31.1696 31.9194Z" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <defs>
                    <linearGradient id="paint0_linear_369_279" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#B686F9" />
                        <stop offset="0.504808" stop-color="#9855F7" />
                        <stop offset="1" stop-color="#B686F9" />
                    </linearGradient>
                </defs>
            </svg>),
            meta: null,
            title: '4.1%',
            sub_title: 'To Supervisor',
            des: 'Escalation Rate',
        },
    ]

    // healt data
    const system_health = [
        {
            title: 'Backend Services Status',
            list: [
                {
                    info: 'API Gateway',
                    status: true,
                    title: 'Operational',
                    des: '',
                },
                {
                    info: 'Database Cluster',
                    status: true,
                    title: 'Healthy',
                    des: '',
                },
                {
                    info: 'Authentication Service',
                    status: true,
                    title: 'Operational',
                    des: '',
                },
                {
                    info: 'Storage Service',
                    status: false,
                    title: 'Degraded',
                    des: 'Highlatancy in EU region',
                },
            ]
        },
        {
            title: 'Hospital - Unified status badge',
            list: [
                {
                    info: 'System Health',
                    status: true,
                    title: 'Healthy',
                    des: '',
                },
                {
                    info: 'Delivery Health',
                    status: true,
                    title: 'Degraded',
                    des: '37 failures in the last 24 hours',
                },
                {
                    info: 'Peak Latency (P95)',
                    status: true,
                    title: 'Incident',
                    des: '',
                },
                {
                    info: 'At Risk',
                    status: true,
                    title: '3.4 sec under peak load',
                    des: '',
                },
            ]
        },
    ]

    return (
        <>
            <MainBody className='min-h-screen flex flex-col gap-y-4 md:gap-y-6'>
                <TopTitle
                    des={false}
                    title="Settings & Config"
                    className="mb-0"
                />
                <div className="bg-[#2F2F31] p-4 md:p-5 lg:p-6 rounded-2xl md:rounded-3xl">
                    <button onClick={() => set_global_filter((e) => !e)} className="flex flex-wrap items-center justify-between w-full gap-3">
                        <span className="flex flex-col gap-y-2">
                            <strong className='flex items-center gap-3 text-white font-medium'><ListFilter className='size-5' /> Global Filters</strong>
                            <span className='text-sm leading-normal text-para'>Updates all metrics in real-time</span>
                        </span>
                        <span className={`${global_filter ? '-scale-y-100' : 'scale-y-100'}`}>
                            <Angle className='size-6 rotate-90' />
                        </span>
                    </button>
                    <AnimatePresence>
                        {global_filter && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="flex items-end flex-wrap gap-4 mt-4 md:mt-5 lg:mt-6">
                                    <Input
                                        className='lg:flex-1 xl:flex-2 w-full'
                                        label='Search'
                                        labelClass='mb-2 text-sm'
                                        placeholder='Device ID...'
                                        inputClass='min-h-11 px-11 bg-[#3E3E41] border-[#646468]'
                                        leftIcon={<Search />}
                                        leftIconClass='left-3'
                                    />
                                    <Dropdown
                                        className='flex-1'
                                        label='Ward'
                                        labelClass='mb-2 text-sm'
                                        placeholder="Ward no"
                                        btnClass='min-h-11 border-transparent! text-white text-sm rounded-xl!'
                                        dropdownClass='shadow-none!'
                                        items={[{ name: 'wb-1' }, { name: 'wp-2' }, { name: 'wp-3' }, { name: 'wp-4' }, { name: 'wp-5' },]}
                                    />
                                    <Dropdown
                                        className='flex-1'
                                        label='State/Province'
                                        labelClass='mb-2 text-sm'
                                        placeholder="All State"
                                        btnClass='min-h-11 border-transparent! text-white text-sm rounded-xl!'
                                        dropdownClass='shadow-none!'
                                        items={countries}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex flex-col gap-y-4 md:gap-y-5 lg:gap-y-6">
                    <div className="flex flex-col gap-y-2">
                        <h4 className='text-lg md:text-xl leading-normal text-white'>Deployment Overview</h4>
                        <p className='text-sm text-para'>Global infrastructure status and regional distribution</p>
                    </div>
                    <div className="bg-[#2F2F31] p-4 md:p-5 lg:p-6 rounded-2xl md:rounded-3xl">
                        <div className="flex items-center justify-between gap-4 mb-4 md:mb-6 lg:mb-8">
                            <div className="flex flex-col gap-y-2">
                                <h4 className='text-lg md:text-xl leading-normal text-white'>Deployment Overview</h4>
                                <div className="flex items-center gap-2">
                                    <p className='text-sm text-para'>Region ID: NA</p>
                                    <span className='size-1.5 rounded-full bg-[#808080]' />
                                    <span className='min-h-8 inline-flex items-center gap-2 rounded-full uppercase text-[#2AD354] bg-[#1C3623] border border-solid border-[#386B46] px-3 text-sm'>
                                        <span className='size-2 rounded-full bg-current' />
                                        <span>OPARETIONAL</span>
                                    </span>
                                </div>
                            </div>
                            <button className="flex items-center gap-2">
                                <span>Minimize</span>
                                <Angle className='rotate-270 size-6' />
                            </button>
                        </div>
                        <div className="rounded-2xl md:rounded-3xl overflow-hidden">
                            <img src={map_image} className='h-150 w-full object-cover' alt="" />
                        </div>
                        <div className="mt-4 md:mt-6 lg:mt-8 flex items-center justify-between">
                            <div className="flex items-center gap-6 md:gap-8 lg:gap-12">
                                {map_info.map((item, index) => (
                                    <div className="flex flex-col gap-y-1" key={index}>
                                        <div className="flex items-center gap-2">
                                            <div className="size-3 rounded-full -mt-0.5" style={{ backgroundColor: item.color }} />
                                            <p className='text-sm text-para'>{item.name}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className='text-sm text-para'>{item.value}</p>
                                            <div className="h-1 w-full rounded-full" style={{ backgroundColor: item.color }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-4 md:gap-6 lg:gap-8">
                                <span className='min-h-8 inline-flex items-center gap-2 rounded-full text-[#2AD354] bg-[#1C3623] border border-solid border-[#386B46] px-3 text-sm'>
                                    <span className='size-2 rounded-full bg-current' />
                                    <span className='capitalize'>Live Data Stream</span>
                                </span>
                                <div className="flex flex-col gap-y-.5">
                                    <h4 className='text-lg md:text-xl leading-normal text-white'>Global Deployment</h4>
                                    <p className='text-sm text-para'>Super Admin Level 1</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-y-4 md:gap-y-5 lg:gap-y-6">
                    <div className="flex flex-col gap-y-2">
                        <h4 className='text-lg md:text-xl leading-normal text-white'>Global Totals – Infrastructure</h4>
                        <p className='text-sm text-para'>Platform scale, deployment footprint, and hardware availability.</p>
                    </div>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-[repeat(auto-fill,262px)]">
                        {infrastructure.map((item, index) => (
                            <div className="p-4 md:p-5 bg-[#2F2F31] border border-solid border-[#2A2A2A] rounded-2xl md:rounded-3xl" key={index}>
                                <div className="flex items-center gap-2 flex-wrap justify-between mb-4 md:mb-5">
                                    <div className="[&>svg]:size-12">{item.icon}</div>
                                    {item.meta &&
                                        <span className='inline-block rounded-full bg-[#2CD155]/10 text-sm px-3 py-1 text-[#28D353]'>{item.meta}</span>
                                    }
                                </div>
                                <h4 className='flex items-end gap-3 text-xl md:text-2xl lg:text-[28px] text-white mb-3'>
                                    {item.title}
                                    {item.sub_title && <span className='text-para text-sm leading-normal font-normal mb-1'>{item.sub_title}</span>}
                                </h4>
                                <p className='font-medium text-lg md:text-xl leading-normal text-white'>{item.des}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-y-4 md:gap-y-5 lg:gap-y-6">
                    <div className="flex flex-col gap-y-2">
                        <h4 className='text-lg md:text-xl leading-normal text-white'>Global Totals – Clinical Activity</h4>
                        <p className='text-sm text-para'>Real-time system load, response efficiency, and clinical pressure metrics.</p>
                    </div>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-[repeat(auto-fill,332px)]">
                        {clinical.map((item, index) => (
                            <div className="p-4 md:p-5 bg-[#2F2F31] border border-solid border-[#2A2A2A] rounded-2xl md:rounded-3xl" key={index}>
                                <div className="flex items-center gap-2 flex-wrap justify-between mb-4 md:mb-5">
                                    <div className="[&>svg]:size-12">{item.icon}</div>
                                    {item.meta &&
                                        <span className='inline-block rounded-full bg-[#2CD155]/10 text-sm px-3 py-1 text-[#28D353]'>{item.meta}</span>
                                    }
                                </div>
                                <h4 className='flex items-end gap-3 text-xl md:text-2xl lg:text-[28px] text-white mb-3'>
                                    {item.title}
                                    {item.sub_title && <span className='text-para text-sm leading-normal font-normal mb-1'>{item.sub_title}</span>}
                                </h4>
                                <p className='font-medium text-lg md:text-xl leading-normal text-white'>{item.des}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-y-4 md:gap-y-5 lg:gap-y-6">
                    <div className="flex flex-col gap-y-2">
                        <h4 className='text-lg md:text-xl leading-normal text-white'>System Health</h4>
                        <p className='text-sm text-para'>Real-time status of critical infrastructure</p>
                    </div>
                    <SystemHealth items={system_health} />
                </div>

                <div className="flex flex-col gap-y-4 md:gap-y-5 lg:gap-y-6">
                    <div className="flex flex-col gap-y-2">
                        <h4 className='text-lg md:text-xl leading-normal text-white'>Deployment Control</h4>
                        <p className='text-sm text-para'>Manage regional deployments and system configuration</p>
                    </div>
                    <DeploymentControl />
                </div>

                <div className="flex flex-col gap-y-4 md:gap-y-5 lg:gap-y-6">
                    <div className="flex flex-col gap-y-2">
                        <h4 className='text-lg md:text-xl leading-normal text-white'>Security, Compliance & Audit</h4>
                        <p className='text-sm text-para'>Trust infrastructure and regulatory oversight</p>
                    </div>
                    <SecurityComplianceAudit />
                </div>
            </MainBody>

            <SiteVerstion />
        </>
    )
}
