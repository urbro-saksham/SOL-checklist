'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { ArrowLeft, BarChart3, Database, CheckCircle2, MailCheck, Package, Users, Activity, Box, AlertTriangle, ChevronDown, UserCheck, Download, X, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import TechLoader from '@/components/TechLoader'; // Import new loader
import AttendanceLineGraph from "@/components/views/AttendanceLineGraph";

export default function Dashboard() {

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance');
  const [showAttendanceDropdown, setShowAttendanceDropdown] = useState(false);
  const [attendanceSection, setAttendanceSection] = useState<'basement' | 'firstFloor' | 'quality' | 'packaging' | 'filter' | 'graphs' | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatingTotalPDF, setGeneratingTotalPDF] = useState(false);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);
  const attendanceButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const[filedate, setFileDate] = useState('')
  const [emailNotification, setEmailNotification] = useState<{ show: boolean; type: 'loading' | 'success' | 'error'; message: string } | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const emailDialogRef = useRef<HTMLDivElement>(null);
  const emailButtonRef = useRef<HTMLDivElement>(null);
  const [emailDialogPosition, setEmailDialogPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    async function fetchAttendance() {
      try {
        console.log('📊 Fetching attendance data...');
        const res = await fetch('/api/attendance');
        const json = await res.json();
        console.log('API Response:', json);

        setFileDate(json.lastUpdated);
        
        if (json.success) {
          console.log('✅ Attendance data received:', json.attendance);
          console.log('📅 Last Updated:', json.lastUpdated);
          setAttendanceData(json.attendance);
          setLastUpdated(json.lastUpdated);
        } else {
          console.error('❌ API Error:', json.error);
          if (json.message) console.log('Error message:', json.message);
        }
      } catch (e) {
        console.error('❌ Failed to fetch attendance:', e);
      } finally {
        setTimeout(() => setLoading(false), 1000);
      }
    }
    fetchAttendance();
  }, []);

  // Scheduled email check (runs every minute to check if it's 3:08 PM IST)
  useEffect(() => {
    const checkScheduledEmail = async () => {
      const now = new Date();
      // Convert to IST (UTC+5:30)
      const istOffset = 5.5 * 60 * 60 * 1000;
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
      const istDate = new Date(utcTime + istOffset);
      
      const currentHour = istDate.getHours();
      const currentMinute = istDate.getMinutes();
      
      // Check if it's exactly 3:08 PM IST
      if (currentHour === 15 && currentMinute === 8) {
        try {
          console.log('🕒 Scheduled email time detected (3:08 PM IST). Triggering scheduled email...');
          const response = await fetch('/api/scheduled-email', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          const result = await response.json();
          
          if (result.success) {
            console.log('✅ Scheduled email sent successfully:', result.message);
          } else {
            console.log('ℹ️ Scheduled email:', result.message);
          }
        } catch (error) {
          console.error('❌ Error triggering scheduled email:', error);
        }
      }
    };

    // Check immediately
    checkScheduledEmail();
    
    // Then check every minute
    const interval = setInterval(checkScheduledEmail, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Calculate dropdown position when it opens
  useEffect(() => {
    if (showAttendanceDropdown && attendanceButtonRef.current) {
      const rect = attendanceButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX
      });
    }
  }, [showAttendanceDropdown]);

  // Calculate email dialog position when it opens
  useEffect(() => {
    if (showEmailDialog && emailButtonRef.current) {
      const rect = emailButtonRef.current.getBoundingClientRect();
      setEmailDialogPosition({
        top: rect.top + window.scrollY,
        left: rect.right + window.scrollX + 8
      });
    }
  }, [showEmailDialog]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showAttendanceDropdown) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside both the button and the dropdown
      if (!target.closest('.attendance-dropdown-container') && !target.closest('.attendance-dropdown-menu')) {
        setShowAttendanceDropdown(false);
      }
    };
    
    // Small delay to prevent immediate close on button click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAttendanceDropdown]);

  // Close email dialog when clicking outside (backdrop handles this, but keeping for consistency)
  useEffect(() => {
    if (!showEmailDialog) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is outside both the button and the dialog
      if (!target.closest('.email-button-container') && !target.closest('.email-dialog-menu')) {
        closeEmailDialog();
      }
    };
    
    // Small delay to prevent immediate close on button click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmailDialog]);

  // PDF Generation Function - ALWAYS DOWNLOADS
  const handleDownloadPDF = async () => {
    if (!attendanceSection || !attendanceData) {
      console.warn('No attendance data available for PDF generation');
      return;
    }
    
    setGeneratingPDF(true);
    console.log("Generating PDF with attendance data:", attendanceData);

    try {
      // Dynamic import for jsPDF
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const sectionName = 
        attendanceSection === 'basement' ? 'Basement' :
        attendanceSection === 'firstFloor' ? 'First Floor' :
        attendanceSection === 'quality' ? 'Quality' :
        attendanceSection === 'packaging' ? 'Packaging' :
        'Filter';
      
    //   const date = new Date().toLocaleDateString('en-IN');
      const date = filedate;
      
      // Use text-based PDF generation (reliable and structured)
      generateTextPDF(pdf, sectionName, date);
      
      const fileName = `Attendance_${sectionName.replace(/\s+/g, '_')}_${date.replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Critical PDF error:', error);
      // Last resort - create minimal PDF
      try {
        const { default: jsPDF } = await import('jspdf');
        const pdf = new jsPDF();
        pdf.setFontSize(16);
        pdf.text('Attendance Report', 20, 20);
        pdf.setFontSize(12);
        pdf.text(`Department: ${attendanceSection}`, 20, 40);
        pdf.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 20, 50);
        pdf.text('Error: Could not generate detailed report.', 20, 70);
        pdf.save(`Attendance_Report_${new Date().getTime()}.pdf`);
      } catch (finalError) {
        console.error('Final fallback failed:', finalError);
      }
    } finally {
      setGeneratingPDF(false);
    }
  };

  const downloadExcelFile = async () => {
    window.open("https://docs.google.com/spreadsheets/d/13UUl-aSWn86eW0ixwLOxBGahCMjaEA0R/export?format=csv", "_self");
  }

  // PDF for Total Attendance (all sections)
  const handleDownloadTotalAttendancePDF = async () => {
    if (!attendanceData) {
      console.warn('No attendance data available for total attendance PDF generation');
      return;
    }

    setGeneratingTotalPDF(true);

    try {
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const date = new Date().toLocaleDateString('en-IN');

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

      const fileName = `Attendance_Total_${date.replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Critical Total Attendance PDF error:', error);
    } finally {
      setGeneratingTotalPDF(false);
    }
  };

  const openEmailDialog = () => {
    setShowEmailDialog(true);
    setEmailInput('');
  };

  const closeEmailDialog = () => {
    setShowEmailDialog(false);
    setEmailInput('');
  };

  const sendEmailHandler = async (recipientEmail?: string) => {
    const emailToSend = recipientEmail || emailInput;
    
    if (!emailToSend || !emailToSend.trim()) {
      setEmailNotification({ show: true, type: 'error', message: 'Please enter a valid email address.' });
      setTimeout(() => {
        setEmailNotification(null);
      }, 4000);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToSend.trim())) {
      setEmailNotification({ show: true, type: 'error', message: 'Please enter a valid email address.' });
      setTimeout(() => {
        setEmailNotification(null);
      }, 4000);
      return;
    }

    // Close dialog
    closeEmailDialog();
    
    // Show loading state immediately
    setEmailNotification({ show: true, type: 'loading', message: 'Sending email...' });
    
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filedate: filedate,
          email: emailToSend.trim()
        })
      });
      const result = await response.json();
      if (result.success) {
        setEmailNotification({ show: true, type: 'success', message: `Email sent successfully to ${emailToSend.trim()}!` });
      } else {
        setEmailNotification({ show: true, type: 'error', message: result.error || 'Failed to send email.' });
      }
      // Auto-hide notification after 4 seconds
      setTimeout(() => {
        setEmailNotification(null);
      }, 4000);
    } catch (error) {
      console.error('Error sending email:', error);
      setEmailNotification({ show: true, type: 'error', message: 'Error sending email. Please try again.' });
      setTimeout(() => {
        setEmailNotification(null);
      }, 4000);
    }
  };


  // Helper function to generate text-based PDF with proper tables
  const generateTextPDF = (pdf: any, sectionName: string, date: string) => {
    // Header with logo area
    pdf.setFillColor(1, 2, 54);
    pdf.rect(0, 0, 210, 40, 'F');
    
    pdf.setFontSize(24);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SOL FRANCE', 20, 18);
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Attendance Report', 20, 30);
    
    // Report Title
    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Attendance Report - ${sectionName}`, 20, 55);
    
    let yPos = 70;
    
    // Date & Department Section
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(1, 2, 54);
    pdf.text('Date & Department', 20, yPos);
    yPos += 8;
    
    // Draw table
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    
    // Table header
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, yPos, 80, 8, 'FD');
    pdf.rect(100, yPos, 90, 8, 'FD');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Field', 25, yPos + 6);
    pdf.text('Value', 105, yPos + 6);
    yPos += 8;
    
    // Date row
    pdf.setFont('helvetica', 'normal');
    pdf.rect(20, yPos, 80, 8, 'D');
    pdf.rect(100, yPos, 90, 8, 'D');
    pdf.text('Date of Report', 25, yPos + 6);
    pdf.text(date, 105, yPos + 6);
    yPos += 8;
    
    // Department row
    pdf.rect(20, yPos, 80, 8, 'D');
    pdf.rect(100, yPos, 90, 8, 'D');
    pdf.text('Department', 25, yPos + 6);
    pdf.text(sectionName, 105, yPos + 6);
    yPos += 15;
    
    // Attendance Details based on section
    if (attendanceSection === 'basement') {
      // Roller Attendance
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(1, 2, 54);
      pdf.text('Roller Attendance', 20, yPos);
      yPos += 8;
      
      drawTable(pdf, yPos, [
        ['Total Rollers', (attendanceData?.basementRollers || 0).toString() + ' Staff'],
        ['Roller Present', (attendanceData?.basementRollersPresent || 0).toString() + ' Staff'],
        ['Roller Absent', (attendanceData?.basementRollersAbsent || 0).toString() + ' Staff']
      ]);
      yPos += 40; // Increased spacing to prevent overlap
      
      // Gummer Attendance
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(1, 2, 54);
      pdf.text('Gummer Attendance', 20, yPos);
      yPos += 8;
      
      drawTable(pdf, yPos, [
        ['Gummer Total', (attendanceData?.basementfilterTotal || 0).toString() + ' Staff'],
        ['Gummer Present', (attendanceData?.basementfilterPresent || 0).toString() + ' Staff'],
        ['Gummer Absent', (attendanceData?.basementfilterAbsent || 0).toString() + ' Staff']
      ]);
      yPos += 40; // Increased spacing to prevent overlap
      
      // Supervisor Attendance
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(1, 2, 54);
      pdf.text('Supervisor Attendance', 20, yPos);
      yPos += 8;
      
      drawTable(pdf, yPos, [
        ['Supervisor Present', (attendanceData?.basementSupervisorPresent || 0).toString() + ' Staff'],
        ['Supervisor Absent', (attendanceData?.basementSupervisorAbsent || 0).toString() + ' Staff']
      ]);
      
    } else if (attendanceSection === 'firstFloor') {
      // Roller Attendance
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(1, 2, 54);
      pdf.text('Roller Attendance', 20, yPos);
      yPos += 8;
      
      drawTable(pdf, yPos, [
        ['Total Rollers', (attendanceData?.firstFloorRollers || 0).toString() + ' Staff'],
        ['Roller Present', (attendanceData?.firstFloorRollersPresent || 0).toString() + ' Staff'],
        ['Roller Absent', (attendanceData?.firstFloorRollersAbsent || 0).toString() + ' Staff']
      ]);
      yPos += 40; // Increased spacing to prevent overlap
      
      // Gummer Attendance
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(1, 2, 54);
      pdf.text('Gummer Attendance', 20, yPos);
      yPos += 8;
      
      drawTable(pdf, yPos, [
        ['Gummer Total', (attendanceData?.firstFloorfilterTotal || 0).toString() + ' Staff'],
        ['Gummer Present', (attendanceData?.firstFloorfilterPresent || 0).toString() + ' Staff'],
        ['Gummer Absent', (attendanceData?.firstFloorfilterAbsent || 0).toString() + ' Staff']
      ]);
      yPos += 40; // Increased spacing to prevent overlap
      
      // Supervisor Attendance
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(1, 2, 54);
      pdf.text('Supervisor Attendance', 20, yPos);
      yPos += 8;
      
      drawTable(pdf, yPos, [
        ['Supervisor Present', (attendanceData?.firstFloorSupervisorPresent || 0).toString() + ' Staff'],
        ['Supervisor Absent', (attendanceData?.firstFloorSupervisorAbsent || 0).toString() + ' Staff']
      ]);
      
    } else if (attendanceSection === 'quality') {
      // Checker Attendance
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(1, 2, 54);
      pdf.text('Checker Attendance', 20, yPos);
      yPos += 8;
      
      drawTable(pdf, yPos, [
        ['Total Checkers', (attendanceData?.qualityTotal || 0).toString() + ' Staff'],
        ['Total Present', (attendanceData?.qualityPresent || 0).toString() + ' Staff'],
        ['Total Absent', (attendanceData?.qualityAbsent || 0).toString() + ' Staff']
      ]);
      
    } else if (attendanceSection === 'packaging') {
      // Manpower Attendance
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(1, 2, 54);
      pdf.text('Manpower Attendance', 20, yPos);
      yPos += 8;
      
      drawTable(pdf, yPos, [
        ['Total Manpower', (attendanceData?.packingTotal || 0).toString() + ' Staff'],
        ['Total Present', (attendanceData?.packingPresent || 0).toString() + ' Staff'],
        ['Total Absent', (attendanceData?.packingAbsent || 0).toString() + ' Staff']
      ]);
    }
    
    // Footer
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
  };
  
  // Helper to draw tables
  const drawTable = (pdf: any, startY: number, rows: string[][]) => {
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
  };

  // 🔥 GLOBAL LOADER
  if (loading) return <TechLoader />;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans p-4 md:p-8 relative overflow-hidden flex flex-col">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-8 flex-1 w-full">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* LOGO ADDED HERE */}
            <div className="relative h-12 w-12 bg-white/5 rounded-xl p-2 border border-white/10">
                 <Image src="/logo.webp" alt="Sol France" fill className="object-contain" />
            </div>
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                Owner's Console
                </h1>
                <p className="text-slate-400 mt-1 text-sm font-medium">Real-time Manufacturing Intelligence</p>
            </div>
          </div>
          <Link href="/" className="self-start md:self-auto flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg border border-white/10">
            <ArrowLeft size={16} /> EXIT
          </Link>
        </div>

        {/* --- NAVIGATION TABS --- */}
        <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl w-full md:w-fit border border-slate-700 backdrop-blur-md overflow-x-auto">
            <button 
                ref={attendanceButtonRef}
                onClick={() => setShowAttendanceDropdown(!showAttendanceDropdown)}
                className={`attendance-dropdown-container flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === 'attendance' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-[1.02]' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
            >
                <UserCheck size={16}/> 
                {activeTab === 'attendance' && attendanceSection ? (
                    attendanceSection === 'basement' ? 'Basement' :
                    attendanceSection === 'firstFloor' ? 'First Floor' :
                    attendanceSection === 'quality' ? 'Quality' :
                    attendanceSection === 'packaging' ? 'Packaging' :
                    attendanceSection === 'filter' ? 'Filter' : 'Attendance'
                ) : 'Attendance'}
                <ChevronDown size={16} className={`transition-transform duration-200 ${showAttendanceDropdown ? 'rotate-180' : ''}`} />
            </button>
            <TabButton 
                label="Cone Production" 
                icon={<Database size={16}/>} 
                active={activeTab === 'production'} 
                onClick={() => setActiveTab('production')} 
            />
            <TabButton 
                label="Quality Check" 
                icon={<CheckCircle2 size={16}/>} 
                active={activeTab === 'quality'} 
                onClick={() => setActiveTab('quality')} 
            />
            <TabButton 
                label="Equal Team" 
                icon={<Users size={16}/>} 
                active={activeTab === 'equal'} 
                onClick={() => setActiveTab('equal')} 
            />
            <div className="email-button-container">
                <div 
                    ref={emailButtonRef}
                    onClick={openEmailDialog} 
                    className='py-2 px-2 flex items-center cursor-pointer bg-[#263247e0] rounded-xl hover:bg-[#263247] transition-colors'
                >
                    <MailCheck size={32} />
                </div>
            </div>
        </div>

        {/* Email Dialog - Fixed Position (Outside Nav) */}
        {showEmailDialog && (
            <>
                {/* Backdrop overlay */}
                <div 
                    className="fixed inset-0 z-[9998] bg-black/20"
                    onClick={closeEmailDialog}
                />
                
                {/* Email Dialog */}
                <div 
                    ref={emailDialogRef}
                    className="email-dialog-menu fixed z-[9999] bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden min-w-[320px] animate-in fade-in slide-in-from-left-2 duration-200"
                    style={{
                        top: `${emailDialogPosition.top}px`,
                        left: `${emailDialogPosition.left}px`,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)'
                    }}
                >
                    {/* Header */}
                    <div className="px-5 py-3.5 border-b border-slate-700/50 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MailCheck size={18} className="text-blue-400" />
                                <span className="text-sm font-bold text-slate-200 uppercase tracking-wider">Send Email</span>
                            </div>
                            <button
                                onClick={closeEmailDialog}
                                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Recipient Email
                            </label>
                            <input
                                type="email"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        sendEmailHandler();
                                    }
                                }}
                                placeholder="Enter email address"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                autoFocus
                            />
                        </div>
                        
                        <button
                            onClick={() => sendEmailHandler()}
                            className="w-full px-5 py-3 text-sm font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-blue-600/30 hover:border-blue-500/50 shadow-lg shadow-blue-900/20"
                        >
                            <MailCheck size={16} />
                            Send Email
                        </button>
                    </div>
                </div>
            </>
        )}

        {/* Professional Attendance Dropdown Menu - Fixed Position */}
        {showAttendanceDropdown && (
            <>
                {/* Backdrop overlay */}
                <div 
                    className="fixed inset-0 z-[9998] bg-black/20"
                    onClick={() => setShowAttendanceDropdown(false)}
                />
                
                {/* Dropdown Menu */}
                <div 
                    className="attendance-dropdown-menu overflow-y-auto scrollbar-hide max-h-[60%] fixed z-[9999] bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden min-w-[260px] animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.3)'
                    }}
                >
                    {/* Header */}
                    <div className="px-5 py-3.5 border-b border-slate-700/50 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
                        <div className="flex items-center gap-2">
                            <UserCheck size={18} className="text-blue-400" />
                            <span className="text-sm font-bold text-slate-200 uppercase tracking-wider">Attendance Sections</span>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                        <button 
                            onClick={() => {
                                setActiveTab('attendance');
                                setAttendanceSection('basement');
                                setShowAttendanceDropdown(false);
                            }}
                            className={`w-full text-left px-5 py-3.5 text-sm font-medium transition-all flex items-center gap-3 group ${
                                activeTab === 'attendance' && attendanceSection === 'basement'
                                    ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-500'
                                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <div className={`w-2 h-2 rounded-full transition-all ${
                                activeTab === 'attendance' && attendanceSection === 'basement'
                                    ? 'bg-blue-400 shadow-lg shadow-blue-400/50'
                                    : 'bg-slate-600 group-hover:bg-slate-500'
                            }`} />
                            <span>Basement</span>
                        </button>
                        
                        <button 
                            onClick={() => {
                                setActiveTab('attendance');
                                setAttendanceSection('firstFloor');
                                setShowAttendanceDropdown(false);
                            }}
                            className={`w-full text-left px-5 py-3.5 text-sm font-medium transition-all flex items-center gap-3 group ${
                                activeTab === 'attendance' && attendanceSection === 'firstFloor'
                                    ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-500'
                                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <div className={`w-2 h-2 rounded-full transition-all ${
                                activeTab === 'attendance' && attendanceSection === 'firstFloor'
                                    ? 'bg-blue-400 shadow-lg shadow-blue-400/50'
                                    : 'bg-slate-600 group-hover:bg-slate-500'
                            }`} />
                            <span>First Floor</span>
                        </button>
                        
                        <button
                            onClick={() => {
                                setActiveTab('attendance');
                                setAttendanceSection('quality');
                                setShowAttendanceDropdown(false);
                            }}
                            className={`w-full text-left px-5 py-3.5 text-sm font-medium transition-all flex items-center gap-3 group ${
                                activeTab === 'attendance' && attendanceSection === 'quality'
                                    ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-500'
                                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <div className={`w-2 h-2 rounded-full transition-all ${
                                activeTab === 'attendance' && attendanceSection === 'quality'
                                    ? 'bg-blue-400 shadow-lg shadow-blue-400/50'
                                    : 'bg-slate-600 group-hover:bg-slate-500'
                            }`} />
                            <span>Quality</span>
                        </button>
                        
                        <button
                            onClick={() => {
                                setActiveTab('attendance');
                                setAttendanceSection('packaging');
                                setShowAttendanceDropdown(false);
                            }}
                            className={`w-full text-left px-5 py-3.5 text-sm font-medium transition-all flex items-center gap-3 group ${
                                activeTab === 'attendance' && attendanceSection === 'packaging'
                                    ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-500'
                                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <div className={`w-2 h-2 rounded-full transition-all ${
                                activeTab === 'attendance' && attendanceSection === 'packaging'
                                    ? 'bg-blue-400 shadow-lg shadow-blue-400/50'
                                    : 'bg-slate-600 group-hover:bg-slate-500'
                            }`} />
                            <span>Packaging</span>
                        </button>
                        
                        <button
                            onClick={() => {
                                setActiveTab('attendance');
                                setAttendanceSection('filter');
                                setShowAttendanceDropdown(false);
                            }}
                            className={`w-full text-left px-5 py-3.5 text-sm font-medium transition-all flex items-center gap-3 group ${
                                activeTab === 'attendance' && attendanceSection === 'filter'
                                    ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-500'
                                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <div className={`w-2 h-2 rounded-full transition-all ${
                                activeTab === 'attendance' && attendanceSection === 'filter'
                                    ? 'bg-blue-400 shadow-lg shadow-blue-400/50'
                                    : 'bg-slate-600 group-hover:bg-slate-500'
                            }`} />
                            <span>Filter</span>
                        </button>

                        <button
                            onClick={() => {
                                setActiveTab('attendance');
                                setAttendanceSection('graphs');
                                setShowAttendanceDropdown(false);
                            }}
                            className={`w-full text-left px-5 py-3.5 text-sm font-medium transition-all flex items-center gap-3 group ${
                                activeTab === 'attendance' && attendanceSection === 'graphs'
                                    ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-500'
                                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <div className={`w-2 h-2 rounded-full transition-all ${
                                activeTab === 'attendance' && attendanceSection === 'graphs'
                                    ? 'bg-blue-400 shadow-lg shadow-blue-400/50'
                                    : 'bg-slate-600 group-hover:bg-slate-500'
                            }`} />
                            <span>Visual Graphs</span>
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-700/50 my-2" />

                    {/* Download Excel File Button */}
                    <div className="px-2 pb-2">
                        <button
                            onClick={() => {
                                downloadExcelFile();
                            }}
                            className="w-full px-5 py-3.5 text-sm font-bold transition-all flex items-center justify-center gap-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 hover:from-green-600/30 hover:to-emerald-600/30 text-green-400 hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-green-600/30 hover:border-green-500/50 shadow-lg shadow-green-900/20"
                        >
                            <Download size={16} />
                            {generatingTotalPDF ? 'Generating...' : 'Download Excel File'}
                        </button>
                    </div>

                    {/* Download Total Button */}
                    <div className="px-2 pb-2">
                        <button
                            onClick={() => {
                                handleDownloadTotalAttendancePDF();
                                setShowAttendanceDropdown(false);
                            }}
                            disabled={generatingTotalPDF || !attendanceData}
                            className="w-full px-5 py-3.5 text-sm font-bold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 hover:from-green-600/30 hover:to-emerald-600/30 text-green-400 hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-green-600/30 hover:border-green-500/50 shadow-lg shadow-green-900/20"
                        >
                            <Download size={16} />
                            {generatingTotalPDF ? 'Generating...' : 'Download Attendance'}
                        </button>
                    </div>
                </div>
            </>
        )}

        {/* --- MAIN CONTENT AREA --- */}
        <div className="bg-[#1e293b]/50 border border-slate-700 rounded-3xl backdrop-blur-xl shadow-2xl p-6 min-h-[500px]">
            
            {/* 1. ATTENDANCE TAB */}
            {activeTab === 'attendance' && !attendanceSection && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex items-center justify-center min-h-[500px]">
                    <div className="text-center space-y-4">
                        <div className="bg-purple-500/10 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                            <UserCheck size={48} className="text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-300">Select Attendance Department</h3>
                        <p className="text-slate-500 text-sm max-w-md">Please select a department from the dropdown menu to view attendance details.</p>
                    </div>
                </div>
            )}

            {activeTab === 'attendance' && attendanceSection && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                    
                    {/* Content Wrapper for PDF */}
                    <div ref={contentRef}>
                        {/* Basements Section */}
                    {attendanceSection === 'basement' && (
                            <>
                                {/* Header with Download Button */}
                                <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400"><UserCheck size={24} /></div>
                                        <h2 className="text-2xl font-bold text-white">Attendance Report - Basement</h2>
                                    </div>
                                    <button
                                        onClick={handleDownloadPDF}
                                        disabled={generatingPDF}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-lg transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Download size={16} />
                                        {generatingPDF ? 'Generating...' : 'Save as PDF'}
                                    </button>
                                </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <TableCard title="Date & Department">
                                    <MetricRow label="Date of Report" value={lastUpdated || new Date().toLocaleDateString('en-IN')} />
                                    <MetricRow label="Department" value="Basement" />
                                </TableCard>
                                <TableCard title="Roller Attendance">
                                    <MetricRow label="Total Rollers" value={attendanceData?.basementRollers || 0} unit="Staff" />
                                    <MetricRow label="Roller Present" value={attendanceData?.basementRollersPresent || 0} unit="Staff" />
                                    <MetricRow label="Roller Absent" value={attendanceData?.basementRollersAbsent || 0} unit="Staff" isBad />
                                </TableCard>
                                <TableCard title="Gummer Attendance">
                                    <MetricRow label="Gummer Total" value={attendanceData?.basementfilterTotal || 0} unit="Staff" />
                                    <MetricRow label="Gummer Present" value={attendanceData?.basementfilterPresent || 0} unit="Staff" />
                                    <MetricRow label="Gummer Absent" value={attendanceData?.basementfilterAbsent || 0} unit="Staff" isBad />
                                </TableCard>
                                <TableCard title="Supervisor Attendance">
                                    <MetricRow label="Supervisor Present" value={attendanceData?.basementSupervisorPresent || 0} unit="Staff" />
                                    <MetricRow label="Supervisor Absent" value={attendanceData?.basementSupervisorAbsent || 0} unit="Staff" isBad />
                                </TableCard>
                            </div>
                        </>
                    )}

                    {/* First Floor Section */}
                    {attendanceSection === 'firstFloor' && (
                        <>
                            {/* Header with Download Button */}
                            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400"><UserCheck size={24} /></div>
                                    <h2 className="text-2xl font-bold text-white">Attendance Report - First Floor</h2>
                                </div>
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={generatingPDF}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-lg transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Download size={16} />
                                    {generatingPDF ? 'Generating...' : 'Save as PDF'}
                                </button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <TableCard title="Date & Department">
                                    <MetricRow label="Date of Report" value={lastUpdated || new Date().toLocaleDateString('en-IN')} />
                                    <MetricRow label="Department" value="First Floor" />
                                </TableCard>
                                <TableCard title="Roller Attendance">
                                    <MetricRow label="Total Rollers" value={attendanceData?.firstFloorRollers || 0} unit="Staff" />
                                    <MetricRow label="Roller Present" value={attendanceData?.firstFloorRollersPresent || 0} unit="Staff" />
                                    <MetricRow label="Roller Absent" value={attendanceData?.firstFloorRollersAbsent || 0} unit="Staff" isBad />
                                </TableCard>
                                <TableCard title="Gummer Attendance">
                                    <MetricRow label="Gummer Total" value={attendanceData?.firstFloorfilterTotal || 0} unit="Staff" />
                                    <MetricRow label="Gummer Present" value={attendanceData?.firstFloorfilterPresent || 0} unit="Staff" />
                                    <MetricRow label="Gummer Absent" value={attendanceData?.firstFloorfilterAbsent || 0} unit="Staff" isBad />
                                </TableCard>
                                <TableCard title="Supervisor Attendance">
                                    <MetricRow label="Supervisor Present" value={attendanceData?.firstFloorSupervisorPresent || 0} unit="Staff" />
                                    <MetricRow label="Supervisor Absent" value={attendanceData?.firstFloorSupervisorAbsent || 0} unit="Staff" isBad />
                                </TableCard>
                            </div>
                        </>
                    )}

                    {/* Quality Department Section */}
                    {attendanceSection === 'quality' && (
                        <>
                            {/* Header with Download Button */}
                            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400"><UserCheck size={24} /></div>
                                    <h2 className="text-2xl font-bold text-white">Attendance Report - Quality Department</h2>
                                </div>
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={generatingPDF}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-lg transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Download size={16} />
                                    {generatingPDF ? 'Generating...' : 'Save as PDF'}
                                </button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <TableCard title="Date & Department">
                                    <MetricRow label="Date of Report" value={lastUpdated || new Date().toLocaleDateString('en-IN')} />
                                    <MetricRow label="Department" value="Quality Department" />
                                </TableCard>
                                <TableCard title="Checker Attendance">
                                    <MetricRow label="Total Checkers" value={attendanceData?.qualityTotal || 0} unit="Staff" />
                                    <MetricRow label="Total Present" value={attendanceData?.qualityPresent || 0} unit="Staff" />
                                    <MetricRow label="Total Absent" value={attendanceData?.qualityAbsent || 0} unit="Staff" isBad />
                                </TableCard>
                            </div>
                        </>
                    )}

                    {/* Packaging Department Section */}
                    {attendanceSection === 'packaging' && (
                        <>
                            {/* Header with Download Button */}
                            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400"><UserCheck size={24} /></div>
                                    <h2 className="text-2xl font-bold text-white">Attendance Report - Packing Department</h2>
                                </div>
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={generatingPDF}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-lg transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Download size={16} />
                                    {generatingPDF ? 'Generating...' : 'Save as PDF'}
                                </button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <TableCard title="Date & Department">
                                    <MetricRow label="Date of Report" value={lastUpdated || new Date().toLocaleDateString('en-IN')} />
                                    <MetricRow label="Department" value="Packing Department" />
                                </TableCard>
                                <TableCard title="Manpower Attendance">
                                    <MetricRow label="Total Manpower" value={attendanceData?.packingTotal || 0} unit="Staff" />
                                    <MetricRow label="Total Present" value={attendanceData?.packingPresent || 0} unit="Staff" />
                                    <MetricRow label="Total Absent" value={attendanceData?.packingAbsent || 0} unit="Staff" isBad />
                                </TableCard>
                            </div>
                        </>
                    )}

                    {/* Filter Department Section */}
                    {attendanceSection === 'filter' && (
                        <>
                            {/* Header with Download Button */}
                            <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400"><UserCheck size={24} /></div>
                                    <h2 className="text-2xl font-bold text-white">Attendance Report - Filter Department</h2>
                                </div>
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={generatingPDF}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-lg transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Download size={16} />
                                    {generatingPDF ? 'Generating...' : 'Save as PDF'}
                                </button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* <TableCard title="Date & Department">
                                    <MetricRow label="Date of Report" value={lastUpdated || new Date().toLocaleDateString('en-IN')} />
                                    <MetricRow label="Department" value="Filter Department" />
                                </TableCard> */}
                                <TableCard title="Filter Maker Attendance">
                                    <MetricRow label="Total Makers" value={attendanceData?.filterMakerTotal || 0} unit="Staff" />
                                    <MetricRow label="Present" value={attendanceData?.filterMakerPresent || 0} unit="Staff" />
                                    <MetricRow label="Absent" value={attendanceData?.filterMakerAbsent || 0} unit="Staff" isBad />
                                </TableCard>
                                <TableCard title="Filter Folder Attendance">
                                    <MetricRow label="Total Folders" value={attendanceData?.filterFolderTotal || 0} unit="Staff" />
                                    <MetricRow label="Present" value={attendanceData?.filterFolderPresent || 0} unit="Staff" />
                                    <MetricRow label="Absent" value={attendanceData?.filterFolderAbsent || 0} unit="Staff" isBad />
                                </TableCard>
                            </div>
                        </>
                    )}

                    {/* Visual Graphs */}
                    {attendanceSection === 'graphs' && (
                        <AttendanceLineGraph />
                    )}
                    </div>
                </div>
            )}

            {/* 2. PRODUCTION TAB */}
            {activeTab === 'production' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                    
                    {/* Header */}
                    <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
                        <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400"><Database size={24} /></div>
                        <h2 className="text-2xl font-bold text-white">Cone Production Update</h2>
                    </div>

                    {/* Progress Bar: Target vs Actual */}
                    <ProgressBar label="Daily Target Achievement" current={0} total={0} color="blue" />

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Left Column: Core Metrics */}
                        <TableCard title="Operational Metrics">
                            <MetricRow label="Total SKU / Brands" value={'-'} />
                            <MetricRow label="Total RFS" value={0} />
                            <MetricRow label="Total Rollers" value={0} />
                            <MetricRow label="Total Manpower" value={0} unit="Staff" />
                            <MetricRow label="Target" value={0} unit="Units" />
                            <MetricRow label="Total Production" value={0} unit="Units" highlight />
                        </TableCard>

                        {/* Right Column: Materials */}
                        <TableCard title="Material Consumption">
                            <MetricRow label="Gum Used" value={0} unit="Kg" />
                            <MetricRow label="Paper Used" value={0} unit="Kg" />
                            <MetricRow label="Paper Rejection" value={0} unit="Kg" isBad />
                            <MetricRow label="Filter Used" value={0} unit="Pcs" />
                            <MetricRow label="Filter Rejection" value={0} unit="Pcs" isBad />
                        </TableCard>
                    </div>
                </div>
            )}

            {/* 3. QUALITY CHECK TAB */}
            {activeTab === 'quality' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                    
                    <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
                        <div className="bg-green-500/20 p-2 rounded-lg text-green-400"><CheckCircle2 size={24} /></div>
                        <h2 className="text-2xl font-bold text-white">Quality Check Update</h2>
                    </div>

                     {/* Visual Yield Bar */}
                     <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-700">
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Quality Yield Rate</span>
                            <span className="text-sm font-bold text-white">
                                {0} OK <span className="text-slate-600">|</span> <span className="text-red-400">{0} Rejected</span>
                            </span>
                        </div>
                        {/* Visual Bar Graph */}
                        <div className="h-6 bg-slate-800 rounded-full overflow-hidden flex w-full">
                            <div className="h-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]" style={{ width: `${(0 / (1)) * 100}%` }}></div>
                            <div className="h-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" style={{ width: `${(0 / (1)) * 100}%` }}></div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-slate-500">
                            <span>Success Rate</span>
                            <span>Defect Rate</span>
                        </div>
                     </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <TableCard title="Team & Scope">
                            <MetricRow label="Brands Checked" value={'-'} />
                            <MetricRow label="Total Checkers" value={0} unit="Staff" />
                            <MetricRow label="Equal Checkers" value={0} unit="Staff" />
                            <MetricRow label="Total QC Verified" value={0} unit="Pcs" highlight />
                        </TableCard>
                        
                        <TableCard title="Defect Analysis">
                            <MetricRow label="Correct Pieces" value={0} unit="Pcs" />
                            <MetricRow label="Rejected Pieces" value={0} unit="Pcs" isBad />
                            <MetricRow label="Rejection Rate" value={0} unit="%" isBad />
                        </TableCard>
                    </div>
                </div>
            )}

            {/* 4. EQUAL TEAM TAB */}
            {activeTab === 'equal' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                    
                    <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
                        <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400"><Users size={24} /></div>
                        <h2 className="text-2xl font-bold text-white">Equal Team Report</h2>
                    </div>

                    {/* Big Visual Cards for Equal Team */}
                    <div className="grid md:grid-cols-3 gap-6">
                        <BigCard 
                            label="Total Boxes Checked" 
                            value={0} 
                            icon={<Box size={32}/>}
                            color="blue" 
                        />
                        <BigCard 
                            label="Rejected Pieces" 
                            value={0} 
                            icon={<AlertTriangle size={32}/>}
                            color="red" 
                        />
                        <BigCard 
                            label="Ready for Packing" 
                            value={0} 
                            icon={<Package size={32}/>}
                            color="green" 
                        />
                    </div>
                    
                    <div className="p-4 bg-slate-900/30 border border-slate-700 rounded-xl text-center">
                        <p className="text-sm text-slate-400">
                            The Equal Team ensures final packaging standards. <br/>
                            <span className="text-white font-bold">{0}</span> units are cleared for dispatch today.
                        </p>
                    </div>
                </div>
            )}

        </div>
      </div>
      
      {/* --- FOOTER --- */}
      <footer className="relative z-10 py-6 text-center text-[10px] text-slate-600 font-medium uppercase tracking-widest mt-auto">
         © {new Date().getFullYear()} Sol France. All rights reserved.
      </footer>

      {/* --- EMAIL NOTIFICATION CARD --- */}
      {emailNotification && (
        <div className="fixed bottom-6 left-6 z-[10000] animate-in fade-in slide-in-from-left-4 duration-300">
          <div className={`min-w-[320px] max-w-md rounded-2xl border backdrop-blur-xl shadow-2xl overflow-hidden ${
            emailNotification.type === 'loading'
              ? 'bg-blue-900/30 border-blue-500/50 shadow-blue-900/30'
              : emailNotification.type === 'success' 
              ? 'bg-green-900/30 border-green-500/50 shadow-green-900/30' 
              : 'bg-red-900/30 border-red-500/50 shadow-red-900/30'
          }`}>
            <div className="p-4 flex items-start gap-3">
              <div className={`flex-shrink-0 p-2 rounded-lg ${
                emailNotification.type === 'loading'
                  ? 'bg-blue-500/20 text-blue-400'
                  : emailNotification.type === 'success' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {emailNotification.type === 'loading' ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : emailNotification.type === 'success' ? (
                  <CheckCircle size={20} />
                ) : (
                  <XCircle size={20} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${
                  emailNotification.type === 'loading'
                    ? 'text-blue-300'
                    : emailNotification.type === 'success' 
                    ? 'text-green-300' 
                    : 'text-red-300'
                }`}>
                  {emailNotification.type === 'loading'
                    ? 'Sending Email'
                    : emailNotification.type === 'success' 
                    ? 'Success' 
                    : 'Error'}
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  {emailNotification.message}
                </p>
              </div>
              {emailNotification.type !== 'loading' && (
                <button
                  onClick={() => setEmailNotification(null)}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function TabButton({ label, icon, active, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                active 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-[1.02]' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
        >
            {icon} {label}
        </button>
    );
}

function TableCard({ title, children }: any) {
    return (
        <div className="bg-slate-900/30 rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50 font-bold text-white text-sm bg-white/5 uppercase tracking-wider">{title}</div>
            <div className="p-2">
                <table className="w-full text-sm"><tbody>{children}</tbody></table>
            </div>
        </div>
    );
}

function MetricRow({ label, value, unit, highlight = false, isBad = false }: any) {
    const isLongText = typeof value === 'string' && value.length > 20;
    
    return (
      <tr className="border-b border-slate-700/30 last:border-0 hover:bg-white/5 transition-colors group">
        <td className="p-4 text-slate-400 font-medium group-hover:text-slate-200 transition-colors">{label}</td>
        <td className={`p-4 text-right font-bold 
            ${highlight ? 'text-xl text-green-400' : isBad ? 'text-red-400' : 'text-white'}
            ${isLongText ? 'text-xs leading-tight max-w-[150px]' : ''}
        `}>
          {value || 0} <span className="text-[10px] text-slate-500 font-normal ml-1">{unit}</span>
        </td>
      </tr>
    );
}

function ProgressBar({ label, current, total, color }: any) {
    const safeCurrent = Number(current) || 0;
    const safeTotal = Number(total) || 1; 
    const percent = Math.min((safeCurrent / safeTotal) * 100, 100);
    
    return (
        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-700 shadow-inner">
            <div className="flex justify-between mb-3 items-end">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                <div className="text-right">
                    <span className="text-2xl font-black text-white">{safeCurrent}</span>
                    <span className="text-sm text-slate-500 mx-1">/</span>
                    <span className="text-sm font-bold text-slate-400">{safeTotal}</span>
                </div>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full bg-blue-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(59,130,246,0.6)]`} 
                    style={{ width: `${percent}%` }}
                >
                    <div className="w-full h-full bg-white/20 animate-pulse"></div>
                </div>
            </div>
            <div className="text-right mt-2 text-xs font-bold text-blue-400">{Math.round(percent)}% Completed</div>
        </div>
    );
}

function BigCard({ label, value, icon, color }: any) {
    const colors: any = {
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20',
        green: 'text-green-400 bg-green-500/10 border-green-500/20 hover:bg-green-500/20',
        red: 'text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20',
    };
    return (
        <div className={`p-6 rounded-3xl border flex flex-col items-center justify-center gap-3 transition-all hover:scale-[1.02] ${colors[color]}`}>
            <div className="p-4 rounded-full bg-black/20">{icon}</div>
            <span className="text-4xl font-black text-white tracking-tighter">{value || 0}</span>
            <span className="text-xs font-bold uppercase opacity-80 tracking-widest">{label}</span>
        </div>
    );
}