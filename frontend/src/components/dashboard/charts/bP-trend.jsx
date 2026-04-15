import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";
import { useMemo } from "react";
import { formatToLocalTime } from "@/utilities/dateUtils";

const mockData = [
    { time: "00:00 PM", sys: 120, dia: 70 },
    { time: "01:00 PM", sys: 120, dia: 70 },
    { time: "02:00 PM", sys: 112, dia: 64 },
    { time: "03:00 PM", sys: 118, dia: 72 },
    { time: "04:00 PM", sys: 150, dia: 88 },
    { time: "05:00 PM", sys: 152, dia: 90 },
    { time: "06:00 PM", sys: 145, dia: 86 },
    { time: "07:00 PM", sys: 138, dia: 82 },
    { time: "08:00 PM", sys: 142, dia: 84 },
    { time: "09:00 PM", sys: 134, dia: 80 },
    { time: "10:00 PM", sys: 130, dia: 78 },
    { time: "11:00 PM", sys: 126, dia: 75 },
    { time: "12:00 AM", sys: 120, dia: 70 },
];

export default function BPTrend({ bloodPressureData = [] }) {
    const data = useMemo(() => {
        if (bloodPressureData && bloodPressureData.length > 0) {
            // Filter out null values and extract systolic/diastolic
            const validData = bloodPressureData
                .filter(item => {
                    if (item.value === null) return false;
                    if (typeof item.value === 'object') {
                        return item.value.systolic != null && item.value.diastolic != null;
                    }
                    return false;
                })
                .map(item => {
                    const bpValue = typeof item.value === 'object' ? item.value : { systolic: null, diastolic: null };
                    return {
                        time: formatToLocalTime(item.time),
                        sys: bpValue.systolic,
                        dia: bpValue.diastolic,
                    };
                });

            // Sample data points if too many (for performance)
            if (validData.length > 200) {
                const sampleRate = Math.ceil(validData.length / 200);
                return validData.filter((_, index) => index % sampleRate === 0 || index === validData.length - 1);
            }

            return validData.length > 0 ? validData : mockData;
        }
        return mockData;
    }, [bloodPressureData]);
    return (
        <div className="h-67.75 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                    <ReferenceLine y={180} stroke="#3a3f45" strokeWidth={1} />
                    <ReferenceLine y={40} stroke="#3a3f45" strokeWidth={1} />
                    <CartesianGrid
                        stroke="#57575B"
                        strokeDasharray="3 3"
                        strokeOpacity={1}
                    />

                    <XAxis
                        dataKey="time"
                        tick={{ fill: "#BABEC4", fontSize: 12 }}
                        axisLine={{ stroke: "#E6E6E6" }}
                        tickLine={false}
                        padding={{ left: 0, right: 0 }}
                    />

                    <YAxis
                        domain={[40, 180]}
                        ticks={[40, 60, 90, 120, 150, 180]}
                        tick={{ fill: "#BABEC4", fontSize: 12 }}
                        axisLine={{ stroke: "#E6E6E6" }}
                        tickLine={false}
                    />

                    <ReferenceLine
                        y={120}
                        stroke="#EF4444"
                        strokeDasharray="4 4"
                        strokeOpacity={0.8}
                    />
                    <ReferenceLine
                        y={80}
                        stroke="#EF4444"
                        strokeDasharray="4 4"
                        strokeOpacity={0.8}
                    />

                    <Tooltip
                        cursor={{ stroke: "#374151", strokeWidth: 1 }}
                        contentStyle={{
                            background: "#111827",
                            border: "1px solid #374151",
                            borderRadius: 8,
                        }}
                        labelStyle={{ color: "#e5e7eb" }}
                    />

                    <Line
                        type="natural"
                        dataKey="sys"
                        stroke="#2563EB"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        dot={{
                            r: 4,
                            fill: "#2563EB",
                            stroke: "#1f2227",
                            strokeWidth: 0,
                        }}
                        activeDot={{
                            r: 6,
                            fill: "#3b82f6",
                            stroke: "#ffffff",
                            strokeWidth: 1,
                        }}
                    />
                    <Line
                        type="natural"
                        dataKey="dia"
                        stroke="#7C3AED"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        dot={{
                            r: 4,
                            fill: "#7C3AED",
                            stroke: "#1f2227",
                            strokeWidth: 0,
                        }}
                        activeDot={{
                            r: 6,
                            fill: "#a855f7",
                            stroke: "#ffffff",
                            strokeWidth: 1,
                        }}
                    />

                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
