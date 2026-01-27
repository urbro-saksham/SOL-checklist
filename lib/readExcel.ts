export async function readAttendanceExcel() {
  const XLSX = await import("xlsx");

  const response = await fetch(
    `/attendance-latest.xlsx?ts=${Date.now()}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("attendance-latest.xlsx not found");
  }

  const buffer = await response.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false, // 🔥 force evaluated values
  });

  return rows.map((row: any) => {
    const keys = Object.keys(row);

    const toNumber = (value: any) => {
      const n = Number(String(value).trim());
      return Number.isFinite(n) ? n : 0; // ✅ no NaN ever
    };

    return {
      date: String(row[keys[0]]).trim(),
      folder: toNumber(row.folder ?? row.Folder ?? row[keys[1]]),
      maker: toNumber(row.maker ?? row.Maker ?? row[keys[2]]),
    };
  });
}
