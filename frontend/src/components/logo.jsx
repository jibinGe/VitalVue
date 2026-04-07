import React from 'react'
import { Link } from 'react-router-dom'
import logo from '@/assets/img/logo.svg'

export default function Logo() {
    return (
        <Link to={'/'}>
            <img src={logo} alt="" />
        </Link>
    )
}
