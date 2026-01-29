import nodemailer from "nodemailer";
import fs from 'fs/promises';
import path from 'path';
import jsPDF from 'jspdf';

const SCHEDULED_EMAILS = ["suckzhum@gmail.com", "braj@thesolfactory.com", "pukhraj.lp@gmail.com"];
const SCHEDULE_TIME_HOUR = 15; // 3:30 PM in 24-hour format
const SCHEDULE_TIME_MINUTE = 30;

// Path to store the last sent date
const LAST_SENT_FILE = path.join(process.cwd(), '.last-scheduled-email-sent');

async function getLastSentDate(): Promise<string | null> {
  try {
    const data = await fs.readFile(LAST_SENT_FILE, 'utf-8');
    return data.trim();
  } catch (error) {
    return null;
  }
}

async function saveLastSentDate(date: string): Promise<void> {
  try {
    await fs.writeFile(LAST_SENT_FILE, date, 'utf-8');
  } catch (error) {
    console.error('Failed to save last sent date:', error);
  }
}

function getISTDate(): Date {
  const now = new Date();
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  return new Date(utcTime + istOffset);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
}

async function fetchAttendanceData() {
  try {
    // In Next.js server routes, we can use absolute URLs or relative URLs
    // Try to construct the URL based on environment
    let apiUrl: string;
    
    if (process.env.NEXT_PUBLIC_BASE_URL) {
      apiUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/attendance`;
    } else if (process.env.VERCEL_URL) {
      apiUrl = `https://${process.env.VERCEL_URL}/api/attendance`;
    } else {
      // For local development or when running on same server
      apiUrl = 'http://localhost:3000/api/attendance';
    }
    
    console.log('📡 Fetching attendance data from:', apiUrl);
    
    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch attendance: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch attendance data');
    }
    
    return {
      attendance: data.attendance,
      lastUpdated: data.lastUpdated,
      totalEmployees: data.totalEmployees
    };
  } catch (error: any) {
    console.error('❌ Error fetching attendance data:', error);
    throw error;
  }
}

function drawTable(pdf: jsPDF, startY: number, rows: string[][]) {
  let yPos = startY;
  
  // Header
  pdf.setFillColor(240, 240, 240);
  pdf.rect(20, yPos, 80, 8, 'FD');
  pdf.rect(100, yPos, 90, 8, 'FD');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Label', 25, yPos + 6);
  pdf.text('Value', 105, yPos + 6);
  yPos += 8;
  
  // Data rows
  pdf.setFont('helvetica', 'normal');
  rows.forEach(([label, value]) => {
    pdf.rect(20, yPos, 80, 8, 'D');
    pdf.rect(100, yPos, 90, 8, 'D');
    pdf.text(label, 25, yPos + 6);
    pdf.text(value, 105, yPos + 6);
    yPos += 8;
  });
}

