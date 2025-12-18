import { NextResponse } from 'next/server';
import { createTodayRow, updateDepartmentData, updateStoredLink, logDepartmentData, DEPARTMENTS, getTodayRow } from '@/lib/sheets';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
        deptId, supervisor, comment, sheetLink,
        prodCount, boxesUsed, totalPresent, totalAbsent, 
        piecesReceived, okPieces, rejCount, itemsAdded 
    } = body;

    // 1. Mandatory Check
    if (!deptId || !supervisor) {
      return NextResponse.json({ error: "Missing Name or ID" }, { status: 400 });
    }

    const dept = DEPARTMENTS.find(d => d.id === deptId);
    if (!dept) return NextResponse.json({ error: "Invalid Dept" }, { status: 400 });

    // 2. Prepare Time
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    let timeStr = istDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    // Late Logic
    const isLate = (istDate.getHours() > 19) || (istDate.getHours() === 19 && istDate.getMinutes() > 30);
    if (isLate) timeStr += " 🔴 LATE";

    // 3. Update MAIN SHEET (Status Board)
    const dateStr = istDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    let rowInfo = await getTodayRow(dateStr);
    if (!rowInfo) {
        await createTodayRow(dateStr);
        rowInfo = await getTodayRow(dateStr);
    }

    if (rowInfo) {
        // [Time, Name, Comment, Link]
        const dataToSave = [timeStr, supervisor, comment || "", sheetLink || "-"];
        await updateDepartmentData(rowInfo.rowIndex, dept.startCol, dataToSave);
    }

    // 4. LOG TO SEPARATE DATABASE SHEET
    const rawData = { 
        supervisor, comment, sheetLink,
        prodCount, boxesUsed, totalPresent, totalAbsent, 
        piecesReceived, okPieces, rejCount, itemsAdded 
    };
    
    await logDepartmentData(deptId, rawData);

    // 5. Update Config Link (only if valid)
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