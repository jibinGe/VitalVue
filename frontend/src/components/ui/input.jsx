import React, { useState } from 'react'

export default function Input({ className = "", inputClass = " min-h-11.5 lg:min-h-13", labelClass = "text-sm lg:text-base", leftIcon, leftIconClass = "left-1.5", type = "text", label, placeholder, error, id, name, required }) {
    const [newType, setNewType] = useState(type);
    const handleChange = () => {
        setNewType((prev) => prev === 'password' ? 'text' : 'password')
    }
    return (
        <div className={`${className}`}>
            {label &&
                <label htmlFor="" className={`mb-3 text-white block ${labelClass}`}>
                    {label}
                    {required && '*'}
                </label>
            }
            {type === 'textarea' ?
                <textarea name={name} id={id} className={`w-full text-sm lg:text-base font-normal text-para placeholder:text-para bg-[#2F2F31] border border-[#CAD5E2]/20 rounded-[14px] placeholder:font-light placeholder:transition-all placeholder:duration-300 focus:placeholder:translate-x-2 focus:placeholder:opacity-0 ${inputClass}`} placeholder={placeholder} required={required} />
                :
                <div className="relative">
                    {leftIcon &&
                        <span className={`absolute top-1/2 -translate-y-1/2 ${leftIconClass}`}>
                            {leftIcon}
                        </span>
                    }
                    <input type={newType} name={name} id={id} className={`${leftIcon ? 'px-9' : 'px-4'} w-full text-sm lg:text-base font-normal text-para placeholder:text-para bg-[#2F2F31] border border-[#CAD5E2]/20 rounded-[14px] placeholder:font-light placeholder:transition-all placeholder:duration-300 focus:placeholder:translate-x-2 focus:placeholder:opacity-0 ring-0 ring-primary/40 focus:ring-1 ${inputClass}`} placeholder={placeholder} required={required} />
                    {type === 'password' &&
                        <button onClick={() => handleChange()} className='absolute top-1/2 -translate-y-1/2 right-0 px-3'>
                            {newType === 'password' ?
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_2120_648)">
                                        <path d="M11.96 11.9601C10.8204 12.8288 9.4327 13.31 7.99996 13.3334C3.33329 13.3334 0.666626 8.0001 0.666626 8.0001C1.49589 6.45469 2.64605 5.1045 4.03996 4.0401M6.59996 2.82676C7.05885 2.71935 7.52867 2.66566 7.99996 2.66676C12.6666 2.66676 15.3333 8.0001 15.3333 8.0001C14.9286 8.75717 14.446 9.46992 13.8933 10.1268M9.41329 9.41343C9.2302 9.60993 9.00939 9.76753 8.76406 9.87685C8.51873 9.98616 8.2539 10.0449 7.98535 10.0497C7.71681 10.0544 7.45007 10.005 7.20103 9.90442C6.952 9.80383 6.72577 9.65412 6.53586 9.4642C6.34594 9.27428 6.19622 9.04806 6.09563 8.79902C5.99504 8.54999 5.94564 8.28324 5.95038 8.0147C5.95512 7.74616 6.0139 7.48133 6.12321 7.236C6.23252 6.99066 6.39013 6.76986 6.58663 6.58676" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M0.666626 0.666748L15.3333 15.3334" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_2120_648">
                                            <rect width="16" height="16" fill="white" />
                                        </clipPath>
                                    </defs>
                                </svg>
                                :
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_2120_648)">
                                        <path d="M11.96 11.9601C10.8204 12.8288 9.4327 13.31 7.99996 13.3334C3.33329 13.3334 0.666626 8.0001 0.666626 8.0001C1.49589 6.45469 2.64605 5.1045 4.03996 4.0401M6.59996 2.82676C7.05885 2.71935 7.52867 2.66566 7.99996 2.66676C12.6666 2.66676 15.3333 8.0001 15.3333 8.0001C14.9286 8.75717 14.446 9.46992 13.8933 10.1268M9.41329 9.41343C9.2302 9.60993 9.00939 9.76753 8.76406 9.87685C8.51873 9.98616 8.2539 10.0449 7.98535 10.0497C7.71681 10.0544 7.45007 10.005 7.20103 9.90442C6.952 9.80383 6.72577 9.65412 6.53586 9.4642C6.34594 9.27428 6.19622 9.04806 6.09563 8.79902C5.99504 8.54999 5.94564 8.28324 5.95038 8.0147C5.95512 7.74616 6.0139 7.48133 6.12321 7.236C6.23252 6.99066 6.39013 6.76986 6.58663 6.58676" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_2120_648">
                                            <rect width="16" height="16" fill="white" />
                                        </clipPath>
                                    </defs>
                                </svg>
                            }
                        </button>
                    }
                    {error &&
                        <span className='text-xs italic font-inter font-normal text-red-400'>{error}</span>
                    }
                </div>
            }
        </div>
    )
}
