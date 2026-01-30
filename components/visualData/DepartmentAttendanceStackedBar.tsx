"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/* ================= TYPES ================= */

type AttendanceRow = {
  DepartmentId?: string;
  [key: string]: string | undefined;
};

type Props = {
  rows: AttendanceRow[];
  dateRange: "today" | "7days" | "month";
};

/* ================= COMPONENT ================= */

export default function DepartmentAttendanceStackedBar({
  rows,
  dateRange,
}: Props) {
  const data = useMemo(() => {
    if (!rows || rows.length === 0) return [];

    const ignoreKeys = [
      "EmployeeCode",
      "EmployeeName",
      "DepartmentId",
      "Location",
      "Designation",
    ];

    const dateColumns = Object.keys(rows[0]).filter(
      (k) => !ignoreKeys.includes(k)
    );

    let validDates = dateColumns;

    if (dateRange === "today") validDates = dateColumns.slice(-1);
    if (dateRange === "7days") validDates = dateColumns.slice(-7);

    const map: Record<
      string,
      { department: string; present: number; absent: number }
    > = {};

    rows.forEach((row) => {
      const dept = row.DepartmentId || "Default";

      if (!map[dept]) {
        map[dept] = { department: dept, present: 0, absent: 0 };
      }

      validDates.forEach((date) => {
        const value = row[date];
        if (value === "Present") map[dept].present++;
        if (value === "Absent") map[dept].absent++;
      });
    });

    return Object.values(map).sort(
      (a, b) => b.present + b.absent - (a.present + a.absent)
    );
  }, [rows, dateRange]);

  if (data.length === 0) {
    return (
      <div className="mt-6 rounded-xl bg-[#0f172a] p-5 text-slate-400">
        No department attendance data available
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl bg-[#0f172a] px-2">
      <h2 className="mb-4 text-lg font-semibold text-white">
        Department-wise Attendance
      </h2>

      <div className="h-[380px] w-full">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

            <XAxis
              dataKey="department"
              interval={0}                // 👈 NO SKIPPING
              angle={-15}
              textAnchor="end"
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
                color: "#000000"
              }}
              labelStyle={{ color: "#0f172a", fontWeight: 600 }}
              itemStyle={{ color: "#3b82f6" }} 
            />

            <Legend />

            <Bar
              dataKey="present"
              stackId="a"
              fill="#3b82f6"
              name="Present"
              barSize={28}
              maxBarSize={40}
            />

            <Bar
              dataKey="absent"
              stackId="a"
              fill="#ffffff"
              name="Absent"
              barSize={28}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
