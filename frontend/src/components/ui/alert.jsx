import React, { useEffect, useState } from 'react'

export default function Alert({ className = "", variant, text }) {
    const [newVariant, setNewVariant] = useState('');

    useEffect(() => {
        const variants = {
            success: 'bg-[#21C45D]/10 text-[#0CB76B]',
            pending: 'bg-[#E5DB4D]/10 text-[#E5DB4C]',
            danger: 'bg-[#FF3932]/10 text-[#FF3932]',
            pink: 'bg-[#FFE5FF]/12 text-[#E06CE0]',
            global: 'bg-[#E5F6FF]/12 text-[#47B4EB]',
        }
        setNewVariant(variants[variant] || 'bg-[#E5E7EB]/10 text-white')
    }, [variant,])

    return (
        <span className={`inline-flex items-center justify-center capitalize text-sm font-normal h-6 rounded px-2.5 ${newVariant} ${className}`}>
            {text || 'Alert'}
        </span>
    )
}
