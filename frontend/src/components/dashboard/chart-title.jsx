import React, { useState } from 'react'

export default function ChartTitle({ className = "mb-4 lg:mb-5", title, titleChildren, des, filter_items, set_active_filter, onFilterChange, children }) {
    const filters = filter_items ? filter_items : ['Live', '6h', '24h'];
    const [activeFilter, setActiveFilter] = useState(filters[set_active_filter ? set_active_filter : 0])

    const handleFilterClick = (item) => {
        setActiveFilter(item);
        if (onFilterChange) {
            onFilterChange(item);
        }
    }

    return (
        <div className={`flex flex-wrap items-center gap-4 justify-between ${className}`}>
            <div className="flex flex-col gap-y-2.5">
                {title &&
                    <h6 className='text-lg lg:text-xl leading-none flex items-center gap-3'>
                        <span>{title}</span>
                        {titleChildren}
                    </h6>
                }
                {des &&
                    <p className='text-sm leading-none'>{des}</p>
                }
            </div>
            {children}
            <div className="flex items-center gap-0 p-1 rounded-xl bg-[#3D3D42]">
                {filters.map((item, index) => (
                    <button onClick={() => handleFilterClick(item)} key={index} className={`flex items-center justify-center min-h-7 px-3 rounded-lg text-sm ${item === activeFilter ? 'bg-[linear-gradient(91deg,#B2884D_0%,#CCA166_48.98%,#B2884D_98.92%)] shadow-[inset_-1px_-1px_5.8px_0_rgba(139,139,139,0.23)] text-white' : 'bg-transparent text-para'}`}>{item}</button>
                ))}
            </div>
        </div>
    )
}
