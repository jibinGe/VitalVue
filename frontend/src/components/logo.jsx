import React from 'react'
import { Link } from 'react-router-dom'
import logo from '@/assets/img/logo.png'

export default function Logo() {
    return (
        <Link to={'/'}>
            <img src={logo} alt="" className='w-10 h-10' />
        </Link>
    )
}
