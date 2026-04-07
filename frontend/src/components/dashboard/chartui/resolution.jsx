import React from 'react'

export default function Resolution() {
    return (
        <div className='w-full pl-3 lg:pl-4'>
            <p className='max-w-50 text-white text-sm md:text-base mb-3 lg:mb-3.5'>Resolution window</p>
            <div className="relative z-1">
                <div className="w-0.5 h-22.5  bg-linear-to-t from-[#00C95080] to-[#FE9A0080] absolute z-2 left-0 top-0"></div>
                <span className='absolute z-3 -left-2.5 top-0 size-5 rounded-full bg-[#FE9A00] border-4 border-[#56585D] block'></span>
                <span className='absolute z-3 -left-2 top-[40%] size-5 rounded-full bg-[#00C950] border-4 border-white block'></span>
                <div className="ml-5 lg:ml-6 xl:ml-8">
                    <div className='mb-1.5'>
                        <h6 className='text-sm md:text-base text-white'>Start</h6>
                        <p className='text-sm md:text-base text-para'>14:20</p>
                    </div>
                    <div className='pb-px border-b border-b-[#314158]/30'>
                        <h6 className='text-sm md:text-base text-white'>Resolved</h6>
                        <p className='text-sm md:text-base text-para'>15:45</p>
                    </div>
                </div>
                <p className='text-sm md:text-base text-para mt-1 lg:mt-2'>Duration: 1h 25m</p>
            </div>
        </div>
    )
}
