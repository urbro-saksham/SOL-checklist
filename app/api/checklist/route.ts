import { NextResponse } from 'next/server';
import { createTodayRow, updateDepartmentData, updateStoredLink, DEPARTMENTS, getTodayRow } from '@/lib/sheets';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { deptId, supervisor, comment, sheetLink } = body;

    // 1. Validate ONLY Mandatory Fields (Link is NOT mandatory anymore)
    if (!deptId || !supervisor) {
      return NextResponse.json({ error: "Missing Name or ID" }, { status: 400 });
    }

    // 2. Find the correct column for this department
    const dept = DEPARTMENTS.find(d => d.id === deptId);
    if (!dept) return NextResponse.json({ error: "Invalid Dept" }, { status: 400 });

    // 3. Get Time
    const now = new Date();
    // Convert to IST
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    
    // Format Time (e.g., "06:30 PM")
    let timeStr = istDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    // Check Late Status (After 7:30 PM)
    const hours = istDate.getUTCHours();
    const minutes = istDate.getUTCMinutes();
    // 7:30 PM IST is roughly 14:00 UTC (depending on base), simpler to just check hours/mins relative to start of day
    // Let's use simple logic: If Hour is 19 (7PM) and Min > 30, or Hour > 19.
    const isLate = (istDate.getHours() > 19) || (istDate.getHours() === 19 && istDate.getMinutes() > 30);
    
    if (isLate) {
        timeStr += " 🔴 LATE";
    }

    // 4. Update the Google Sheet Data (Sheet1)
    const dateStr = istDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    
    // Ensure "Today's Row" exists
    let rowInfo = await getTodayRow(dateStr);
    if (!rowInfo) {
        await createTodayRow(dateStr);
        rowInfo = await getTodayRow(dateStr); // Fetch again
    }

    if (rowInfo) {
        // [Time, Name, Comment, Link]
        // Note: We save the link in the log if provided, otherwise just "-"
        const dataToSave = [timeStr, supervisor, comment || "", sheetLink || "-"];
        await updateDepartmentData(rowInfo.rowIndex, dept.startCol, dataToSave);
    }

    // 5. Update the Stored Link (Config_Links) ONLY IF PROVIDED
    if (sheetLink && sheetLink.includes('docs.google.com')) {
        await updateStoredLink(deptId, sheetLink);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const dateStr = istDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const rowInfo = await getTodayRow(dateStr);
    const savedLinks = await import('@/lib/sheets').then(m => m.getStoredLinks());

    const departments = DEPARTMENTS.map(dept => {
      let isCompleted = false;
      let data = { timestamp: '', supervisor: '', comment: '' };

      if (rowInfo && rowInfo.data) {
        // Data structure in sheet: [Time, Name, Comment, Link]
        const colIdx = dept.startCol; // 0-indexed from sheet array? No, Sheet API returns 0-indexed array relative to A1
        // API returns array of strings. row[0] is Date.
        // Index mapping:
        // Dept 1 (Floor): Cols 1,2,3,4 (Indices 1,2,3,4)
        // Dept 2: Indices 5,6,7,8
        const time = rowInfo.data[dept.startCol];
        if (time) {
            isCompleted = true;
            data = {
                timestamp: time,
                supervisor: rowInfo.data[dept.startCol + 1],
                comment: rowInfo.data[dept.startCol + 2]
            };
        }
      }

      return {
        id: dept.id,
        name: dept.name,
        completed: isCompleted,
        ...data,
        savedLink: savedLinks[dept.id] || ''
      };
    });

    return NextResponse.json({ departments });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}