import { NextResponse } from 'next/server';
import { getTodayRow, createTodayRow, updateDepartmentData, checkSheetForToday, getStoredLinks, updateStoredLink, DEPARTMENTS } from '@/lib/sheets';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET() {
  const today = new Date().toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).split(',')[0]; 
  
  try {
    // 1. Get Checklist Status
    let row = await getTodayRow(today);
    if (!row) {
      await createTodayRow(today);
      await new Promise(r => setTimeout(r, 1000));
      row = await getTodayRow(today);
    }
    
    // 2. Get Dynamic Links
    const savedLinks = await getStoredLinks();

    const rowData = row?.data || [];
    const structuredData = DEPARTMENTS.map((dept) => ({
      id: dept.id,
      name: dept.name,
      completed: rowData[dept.startCol] === 'TRUE',
      supervisor: rowData[dept.startCol + 1] || '',
      timestamp: rowData[dept.startCol + 2] || '',
      comment: rowData[dept.startCol + 3] || '',
      // Attach the saved link to the department object
      currentLink: savedLinks[dept.id] || '' 
    }));

    const isAllDone = structuredData.every(d => d.completed);

    return NextResponse.json({ 
        date: today, 
        rowIndex: row?.rowIndex ?? 0, 
        departments: structuredData,
        isAllDone
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rowIndex, deptId, supervisor, comment, sheetLink } = body;
    
    const dept = DEPARTMENTS.find(d => d.id === deptId);
    if (!dept) return NextResponse.json({ error: 'Invalid Dept' }, { status: 400 });

    if (deptId !== 'it_check') {
        if (!sheetLink) return NextResponse.json({ error: "Link missing" }, { status: 400 });
        const isValid = await checkSheetForToday(sheetLink);
        if (!isValid) return NextResponse.json({ error: `⚠️ Data Missing! Today's date not found in the sheet.` }, { status: 400 });
        
        // --- 💾 SAVE LINK FOR NEXT TIME ---
        await updateStoredLink(deptId, sheetLink);
    }

    const now = new Date();
    const istTimeStr = now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });
    const [hours, minutes] = istTimeStr.split(':').map(Number);
    let displayTime = now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true });

    if (hours > 19 || (hours === 19 && minutes > 30)) {
        displayTime = `${displayTime} 🔴 LATE`;
    }

    await updateDepartmentData(rowIndex, dept.startCol, ['TRUE', supervisor, displayTime, comment]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save Error:", error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}