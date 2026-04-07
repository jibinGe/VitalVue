export default function RangeGauge2({ value = 40, status = ["Low", "Baseline", "High",] }) {


    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                {status.map((item, index) => (
                    <div key={index} className="text-xs text-[#99aqf]">{item} </div>
                ))}
            </div>
            <div className="h-2 w-full rounded-full bg-[linear-gradient(90deg,#40BF80_0%,#A5AC53_26.68%,#B3774C_55.77%,#BF4055_100%)] relative z-1 overflow-hidden">
                <div className="absolute top-0 left-0 border-r-4 border-white h-full transition-all duration-300"
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    )
}
