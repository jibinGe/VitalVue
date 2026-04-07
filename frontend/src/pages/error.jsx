import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Angle } from '../utilities/icons'

export default function Error() {
    const navigate = useNavigate()
    return (
        <div className='w-full h-screen flex flex-col justify-center items-center'>
            <h2 className='text-5xl mb-6'>Page Not Found</h2>
            <button onClick={() => navigate(-1)} className="btn gap-1 px-3 min-h-12 group" to={location.pathname}><Angle className='size-6 rotate-180 group-hover:-translate-x-1 transition-all duration-300' /> Back Top Home</button>
        </div>
    )
}
