import React from 'react'

export default function Baseline() {
    return (
        <div className='w-full pl-3 lg:pl-4'>
            <p className='max-w-50 text-white text-sm md:text-base mb-3 lg:mb-4'>Baseline comparison</p>
            <div className="flex items-center justify-between mb-3 lg:mb-4.5">
                <p className='text-sm md:text-base text-para leading-normal!'>Baseline</p>
                <p className='text-sm md:text-base text-para leading-normal!'>37.0°C</p>
            </div>
            <div className="flex items-center gap-2.5 bg-white/8 rounded-xl lg:rounded-2xl p-2">
                <div className="size-9 rounded-full bg-froly flex items-center justify-center flex-[0_0_auto]">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15.0581 12.0254L9.99974 17.0837L4.94141 12.0254" stroke="white" strokeWidth="1.2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10 2.91699V16.942" stroke="white" strokeWidth="1.2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div>
                    <h6 className='text-base md:text-lg font-medium text-white'>−0.6°C</h6>
                    <p className='text-xs md:text-sm text-white '>Below normal</p>
                </div>
            </div>
        </div>
    )
}
