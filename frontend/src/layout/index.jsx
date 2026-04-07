import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import bg from '@/assets/img/login/bg.png'

export default function Index() {
    const pathName = useLocation();
    useEffect(() => { window.scrollTo(0, 0) }, [pathName])
    return (
        <div className='relative z-1 min-h-screen px-6 md:px-10 lg:px-14 xl:px-20 flex items-center justify-end py-6 md:py-10 lg:py-16'>
            <div className="absolute h-full md:h-auto top-0 left-0 w-full -z-10 pointer-events-none">
                <img src={bg} className='size-full object-cover' alt="" />
            </div>
            <div className="bg-[linear-gradient(80deg,rgba(255,255,255,0.4)_0%,rgba(255,255,255,0.1)_52%,rgba(255,255,255,0.4)_100%)] rounded-2xl md:rounded-3xl lg:rounded-[30px] p-px shadow-[0_0_50px_0_rgba(0,0,0,0.08)] overflow-hidden max-w-150 w-full">
                <div className="bg-[#252527] py-8 md:py-12 lg:py-16 px-4 md:px-8 lg:px-12 rounded-2xl md:rounded-3xl lg:rounded-[30px] min-h-175 flex items-center">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}
