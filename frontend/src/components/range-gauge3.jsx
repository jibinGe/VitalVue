export default function RangeGauge3({
    value = 40,
    type = "normal",
    status = ["Low", "Baseline", "High"],
}) {
    return (
        <div>
            {/* Status labels */}
            <div className="flex items-center justify-between mb-2">
                {status.map((item, index) => (
                    <div key={index} className="text-xs text-[#9A9A9A]">
                        {item}
                    </div>
                ))}
            </div>
            {type === "normal" && (
                <div className="h-2 w-full rounded-full bg-[linear-gradient(90deg,#40BF80_0%,#A5AC53_26.68%,#B3774C_55.77%,#BF4055_100%)] relative overflow-hidden">
                    <div
                        className="absolute top-0 left-0 border-r-4 border-white h-full transition-all duration-300"
                        style={{ width: `${value}%` }}
                    />
                </div>
            )}
            {type === "baseline" && (
                <div className="h-2 w-full bg-[#585858] rounded-full relative z-1">
                    <div className="h-full w-19 bg-[#F2A40A] rounded-r-full absolute z-2 right-[30.5%] top-1/2 -translate-y-1/2">
                        <span className="block h-5 w-px bg-[#9A9A9A] absolute z-3 -left-px -top-1.5" />
                    </div>
                </div>
            )}
            {type === "fever" && (
                <div className="h-2 w-full bg-[#585858] rounded-full relative">
                    <div className="h-full w-30 bg-[#F2A40A] rounded-full absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2" />
                    <span className="block h-full w-1 bg-white absolute left-1/2 -translate-x-1/2" />
                </div>
            )}
        </div>
    );
}
