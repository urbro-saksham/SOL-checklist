"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ================= TYPES ================= */

type AttendanceRow = {
  EmployeeCode: string;
  EmployeeName: string;
  DepartmentId: string;
  Location: string;
  Designation: string;
  [date: string]: string; // dynamic date columns
};

type TrendPoint = {
  date: string;
  percentage: number;
};

/* ================= COMPONENT ================= */

export default function DailyAttendanceTrend({
  rows: propRows,
  filterBy,
  selectedValue,
}: {
  rows?: AttendanceRow[];
  filterBy?: "department" | "location" | "designation" | "";
  selectedValue?: string;
}) {
  // If parent passes rows, use them to avoid re-fetching when switching tabs.
  // Otherwise, fallback to fetching locally once.
  const [rows, setRows] = useState<AttendanceRow[]>(propRows ?? []);
  const [loading, setLoading] = useState<boolean>(
    !propRows || propRows.length === 0,
  );

  useEffect(() => {
    // If parent provides rows later, update local state and clear loading.
    if (propRows && propRows.length > 0) {
      setRows(propRows);
      setLoading(false);
      return;
    }

    // If parent did not provide rows, fetch once locally.
    if (!propRows) {
      let mounted = true;

      async function loadExcel() {
        try {
          const res = await fetch("/attendance-latest.xlsx");
          if (!res.ok) throw new Error("Excel not found");

          const buffer = await res.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];

          const json = XLSX.utils.sheet_to_json(sheet, {
            defval: "",
            raw: false,
          }) as AttendanceRow[];

          if (!mounted) return;
          setRows(json);
        } catch (err) {
          console.error(err);
        } finally {
          if (mounted) setLoading(false);
        }
      }

      loadExcel();

      return () => {
        mounted = false;
      };
    }
  }, [propRows]);

  /* -------- BUILD DAILY ATTENDANCE % -------- */

  const dailyTrend: TrendPoint[] = useMemo(() => {
    if (!rows.length) return [];

    // apply active filter from parent (if provided)
    let effective = rows;
    if (filterBy && selectedValue) {
      effective = rows.filter((r) => {
        if (filterBy === "department")
          return r.DepartmentId?.toUpperCase() === selectedValue.toUpperCase();
        if (filterBy === "location")
          return r.Location?.toUpperCase() === selectedValue.toUpperCase();
        if (filterBy === "designation")
          return r.Designation?.toUpperCase() === selectedValue.toUpperCase();
        return true;
      });
    }

    const ignoreKeys = [
      "EmployeeCode",
      "EmployeeName",
      "DepartmentId",
      "Location",
      "Designation",
    ];

    // Detect date columns from Excel
    const dateColumns = Object.keys(rows[0]).filter(
      (key) => !ignoreKeys.includes(key),
    );

    return dateColumns.map((date) => {
      let present = 0;
      let total = 0;

      effective.forEach((row) => {
        const val = row[date];
        if (val === "Present" || val === "Absent") {
          total++;
          if (val === "Present") present++;
        }
      });

      return {
        date,
        percentage: total ? Math.round((present / total) * 100) : 0,
      };
    });
  }, [rows]);

  /* -------- UI -------- */

  if (loading) {
    return (
      <div className="mt-6 rounded-xl bg-[#0f172a] p-5 text-white">
        Loading attendance data…
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl bg-[#0f172a] px-2">
      <h2 className="mb-4 text-lg font-semibold text-white">
        Daily Attendance Trend (%)
      </h2>

      <div className="h-[350px] w-full">
        <ResponsiveContainer>
          <LineChart data={dailyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              stroke="#cbd5f5"
              tickFormatter={(d) => {
                if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
                  return d.slice(5); // MM-DD
                }
                return d as any;
              }}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              stroke="#cbd5f5"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              }}
              labelStyle={{
                color: "#0f172a",
                fontWeight: 600,
              }}
              itemStyle={{
                color: "#2563eb",
                fontWeight: 500,
              }}
              formatter={(value) => [`${value}%`, "Attendance"]}
            />
            <Line
              type="monotone"
              dataKey="percentage"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
