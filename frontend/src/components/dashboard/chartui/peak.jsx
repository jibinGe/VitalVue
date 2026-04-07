import React from 'react'

export default function Peak() {
  return (
    <div className='w-full pl-3 lg:pl-4'>
         <p className='max-w-50 text-white text-sm md:text-base mb-3 lg:mb-4'>Peak episode timing</p>
          <div className="w-full h-2 rounded-full bg-[#585858] relative z-1 mb-2">
             <div className="h-full w-[40%] rounded-full bg-[#77C0FF]"></div>
             <span className='absolute z-2 left-[10%] top-1/2 -translate-y-1/2 size-3 rounded-full bg-bluesky block border border-white' ></span>
          </div>
          <div className="flex items-center justify-between">
            <p  className='text-sm md:text-base text-para'>00:00</p>
            <p  className='text-sm md:text-base text-[#EA6672]'>03:00</p>
            <p  className='text-sm md:text-base text-para'>24:00</p>
          </div>
    </div>
  )
}
