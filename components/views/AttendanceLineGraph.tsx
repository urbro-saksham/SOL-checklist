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
import DonutGraph from "./visualData/DonutGraph";

const data = [
  { date: "1 Jan", folder: 12, maker: 9 },
  { date: "5 Jan", folder: 13, maker: 10 },
  { date: "10 Jan", folder: 14, maker: 11 },
  { date: "15 Jan", folder: 12, maker: 10 },
  { date: "20 Jan", folder: 15, maker: 12 },
  { date: "22 Jan", folder: 12, maker: 9 },
];

import * as XLSX from "xlsx";
import { useEffect } from "react";

type AttendanceMeta = {
  departments: string[];
  locations: string[];
  designations: string[];
};

export async function getAttendanceMetaFromExcel(
  fileUrl: string,
): Promise<AttendanceMeta> {
  // 1. Fetch file
  const res = await fetch(fileUrl);

  if (!res.ok) {
    throw new Error("Excel file not found");
  }

  // 2. Convert to buffer
  const buffer = await res.arrayBuffer();

  // 3. Read workbook
  const workbook = XLSX.read(buffer, { type: "array" });

  // 4. Read first sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // 5. Convert to JSON
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });

  // 6. Sets for uniqueness
  const departments = new Set<string>();
  const locations = new Set<string>();
  const designations = new Set<string>();

  // 7. Extract fields
  for (const row of rows as any[]) {
    const dept = String(row.DepartmentId || "").trim();
    const loc = String(row.Location || "").trim();
    const des = String(row.Designation || "").trim();

    if (dept) departments.add(dept);
    if (loc) locations.add(loc);
    if (des) designations.add(des);
  }

  // 8. Return clean arrays
  return {
    departments: [...departments],
    locations: [...locations],
    designations: [...designations],
  };
}

export default function AttendanceLineGraph() {
  useEffect(() => {
    const getExcelMeta = async () => {
      const meta = await getAttendanceMetaFromExcel("../../attendance-latest.xlsx");

      console.log(meta);
    };

    getExcelMeta();
  }, []);

  return (
    <div className="mt-6 rounded-xl bg-[#0f172a] p-5">
      <h2 className="text-lg font-semibold text-white mb-4">
        Attendance Trend (1–22 Jan)
      </h2>

      <div className="w-full">
        <LineChart data={data} height={320} width="100%">
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
      </div>
    </div>
  );
}
