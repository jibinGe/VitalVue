import React, { useState, useEffect } from 'react'

export default function Input({ className = "mb-0",
    inputClass = "",
    labelClass = "text-sm",
    type = "text",
    label,
    placeholder,
    error,
    id = 'input_1',
    name,
    value,
    onChange,
    required,
    right_icon
}) {

    const [new_value, set_new_value] = useState(value || '');

    useEffect(() => {
        set_new_value(value || '');
    }, [value]);

    const handleChange = (e) => {
        const newVal = e.target.value;
        set_new_value(newVal);
        if (onChange) {
            onChange(e);
        }
    };

    return (
        <label htmlFor={id} className={`p-px overflow-hidden bg-[linear-gradient(130deg,rgba(255,255,255,.2)_0%,rgba(153,153,153,0.1)_25%,rgba(255,255,255,.2)_50%,rgba(255,255,255,0)_100%)] rounded-2xl md:rounded-[20px] ${className}`}>
            <div className="bg-[#3D3C3E] rounded-2xl md:rounded-[20px] py-3 px-4 md:px-5 relative flex flex-col">
                {label &&
                    <label htmlFor={id} className={`text-xs font-normal text-[#E2E4E9] mb-0 ${labelClass}`}>
                        {label}
                        {required && '*'}
                    </label>
                }
                <input
                    onChange={handleChange}
                    type={type}
                    name={name}
                    value={new_value}
                    id={id}
                    placeholder={placeholder}
                    className={`w-full h-6 text-sm text-white placeholder:text-white ${inputClass}`}
                    required={required}
                />
                {right_icon &&
                    <span className='absolute top-1/2 -translate-y-1/2 right-4 md:right-5'>{right_icon}</span>
                }
            </div>
            {error &&
                <span className='text-xs italic font-inter font-normal text-red-400'>{error}</span>
            }
        </label>
    )
}
