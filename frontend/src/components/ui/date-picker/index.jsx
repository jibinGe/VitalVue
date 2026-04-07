import React, { useState } from "react";
import DatePicker from "react-datepicker";

function MyDatePicker({ className = "", label, labelClass = "", required = false, placeholder, inputClass = "min-h-11 lg:min-h-12" }) {
    const [selectedDate, setSelectedDate] = useState(null);

    return (
        <div className={`relative flex flex-col gap-0 ${className}`}>
            {label &&
                <label htmlFor="" className={`mb-3 text-base block text-white ${labelClass}`}>
                    {label}
                    {required &&
                        <span className='text-red-500'> *</span>
                    }
                </label>
            }
            <DatePicker
                selected={selectedDate}
                onChange={date => setSelectedDate(date)}
                dateFormat="yyyy-MM-dd"
                placeholderText={placeholder}
                isClearable={false}
                showPopperArrow={false}
                className={`px-4 w-full text-sm lg:text-base font-normal text-para placeholder:text-para border border-[#CAD5E2]/20 bg-white/10 rounded-[14px] placeholder:font-light placeholder:transition-all placeholder:duration-300 focus:placeholder:translate-x-2 focus:placeholder:opacity-0 ring-0 ring-primary/40 focus:ring-1 ${inputClass}`}
            />
        </div>
    );
}

export default MyDatePicker;
