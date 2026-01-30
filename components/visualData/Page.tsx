"use client";

import * as XLSX from "xlsx";
import { useEffect, useMemo, useState } from "react";
import DonutGraph from "./DonutGraph";
import DailyAttendanceTrend from "./DailyAttendanceTrend";
import DropDownMultiLevel from "../DropDownMultilevel";
import DepartmentAttendanceStackedBar from "./DepartmentAttendanceStackedBar";
import LateEarlyBarChart from "./PunctualityChart";

/* ---------------- Types ---------------- */

type AttendanceRow = {
  EmployeeCode: string;
  EmployeeName: string;
  DepartmentId: string;
  Location: string;
  Designation: string;
  [date: string]: string; // dynamic dates
};

type DateRange = "today" | "7days" | "month";
type FilterBy = "" | "department" | "location" | "designation";

/* ---------------- Helpers ---------------- */

const normalize = (v: string) => v.trim().toUpperCase().replace(/\s+/g, " ");

function getDateRangeKeys(allDates: string[], range: DateRange) {
  // allDates should be sorted ascending (YYYY-MM-DD strings sort lexicographically)
  if (!allDates || allDates.length === 0) return [];

  const sorted = [...allDates].sort();
  const lastDateStr = sorted[sorted.length - 1];
  const lastDate = new Date(lastDateStr);

  if (range === "today") {
    // show the last available date in the sheet (not the calendar today)
    return [lastDateStr];
  }

  if (range === "7days") {
    // return last up-to-7 date columns (if available)
    return sorted.slice(-7);
  }

  if (range === "month") {
    // show dates that belong to the same month/year as the last available date
    return sorted.filter((d) => {
      const dt = new Date(d);
      return (
        dt.getMonth() === lastDate.getMonth() &&
        dt.getFullYear() === lastDate.getFullYear()
      );
    });
  }

  return [];
}

/* ---------------- Excel Reader ---------------- */

async function readAttendanceExcel(fileUrl: string) {
  const res = await fetch(fileUrl);

  if (!res.ok) throw new Error("Excel file not found");

  const buffer = await res.arrayBuffer();

  const workbook = XLSX.read(buffer, { type: "array" });

  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  return XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  }) as AttendanceRow[];
}

// extractMeta removed; DonutGraph will compute any metadata and filtering UI it needs.

/* ---------------- Component ---------------- */

