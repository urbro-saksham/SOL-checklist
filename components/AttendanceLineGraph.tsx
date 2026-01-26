"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  { date: "1 Jan", folder: 12, maker: 9 },
  { date: "5 Jan", folder: 13, maker: 10 },
  { date: "10 Jan", folder: 14, maker: 11 },
  { date: "15 Jan", folder: 12, maker: 10 },
  { date: "20 Jan", folder: 15, maker: 12 },
  { date: "22 Jan", folder: 12, maker: 9 },
];

export default function AttendanceLineGraph() {
  return (
    <div className="mt-6 rounded-xl bg-[#0f172a] p-5">
      <h2 className="text-lg font-semibold text-white mb-4">
        Attendance Trend (1–22 Jan)
      </h2>

      <div className="h-[320px] w-full">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#cbd5f5" />
            <YAxis stroke="#cbd5f5" />
            <Tooltip />
            <Legend />

            <Line
              type="monotone"
              dataKey="folder"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Filter Folder"
            />
            <Line
              type="monotone"
              dataKey="maker"
              stroke="#22c55e"
              strokeWidth={2}
              name="Filter Maker"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}