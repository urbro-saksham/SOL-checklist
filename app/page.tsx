'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2, CheckCircle2, Lock, ArrowRight, Activity, ShieldCheck, ExternalLink, ServerCog, KeyRound } from 'lucide-react';

// --- ⚙️ CONFIGURATION ---
const OWNER_PHONE = "919876543210"; 

// 🔐 PINS (The "Keys" to open the sheets)
const DEPARTMENT_PINS: Record<string, string> = {
  'floor': '1001',
  'basement': '2002',
  'quality': '3003',
  'stock': '4004',
  'attendance': '5005',
  'it_check': '6006'
};

// 🔗 LINKS TO SHEETS (Hidden until PIN is entered)
const DEPARTMENT_SHEETS: Record<string, string> = {
  'floor': 'https://docs.google.com/spreadsheets/d/YOUR_FLOOR_SHEET_ID/edit',
  'basement': 'https://docs.google.com/spreadsheets/d/YOUR_BASEMENT_SHEET_ID/edit',
  'quality': 'https://docs.google.com/spreadsheets/d/YOUR_QUALITY_SHEET_ID/edit',
  'stock': 'https://docs.google.com/spreadsheets/d/YOUR_STOCK_SHEET_ID/edit',
  'attendance': 'https://docs.google.com/spreadsheets/d/YOUR_ATTENDANCE_SHEET_ID/edit',
  'it_check': '#' 
};

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/checklist');
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setData(json.departments || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (deptId: string, name: string, comment: string) => {
    setSubmitting(deptId);
    
    const res = await fetch('/api/checklist', {
      method: 'POST',
      body: JSON.stringify({ rowIndex: 0, deptId, supervisor: name, comment }),
    });

    if (!res.ok) {
        alert("Failed to submit.");
    } else {
        await fetchData();

        // --- IT AUTOMATION ---
        if (deptId === 'it_check') {
            const text = `✅ *Daily Protocol Completed (IST)*\n\nDate: ${new Date().toLocaleDateString('en-IN')}\n\nAll Departments have updated their sheets.\nIT Verification Complete.\n\n- Sent via SOL App`;
            window.location.href = `https://wa.me/${OWNER_PHONE}?text=${encodeURIComponent(text)}`;
        }
    }
    setSubmitting(null);
  };

  const completedCount = data.filter(d => d.completed).length;
  const tasksCompleted = data.filter(d => d.id !== 'it_check' && d.completed).length;
  const progress = (completedCount / 6) * 100;
  
  const dateStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0f172a] text-white">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-bold tracking-widest uppercase text-blue-400">System Initializing...</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 font-sans pb-24">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#0f172a] via-[#1e3a8a] to-transparent opacity-100" />
      </div>

      <header className="relative z-10 pt-6 px-6 pb-20">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="relative h-16 w-40 filter drop-shadow-lg">
             <Image src="/logo.webp" alt="Logo" fill className="object-contain object-left" priority />
          </div>
          <div className="text-right text-white">
            <div className="text-3xl font-black tracking-tighter leading-none">{dateStr}</div>
            <div className="text-xs font-bold text-blue-300 uppercase tracking-widest">IST</div>
          </div>
        </div>

        <div className="max-w-xl mx-auto mt-8">
           <div className="flex justify-between items-end mb-2 text-white">
             <div>
               <h1 className="text-lg font-bold">Daily Protocol</h1>
               <p className="text-xs text-blue-200 opacity-80">Authorized Personnel Only</p>
             </div>
             <div className="text-right">
               <div className="text-3xl font-black leading-none">{Math.round(progress)}<span className="text-lg">%</span></div>
             </div>
           </div>
           
           <div className="h-3 w-full bg-blue-900/50 rounded-full backdrop-blur-sm overflow-hidden border border-white/10 relative">
              <div 
                className={`h-full transition-all duration-1000 ease-out shadow-[0_0_20px_rgba(239,68,68,0.8)] relative overflow-hidden
                  ${completedCount === 6 ? 'bg-green-500' : 'bg-gradient-to-r from-red-600 to-red-400'}
                `}
                style={{ width: `${Math.max(progress, 5)}%` }}
              >
              </div>
           </div>
        </div>
      </header>

      <main className="relative z-20 px-4 -mt-12 max-w-xl mx-auto space-y-5">
        {data.map((dept) => {
          const isIT = dept.id === 'it_check';
          const isLocked = isIT ? tasksCompleted < 5 : false;
          const isActive = !dept.completed && !isLocked;

          return (
            <div 
              key={dept.id}
              className={`
                relative rounded-2xl transition-all duration-500 ease-out overflow-hidden
                ${isActive 
                  ? 'bg-white shadow-xl scale-[1.01] ring-1 ring-red-100 translate-y-0 z-10' 
                  : 'bg-white/90 shadow-sm border border-slate-100 hover:bg-white translate-y-2 z-0'
                }
                ${isLocked ? 'opacity-60 grayscale-[50%] bg-slate-50' : ''}
              `}
            >
              {isActive && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-red-500"></div>}

              <div className="p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`
                    h-12 w-12 rounded-xl flex items-center justify-center text-lg shadow-inner
                    ${dept.completed ? 'bg-green-100 text-green-700' : isActive ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}
                  `}>
                    {dept.completed ? <CheckCircle2 size={24} /> : isIT ? <ServerCog size={24}/> : isActive ? <Activity size={24} className="animate-pulse"/> : <Lock size={22} />}
                  </div>

                  <div className="flex-1">
                    <h3 className={`font-bold text-lg leading-tight ${dept.completed ? 'text-slate-800' : isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                      {dept.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {dept.completed && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded uppercase">Submitted</span>}
                      {isActive && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded uppercase animate-pulse">Pending Action</span>}
                      {isLocked && <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase">Locked</span>}
                    </div>
                  </div>
                </div>

                <div className="pl-[60px]">
                  {dept.completed ? (
                    <div className="bg-slate-50 rounded-lg p-3 text-sm border border-slate-100 flex items-start gap-3">
                      <ShieldCheck size={16} className="text-green-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-slate-900 font-semibold">{dept.supervisor}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{dept.timestamp}</div>
                      </div>
                    </div>
                  ) : isActive ? (
                    <div className="animate-in slide-in-from-bottom-2 fade-in duration-500">
                      <ActiveForm 
                        dept={dept} 
                        requiredPin={DEPARTMENT_PINS[dept.id]} 
                        sheetLink={DEPARTMENT_SHEETS[dept.id]} // Pass the link here
                        onSubmit={handleSubmit} 
                        isSubmitting={submitting === dept.id} 
                      />
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic flex items-center gap-2 h-8">Waiting for departments to finish...</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {completedCount === 6 && (
          <div className="text-center py-8 animate-in zoom-in duration-500">
            <h2 className="text-xl font-black text-slate-800">Complete</h2>
            <p className="text-slate-500 text-sm">Owner has been notified.</p>
          </div>
        )}
      </main>
    </div>
  );
}

// --- SECURE FORM COMPONENT ---
function ActiveForm({ dept, requiredPin, sheetLink, onSubmit, isSubmitting }: any) {
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [pin, setPin] = useState('');
  const [isVerified, setIsVerified] = useState(false); // <--- Controls visibility
  const [error, setError] = useState('');

  const handleVerify = () => {
    if (pin !== requiredPin) {
      setError('Incorrect PIN. Access Denied.');
      return;
    }
    setIsVerified(true);
    setError('');
  };

  const handleFinalSubmit = () => {
    if (!name.trim()) {
        setError("Supervisor Name is required.");
        return;
    }
    onSubmit(dept.id, name, comment);
  };

  // STATE 1: LOCKED (Show PIN Input only)
  if (!isVerified) {
    return (
      <div className="mt-2 space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
             <KeyRound size={14} /> 
             <span>Verify Identity to Access Sheet</span>
        </div>
        <div className="flex gap-3">
            <div className="relative flex-1">
                <input 
                  type="password"
                  maxLength={4}
                  className="peer w-full h-10 bg-white border-2 border-slate-200 rounded-lg text-center text-sm font-bold text-slate-900 tracking-[0.3em] focus:border-red-500 focus:outline-none transition-all"
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                />
            </div>
            <button 
                onClick={handleVerify}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-black transition-colors"
            >
                UNLOCK
            </button>
        </div>
        {error && <div className="text-xs text-red-500 font-bold animate-pulse">{error}</div>}
      </div>
    );
  }

  // STATE 2: UNLOCKED (Show Link and Submit Form)
  return (
    <div className="space-y-5 pt-2 animate-in fade-in zoom-in duration-300">
      
      {/* 1. OPEN SHEET BUTTON (Only visible after PIN) */}
      {dept.id !== 'it_check' && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <a 
              href={sheetLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#1e3a8a] text-white font-bold text-sm py-3 rounded-lg shadow-blue-900/20 shadow-lg hover:bg-blue-900 transition-all transform hover:scale-[1.02]"
            >
              <ExternalLink size={16} />
              OPEN {dept.name.toUpperCase()} SHEET
            </a>
            <p className="text-[10px] text-center text-blue-400 mt-2 font-medium">
                Complete your work in the sheet, then fill the form below.
            </p>
        </div>
      )}

      {/* 2. SUBMISSION FORM */}
      <div className="grid gap-5 md:grid-cols-2">
          <div className="relative">
            <input 
              id={`name-${dept.id}`}
              className="peer w-full h-12 bg-transparent border-b-2 border-slate-300 text-sm font-bold text-slate-900 placeholder-transparent focus:border-red-500 focus:outline-none transition-all pt-4"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label htmlFor={`name-${dept.id}`} className="pointer-events-none absolute left-0 -top-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-slate-500 peer-focus:-top-1 peer-focus:text-[10px] peer-focus:text-red-500">
              Supervisor Name
            </label>
          </div>
          
          <div className="relative">
            <input 
              id={`comment-${dept.id}`}
              className="peer w-full h-12 bg-transparent border-b-2 border-slate-300 text-sm font-medium text-slate-900 placeholder-transparent focus:border-blue-500 focus:outline-none transition-all pt-4"
              placeholder="Comments"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <label htmlFor={`comment-${dept.id}`} className="pointer-events-none absolute left-0 -top-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-slate-500 peer-focus:-top-1 peer-focus:text-[10px] peer-focus:text-blue-500">
              Comments (Optional)
            </label>
          </div>
      </div>

      <button 
          disabled={!name.trim() || isSubmitting}
          onClick={handleFinalSubmit}
          className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] shadow-lg ${!name.trim() ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 'bg-green-600 text-white shadow-green-900/20 hover:bg-green-700'}`}
      >
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <><span>MARK WORK AS DONE</span><ArrowRight size={16} /></>}
      </button>
      
      {error && <div className="text-center text-xs text-red-500 font-bold animate-pulse">{error}</div>}
    </div>
  );
}