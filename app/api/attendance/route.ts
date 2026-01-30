import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

// const INDEX_URL = "https://docs.google.com/spreadsheets/d/1ec9iB8u1rLEZuL3G0nIT6mkUYWI1vSbER8GHIJEWTDU/export?format=csv";

const INDEX_URL = "https://docs.google.com/spreadsheets/d/1nCeM9jtXEfm7fHsHnLVJugxmJU-TirWlAcDPFzEawkM/export?format=csv";

// Path where we cache the latest downloaded attendance Excel file
const LOCAL_EXCEL_PATH = path.join(process.cwd(), 'public', 'attendance-latest.xlsx');

// https://docs.google.com/spreadsheets/d/1ec9iB8u1rLEZuL3G0nIT6mkUYWI1vSbER8GHIJEWTDU/edit?usp=sharing
async function getLatestFileId() {
  console.log('\n🔍 Step 1: Fetching file index from Google Sheets...');
  console.log('Index URL:', INDEX_URL);
  
  const res = await fetch(INDEX_URL, { cache: "no-store" });
  const csv = await res.text();
 
  console.log('✅ Index CSV fetched, length:', csv.length);

  const { data } = Papa.parse(csv, { header: true });
  console.log('📊 Total rows parsed:', data.length);
  console.log('Sample rows:', data.slice(0, 3));
  console.log('FULL DATA' + ':', data); // file
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

async function parseAttendanceFromBuffer(buffer: ArrayBuffer | Buffer) {
  console.log('\n📖 Step 3: Reading Excel workbook...');
  const workbook = XLSX.read(buffer, { 
    cellDates: true,
    cellNF: false,
    cellText: false,
    dense: false
  });
  console.log('Available sheets:', workbook.SheetNames);
  
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Check sheet range to see if data exists
  const sheetRange = sheet['!ref'];
  console.log('📊 Sheet range from !ref:', sheetRange);
  
  // CRITICAL DEBUG: Check all cells in the sheet to find the actual data range
  console.log('\n🔍 CRITICAL DEBUG: Analyzing sheet structure...');
  const sheetKeys = Object.keys(sheet).filter(key => !key.startsWith('!'));
  console.log('Total cells found in sheet:', sheetKeys.length);
  
  // Find the maximum column and row by scanning all cells
  let maxRow = 0;
  let maxCol = 0;
  const cellMap = new Map<string, any>();
  
  sheetKeys.forEach(key => {
    const cell = XLSX.utils.decode_cell(key);
    maxRow = Math.max(maxRow, cell.r);
    maxCol = Math.max(maxCol, cell.c);
    cellMap.set(key, sheet[key]);
  });
  
  console.log(`📊 Actual data range (from cell scan): Row 0-${maxRow}, Column 0-${maxCol}`);
  console.log(`📊 Sheet !ref range: ${sheetRange}`);
  
  if (sheetRange) {
    const refRange = XLSX.utils.decode_range(sheetRange);
    console.log(`📊 !ref decoded: Row ${refRange.s.r}-${refRange.e.r}, Column ${refRange.s.c}-${refRange.e.c}`);
    console.log(`⚠️  Range mismatch check: maxRow=${maxRow} vs refRange.e.r=${refRange.e.r}, maxCol=${maxCol} vs refRange.e.c=${refRange.e.c}`);
    
    if (maxCol > refRange.e.c) {
      console.log(`⚠️  WARNING: Actual columns (${maxCol}) exceed !ref range (${refRange.e.c})! This is likely the issue.`);
      console.log(`   The sheet range doesn't include all columns. We'll read directly from cells.`);
    }
  }
  
  // First, read without headers to find the header row
  console.log('\n🔍 Searching for header row containing "EmployeeCode"...');
  
  // Read ALL rows up to maxRow, scanning all columns
  const rawData: any[][] = [];
  for (let row = 0; row <= Math.min(maxRow, 1000); row++) {
    const rowData: any[] = [];
    for (let col = 0; col <= maxCol; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];
      if (cell) {
        // Get the value, handling different cell types
        let value: any = cell.v;
        if (cell.t === 'd' && cell.v instanceof Date) {
          value = cell.v;
        } else if (cell.t === 'n' && cell.w) {
          // If there's a formatted text, prefer it for dates
          value = cell.w;
        } else if (cell.t === 'n') {
          value = cell.v;
        } else {
          value = cell.v || cell.w || '';
        }
        rowData[col] = value;
      } else {
        rowData[col] = '';
      }
    }
    rawData.push(rowData);
  }
  
  console.log('Total raw rows found:', rawData.length);
  console.log('Max columns found:', maxCol + 1);
  
  // Find the row index that contains "EmployeeCode"
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(20, rawData.length); i++) {
    const row = rawData[i];
    const rowString = JSON.stringify(row).toUpperCase();
    if (rowString.includes('EMPLOYEECODE')) {
      headerRowIndex = i;
      console.log(`✅ Found header row at index ${i}`);
      console.log(`   Header row has ${row.length} columns`);
      console.log(`   First 10 header values:`, row.slice(0, 10));
      break;
    }
  }
  
  if (headerRowIndex === -1) {
    console.error('❌ Could not find header row with "EmployeeCode"');
    console.error('First 10 rows:', rawData.slice(0, 10));
    throw new Error('Header row with "EmployeeCode" not found in Excel file');
  }
  
  // Now parse again starting from the header row
  console.log(`\n📋 Parsing data starting from row ${headerRowIndex + 1}...`);
  
  // Get the raw header row to see actual column names
  const rawHeaderRow = rawData[headerRowIndex];
  console.log('\n📋 Raw header row analysis:');
  console.log('   Total columns:', rawHeaderRow.length);
  console.log('   Non-empty columns:', rawHeaderRow.filter((c: any) => c !== null && c !== undefined && c !== '').length);
  console.log('   First 20 columns:', rawHeaderRow.slice(0, 20));
  console.log('   Last 20 columns:', rawHeaderRow.slice(-20));
  
  console.log('\n📋 Raw header row types (first 30):');
  rawHeaderRow.slice(0, 30).forEach((cell: any, idx: number) => {
    console.log(`  Col ${idx}: value="${cell}", type=${typeof cell}, isDate=${cell instanceof Date}, stringified="${String(cell)}"`);
  });
  
  // Normalize header row - convert all headers to strings, handling dates and numbers
  const normalizedHeaders = rawHeaderRow.map((cell: any, idx: number) => {
    if (cell === null || cell === undefined || cell === '') {
      return `Column${idx + 1}`; // Fallback for empty headers
    }
    
    // Handle Date objects
    if (cell instanceof Date) {
      const year = cell.getFullYear();
      const month = String(cell.getMonth() + 1).padStart(2, '0');
      const day = String(cell.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Handle Excel date serial numbers (if Excel converted date headers to numbers)
    if (typeof cell === 'number') {
      // Check if it's a reasonable date serial (Excel dates start from 1 = Jan 1, 1900)
      // Dates in 2020s would be around 44000-45000 range
      if (cell > 1 && cell < 100000) {
        try {
          // Excel epoch: Dec 30, 1899
          const excelEpoch = new Date(1899, 11, 30);
          const date = new Date(excelEpoch.getTime() + cell * 24 * 60 * 60 * 1000);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        } catch (e) {
          // If conversion fails, just use the number as string
          return String(cell);
        }
      }
      return String(cell);
    }
    
    // Handle strings - trim whitespace
    return String(cell).trim();
  });
  
  console.log('\n📋 Normalized headers analysis:');
  console.log('   Total normalized headers:', normalizedHeaders.length);
  console.log('   First 10 headers:', normalizedHeaders.slice(0, 10));
  console.log('   Last 10 headers:', normalizedHeaders.slice(-10));
  console.log('   Headers that look like dates:', normalizedHeaders.filter((h: string) => {
    const trimmed = h.trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) || 
           /^\d{2}-\d{2}-\d{4}$/.test(trimmed) ||
           (trimmed.includes('-') && /\d/.test(trimmed));
  }));
  
  // Parse data rows (skip header row)
  const dataRows = rawData.slice(headerRowIndex + 1);
  console.log('\n📊 Data rows count:', dataRows.length);
  
  // Convert data rows to objects using normalized headers
  const jsonData = dataRows.map((row: any[]) => {
    const rowObj: any = {};
    normalizedHeaders.forEach((header: string, idx: number) => {
      rowObj[header] = row[idx] !== undefined && row[idx] !== null ? row[idx] : '';
    });
    return rowObj;
  });
  
  console.log('\n✅ Sheet converted to JSON');
  console.log('Total data rows (after header):', jsonData.length);
  
  if (jsonData.length > 0) {
    const firstRow = jsonData[0] as Record<string, any>;
    console.log('\n📋 First data row keys:', Object.keys(firstRow));
    console.log('📋 First data row keys count:', Object.keys(firstRow).length);
    console.log('📋 First 20 keys:', Object.keys(firstRow).slice(0, 20));
    console.log('📋 Last 20 keys:', Object.keys(firstRow).slice(-20));
    console.log('\n📋 First 3 data rows (full):');
    jsonData.slice(0, 3).forEach((row, i) => {
      console.log(`  Row ${i + 1}:`, JSON.stringify(row, null, 2));
    });
  }

  return jsonData;
}

