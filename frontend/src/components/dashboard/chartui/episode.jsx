
export default function Episode() {
    const cardPross = [
        {
            title: "Ep. 1",
            time: "32m",
            value: "40"
        },
        {
            title: "Ep. 2",
            time: "78m",
            value: "100"
        },
    ]
    return (
        <div className="w-full ml-3 lg:ml-4">
            <p className='max-w-50 text-white text-sm md:text-base mb-3 lg:mb-4.5'>Episode duration distribution</p>
            {cardPross.map((item, idx) => (
                <div key={idx} className="mb-2 last:mb-0">
                    <div className="flex items-center justify-between gap-2">
                        <p className='text-sm md:text-base leading-normal! text-para'>Ep {idx + 1}</p>
                        <p className='text-sm md:text-base leading-normal! text-para'>{item.time}</p>
                    </div>
                    <div className="h-1.5 w-full bg-[#585858] rounded-full">
                        <div style={{ width: `${item.value}%` }} className="h-full rounded-full bg-[#F2A40A] w-[40%]"></div>
                    </div>
                </div>
            ))}
        </div>
    )
}
