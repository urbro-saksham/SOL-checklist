import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

const INDEX_URL =
  "https://docs.google.com/spreadsheets/d/1ec9iB8u1rLEZuL3G0nIT6mkUYWI1vSbER8GHIJEWTDU/export?format=csv";

// https://docs.google.com/spreadsheets/d/1ec9iB8u1rLEZuL3G0nIT6mkUYWI1vSbER8GHIJEWTDU/edit?usp=sharing
async function getLatestFileId() {
  console.log('\n🔍 Step 1: Fetching file index from Google Sheets...');
  console.log('Index URL:', INDEX_URL);
  
  const res = await fetch(INDEX_URL, { cache: "no-store" });
  const csv = await res.text();
 
  console.log('✅ Index CSV fetched, length:', csv.length);
  console.log('First 500 chars:', csv.substring(0, 500));

  const { data } = Papa.parse(csv, { header: true });
  console.log('📊 Total rows parsed:', data.length);
  console.log('Sample rows:', data.slice(0, 3));

  const normalized = data.map((row: any) => ({
    name: row.Name?.trim(),
    fileId: row.FileId?.trim(),
  }));

  // filter valid rows
  const validFiles = normalized
    .filter(
      (row: any) =>
        row.fileId &&
        row.fileId !== "PENDING_SYNC" &&
        row.name?.startsWith("Attendance_")
    )
    .map((row: any) => {
      const match = row.name.match(/Attendance_(\d{4})_(\d{2})/);
      if (!match) return null;

      return {
        fileId: row.fileId,
        name: row.name,
        year: Number(match[1]),
        month: Number(match[2]),
      };
    })
    .filter(Boolean);

  console.log('📋 Valid attendance files found:', validFiles.length);
  console.log('Files:', validFiles);

  // pick latest by year + month
  validFiles.sort((a: any, b: any) =>
    a.year !== b.year ? b.year - a.year : b.month - a.month
  );

  const latest = validFiles[0];
  console.log('✅ Latest file selected:', latest);
  
  return latest?.fileId;
}

