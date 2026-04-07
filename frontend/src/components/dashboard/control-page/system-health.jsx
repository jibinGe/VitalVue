import React from 'react'

export default function SystemHealth({ items, className = "" }) {
    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 lg:gap-6 ${className}`}>
            {items.map((card, index) => (
                <div className="bg-[#2F2F31] rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col gap-y-4 md:gap-y-5 lg:gap-y-6" key={index}>
                    <h4 className='text-lg font-medium'>{card.title}</h4>
                    <div className="flex flex-col gap-y-3 md:gap-y-3">
                        {card.list.map((item, i) => (
                            <div key={i} className="bg-[#3E3E41] border border-solid border-[#57575B] rounded-2xl md:rounded-[20px] p-4 md:p-5 flex flex-col gap-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span className={`size-1.5 rounded-full ${item.status ? 'bg-[#28D353]' : 'bg-[#FF3833]'}`} />
                                    <span className='text-sm font-normal text-para leading-normal'>{item.info}</span>
                                </div>
                                <h4 className='text-lg md:text-xl leading-normal font-medium'>{item.title}</h4>
                                {item.des &&
                                    <p>{item.des}</p>
                                }
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
