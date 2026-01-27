"use client";

import { useEffect, useState } from "react";
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
import { readAttendanceExcel } from "@/lib/readExcel";

type Row = {
  date: string;
  attendance: number;
  folder: number;
  maker: number;
};

export default function AttendanceLineGraph() {
  const [data, setData] = useState<Row[]>([]);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const rows = await readAttendanceExcel();

      const formatted = rows.map((row: any) => ({
        date: String(row.date),
        attendance: Number(row.attendance) || 0,
        folder: Number(row.folder) || 0,
        maker: Number(row.maker) || 0,
      }));

      setData(formatted);
      setError("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ✅ DAILY UPDATE
  useEffect(() => {
    loadData();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const interval = setInterval(loadData, ONE_DAY);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="mt-6 rounded-xl bg-red-950 p-4 text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-10 mt-6">
      {/* ================= ATTENDANCE GRAPH ================= */}
      <div className="rounded-xl bg-[#0f172a] p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Attendance Trend
        </h2>

        <div className="h-[300px] w-full">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#cbd5f5" />
              <YAxis stroke="#cbd5f5" />
              <Tooltip />
              <Legend />

              <Line
                type="monotone"
                dataKey="attendance"
                stroke="#38bdf8"
                strokeWidth={3}
                name="Attendance"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ================= WORK DONE GRAPH ================= */}
      <div className="rounded-xl bg-[#0f172a] p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Folding & Making Done
        </h2>

        <div className="h-[300px] w-full">
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
                stroke="#22c55e"
                strokeWidth={2}
                name="Folding Done"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="maker"
                stroke="#f97316"
                strokeWidth={2}
                name="Making Done"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