async function fetchLatestAttendance() {
  const fileId = await getLatestFileId();
  if (!fileId) {
    console.error('❌ No synced file found in index!');
    throw new Error("No synced file found");
  }

  console.log('\n📥 Step 2: Downloading Excel file from Google Drive...');
  console.log('File ID:', fileId);
  
  // Try multiple download URL formats
  const downloadUrls = [
    `https://drive.google.com/uc?export=download&id=${fileId}`,
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    `https://drive.google.com/u/0/uc?id=${fileId}&export=download`,
  ];
  
  let res: Response | null = null;
  let lastError: string = '';
  
  for (let i = 0; i < downloadUrls.length; i++) {
    const url = downloadUrls[i];
    console.log(`\nTrying download URL ${i + 1}/${downloadUrls.length}:`, url);
    
    try {
      const response = await fetch(url, { 
        cache: "no-store",
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      console.log(`  Response status: ${response.status}`);
      console.log(`  Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        res = response;
        console.log(`  ✅ Success with URL ${i + 1}`);
        break;
      } else {
        const text = await response.text();
        console.log(`  ❌ Failed, body preview:`, text.substring(0, 200));
        lastError = `Status ${response.status}: ${text.substring(0, 100)}`;
      }
    } catch (err: any) {
      console.log(`  ❌ Fetch error:`, err.message);
      lastError = err.message;
    }
  }
  
  if (!res) {
    console.error('❌ All download URLs failed!');
    console.error('Last error:', lastError);
    throw new Error(`Cannot download file from Google Drive. Make sure the file is publicly accessible (Anyone with the link can view). Last error: ${lastError}`);
  }

  const buffer = await res.arrayBuffer();
  console.log('✅ File downloaded, size:', buffer.byteLength, 'bytes');

  console.log('\n📖 Step 3: Reading Excel workbook...');
  const workbook = XLSX.read(buffer);
  console.log('Available sheets:', workbook.SheetNames);
  
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Check sheet range to see if data exists
  const sheetRange = sheet['!ref'];
  console.log('Sheet range:', sheetRange);
  
  // Try to see raw cell data
  console.log('\n🔍 Raw sheet structure (first few cells):');
  ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'I1', 'J1'].forEach(cellRef => {
    if (sheet[cellRef]) {
      console.log(`  ${cellRef}:`, sheet[cellRef].v || sheet[cellRef].w || sheet[cellRef]);
    }
  });
  
  const jsonData = XLSX.utils.sheet_to_json(sheet, {
  defval: "",
  raw: false
});
  
  console.log('\n✅ Sheet converted to JSON');
  console.log('Total rows:', jsonData.length);
  
  if (jsonData.length > 0) {
    const firstRow = jsonData[0] as Record<string, any>;
    console.log('\n📋 First row keys:', Object.keys(firstRow));
    console.log('📋 First row values:', Object.values(firstRow));
    console.log('\n📋 First 3 rows (full):');
    jsonData.slice(0, 3).forEach((row, i) => {
      console.log(`  Row ${i + 1}:`, JSON.stringify(row, null, 2));
    });
  }

  return jsonData;
}

export async function GET() {
  try {
    console.log('\n========== ATTENDANCE API START ==========');
    console.log('Time:', new Date().toISOString());
    
    // Fetch data from Google Drive
    const data = await fetchLatestAttendance();
    
    console.log('\n📊 Step 4: Analyzing Excel structure...');
    
    if (data.length === 0) {
      console.error('❌ No data in Excel file!');
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }
    
    // Show first 3 rows of raw data
    console.log('\n📋 Sample data (first 3 rows):');
    data.slice(0, 3).forEach((row: any, i: number) => {
      console.log(`Row ${i + 1}:`, {
        EmployeeCode: row.EmployeeCode,
        EmployeeName: row.EmployeeName,
        DepartmentName: row.DepartmentName,
        Designation: row.Designation,
        Location: row.Location
      });
    });
    
    const firstRow: any = data[0];
    const allColumns = Object.keys(firstRow);
    console.log('\n📊 Column Analysis:');
    console.log('Total columns:', allColumns.length);
    console.log('All column names:', allColumns);
    
    // Standard columns (non-date columns)
    const standardCols = ['EmployeeCode', 'EmployeeName', 'DepartmentName', 'Designation', 'Location', 'Shift'];
    console.log('Standard columns to filter:', standardCols);
    
    // Find date columns - anything that's not a standard column and contains date-like patterns
    const dateColumns = allColumns.filter(col => {
      const isStandard = standardCols.includes(col);
      const hasDatePattern = col.includes('-') || col.includes('/') || /^\d{2}-\d{2}-\d{4}$/.test(col) || /^\d{4}-\d{2}-\d{2}$/.test(col);
      return !isStandard && hasDatePattern;
    });
    
    console.log('\n📅 Date Columns Analysis:');
    console.log('Date columns found:', dateColumns.length);
    console.log('Date column names:', dateColumns);
    
    // Show which columns were filtered out
    const nonDateNonStandard = allColumns.filter(col => !standardCols.includes(col) && !dateColumns.includes(col));
    if (nonDateNonStandard.length > 0) {
      console.log('⚠️ Columns ignored (not standard, not date-like):', nonDateNonStandard);
    }
    
    if (dateColumns.length === 0) {
      console.error('❌ No date columns found!');
      console.error('All columns detected:', allColumns);
      console.error('Standard columns filter:', standardCols);
      console.error('Columns that were filtered out:', allColumns.filter(col => !standardCols.includes(col)));
      
      // Show raw first row
      console.error('\n🔍 Raw first row data:');
      console.error(JSON.stringify(firstRow, null, 2));
      
      return NextResponse.json({ 
        error: 'No date columns found in Excel file',
        message: `Found ${allColumns.length} columns total. Expected at least 5 standard columns + date columns.`,
        columnsFound: allColumns,
        standardColumnsExpected: standardCols,
        rawFirstRow: firstRow,
        suggestion: 'Check if Excel file has correct headers: EmployeeCode, EmployeeName, DepartmentName, Designation, Location, then date columns'
      }, { status: 400 });
    }
    
    // Use last date column (most recent)
    const lastDateColumn = dateColumns[dateColumns.length - 1];
    console.log('\n✅ Using LAST date column for attendance:', lastDateColumn);
    console.log('📋 Sample attendance values from this date:');
    data.slice(0, 10).forEach((row: any, i: number) => {
      console.log(`  ${i + 1}. ${row.EmployeeName} (${row.DepartmentName}/${row.Location}): ${row[lastDateColumn]}`);
    });
    
    // Process attendance counts
    console.log('\n👥 Step 5: Processing attendance data...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('FILTERING RULES (ONLY: Location + Designation + Date Status):');
    console.log('  🏢 Basement Rollers: BASEMENT location + ROLLER designation');
    console.log('  👔 Basement Supervisors: BASEMENT location + SUPERVISOR designation');
    console.log('  🔧 Basement Gummers: BASEMENT location + GUMMER designation');
    console.log('  🏢 First Floor Rollers: (1ST FLOOR or GROUND FLOOR) location + ROLLER designation');
    console.log('  👔 First Floor Supervisors: (1ST FLOOR or GROUND FLOOR) location + SUPERVISOR designation');
    console.log('  🔧 First Floor Gummers: (1ST FLOOR or GROUND FLOOR) location + GUMMER designation');
    console.log('  ✅ Quality: Any location + CHECKER designation');
    console.log('  📦 Packing: Any location + Packing related designation');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const counts = {
      basementRollers: 0,
      basementRollersPresent: 0,
      basementRollersAbsent: 0,
      
      basementSupervisorTotal: 0,
      basementSupervisorPresent: 0,
      basementSupervisorAbsent: 0,
      
      firstFloorRollers: 0,
      firstFloorRollersPresent: 0,
      firstFloorRollersAbsent: 0,
      
      firstFloorSupervisorTotal: 0,
      firstFloorSupervisorPresent: 0,
      firstFloorSupervisorAbsent: 0,

      basementfilterTotal: 0,
      basementfilterPresent: 0,
      basementfilterAbsent: 0,
      
      firstFloorfilterTotal: 0,
      firstFloorfilterPresent: 0,
      firstFloorfilterAbsent: 0,
      
      supervisorTotal: 0,
      supervisorPresent: 0,
      supervisorAbsent: 0,
      
      qualityTotal: 0,
      qualityPresent: 0,
      qualityAbsent: 0,
      
      packingTotal: 0,
      packingPresent: 0,
      packingAbsent: 0
    };
    
    let processedCount = 0;
    let presentCount = 0;
    let absentCount = 0;
    let unknownStatusCount = 0;
    let uniqueStatusValues = new Set<string>();
    let matchedEmployees = {
      basement: [] as string[],
      basementSupervisor: [] as string[],
      firstFloor: [] as string[],
      firstFloorSupervisor: [] as string[],
      firstFloorFilter: [] as string[],
      basementFilter: [] as string[],
      filter: [] as string[],
      management: [] as string[],
      quality: [] as string[],
      packing: [] as string[]
    };
    
    data.forEach((row: any, index: number) => {
      const dept = (row.DepartmentName || '').toString().toUpperCase().trim();
      const loc = (row.Location || '').toString().toUpperCase().trim();
      const designation = (row.Designation || '').toString().toUpperCase().trim();
      const status = (row[lastDateColumn] || '').toString().toUpperCase().trim();
      const empName = row.EmployeeName || 'Unknown';
      
      // Track all unique status values
      if (status) {
        uniqueStatusValues.add(status);
      }
      
      // More flexible status checking - handle multiple variations
      const isPresent = status === 'PRESENT' || status === 'P' || status.startsWith('P') || status.includes('PRESENT');
      const isAbsent = status === 'ABSENT' || status === 'A' || status.startsWith('A') || status.includes('ABSENT');
      
      // Track status counts for debugging
      if (isPresent) {
        presentCount++;
      } else if (isAbsent) {
        absentCount++;
      } else if (status) {
        unknownStatusCount++;
      }
      
      // Log first 20 employees for debugging with more detail
      if (index < 20) {
        console.log(`  ${index + 1}. ${empName}`);
        console.log(`      Dept: "${dept}" | Loc: "${loc}" | Designation: "${designation}"`);
        console.log(`      Status: "${status}" | Present: ${isPresent} | Absent: ${isAbsent}`);
        console.log(`      Raw status value type: ${typeof row[lastDateColumn]}, value: "${row[lastDateColumn]}"`);
      }
      
      processedCount++;
      
      // ✅ BASEMENT SECTION - ONLY Location + Designation + Date
      // Basement Rollers: BASEMENT location + ROLLER designation
      if (loc === 'BASEMENT' && designation === 'ROLLER') {
        counts.basementRollers++;
        matchedEmployees.basement.push(`${empName} (${status})`);
        if (isPresent) {
          counts.basementRollersPresent++;
        }
        if (isAbsent) {
          counts.basementRollersAbsent++;
        }
      }

      // ✅ FIRST FLOOR SECTION - ONLY Location + Designation + Date
      // First Floor Rollers: (1ST FLOOR OR GROUND FLOOR) location + ROLLER designation
      if ((loc === '1ST FLOOR') && designation === 'ROLLER') {
        counts.firstFloorRollers++;
        matchedEmployees.firstFloor.push(`${empName} (${status})`);
        if (isPresent) {
          counts.firstFloorRollersPresent++;
        }
        if (isAbsent) {
          counts.firstFloorRollersAbsent++;
        }
      }
      
      // Basement Supervisors: BASEMENT location + SUPERVISOR designation
      if (loc === 'BASEMENT' && designation === 'SUPERVISOR') {
        counts.basementSupervisorTotal++;
        matchedEmployees.basementSupervisor.push(`${empName} (${status})`);
        if (isPresent) {
          counts.basementSupervisorPresent++;
        }
        if (isAbsent) {
          counts.basementSupervisorAbsent++;
        }
      }
      
      // First Floor Supervisors: (1ST FLOOR OR GROUND FLOOR) location + SUPERVISOR designation
      if ((loc === '1ST FLOOR') && designation === 'SUPERVISOR') {
        counts.firstFloorSupervisorTotal++;
        matchedEmployees.firstFloorSupervisor.push(`${empName} (${status})`);
        if (isPresent) {
          counts.firstFloorSupervisorPresent++;
        }
        if (isAbsent) {
          counts.firstFloorSupervisorAbsent++;
        }
      }

      if ((loc === 'BASEMENT') && designation === 'GUMMER') {
        counts.basementfilterTotal++;
        matchedEmployees.basementFilter.push(`${empName} (${status})`);
        if (isPresent) {
          counts.basementfilterPresent++;
        }
        if (isAbsent) {
          counts.basementfilterAbsent++;
        }
      }

      if ((loc === '1ST FLOOR') && designation === 'GUMMER') {
        counts.firstFloorfilterTotal++;
        matchedEmployees.firstFloorFilter.push(`${empName} (${status})`);
        if (isPresent) {
          counts.firstFloorfilterPresent++;
        }
        if (isAbsent) {
          counts.firstFloorfilterAbsent++;
        }
      }
      
      // General Supervisors (for backward compatibility - count all supervisors not in specific floors)
      if (designation === 'SUPERVISOR') {
        counts.supervisorTotal++;
        matchedEmployees.management.push(`${empName} (${status})`);
        if (isPresent) counts.supervisorPresent++;
        if (isAbsent) counts.supervisorAbsent++;
      }
      
      // ✅ QUALITY SECTION - CHECKER designation
      if (designation === 'CHECKER') {
        counts.qualityTotal++;
        matchedEmployees.quality.push(`${empName} (${status})`);
        if (isPresent) counts.qualityPresent++;
        if (isAbsent) counts.qualityAbsent++;
      }
      
      // ✅ PACKING SECTION - Look for packing-related designations
      if (designation.includes('PACK') || dept === 'PACKING') {
        counts.packingTotal++;
        matchedEmployees.packing.push(`${empName} (${status})`);
        if (isPresent) counts.packingPresent++;
        if (isAbsent) counts.packingAbsent++;
      }
    });
    
    console.log('\n✅ Processing complete!');
    console.log('Total employees processed:', processedCount);
    console.log('');
    console.log('📊 STATUS CLASSIFICATION SUMMARY:');
    console.log('  ✅ Classified as PRESENT:', presentCount, `(${Math.round(presentCount/processedCount*100)}%)`);
    console.log('  ❌ Classified as ABSENT:', absentCount, `(${Math.round(absentCount/processedCount*100)}%)`);
    console.log('  ⚠️  Unknown/Other status:', unknownStatusCount, `(${Math.round(unknownStatusCount/processedCount*100)}%)`);
    
    // Show all unique status values found in the data
    console.log('\n📊 UNIQUE STATUS VALUES FOUND IN EXCEL:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const statusArray = Array.from(uniqueStatusValues).sort();
    console.log('Total unique status values:', statusArray.length);
    statusArray.forEach((val, idx) => {
      console.log(`  ${idx + 1}. "${val}"`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Show matched employees for each category (first 5 of each)
    console.log('\n👥 Matched Employees by Category:');
    console.log('\n🏢 BASEMENT SECTION (Location = BASEMENT):');
    console.log('  → Basement Rollers (Location: BASEMENT + Designation: ROLLER):', matchedEmployees.basement.length, 'employees');
    console.log('     Total:', counts.basementRollers, '| Present:', counts.basementRollersPresent, '| Absent:', counts.basementRollersAbsent);
    if (matchedEmployees.basement.length > 0) {
      console.log('     Sample:', matchedEmployees.basement.slice(0, 5).join(', '));
    }
    
    console.log('  → Basement Supervisors (Location: BASEMENT + Designation: SUPERVISOR):', matchedEmployees.basementSupervisor.length, 'employees');
    console.log('     Total:', counts.basementSupervisorTotal, '| Present:', counts.basementSupervisorPresent, '| Absent:', counts.basementSupervisorAbsent);
    if (matchedEmployees.basementSupervisor.length > 0) {
      console.log('     Sample:', matchedEmployees.basementSupervisor.join(', '));
    }
    
    console.log('\n🏢 FIRST FLOOR SECTION (Location = 1ST FLOOR or GROUND FLOOR):');
    console.log('  → First Floor Rollers (Location: 1ST FLOOR/GROUND + Designation: ROLLER):', matchedEmployees.firstFloor.length, 'employees');
    console.log('     Total:', counts.firstFloorRollers, '| Present:', counts.firstFloorRollersPresent, '| Absent:', counts.firstFloorRollersAbsent);
    if (matchedEmployees.firstFloor.length > 0) {
      console.log('     Sample:', matchedEmployees.firstFloor.slice(0, 5).join(', '));
    }
    
    console.log('  → First Floor Supervisors (Location: 1ST FLOOR/GROUND + Designation: SUPERVISOR):', matchedEmployees.firstFloorSupervisor.length, 'employees');
    console.log('     Total:', counts.firstFloorSupervisorTotal, '| Present:', counts.firstFloorSupervisorPresent, '| Absent:', counts.firstFloorSupervisorAbsent);
    if (matchedEmployees.firstFloorSupervisor.length > 0) {
      console.log('     Sample:', matchedEmployees.firstFloorSupervisor.join(', '));
    }
    
    console.log('\n🔧 GUMMER SECTION:');
    console.log('  → Basement Gummers (Location: BASEMENT + Designation: GUMMER):', matchedEmployees.basementFilter.length, 'employees');
    console.log('     Total:', counts.basementfilterTotal, '| Present:', counts.basementfilterPresent, '| Absent:', counts.basementfilterAbsent);
    if (matchedEmployees.basementFilter.length > 0) {
      console.log('     Sample:', matchedEmployees.basementFilter.slice(0, 5).join(', '));
    }
    
    console.log('  → First Floor Gummers (Location: 1ST FLOOR + Designation: GUMMER):', matchedEmployees.firstFloorFilter.length, 'employees');
    console.log('     Total:', counts.firstFloorfilterTotal, '| Present:', counts.firstFloorfilterPresent, '| Absent:', counts.firstFloorfilterAbsent);
    if (matchedEmployees.firstFloorFilter.length > 0) {
      console.log('     Sample:', matchedEmployees.firstFloorFilter.slice(0, 5).join(', '));
    }
    
    console.log('\n👔 ALL SUPERVISORS SECTION:');
    console.log('  → All Supervisors (Designation: SUPERVISOR):', matchedEmployees.management.length, 'employees');
    console.log('     Total:', counts.supervisorTotal, '| Present:', counts.supervisorPresent, '| Absent:', counts.supervisorAbsent);
    if (matchedEmployees.management.length > 0) {
      console.log('     Sample:', matchedEmployees.management.join(', '));
    }
    
    console.log('\n✅ QUALITY SECTION:');
    console.log('  → Quality Checkers (Designation: CHECKER):', matchedEmployees.quality.length, 'employees');
    console.log('     Total:', counts.qualityTotal, '| Present:', counts.qualityPresent, '| Absent:', counts.qualityAbsent);
    if (matchedEmployees.quality.length > 0) {
      console.log('     Sample:', matchedEmployees.quality.slice(0, 5).join(', '));
    }
    
    console.log('\n📦 PACKING SECTION:');
    console.log('  → Packing Staff (Designation/Dept contains PACK):', matchedEmployees.packing.length, 'employees');
    console.log('     Total:', counts.packingTotal, '| Present:', counts.packingPresent, '| Absent:', counts.packingAbsent);
    if (matchedEmployees.packing.length > 0) {
      console.log('     Sample:', matchedEmployees.packing.slice(0, 5).join(', '));
    }
    
    console.log('\n📊 FINAL COUNTS (ALL DATA):');
    console.log(JSON.stringify(counts, null, 2));
    
    console.log('\n✅ VERIFICATION - PRESENT ONLY (What shows on Dashboard):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 BASEMENT SECTION (Location = BASEMENT):');
    console.log('   • Rollers Present:', counts.basementRollersPresent, '/', counts.basementRollers, 'total');
    console.log('   • Supervisors Present:', counts.basementSupervisorPresent, '/', counts.basementSupervisorTotal, 'total');
    console.log('   • Gummers Present:', counts.basementfilterPresent, '/', counts.basementfilterTotal, 'total');
    console.log('');
    console.log('📍 FIRST FLOOR SECTION (Location = 1ST FLOOR or GROUND FLOOR):');
    console.log('   • Rollers Present:', counts.firstFloorRollersPresent, '/', counts.firstFloorRollers, 'total');
    console.log('   • Supervisors Present:', counts.firstFloorSupervisorPresent, '/', counts.firstFloorSupervisorTotal, 'total');
    console.log('   • Gummers Present:', counts.firstFloorfilterPresent, '/', counts.firstFloorfilterTotal, 'total');
    console.log('');
    console.log('📍 QUALITY SECTION:');
    console.log('   • Checkers Present:', counts.qualityPresent, '/', counts.qualityTotal, 'total');
    console.log('');
    console.log('📍 PACKING SECTION:');
    console.log('   • Manpower Present:', counts.packingPresent, '/', counts.packingTotal, 'total');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Show unique departments, locations, and designations
    const uniqueDepts = [...new Set(data.map((r: any) => (r.DepartmentName || '').toString().toUpperCase().trim()))];
    const uniqueLocs = [...new Set(data.map((r: any) => (r.Location || '').toString().toUpperCase().trim()))].filter(Boolean);
    const uniqueDesignations = [...new Set(data.map((r: any) => (r.Designation || '').toString().toUpperCase().trim()))].filter(Boolean);
    
    console.log('\n📋 All Unique Departments Found:', uniqueDepts);
    console.log('📋 All Unique Locations Found:', uniqueLocs);
    console.log('📋 All Unique Designations Found:', uniqueDesignations);
    
    const response = {
      success: true,
      lastUpdated: lastDateColumn,
      totalEmployees: data.length,
      attendance: counts,
      debug: {
        uniqueDepartments: uniqueDepts,
        uniqueLocations: uniqueLocs,
        uniqueDesignations: uniqueDesignations
      }
    };
    
    console.log('\n✅ Sending response to frontend');
    console.log('========== ATTENDANCE API END ==========\n');
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('\n❌❌❌ CRITICAL ERROR ❌❌❌');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('========== ATTENDANCE API ERROR END ==========\n');
    
    return NextResponse.json({ 
      error: 'Failed to fetch attendance',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