async function fetchLatestAttendance() {
  let buffer: ArrayBuffer | Buffer | null = null;
  let lastError = '';

  try {
    const fileId = await getLatestFileId();
    if (!fileId) {
      console.error('❌ No synced file found in index! Will try local cached file if available.');
      lastError = 'No synced file found in index';
    } else {
      console.log('\n📥 Step 2: Downloading Excel file from Google Drive...');
      console.log('File ID:', fileId);
      
      // Try multiple download URL formats
      const downloadUrls = [
        `https://drive.google.com/uc?export=download&id=${fileId}`,
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        `https://drive.google.com/u/0/uc?id=${fileId}&export=download`,
      ];
      
      let res: Response | null = null;
      
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
      
      if (res) {
        const arrBuf = await res.arrayBuffer();
        buffer = arrBuf;
        console.log('✅ File downloaded from Drive, size:', arrBuf.byteLength, 'bytes');

        // Try to cache the file locally in the project root
        try {
          console.log('\n💾 Caching Excel file to project root at:', LOCAL_EXCEL_PATH);
          await fs.writeFile(LOCAL_EXCEL_PATH, Buffer.from(arrBuf));
          console.log('✅ Excel file cached successfully.');
        } catch (writeErr: any) {
          console.error('⚠️ Failed to cache Excel file locally:', writeErr.message);
        }
      } else {
        console.error('❌ All download URLs failed. Will attempt to read from local cached file.');
      }
    }
  } catch (err: any) {
    console.error('❌ Unexpected error while fetching from Drive:', err.message);
    lastError = err.message;
  }

  // If we don't have a buffer from Drive, fall back to local cached file
  if (!buffer) {
    try {
      console.log('\n📂 Attempting to read cached Excel file from project root...');
      const localBuffer = await fs.readFile(LOCAL_EXCEL_PATH);
      buffer = localBuffer;
      console.log('✅ Successfully loaded cached Excel file from:', LOCAL_EXCEL_PATH);
    } catch (readErr: any) {
      console.error('❌ Failed to read cached Excel file from project root:', readErr.message);
      throw new Error(
        `Cannot download file from Google Drive and no cached file found in project root. ` +
        `Last Drive error: ${lastError || 'Unknown error'}; Local read error: ${readErr.message}`
      );
    }
  }

  // At this point we have a buffer (either from Drive or local cache)
  return parseAttendanceFromBuffer(buffer);
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
    console.log('All column names (with types and values):');
    allColumns.forEach((col, idx) => {
      const value = firstRow[col];
      console.log(`  ${idx + 1}. "${col}" (type: ${typeof col}, value type: ${typeof value}, sample value: ${JSON.stringify(value)})`);
    });
    
    // Standard columns (non-date columns)
    const standardCols = ['EmployeeCode', 'EmployeeName', 'DepartmentName', 'Designation', 'Location', 'Shift'];
    console.log('Standard columns to filter:', standardCols);
  
    // Helper function to check if a column name looks like a date
    function isDateColumn(colName: string): boolean {
      if (!colName) return false;
      
      // Trim whitespace and convert to string
      const trimmed = String(colName).trim();
      
      // Check if it's a standard column (case-insensitive)
      const isStandard = standardCols.some(sc => sc.toLowerCase() === trimmed.toLowerCase());
      if (isStandard) return false;
      
      // Check for date patterns:
      // 1. YYYY-MM-DD format (e.g., 2026-01-01)
      // 2. DD-MM-YYYY format (e.g., 01-01-2026)
      // 3. MM/DD/YYYY or DD/MM/YYYY format
      // 4. Contains dash or slash separators with numbers
      // 5. Excel date serial numbers (if Excel converted dates to numbers)
      
      // Exact date format patterns
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
        /^\d{2}-\d{2}-\d{4}$/,           // DD-MM-YYYY
        /^\d{4}\/\d{2}\/\d{2}$/,         // YYYY/MM/DD
        /^\d{2}\/\d{2}\/\d{4}$/,         // MM/DD/YYYY or DD/MM/YYYY
        /^\d{1,2}-\d{1,2}-\d{4}$/,       // D-M-YYYY or DD-MM-YYYY (flexible)
        /^\d{4}-\d{1,2}-\d{1,2}$/,       // YYYY-M-D or YYYY-MM-DD (flexible)
      ];
      
      // Check exact patterns first
      if (datePatterns.some(pattern => pattern.test(trimmed))) {
        return true;
      }
      
      // Check if it contains date-like separators with numbers
      // Pattern: has dashes or slashes AND contains numbers
      if ((trimmed.includes('-') || trimmed.includes('/')) && /\d/.test(trimmed)) {
        // More specific check: should have at least 2 numbers separated by dash/slash
        const parts = trimmed.split(/[-\/]/);
        if (parts.length >= 2 && parts.every(p => /\d/.test(p))) {
          return true;
        }
      }
      
      // Check for Excel date serial numbers (if Excel converted date headers)
      // Excel dates are typically > 1 (Jan 1, 1900 = 1)
      // But this is unlikely for headers, so we'll skip this check
      
      return false;
    }
    
    // Find date columns - anything that's not a standard column and contains date-like patterns
    const dateColumns = allColumns.filter(col => {
      return isDateColumn(col);
    });
    
    console.log('\n📅 Date Columns Analysis:');
    console.log('Date columns found:', dateColumns.length);
    console.log('Date column names:', dateColumns);
    
    // Show which columns were filtered out
    const nonDateNonStandard = allColumns.filter(col => !standardCols.includes(col) && !dateColumns.includes(col));
    if (nonDateNonStandard.length > 0) {
      console.log('⚠️ Columns ignored (not standard, not date-like):', nonDateNonStandard);
      console.log('⚠️ Detailed analysis of ignored columns:');
      nonDateNonStandard.forEach(col => {
        const trimmed = String(col).trim();
        const hasDash = trimmed.includes('-');
        const hasSlash = trimmed.includes('/');
        const hasNumbers = /\d/.test(trimmed);
        console.log(`  - "${col}" (trimmed: "${trimmed}")`);
        console.log(`    Has dash: ${hasDash}, Has slash: ${hasSlash}, Has numbers: ${hasNumbers}`);
        console.log(`    Matches YYYY-MM-DD: ${/^\d{4}-\d{2}-\d{2}$/.test(trimmed)}`);
        console.log(`    Matches DD-MM-YYYY: ${/^\d{2}-\d{2}-\d{4}$/.test(trimmed)}`);
      });
    }
    
    if (dateColumns.length === 0) {
      console.error('❌ No date columns found!');
      console.error('All columns detected:', allColumns);
      console.error('Standard columns filter:', standardCols);
      const potentialDateCols = allColumns.filter(col => !standardCols.includes(col));
      console.error('Columns that are NOT standard columns (potential dates):', potentialDateCols);
      
      // Show detailed analysis of potential date columns
      console.error('\n🔍 Detailed analysis of potential date columns:');
      potentialDateCols.forEach(col => {
        const trimmed = String(col).trim();
        console.error(`  Column: "${col}"`);
        console.error(`    Trimmed: "${trimmed}"`);
        console.error(`    Type: ${typeof col}`);
        console.error(`    Length: ${trimmed.length}`);
        console.error(`    Contains dash: ${trimmed.includes('-')}`);
        console.error(`    Contains slash: ${trimmed.includes('/')}`);
        console.error(`    Contains numbers: ${/\d/.test(trimmed)}`);
        console.error(`    Matches YYYY-MM-DD: ${/^\d{4}-\d{2}-\d{2}$/.test(trimmed)}`);
        console.error(`    Matches DD-MM-YYYY: ${/^\d{2}-\d{2}-\d{4}$/.test(trimmed)}`);
        console.error(`    Sample value from first row: ${JSON.stringify(firstRow[col])}`);
      });
      
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
    console.log('  🧵 Filter Maker: Any location + designation contains "FILTER MAKER"');
    console.log('  📂 Filter Folder: Any location + designation contains "FILTER FOLDER"');
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
      packingAbsent: 0,

      filterMakerTotal: 0,
      filterMakerPresent: 0,
      filterMakerAbsent: 0,

      filterFolderTotal: 0,
      filterFolderPresent: 0,
      filterFolderAbsent: 0
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
      packing: [] as string[],
      filterMaker: [] as string[],
      filterFolder: [] as string[]
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

      // ✅ FILTER MAKER SECTION
      if (designation.includes('FILTER MAKER')) {
        counts.filterMakerTotal++;
        matchedEmployees.filterMaker.push(`${empName} (${status})`);
        if (isPresent) counts.filterMakerPresent++;
        if (isAbsent) counts.filterMakerAbsent++;
      }

      // ✅ FILTER FOLDER SECTION
      if (designation.includes('FILTER FOLDER')) {
        counts.filterFolderTotal++;
        matchedEmployees.filterFolder.push(`${empName} (${status})`);
        if (isPresent) counts.filterFolderPresent++;
        if (isAbsent) counts.filterFolderAbsent++;
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

    console.log('\n🧵 FILTER MAKER SECTION:');
    console.log('  → Filter Makers (Designation contains "FILTER MAKER"):', matchedEmployees.filterMaker.length, 'employees');
    console.log('     Total:', counts.filterMakerTotal, '| Present:', counts.filterMakerPresent, '| Absent:', counts.filterMakerAbsent);
    if (matchedEmployees.filterMaker.length > 0) {
      console.log('     Sample:', matchedEmployees.filterMaker.slice(0, 5).join(', '));
    }

    console.log('\n📂 FILTER FOLDER SECTION:');
    console.log('  → Filter Folders (Designation contains "FILTER FOLDER"):', matchedEmployees.filterFolder.length, 'employees');
    console.log('     Total:', counts.filterFolderTotal, '| Present:', counts.filterFolderPresent, '| Absent:', counts.filterFolderAbsent);
    if (matchedEmployees.filterFolder.length > 0) {
      console.log('     Sample:', matchedEmployees.filterFolder.slice(0, 5).join(', '));
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
    console.log('');
    console.log('📍 FILTER MAKER SECTION:');
    console.log('   • Makers Present:', counts.filterMakerPresent, '/', counts.filterMakerTotal, 'total');
    console.log('');
    console.log('📍 FILTER FOLDER SECTION:');
    console.log('   • Folders Present:', counts.filterFolderPresent, '/', counts.filterFolderTotal, 'total');
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

