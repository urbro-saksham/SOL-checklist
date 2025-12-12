import { NextResponse } from 'next/server';
import { getTodayRow, createTodayRow, updateDepartmentData, DEPARTMENTS } from '@/lib/sheets';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET() {
  // IST Date for Today
  const today = new Date().toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).split(',')[0]; 
  
  try {
    let row = await getTodayRow(today);
    
    if (!row) {
      await createTodayRow(today);
      await new Promise(r => setTimeout(r, 1000));
      row = await getTodayRow(today);
    }
    
    const rowData = row?.data || [];
    const structuredData = DEPARTMENTS.map((dept) => ({
      id: dept.id,
      name: dept.name,
      completed: rowData[dept.startCol] === 'TRUE',
      supervisor: rowData[dept.startCol + 1] || '',
      timestamp: rowData[dept.startCol + 2] || '',
      comment: rowData[dept.startCol + 3] || '',
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
    const { rowIndex, deptId, supervisor, comment } = body; // No sheetLink needed anymore
    
    const dept = DEPARTMENTS.find(d => d.id === deptId);
    if (!dept) return NextResponse.json({ error: 'Invalid Dept' }, { status: 400 });

    // IST Timestamp
    const timestamp = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true });

    // Mark as Complete
    await updateDepartmentData(rowIndex, dept.startCol, ['TRUE', supervisor, timestamp, comment]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save Error:", error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}