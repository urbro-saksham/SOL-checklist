import { google } from 'googleapis';

export const DEPARTMENTS = [
  { id: 'floor', name: 'Production (First Floor)', startCol: 1 },
  { id: 'basement', name: 'Production (Basement)', startCol: 5 },
  { id: 'quality', name: 'Quality Check', startCol: 9 },
  { id: 'stock', name: 'Stock Availability', startCol: 13 },
  { id: 'attendance', name: 'Attendance', startCol: 17 },
  { id: 'it_check', name: 'IT Final Verification', startCol: 21 }
];

const CONFIG_SHEET = "Config_Links";

async function getAuthSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth: await auth.getClient() as any });
}

export async function getStoredLinks() {
  const sheets = await getAuthSheets();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  try {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${CONFIG_SHEET}!A:B` });
    const rows = response.data.values || [];
    const links: Record<string, string> = {};
    rows.forEach(row => { if (row[0] && row[1]) links[row[0]] = row[1]; });
    return links;
  } catch (e) { return {}; }
}

export async function updateStoredLink(deptId: string, newLink: string) {
  const sheets = await getAuthSheets();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${CONFIG_SHEET}!A:A` });
  const rows = response.data.values || [];
  let rowIndex = rows.findIndex(row => row[0] === deptId);
  
  if (rowIndex === -1) {
    await sheets.spreadsheets.values.append({ spreadsheetId, range: `${CONFIG_SHEET}!A:A`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[deptId, newLink]] } });
  } else {
    await sheets.spreadsheets.values.update({ spreadsheetId, range: `${CONFIG_SHEET}!B${rowIndex + 1}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [[newLink]] } });
  }
}

// --- 📊 DASHBOARD INTELLIGENCE ENGINE (UPDATED) ---
export async function fetchDashboardMetrics() {
  const links = await getStoredLinks();
  
  // We scan ALL departments now to find data
  const targetDepts = ['floor', 'basement', 'quality']; 
  
  // METRIC DEFINITIONS (The keywords we hunt for in the sheets)
  const metricMap: Record<string, string[]> = {
    // Production Metrics
    'Brands': ['brand', 'sku name', 'product name'],
    'RFS': ['total rfs', 'rfs'],
    'Rollers': ['total rollers', 'rollers', 'roller count'],
    'Manpower': ['total manpower', 'manpower', 'labor', 'workers'],
    'Gum': ['gum used', 'total gum'],
    'Paper': ['paper used', 'total paper'],
    'PaperReject': ['paper rejection', 'paper waste'],
    'Filter': ['filter used', 'total filter'],
    'FilterReject': ['filter rejection', 'filter waste'],
    'Target': ['total target', 'production target'],
    'Production': ['total production', 'actual production'],
    
    // Quality Metrics
    'Checkers': ['total checkers', 'number of checkers'],
    'CheckersEqual': ['total checkers (equal)', 'equal checkers'],
    'QCDone': ['total qc done', 'qc completed'],
    'CorrectPieces': ['total correct pieces', 'good pieces', 'ok pieces'],
    'QCRejected': ['total rejected pieces', 'bad pieces', 'rejected pcs'],
    'QCRejectionPercent': ['total rejection percentage', 'rejection %'],

    // Equal Team Metrics
    'BoxesChecked': ['total boxes checked', 'boxes checked'],
    'EqualRejected': ['total rejected pieces (equal)', 'equal rejection'],
    'EqualPacking': ['total equal for packing', 'ready for packing']
  };

  const aggregatedData: Record<string, number | string> = {};
  for (const key in metricMap) aggregatedData[key] = 0;
  aggregatedData['Brands'] = ""; 

  for (const dept of targetDepts) {
    const link = links[dept];
    if (!link) continue;
    
    const matches = link.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches || !matches[1]) continue;
    const sheetId = matches[1];

    try {
      const sheets = await getAuthSheets();
      // Read the whole sheet (A:Z) to scan for keywords
      const response = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'A:Z' });
      const rows = response.data.values || [];

      rows.forEach((row, rIndex) => {
        row.forEach((cell, cIndex) => {
          if (!cell) return;
          const cellText = cell.toString().toLowerCase().trim();

          for (const [metricKey, keywords] of Object.entries(metricMap)) {
            if (keywords.some(k => cellText.includes(k))) {
              // Found a keyword! Look for value in next cell
              let value = row[cIndex + 1]; 
              if (!value && row[cIndex + 2]) value = row[cIndex + 2];

              if (value) {
                const cleanValue = value.toString().replace(/[^0-9.]/g, '');
                
                if (metricKey === 'Brands') {
                   // Concatenate brands without duplicates
                   if (!aggregatedData[metricKey].toString().includes(value)) {
                       aggregatedData[metricKey] += value + ", ";
                   }
                } else {
                   // Sum up numbers
                   aggregatedData[metricKey] = (Number(aggregatedData[metricKey]) || 0) + Number(cleanValue);
                }
              }
            }
          }
        });
      });
    } catch (e) { console.error(`Failed to read sheet ${dept}`, e); }
  }
  
  return aggregatedData;
}

// --- STANDARD EXPORTS ---
export async function getTodayRow(dateStr: string) {
  const sheets = await getAuthSheets();
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'Sheet1!A:Z' });
  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((row) => row[0] === dateStr);
  if (rowIndex === -1) return null;
  return { rowIndex: rowIndex + 1, data: rows[rowIndex] };
}
export async function createTodayRow(dateStr: string) {
  const sheets = await getAuthSheets();
  await sheets.spreadsheets.values.append({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'Sheet1!A:A', valueInputOption: 'USER_ENTERED', requestBody: { values: [[dateStr, ...Array(25).fill('')]] } });
}
export async function updateDepartmentData(rowIndex: number, colIndex: number, data: string[]) {
  const sheets = await getAuthSheets();
  const startChar = getColumnLetter(colIndex);
  const endChar = getColumnLetter(colIndex + 3);
  await sheets.spreadsheets.values.update({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: `Sheet1!${startChar}${rowIndex}:${endChar}${rowIndex}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [data] } });
}
export async function checkSheetForToday(sheetLink: string) {
  const sheets = await getAuthSheets();
  const matches = sheetLink.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!matches || !matches[1]) return false;
  const externalSheetId = matches[1];
  try {
      const response = await sheets.spreadsheets.values.get({ spreadsheetId: externalSheetId, range: 'A:ZZ' });
      const rows = response.data.values || [];
      const now = new Date();
      const options: any = { timeZone: 'Asia/Kolkata' };
      const day = now.toLocaleString('en-IN', { day: 'numeric', ...options }); 
      const monthNum = now.toLocaleString('en-IN', { month: 'numeric', ...options });
      const year = now.toLocaleString('en-IN', { year: 'numeric', ...options });
      const yearShort = year.slice(-2);
      const monthShort = now.toLocaleString('en-IN', { month: 'short', ...options });
      const searchTerms = [`${day}/${monthNum}/${year}`, `${day}-${monthNum}-${year}`, `${day}/${monthNum}/${yearShort}`, `${day}-${monthNum}-${yearShort}`, `${year}-${monthNum}-${day}`, `${day} ${monthShort}`, `${day}-${monthShort}`, `${Number(day)} ${monthShort}`, `${Number(day)}-${monthShort}`];
      const allText = rows.flat().join(" ").toLowerCase(); 
      return searchTerms.some(term => allText.includes(term.toLowerCase()));
  } catch (error) { return false; }
}
function getColumnLetter(colIndex: number) {
  let letter = '';
  while (colIndex >= 0) {
    letter = String.fromCharCode((colIndex % 26) + 65) + letter;
    colIndex = Math.floor(colIndex / 26) - 1;
  }
  return letter;
}