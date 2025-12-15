'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { 
  Loader2, CheckCircle2, Lock, ArrowRight, Activity, ShieldCheck, 
  ExternalLink, ServerCog, KeyRound, X, LayoutGrid, AlertTriangle, 
  Link as LinkIcon, Maximize2, Save, Cloud, Check 
} from 'lucide-react';

// --- ⚙️ CONFIGURATION ---
const OWNER_PHONE = "919876543210"; 

const DEPARTMENT_PINS: Record<string, string> = {
  'floor': '1001',
  'basement': '2002',
  'quality': '3003',
  'stock': '4004',
  'attendance': '5005',
  'it_check': '6006'
};

const DEFAULT_LINKS: Record<string, string> = {
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
  const [activeDeptId, setActiveDeptId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [embeddedLink, setEmbeddedLink] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false); // Controls the "Saving..." animation

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

  const handleSubmit = async (deptId: string, name: string, comment: string, sheetLink: string) => {
    setSubmitting(deptId);
    
    const res = await fetch('/api/checklist', {
      method: 'POST',
      body: JSON.stringify({ rowIndex: 0, deptId, supervisor: name, comment, sheetLink }),
    });

    const json = await res.json();

    if (!res.ok) {
        alert(json.error || "Failed to submit.");
    } else {
        await fetchData();
        setActiveDeptId(null); 
        setEmbeddedLink(null);

        if (deptId === 'it_check') {
            generateWhatsAppReport(name);
        }
    }
    setSubmitting(null);
  };

  const handleSaveAndClose = () => {
    // 1. Show Sync Animation
    setIsSyncing(true);
    // 2. Wait 1.5s to simulate "Syncing to Backend"
    setTimeout(() => {
        setIsSyncing(false);
        setEmbeddedLink(null);
    }, 1500);
  };

  const generateWhatsAppReport = (itName: string) => {
      const lateList = data
        .filter(d => d.id !== 'it_check' && d.completed)
        .filter(d => {
            const timeStr = d.timestamp.replace('🔴 LATE', '').trim();
            const [time, modifier] = timeStr.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (modifier === 'PM' && hours !== 12) hours += 12;
            if (modifier === 'AM' && hours === 12) hours = 0;
            if (hours > 19 || (hours === 19 && minutes > 30)) return true;
            return false;
        })
        .map(d => `${d.name} (${d.supervisor})`);

      let text = `✅ *Daily Protocol Completed*\n\nDate: ${new Date().toLocaleDateString('en-IN')}\nIT Verified by: ${itName}\n\n`;
      if (lateList.length > 0) {
          text += `⚠️ *LATE SUBMISSIONS (>7:30 PM):*\n`;
          lateList.forEach(item => text += `- ${item}\n`);
      } else {
          text += `🌟 All departments submitted on time.\n`;
      }
      text += `\n- Sent via SOL App`;
      window.location.href = `https://wa.me/${OWNER_PHONE}?text=${encodeURIComponent(text)}`;
  };

  const completedCount = data.filter(d => d.completed).length;
  const tasksCompleted = data.filter(d => d.id !== 'it_check' && d.completed).length;
  const progress = (completedCount / 6) * 100;
  const dateStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
  const activeDept = data.find(d => d.id === activeDeptId);

  const currentLink = activeDept?.savedLink || DEFAULT_LINKS[activeDept?.id || ''] || '';

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-[#000510] text-white">
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <div className="h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_50px_rgba(59,130,246,0.5)]"></div>
        <span className="text-sm font-bold tracking-[0.3em] uppercase text-blue-400">System Initializing</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans overflow-hidden relative selection:bg-blue-500 selection:text-white">
      
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#0f172a]" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-[pulse_10s_infinite]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-[pulse_15s_infinite_reverse]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* --- 🖥️ EMBEDDED WORKSPACE (THEME MATCHED) --- */}
      {embeddedLink && (
         <div className="fixed inset-0 z-[60] flex flex-col animate-in slide-in-from-bottom-10 duration-500 bg-[#0f172a]">
            
            {/* Dark Toolbar */}
            <div className="h-16 bg-[#0f172a]/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 shadow-2xl z-50">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600/20 text-blue-400 p-2 rounded-lg border border-blue-500/30"><LayoutGrid size={20}/></div>
                    <div>
                        <h3 className="text-base font-bold text-white leading-tight">{activeDept?.name}</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            Live Connection Active
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                   <p className="hidden md:block text-xs text-slate-500 italic">Changes in Google Sheets save automatically</p>
                   <button 
                       onClick={handleSaveAndClose}
                       disabled={isSyncing}
                       className="group relative flex items-center gap-3 bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)] hover:shadow-[0_0_30px_rgba(22,163,74,0.5)] overflow-hidden"
                   >
                       {isSyncing ? (
                         <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>SYNCING DATA...</span>
                         </>
                       ) : (
                         <>
                            <Save size={16} />
                            <span>SAVE & CLOSE</span>
                         </>
                       )}
                       {/* Button Shine Effect */}
                       <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                   </button>
                </div>
            </div>
            
            {/* The Google Sheet Iframe Container */}
            <div className="flex-1 relative bg-[#0f172a]">
                {/* Loading Spinner for Iframe */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <Loader2 size={40} className="text-blue-500 animate-spin opacity-50"/>
                </div>
                
                {/* The Iframe */}
                <iframe 
                    src={embeddedLink} 
                    className={`relative z-10 w-full h-full border-0 transition-opacity duration-700 ${isSyncing ? 'opacity-50 scale-[0.99] blur-sm' : 'opacity-100'}`}
                    allow="clipboard-write"
                />

                {/* Sync Overlay */}
                {isSyncing && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                      <div className="bg-[#0f172a] border border-blue-500/50 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95">
                          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
                             <Cloud size={32} className="animate-pulse"/>
                          </div>
                          <div className="text-center">
                             <h4 className="text-white font-bold text-lg">Syncing Workspace</h4>
                             <p className="text-slate-400 text-xs mt-1">Returning to Command Center...</p>
                          </div>
                      </div>
                  </div>
                )}
            </div>
         </div>
      )}

      <header className="relative z-10 w-full px-8 py-6 flex items-center justify-between border-b border-white/5 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-6">
           <div className="relative h-12 w-40 hover:brightness-125 transition-all">
             <Image src="/logo.webp" alt="Logo" fill className="object-contain object-left" priority />
           </div>
           <div className="hidden md:flex flex-col">
             <span className="text-xs font-bold text-blue-400 tracking-widest uppercase">Protocol Status</span>
             <span className="text-sm font-bold text-white tracking-wide">Daily Production Checklist</span>
           </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">IST Date</div>
            <div className="text-xl font-black text-white tracking-tight">{dateStr}</div>
          </div>
          <div className="relative h-14 w-14 flex items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
              <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
              <path className="text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-all duration-1000 ease-out" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
            </svg>
            <span className="absolute text-[10px] font-bold">{Math.round(progress)}%</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-6 py-6 h-[calc(100vh-100px)] flex flex-col">
        <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-center gap-3 text-amber-200">
            <AlertTriangle size={18} className="animate-pulse" />
            <span className="text-sm font-bold tracking-wide">
                DEADLINE NOTICE: Reports submitted after <span className="text-white bg-amber-600/40 px-2 py-0.5 rounded">7:30 PM</span> will be flagged to Management.
            </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full max-h-[600px]">
          {data.map((dept) => {
            const isIT = dept.id === 'it_check';
            const isLocked = isIT ? tasksCompleted < 5 : false;
            const isCompleted = dept.completed;
            const isLate = dept.timestamp.includes('LATE');
            
            return (
              <button
                key={dept.id}
                disabled={isLocked}
                onClick={() => !isLocked && setActiveDeptId(dept.id)}
                className={`
                  group relative w-full h-full min-h-[160px] rounded-2xl p-6 text-left transition-all duration-500 border backdrop-blur-md flex flex-col justify-between overflow-hidden
                  ${isCompleted 
                    ? isLate ? 'bg-red-900/10 border-red-500/30' : 'bg-blue-900/20 border-blue-500/30'
                    : isLocked 
                      ? 'bg-slate-900/40 border-slate-800 cursor-not-allowed opacity-60 grayscale' 
                      : 'bg-slate-800/40 border-slate-700 hover:bg-slate-700/50 hover:border-slate-500 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]'
                  }
                `}
              >
                {!isLocked && !isCompleted && (
                   <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-400/30 transition-all"></div>
                )}

                <div className="flex justify-between items-start w-full">
                  <div className={`p-3 rounded-xl transition-all duration-300 ${isCompleted ? 'bg-blue-500/20 text-blue-400' : isLocked ? 'bg-slate-800 text-slate-500' : 'bg-white/10 text-white group-hover:bg-blue-600 group-hover:text-white'}`}>
                    {isCompleted ? <CheckCircle2 size={24} /> : isIT ? <ServerCog size={24}/> : isLocked ? <Lock size={24} /> : <Activity size={24} />}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${isCompleted ? (isLate ? 'bg-red-900/40 border-red-500 text-red-200' : 'bg-blue-900/40 border-blue-500/30 text-blue-300') : isLocked ? 'bg-slate-900 border-slate-700 text-slate-500' : 'bg-red-500/20 border-red-500/30 text-red-300 animate-pulse'}`}>
                    {isCompleted ? (isLate ? 'LATE SUBMISSION' : 'COMPLETED') : isLocked ? 'LOCKED' : 'ACTION REQ.'}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg md:text-xl font-bold text-white mb-1 group-hover:text-blue-200 transition-colors">{dept.name}</h3>
                  {isCompleted ? (
                    <div className="text-xs text-slate-400 font-mono">By: <span className="text-white">{dept.supervisor}</span> at {dept.timestamp.replace('🔴 LATE', '')}</div>
                  ) : (
                    <div className="text-xs text-slate-400 group-hover:text-slate-300 flex items-center gap-2">
                       {isLocked ? 'Waiting for sequence...' : 'Click to Update Status'}
                       {!isLocked && <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* VERIFICATION MODAL */}
      {activeDept && !embeddedLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setActiveDeptId(null)}/>
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-slate-700 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-slate-900/50 p-6 border-b border-slate-800 flex justify-between items-center">
              <div><h2 className="text-xl font-bold text-white">{activeDept.name}</h2></div>
              <button onClick={() => setActiveDeptId(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-6">
              {activeDept.completed ? (
                <div className="text-center py-8">
                  <div className="inline-flex p-4 bg-green-500/20 rounded-full text-green-400 mb-4"><CheckCircle2 size={48} /></div>
                  <h3 className="text-white font-bold text-lg">Already Submitted</h3>
                  <p className="text-slate-400 text-sm mt-2">By: {activeDept.supervisor}<br/>Time: {activeDept.timestamp}</p>
                </div>
              ) : (
                <ActiveForm 
                    dept={activeDept} 
                    requiredPin={DEPARTMENT_PINS[activeDept.id]} 
                    savedLink={currentLink} 
                    onOpenSheet={(link: string) => setEmbeddedLink(link)} 
                    onSubmit={handleSubmit} 
                    isSubmitting={submitting === activeDept.id}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActiveForm({ dept, requiredPin, savedLink, onOpenSheet, onSubmit, isSubmitting }: any) {
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [link, setLink] = useState('');
  const [pin, setPin] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = () => {
    if (pin !== requiredPin) { setError('Incorrect PIN'); return; }
    setIsVerified(true); setError('');
  };

  const handleFinalSubmit = () => {
    if (!name.trim()) { setError("Name Required"); return; }
    if (dept.id !== 'it_check' && !link.includes('docs.google.com/spreadsheets')) { setError("Valid Google Sheet Link Required"); return; }
    onSubmit(dept.id, name, comment, link);
  };

  if (!isVerified) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-400"><KeyRound size={24} /></div>
        <div><h3 className="text-white font-bold">Identity Verification</h3><p className="text-slate-400 text-xs mt-1">Enter Department PIN</p></div>
        <div className="flex justify-center gap-2">
          <input type="password" maxLength={4} className="w-48 h-12 bg-slate-900 border border-slate-700 rounded-xl text-center text-xl font-bold text-white tracking-[0.5em] focus:border-blue-500 focus:outline-none" placeholder="PIN" value={pin} onChange={(e) => { setPin(e.target.value); setError(''); }} onKeyDown={(e) => e.key === 'Enter' && handleVerify()}/>
        </div>
        <button onClick={handleVerify} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all">VERIFY ACCESS</button>
        {error && <div className="text-red-400 text-xs font-bold animate-pulse">{error}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in slide-in-from-bottom-5 duration-300">
      
      {/* 1. BUTTON: TRIGGERS EMBEDDED IFRAME */}
      {dept.id !== 'it_check' && (
        <button 
            onClick={() => onOpenSheet(savedLink || '#')}
            className="group flex items-center justify-between w-full bg-[#1e293b] border border-slate-700 hover:border-blue-500/50 p-4 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]"
        >
          <div className="flex items-center gap-3">
             <div className="p-2 bg-green-500/20 text-green-400 rounded-lg group-hover:scale-110 transition-transform"><Maximize2 size={20}/></div>
             <div className="text-left"><div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">Launch Work Sheet</div><div className="text-[10px] text-slate-400">Opens inside App</div></div>
          </div>
          <ExternalLink size={16} className="text-slate-500 group-hover:text-white transition-colors"/>
        </button>
      )}

      <div className="h-px bg-slate-800 w-full my-4"></div>

      <div className="space-y-4">
        <div className="grid gap-5 md:grid-cols-2">
            <div className="relative"><input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none peer placeholder-transparent" id="n" placeholder="N" value={name} onChange={e => setName(e.target.value)}/><label htmlFor="n" className="absolute left-4 top-[-10px] bg-[#0f172a] px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:top-3.5 peer-focus:top-[-10px] peer-focus:text-blue-500 pointer-events-none">Supervisor Name</label></div>
            <div className="relative"><input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none peer placeholder-transparent" id="c" placeholder="C" value={comment} onChange={e => setComment(e.target.value)}/><label htmlFor="c" className="absolute left-4 top-[-10px] bg-[#0f172a] px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:top-3.5 peer-focus:top-[-10px] peer-focus:text-blue-500 pointer-events-none">Comments</label></div>
        </div>

        {dept.id !== 'it_check' && (
            <div className="relative mt-2">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-500/10 rounded-xl text-green-400 shrink-0"><LinkIcon size={20} /></div>
                    <div className="relative w-full">
                        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-green-500 focus:outline-none peer placeholder-transparent" id="l" placeholder="L" value={link} onChange={e => setLink(e.target.value)}/>
                        <label htmlFor="l" className="absolute left-4 top-[-10px] bg-[#0f172a] px-1 text-[10px] font-bold text-green-500 uppercase tracking-wider transition-all peer-placeholder-shown:top-3.5 peer-focus:top-[-10px] pointer-events-none">Paste New Link (After Editing)</label>
                    </div>
                </div>
            </div>
        )}
      </div>

      <button disabled={isSubmitting} onClick={handleFinalSubmit} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 shadow-[0_0_20px_rgba(22,163,74,0.3)]">
          {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <><span>CONFIRM COMPLETION</span><CheckCircle2 size={18} /></>}
      </button>
      {error && <div className="text-center text-xs text-red-400 font-bold">{error}</div>}
    </div>
  );
}