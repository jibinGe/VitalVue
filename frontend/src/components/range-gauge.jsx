export default function RangeGauge({ value = 40, get_number_count }) {
    const min = 20
    const max = 140

    const safeValue = Math.min(Math.max(value, min), max)

    const width = ((safeValue - min) / (max - min)) * 100

    const numberCount = get_number_count ? get_number_count : [0, 40, 60, 80, 100, 120, 140];

    return (
        <div>
            <div className="h-2 w-full rounded-full bg-[linear-gradient(90deg,#B3774C_0%,#A5AC53_26.68%,#40BF80_63.98%,#BF4055_100%)] relative z-1 overflow-hidden">
                <div
                    className="absolute top-0 left-0 border-r-4 border-white h-full transition-all duration-300"
                    style={{ width: `${width}%` }}
                />
            </div>

            <div className="flex items-center justify-between mt-1 md:mt-2">
                {numberCount.map((item, index) => (
                    <span
                        key={index}
                        className="text-[9px] text-[#99A1AF]"
                    >
                        {item}
                    </span>
                ))}
            </div>
        </div>
    )
}