async function generateTotalAttendancePDF(attendanceData: any, date: string): Promise<Buffer> {
  const pdf = new jsPDF('p', 'mm', 'a4');

  // Header
  pdf.setFillColor(1, 2, 54);
  pdf.rect(0, 0, 210, 40, 'F');
  pdf.setFontSize(24);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SOL FRANCE', 20, 18);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Total Attendance Summary', 20, 30);

  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Total Attendance Report', 20, 55);

  let yPos = 70;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(1, 2, 54);
  pdf.text('Date of Report', 20, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(date, 70, yPos);
  yPos += 12;

  // Calculate total employees present and absent
  const totalPresent = 
    (attendanceData?.basementRollersPresent || 0) +
    (attendanceData?.basementfilterPresent || 0) +
    (attendanceData?.basementSupervisorPresent || 0) +
    (attendanceData?.firstFloorRollersPresent || 0) +
    (attendanceData?.firstFloorfilterPresent || 0) +
    (attendanceData?.firstFloorSupervisorPresent || 0) +
    (attendanceData?.qualityPresent || 0) +
    (attendanceData?.packingPresent || 0) +
    (attendanceData?.filterMakerPresent || 0) +
    (attendanceData?.filterFolderPresent || 0);

  const totalAbsent = 
    (attendanceData?.basementRollersAbsent || 0) +
    (attendanceData?.basementfilterAbsent || 0) +
    (attendanceData?.basementSupervisorAbsent || 0) +
    (attendanceData?.firstFloorRollersAbsent || 0) +
    (attendanceData?.firstFloorfilterAbsent || 0) +
    (attendanceData?.firstFloorSupervisorAbsent || 0) +
    (attendanceData?.qualityAbsent || 0) +
    (attendanceData?.packingAbsent || 0) +
    (attendanceData?.filterMakerAbsent || 0) +
    (attendanceData?.filterFolderAbsent || 0);

  const totalEmployees = totalPresent + totalAbsent;

  // Add Total Summary Section
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(1, 2, 54);
  pdf.text('Total Summary', 20, yPos);
  yPos += 8;
  
  drawTable(pdf, yPos, [
    ['Total Employees', totalEmployees.toString() + ' Staff'],
    ['Total Present', totalPresent.toString() + ' Staff'],
    ['Total Absent', totalAbsent.toString() + ' Staff']
  ]);
  yPos += 40;

  const addSection = (title: string, rows: string[][]) => {
    if (yPos > 250) {
      pdf.addPage();
      yPos = 20;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(1, 2, 54);
    pdf.text(title, 20, yPos);
    yPos += 8;
    drawTable(pdf, yPos, rows);
    yPos += 8 + rows.length * 8 + 8;
  };

  addSection('Basement', [
    ['Rollers Present', `${attendanceData?.basementRollersPresent || 0} / ${attendanceData?.basementRollers || 0}`],
    ['Gummers Present', `${attendanceData?.basementfilterPresent || 0} / ${attendanceData?.basementfilterTotal || 0}`],
    ['Supervisors Present', `${attendanceData?.basementSupervisorPresent || 0} / ${attendanceData?.basementSupervisorTotal || 0}`],
  ]);

  addSection('First Floor', [
    ['Rollers Present', `${attendanceData?.firstFloorRollersPresent || 0} / ${attendanceData?.firstFloorRollers || 0}`],
    ['Gummers Present', `${attendanceData?.firstFloorfilterPresent || 0} / ${attendanceData?.firstFloorfilterTotal || 0}`],
    ['Supervisors Present', `${attendanceData?.firstFloorSupervisorPresent || 0} / ${attendanceData?.firstFloorSupervisorTotal || 0}`],
  ]);

  addSection('Quality', [
    ['Total Present', `${attendanceData?.qualityPresent || 0} / ${attendanceData?.qualityTotal || 0}`],
  ]);

  addSection('Packing', [
    ['Total Present', `${attendanceData?.packingPresent || 0} / ${attendanceData?.packingTotal || 0}`],
  ]);

  addSection('Filter', [
    ['Filter Maker Present', `${attendanceData?.filterMakerPresent || 0} / ${attendanceData?.filterMakerTotal || 0}`],
    ['Filter Folder Present', `${attendanceData?.filterFolderPresent || 0} / ${attendanceData?.filterFolderTotal || 0}`],
  ]);

  pdf.setFontSize(8);
  pdf.setTextColor(128, 128, 128);
  pdf.setFont('helvetica', 'italic');
  pdf.text(
    `Generated on ${new Date().toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })}`,
    20,
    280
  );
  pdf.text(`© ${new Date().getFullYear()} Sol France. All rights reserved.`, 20, 285);

  // Convert PDF to buffer
  const pdfOutput = pdf.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

async function sendScheduledEmail() {
  try {
    console.log('📊 Fetching attendance data for scheduled email...');
    const attendanceInfo = await fetchAttendanceData();
    const attendanceData = attendanceInfo.attendance;
    const lastUpdated = attendanceInfo.lastUpdated || formatDate(getISTDate());

    console.log('📄 Generating PDF for scheduled email...');
    const pdfBuffer = await generateTotalAttendancePDF(attendanceData, lastUpdated);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const istDate = getISTDate();
    const filedate = formatDate(istDate);
    const emailRecipients = SCHEDULED_EMAILS.join(', ');

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: SCHEDULED_EMAILS,
      subject: `Daily Attendance Report - ${filedate}`,
      text: `This is the automated daily attendance report for ${filedate}.\n\nAttached is the Total Attendance PDF Report.`,
      attachments: [
        {
          filename: `Attendance_Total_${filedate.replace(/\s+/g, '-')}.pdf`,
          content: pdfBuffer
        }
      ]
    });

    await saveLastSentDate(filedate);
    console.log(`✅ Scheduled email sent successfully to ${emailRecipients} at ${new Date().toISOString()}`);
    return { success: true, message: `Email sent to ${emailRecipients}` };
  } catch (err: any) {
    console.error('❌ Error sending scheduled email:', err);
    throw err;
  }
}

