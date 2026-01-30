import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/* ---------------- Mock Data ---------------- */

const lateEarlyData = [
  {
    date: "Mon",
    late: 8,
    early: 3,
  },
  {
    date: "Tue",
    late: 5,
    early: 2,
  },
  {
    date: "Wed",
    late: 12,
    early: 6,
  },
  {
    date: "Thu",
    late: 6,
    early: 4,
  },
  {
    date: "Fri",
    late: 15,
    early: 9,
  },
  {
    date: "Sat",
    late: 4,
    early: 1,
  },
];

/* ---------------- Component ---------------- */

const LateEarlyBarChart = () => {
  return (
    <div className="mt-6 rounded-xl bg-[#0f172a] px-2">
      <h2 className="mb-4 text-lg font-semibold text-white">
        Punctuality Patterns
      </h2>

      <div className="h-[380px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={lateEarlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

            <XAxis
              dataKey="date"
              interval={0}
              height={50}
              stroke="#cbd5f5"
              tick={{ fontSize: 12 }}
            />

            <YAxis
              stroke="#cbd5f5"
              tick={{ fontSize: 12 }}
              padding={{ top: 20 }}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                color: "#000000",
              }}
              labelStyle={{ color: "#0f172a", fontWeight: 600 }}
              itemStyle={{ color: "#3b82f6" }}
            />

            <Legend />

            <Bar
              dataKey="late"
              name="Late Arrivals"
              fill="#3b83f6"
              barSize={28}
              maxBarSize={40}
            />

            <Bar
              dataKey="early"
              name="Early Leaves"
              fill="#ffffff"
              barSize={28}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LateEarlyBarChart;
