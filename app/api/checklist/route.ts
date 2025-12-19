import { NextResponse } from 'next/server';
import { 
  createTodayRow, 
  updateDepartmentData, 
  updateStoredLink, 
  logDepartmentData, 
  DEPARTMENTS, 
  getTodayRow, 
  getRowByDate,   // <--- Added 
  getStoredLinks  // <--- Added
} from '@/lib/sheets';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
        deptId, supervisor, comment, sheetLink,
        prodCount, boxesUsed, totalPresent, totalAbsent, 
        piecesReceived, okPieces, rejCount, itemsAdded 
    } = body;

    if (!deptId || !supervisor) {
      return NextResponse.json({ error: "Missing Name or ID" }, { status: 400 });
    }

    const dept = DEPARTMENTS.find(d => d.id === deptId);
    if (!dept) return NextResponse.json({ error: "Invalid Dept" }, { status: 400 });

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    let timeStr = istDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    // 7:30 PM LATE Logic
    const isLate = (istDate.getHours() > 19) || (istDate.getHours() === 19 && istDate.getMinutes() > 30);
    if (isLate) timeStr += " 🔴 LATE";

    const dateStr = istDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    let rowInfo = await getTodayRow(dateStr);
    if (!rowInfo) {
        await createTodayRow(dateStr);
        rowInfo = await getTodayRow(dateStr);
    }

    if (rowInfo) {
        const dataToSave = [timeStr, supervisor, comment || "", sheetLink || "-"];
        await updateDepartmentData(rowInfo.rowIndex, dept.startCol, dataToSave);
    }

    const rawData = { 
        supervisor, comment, sheetLink,
        prodCount, boxesUsed, totalPresent, totalAbsent, 
        piecesReceived, okPieces, rejCount, itemsAdded 
    };
    
    await logDepartmentData(deptId, rawData);

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
    
    // 1. Get Dates (Today & Yesterday)
    const istDate = new Date(now.getTime() + istOffset);
    const dateStr = istDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const yesterdayDate = new Date(now.getTime() + istOffset - (24 * 60 * 60 * 1000));
    const yesterdayStr = yesterdayDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    // 2. Fetch Data
    const [rowInfo, yesterdayRow, savedLinks] = await Promise.all([
        getTodayRow(dateStr),
        getRowByDate(yesterdayStr),
        getStoredLinks()
    ]);

    const departments = DEPARTMENTS.map(dept => {
      let isCompleted = false;
      let data = { timestamp: '', supervisor: '', comment: '' };

      // A. Check Today
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

      // B. Check Yesterday (Late?)
      let lateYesterday = false;
      if (yesterdayRow && yesterdayRow.data) {
          const yTime = yesterdayRow.data[dept.startCol];
          if (yTime && yTime.includes('LATE')) {
              lateYesterday = true;
          }
      }

      return {
        id: dept.id,
        name: dept.name,
        completed: isCompleted,
        lateYesterday, // <--- Sent to Frontend
        ...data,
        savedLink: savedLinks[dept.id] || ''
      };
    });

    return NextResponse.json({ departments });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}