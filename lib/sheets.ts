import { google } from 'googleapis';

// --- TYPES ---
export interface DepartmentData {
  supervisor: string;
  comment?: string;
  sheetLink?: string | null;
  prodCount?: string;
  boxesUsed?: string;
  totalPresent?: string;
  totalAbsent?: string;
  piecesReceived?: string;
  okPieces?: string;
  rejCount?: string;
  itemsAdded?: string;
}

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

// --- 1. NEW HELPER: Fetch ANY Row by Date ---
export async function getRowByDate(dateStr: string) {
  const sheets = await getAuthSheets();
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'Sheet1!A:Z' });
  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((row) => row[0] === dateStr);
  if (rowIndex === -1) return null;
  return { rowIndex: rowIndex + 1, data: rows[rowIndex] };
}

// --- 2. WRAPPER (Keeps existing logic working) ---
export async function getTodayRow(dateStr: string) {
  return getRowByDate(dateStr);
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

// --- 📝 LOGGING (DATABASE) ---
export async function logDepartmentData(deptId: string, data: DepartmentData) {
    const sheets = await getAuthSheets();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const targetSheet = `DB_${deptId.charAt(0).toUpperCase() + deptId.slice(1)}`; 
    
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    const dateStr = istDate.toLocaleDateString('en-IN');
    const timeStr = istDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const common = [dateStr, timeStr, data.supervisor, data.sheetLink || "-", data.comment || ""];
    let rowValues: string[] = [];

    if (deptId === 'floor' || deptId === 'basement') {
        rowValues = [...common, data.prodCount || "0", data.boxesUsed || "0"];
    } else if (deptId === 'attendance') {
        rowValues = [...common, data.totalPresent || "0", data.totalAbsent || "0"];
    } else if (deptId === 'quality') {
        rowValues = [...common, data.piecesReceived || "0", data.okPieces || "0", data.rejCount || "0"];
    } else if (deptId === 'stock') {
        rowValues = [...common, data.itemsAdded || "0"];
    } else {
        rowValues = common;
    }

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${targetSheet}!A:A`, 
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [rowValues] }
        });
    } catch (e) {
        console.error(`Error logging to ${targetSheet}`, e);
    }
}

// --- 📊 DASHBOARD METRICS ---
export async function fetchDashboardMetrics() {
  const links = await getStoredLinks();
  const targetDepts = ['floor', 'basement', 'quality', 'attendance']; 
  const metricMap: Record<string, string[]> = {
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
    'Checkers': ['total checkers', 'number of checkers'],
    'CheckersEqual': ['total checkers (equal)', 'equal checkers'],
    'QCDone': ['total qc done', 'qc completed'],
    'CorrectPieces': ['total correct pieces', 'good pieces', 'ok pieces'],
    'QCRejected': ['total rejected pieces', 'bad pieces', 'rejected pcs'],
    'QCRejectionPercent': ['total rejection percentage', 'rejection %'],
    'BoxesChecked': ['total boxes checked', 'boxes checked'],
    'EqualRejected': ['total rejected pieces (equal)', 'equal rejection'],
    'EqualPacking': ['total equal for packing', 'ready for packing'],
    'RollerPresent': ['roller present', 'rollers present'],
    'RollerAbsent': ['roller absent', 'rollers absent'],
    'FilterTotal': ['filter total', 'total filter staff'],
    'FilterPresent': ['filter present', 'filters present'],
    'FilterAbsent': ['filter absent', 'filters absent'],
    'SupervisorPresent': ['supervisor present', 'supervisors present'],
    'SupervisorAbsent': ['supervisor absent', 'supervisors absent'],
    'CheckersPresent': ['checkers present', 'checker present'],
    'CheckersAbsent': ['checkers absent', 'checker absent'],
    'PackingManpower': ['packing manpower', 'packaging manpower', 'total packing staff'],
    'PackingPresent': ['packing present', 'packaging present'],
    'PackingAbsent': ['packing absent', 'packaging absent']
  };

  const aggregatedData: Record<string, number | string> = {};
  for (const key in metricMap) aggregatedData[key] = 0;
  aggregatedData['Brands'] = ""; 

  for (const dept of targetDepts) {
    const link = links[dept];
    if (!link) continue;
    const matches = link.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches || !matches[1]) continue;
    
    try {
      const sheets = await getAuthSheets();
      const response = await sheets.spreadsheets.values.get({ spreadsheetId: matches[1], range: 'A1:Z500' });
      const rows = response.data.values || [];
      rows.forEach((row) => {
        row.forEach((cell, cIndex) => {
          if (!cell) return;
          const cellText = cell.toString().toLowerCase().trim();
          for (const [metricKey, keywords] of Object.entries(metricMap)) {
            if (keywords.some(k => cellText === k || cellText.includes(k))) {
              let value = row[cIndex + 1] || row[cIndex + 2];
              if (value) {
                const cleanValue = value.toString().replace(/[^0-9.]/g, '');
                if (metricKey === 'Brands') {
                   if (!aggregatedData[metricKey].toString().includes(value)) aggregatedData[metricKey] += value + ", ";
                } else {
                   aggregatedData[metricKey] = (Number(aggregatedData[metricKey]) || 0) + Number(cleanValue);
                }
              }
            }
          }
        });
      });
    } catch (e) { console.error(`Failed to read ${dept}`, e); }
  }
  return aggregatedData;
}

export async function getLeaderboardData() {
    const sheets = await getAuthSheets();
    try {
      const response = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'Sheet1!A:Z' });
      return response.data.values ? response.data.values.slice(1) : [];
    } catch (e) { return []; }
}

function getColumnLetter(colIndex: number) {
  let letter = '';
  while (colIndex >= 0) {
    letter = String.fromCharCode((colIndex % 26) + 65) + letter;
    colIndex = Math.floor(colIndex / 26) - 1;
  }
  return letter;
}