export default function VisualData() {
  /* ------------ State ------------ */

  const [rows, setRows] = useState<AttendanceRow[]>([]);

  const [dateRange, setDateRange] = useState<DateRange>("7days");
  const [activeTab, setActiveTab] = useState<
    "trend" | "distribution" | "department" | "punctuality"
  >("trend");
  // per-tab filter state (independent for trend and distribution)
  const [trendFilter, setTrendFilter] = useState<{
    filterBy: FilterBy;
    selectedValue: string;
  }>({ filterBy: "", selectedValue: "" });

  const [donutFilter, setDonutFilter] = useState<{
    filterBy: FilterBy;
    selectedValue: string;
  }>({ filterBy: "", selectedValue: "" });

  /* ------------ Load Excel ------------ */

  useEffect(() => {
    async function load() {
      const data = await readAttendanceExcel("/attendance-latest.xlsx");

      setRows(data);
    }

    load();
  }, []);

  /* ------------ Available Dates ------------ */

  const allDates = useMemo(() => {
    if (!rows.length) return [];

    return Object.keys(rows[0]).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k));
  }, [rows]);

  // sortedDates (ascending) for UI decisions
  const sortedDates = useMemo(() => {
    return [...allDates].sort();
  }, [allDates]);

  // if user had 7days selected but there are fewer than 7 dates, switch to month
  useEffect(() => {
    if (dateRange === "7days" && sortedDates.length < 7) {
      setDateRange("month");
    }
  }, [dateRange, sortedDates]);

  /* ------------ Rows filtered by selected days ------------ */

  const rowsByDate = useMemo(() => {
    if (!rows.length) return [] as AttendanceRow[];

    const validDates = getDateRangeKeys(allDates, dateRange);

    // For each row, pick only the keys we need (meta keys + selected date keys)
    return rows.map((r) => {
      const out: AttendanceRow = {
        EmployeeCode: r.EmployeeCode,
        EmployeeName: r.EmployeeName,
        DepartmentId: r.DepartmentId,
        Location: r.Location,
        Designation: r.Designation,
      };

      validDates.forEach((d) => {
        out[d] = r[d] ?? "";
      });

      return out;
    });
  }, [rows, allDates, dateRange]);

  /* ---------------- UI ---------------- */

  return (
    <div className=" rounded-xl bg-[#0f172a] p-5">
      {/* ---------- Tabs & Date Range (shared) ---------- */}

      <div className="flex items-center justify-between border-b border-slate-700 mb-6">
        {/* Tabs */}
        <div className="flex gap-8">
          {[
            { id: "trend", label: "Daily Attendance Trend (%)" },
            { id: "distribution", label: "Presence vs Absence Ratio" },
            { id: "department", label: "Department-Wise Comparisons" },
            { id: "punctuality", label: "Punctuality Patterns"}
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                // reset per-tab filters when switching tabs
                setTrendFilter({ filterBy: "", selectedValue: "" });
                setDonutFilter({ filterBy: "", selectedValue: "" });
              }}
              className={`
          pb-2 text-sm font-medium transition border-b-2 
          ${
            activeTab === tab.id
              ? "text-white font-semibold border-white"
              : "text-slate-400 hover:text-slate-300 border-transparent"
          }
        `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {/* Date range (shared between graphs) */}

      {/* Other filter (per-tab). Date range is shared above. */}
      <div className="mt-3 mb-4 px-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* only show filter selector for trend and distribution tabs; nothing for department tab */}
          {(activeTab === "trend" || activeTab === "distribution") && (
            <>
              <DropDownMultiLevel
                options={[
                  { label: "Department", value: "department" },
                  { label: "Location", value: "location" },
                  { label: "Designation", value: "designation" },
                ]}
                selected={
                  activeTab === "trend"
                    ? trendFilter.filterBy
                    : donutFilter.filterBy
                }
                onSelect={(val) => {
                  if (activeTab === "trend")
                    setTrendFilter({
                      filterBy: val as FilterBy,
                      selectedValue: "",
                    });
                  else
                    setDonutFilter({
                      filterBy: val as FilterBy,
                      selectedValue: "",
                    });
                }}
                placeholder="Filter"
              />

              {/* value dropdown for trend */}
              {activeTab === "trend" && trendFilter.filterBy && (
                <DropDownMultiLevel
                  options={(() => {
                    const set = new Set<string>();
                    rows.forEach((r) => {
                      if (
                        trendFilter.filterBy === "department" &&
                        r.DepartmentId
                      )
                        set.add(normalize(r.DepartmentId));
                      if (trendFilter.filterBy === "location" && r.Location)
                        set.add(normalize(r.Location));
                      if (
                        trendFilter.filterBy === "designation" &&
                        r.Designation
                      )
                        set.add(normalize(r.Designation));
                    });

                    return [...set].map((s) => ({ label: s, value: s }));
                  })()}
                  selected={trendFilter.selectedValue}
                  onSelect={(val) =>
                    setTrendFilter({ ...trendFilter, selectedValue: val })
                  }
                  placeholder="All"
                />
              )}

              {/* value dropdown for distribution */}
              {activeTab === "distribution" && donutFilter.filterBy && (
                <DropDownMultiLevel
                  options={(() => {
                    const set = new Set<string>();
                    rows.forEach((r) => {
                      if (
                        donutFilter.filterBy === "department" &&
                        r.DepartmentId
                      )
                        set.add(normalize(r.DepartmentId));
                      if (donutFilter.filterBy === "location" && r.Location)
                        set.add(normalize(r.Location));
                      if (
                        donutFilter.filterBy === "designation" &&
                        r.Designation
                      )
                        set.add(normalize(r.Designation));
                    });

                    return [...set].map((s) => ({ label: s, value: s }));
                  })()}
                  selected={donutFilter.selectedValue}
                  onSelect={(val) =>
                    setDonutFilter({ ...donutFilter, selectedValue: val })
                  }
                  placeholder="All"
                />
              )}
            </>
          )}
        </div>

        {/* Date range selector placed beside other filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDateRange("today")}
            className={`px-3 py-1 rounded-md text-sm font-medium transition ${
              dateRange === "today"
                ? "bg-white text-slate-900"
                : "bg-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            Today
          </button>

          {sortedDates.length >= 7 && (
            <button
              onClick={() => setDateRange("7days")}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                dateRange === "7days"
                  ? "bg-white text-slate-900"
                  : "bg-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              7 days
            </button>
          )}

          <button
            onClick={() => setDateRange("month")}
            className={`px-3 py-1 rounded-md text-sm font-medium transition ${
              dateRange === "month"
                ? "bg-white text-slate-900"
                : "bg-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Render tabs content: pass per-tab filtered rows to each graph */}

      {activeTab === "trend" &&
        (() => {
          let trendRows = rowsByDate;
          if (trendFilter.filterBy && trendFilter.selectedValue) {
            trendRows = trendRows.filter((row) => {
              if (trendFilter.filterBy === "department")
                return (
                  normalize(row.DepartmentId) === trendFilter.selectedValue
                );
              if (trendFilter.filterBy === "location")
                return normalize(row.Location) === trendFilter.selectedValue;
              if (trendFilter.filterBy === "designation")
                return normalize(row.Designation) === trendFilter.selectedValue;
              return true;
            });
          }

          return <DailyAttendanceTrend rows={trendRows} />;
        })()}

      {activeTab === "distribution" && (
        <div className="mt-6 rounded-xl bg-[#0f172a]">
          <div className="h-[380px] w-full flex justify-center">
            {(() => {
              let donutRows = rowsByDate;
              if (donutFilter.filterBy && donutFilter.selectedValue) {
                donutRows = donutRows.filter((row) => {
                  if (donutFilter.filterBy === "department")
                    return (
                      normalize(row.DepartmentId) === donutFilter.selectedValue
                    );
                  if (donutFilter.filterBy === "location")
                    return (
                      normalize(row.Location) === donutFilter.selectedValue
                    );
                  if (donutFilter.filterBy === "designation")
                    return (
                      normalize(row.Designation) === donutFilter.selectedValue
                    );
                  return true;
                });
              }

              return <DonutGraph rows={donutRows} />;
            })()}
          </div>
        </div>
      )}

      {activeTab === "department" &&
        (() => {
          let departmentRows = rowsByDate;

          return (
            <DepartmentAttendanceStackedBar
              rows={departmentRows}
              dateRange={dateRange}
            />
          );
        })()}

        {activeTab === "punctuality" &&
        (() => {

          return (
            <LateEarlyBarChart />
          );
        })()}
    </div>
  );
}