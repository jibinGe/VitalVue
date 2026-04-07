import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis } from "recharts"


export default function RespiratoryRate() {

  const chartData = [
    { data: 186 },
    { data: 305 },
    { data: 237 },
    { data: 73 },
    { data: 209 },
    { data: 214 },
  ]

  return (
    <div className="w-full h-14">
      <ResponsiveContainer width="100%" hight="100%">
        <LineChart accessibilityLayer data={chartData}>
          <Line dataKey="data" type="step" stroke="#9D7F56" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
