"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer } from "recharts";

const normalize = (v: string) => v.trim().toUpperCase().replace(/\s+/g, " ");

type AttendanceRow = {
  EmployeeCode: string;
  EmployeeName: string;
  DepartmentId: string;
  Location: string;
  Designation: string;
  [date: string]: string;
};

type Props = {
  rows: AttendanceRow[];
};

export default function DonutGraph({ rows }: Props) {
  const effectiveRows = rows;
  // rows passed here are already limited to selected date columns
  let present = 0;
  let absent = 0;

  effectiveRows.forEach((r) => {
    Object.keys(r).forEach((k) => {
      if (
        [
          "EmployeeCode",
          "EmployeeName",
          "DepartmentId",
          "Location",
          "Designation",
        ].includes(k)
      )
        return;

      const v = r[k];
      if (v === "Present") present++;
      if (v === "Absent") absent++;
    });
  });

  const data = [
    { name: "Present", value: present },
    { name: "Absent", value: absent },
  ];

  const total = present + absent;

  const COLORS = ["#3b82f6", "#ffffff"];

  if (total === 0) {
    return (
      <div className="w-full h-[280px] flex items-center justify-center text-sm text-gray-300">
        No attendance data for the selected range / filter
      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-col justify-around px-2">
      <h2 className="mb-4 text-lg font-semibold text-white">
        Presence vs Absence Ratio
      </h2>
    <div className="w-full h-full flex justify-around items-center ">
      
      <ResponsiveContainer width="60%" height="100%">
        <PieChart>
          <Tooltip />

          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            label={(props: any) => {
              const name = props?.name ?? "";
              const percent =
                typeof props?.percent === "number"
                  ? (props.percent * 100).toFixed(0)
                  : "0";

              return `${name} ${percent}%`;
            }}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="w-[30%] flex justify-center">
        <div className="flex flex-col gap-4">
          {/* <DonutData title="TOTAL" value={present + absent} clr="#555555" /> */}
          <DonutData title="PRESENT" value={present} clr="#3b82f6" />
          <DonutData title="ABSENT" value={absent} clr="#ffffff" />
        </div>
      </div>
    </div>
    </div>
  );
}

function DonutData({
  title,
  value,
  clr,
}: {
  title: string;
  value: string | number;
  clr: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {/** Map known hex colors to Tailwind arbitrary bg classes (literal strings so purge sees them) */}
      {(() => {
        const bgClass =
          clr === "#3b82f6"
            ? "bg-[#3b82f6]"
            : clr === "#ffffff"
              ? "bg-[#ffffff]"
              : clr === "#555555"
                ? "bg-[#555555]"
                : "bg-gray-400";

        return (
          <div className={`h-[12px] w-[12px] ${bgClass}`} aria-hidden="true" />
        );
      })()}

      <div className="text text-gray-200 font-sans font-semibold">
        {title}: {value}
      </div>
    </div>
  );
}
