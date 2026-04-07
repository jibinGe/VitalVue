import React from 'react'

export default function SiteVerstion() {
    return (
        <div className="min-h-16 bg-[#1D1D20] shadow-[0_8px_25px_0_rgba(0,0,0,0.16)] flex flex-wrap gap-3 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-white leading-none">
                    <span className='size-2 bg-[#28D353] rounded-full'></span>Cannected to Cloud
                </div>
                <div className="rounded-xl relative z-1 bg-white/8 min-h-8.5 overflow-hidden flex items-center justify-center gap-2 text-sm font-normal text-white px-3 border border-solid border-[#2CD155]/35">
                    <span className='size-12 rounded-full bg-[#2CD155]/50 blur-2xl absolute -right-3 -top-4 -z-10' />
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.7931 10.8785C11.0245 10.1471 10.0319 9.74305 9.00362 9.74305C7.9753 9.74305 6.98273 10.1471 6.21414 10.8785M14.0221 8.492C12.6609 7.12922 10.8669 6.37109 9.00326 6.37109C7.13963 6.37109 5.34561 7.12922 3.98438 8.492" stroke="#2CD155" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M16 5.85706C14.0734 4.01694 11.5818 3 9 3C6.41819 3 3.92661 4.01694 2 5.85706" stroke="#2CD155" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M9.0004 14.9999C8.76932 14.9999 8.54343 14.9265 8.35129 14.7891C8.15915 14.6516 8.0094 14.4562 7.92097 14.2277C7.83254 13.9991 7.8094 13.7476 7.85448 13.5049C7.89956 13.2623 8.01084 13.0394 8.17424 12.8644C8.33764 12.6895 8.54582 12.5704 8.77246 12.5221C8.99911 12.4738 9.23403 12.4986 9.44752 12.5933C9.66101 12.6879 9.84348 12.8483 9.97187 13.054C10.1002 13.2597 10.1688 13.5016 10.1688 13.749C10.1688 14.0807 10.0457 14.3989 9.82657 14.6335C9.60745 14.8681 9.31027 14.9999 9.0004 14.9999Z" fill="#2CD155" />
                    </svg> Stable
                </div>
            </div>
            <div className="text-white">Version: V1.2.0</div>
        </div>
    )
}
