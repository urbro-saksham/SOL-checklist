import { google } from 'googleapis';

export const DEPARTMENTS = [
  { id: 'floor', name: 'Production (First Floor)', startCol: 1, sheetName: 'Data_Floor' },
  { id: 'basement', name: 'Production (Basement)', startCol: 5, sheetName: 'Data_Basement' },
  { id: 'quality', name: 'Quality Check', startCol: 9, sheetName: 'Data_Quality' },
  { id: 'stock', name: 'Stock Availability', startCol: 13, sheetName: 'Data_Stock' },
  { id: 'attendance', name: 'Attendance', startCol: 17, sheetName: 'Data_Attendance' },
  { id: 'it_check', name: 'IT Final Verification', startCol: 21, sheetName: 'Data_IT' } // <--- 6th Step
];

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

export async function getTodayRow(dateStr: string) {
  const sheets = await getAuthSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Sheet1!A:Z', // Extended range for 6 departments
  });
  const rows = response.data.values || [];
  const rowIndex = rows.findIndex((row) => row[0] === dateStr);
  if (rowIndex === -1) return null;
  return { rowIndex: rowIndex + 1, data: rows[rowIndex] };
}

export async function createTodayRow(dateStr: string) {
  const sheets = await getAuthSheets();
  // Create row with enough empty slots for 6 departments (Date + 4*6 = 25 columns)
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Sheet1!A:A',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[dateStr, ...Array(25).fill('')]] },
  });
}

export async function updateDepartmentData(rowIndex: number, colIndex: number, data: string[]) {
  const sheets = await getAuthSheets();
  const startChar = getColumnLetter(colIndex);
  const endChar = getColumnLetter(colIndex + 3);
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `Sheet1!${startChar}${rowIndex}:${endChar}${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [data] },
  });
}

// Helper to calculate column letters (A, B... Z, AA)
function getColumnLetter(colIndex: number) {
  let letter = '';
  while (colIndex >= 0) {
    letter = String.fromCharCode((colIndex % 26) + 65) + letter;
    colIndex = Math.floor(colIndex / 26) - 1;
  }
  return letter;
}

// --- OVERWRITE LOGIC ---
export async function processSheetLink(deptName: string, supervisor: string, sheetLink: string, targetSheetTitle: string) {
  const sheets = await getAuthSheets();
  const mainSpreadsheetId = process.env.GOOGLE_SHEET_ID;

  // 1. Extract External ID
  const matches = sheetLink.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!matches || !matches[1]) throw new Error("Invalid Google Sheet Link");
  const externalSheetId = matches[1];

  // 2. Read User Data
  const externalResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: externalSheetId,
    range: 'A:Z', 
  });
  const rawData = externalResponse.data.values;
  if (!rawData || rawData.length === 0) return;

  // 3. Add Context (Timestamp in IST)
  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const labeledRows = rawData.map(row => [timestamp, deptName, supervisor, ...row]);

  // 4. Check/Create/Clear Sheet
  const meta = await sheets.spreadsheets.get({ spreadsheetId: mainSpreadsheetId });
  const sheetExists = meta.data.sheets?.some(s => s.properties?.title === targetSheetTitle);

  if (!sheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: mainSpreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: targetSheetTitle } } }] }
    });
  } else {
    // CLEAR existing data to overwrite previous day
    await sheets.spreadsheets.values.clear({
      spreadsheetId: mainSpreadsheetId,
      range: `${targetSheetTitle}!A:Z`,
    });
  }

  // 5. Write Fresh Data
  await sheets.spreadsheets.values.update({
    spreadsheetId: mainSpreadsheetId,
    range: `${targetSheetTitle}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [["Uploaded At (IST)", "Department", "Supervisor", "--- DATA START ---"], ...labeledRows] },
  });
}