export async function GET(request: Request) {
  try {
    const istDate = getISTDate();
    const currentHour = istDate.getHours();
    const currentMinute = istDate.getMinutes();
    const todayDate = formatDate(istDate);
    
    // Check if it's the scheduled time (3:30 PM IST)
    const isScheduledTime = currentHour === SCHEDULE_TIME_HOUR && currentMinute === SCHEDULE_TIME_MINUTE;
    
    // Check if email was already sent today
    const lastSentDate = await getLastSentDate();
    const alreadySentToday = lastSentDate === todayDate;
    
    // Get query parameter to force send (for testing)
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';
    
    if (force) {
      // Force send regardless of time or date
      const result = await sendScheduledEmail();
      return Response.json({
        ...result,
        message: 'Email sent (forced)'
      });
    }
    
    if (!isScheduledTime) {
      return Response.json({
        success: false,
        message: `Not scheduled time. Current time: ${currentHour}:${String(currentMinute).padStart(2, '0')} IST. Scheduled: ${SCHEDULE_TIME_HOUR}:${String(SCHEDULE_TIME_MINUTE).padStart(2, '0')} IST`,
        currentTime: `${currentHour}:${String(currentMinute).padStart(2, '0')}`,
        scheduledTime: `${SCHEDULE_TIME_HOUR}:${String(SCHEDULE_TIME_MINUTE).padStart(2, '0')}`,
        date: todayDate
      });
    }
    
    if (alreadySentToday) {
      return Response.json({
        success: false,
        message: `Email already sent today (${todayDate}). Will send again tomorrow.`,
        lastSentDate,
        todayDate
      });
    }
    
    // Send the email
    const result = await sendScheduledEmail();
    
    return Response.json({
      ...result,
      message: 'Scheduled email sent successfully',
      sentAt: new Date().toISOString(),
      date: todayDate
    });
    
  } catch (err: any) {
    console.error('Error in scheduled email route:', err);
    return Response.json(
      { 
        success: false, 
        error: err.message,
        message: 'Failed to send scheduled email'
      },
      { status: 500 }
    );
  }
}

// POST endpoint for manual triggering (can be used by cron services)
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const force = body.force === true;
    
    const istDate = getISTDate();
    const todayDate = formatDate(istDate);
    const lastSentDate = await getLastSentDate();
    const alreadySentToday = lastSentDate === todayDate;
    
    if (!force && alreadySentToday) {
      return Response.json({
        success: false,
        message: `Email already sent today (${todayDate}). Use force: true to send again.`,
        lastSentDate,
        todayDate
      });
    }
    
    const result = await sendScheduledEmail();
    
    return Response.json({
      ...result,
      message: force ? 'Email sent (forced)' : 'Scheduled email sent successfully',
      sentAt: new Date().toISOString(),
      date: todayDate
    });
    
  } catch (err: any) {
    console.error('Error in scheduled email POST route:', err);
    return Response.json(
      { 
        success: false, 
        error: err.message,
        message: 'Failed to send scheduled email'
      },
      { status: 500 }
    );
  }
}

