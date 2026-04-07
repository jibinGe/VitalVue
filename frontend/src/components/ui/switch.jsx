import React from 'react'

export default function Switch({ className = "", switchClass = "", title="arif", titleClass = "", id = "switch", name = "switch", checked, onChange }) {
    return (
        <label htmlFor={id} className={`cursor-pointer flex items-center gap-2 ${className}`}>
            <span className={`w-11 h-6 rounded-2xl bg-[#454343] inline-block ${switchClass}`}>
                <input type="checkbox" id={id} className='peer hidden' checked={checked} name={name} onChange={onChange} />
                <span className='size-5 rounded-full bg-white absolute top-1/2 left-0.5 -translate-y-1/2 peer-checked:bg-primary peer-checked:translate-x-full transition-all duration-300' />
            </span>
            {title &&
                <span className={`font-medium text-black text-sm capitalize ${titleClass}`}>{title}</span>
            }
        </label>
    )
}
