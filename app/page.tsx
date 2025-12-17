'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircle2, Lock, ArrowRight, Activity, ShieldCheck, 
  ExternalLink, KeyRound, X, LayoutGrid, AlertTriangle, 
  Link as LinkIcon, Maximize2, Save, BarChart3,
  Factory, Warehouse, ClipboardCheck, Package, Users, Wifi, Trophy, Loader2,
  ChevronDown, ChevronUp, Hash, Ban, Box, UserCheck, UserX, Layers
} from 'lucide-react';
import TechLoader from '@/components/TechLoader';

// --- ⚙️ CONFIGURATION ---
const OWNER_PHONE = "917457001218"; 
const MASTER_PIN = "9999"; 

const DEPARTMENT_PINS: Record<string, string> = {
  'floor': '7830',
  'basement': '4290',
  'quality': '4030',
  'stock': '1993',
  'attendance': '9389',
  'it_check': '0769'
};

const DEFAULT_LINKS: Record<string, string> = {
      'floor': 'https://docs.google.com/spreadsheets/d/1SHR6Oanaz-h-iYZBRSwlqci4PHuVRxpLG92MEcGSB9E/edit?gid=190658331#gid=190658331',
      'basement': 'https://docs.google.com/spreadsheets/d/1SHR6Oanaz-h-iYZBRSwlqci4PHuVRxpLG92MEcGSB9E/edit?gid=1251109391#gid=1251109391',
      'quality': 'https://docs.google.com/spreadsheets/d/1xKqVTss5nyXxP41ff-eVdS5aUBqb6Su8reE8OdWre3Y/edit?gid=1008672530#gid=1008672530',
      'stock': 'https://docs.google.com/spreadsheets/d/12siBNbDOtmyAqIRH5cgc9APtw3rIEqBeZTzBRgiBrsg/edit?gid=580761467#gid=580761467',
      'attendance': 'https://docs.google.com/spreadsheets/d/1O20bocLcEgeiUB9r8QdamIPweIbS1KOxpwk4ultJ8RU/edit?gid=0#gid=0',
      'it_check': '#' 
    };

// --- 🎨 THEME CONFIGURATION ---
const DEPT_THEME: Record<string, any> = {
  'floor': { 
      icon: Factory, 
      color: 'text-amber-400', 
      bg: 'bg-amber-500/10', 
      border: 'hover:border-amber-500/50',
      glow: 'hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]',
      gradient: 'from-amber-500/20 to-transparent'
  },
  'basement': { 
      icon: Warehouse, 
      color: 'text-indigo-400', 
      bg: 'bg-indigo-500/10', 
      border: 'hover:border-indigo-500/50',
      glow: 'hover:shadow-[0_0_30px_rgba(99,102,241,0.2)]',
      gradient: 'from-indigo-500/20 to-transparent'
  },
  'quality': { 
      icon: ClipboardCheck, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/10', 
      border: 'hover:border-emerald-500/50',
      glow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]',
      gradient: 'from-emerald-500/20 to-transparent'
  },
  'stock': { 
      icon: Package, 
      color: 'text-cyan-400', 
      bg: 'bg-cyan-500/10', 
      border: 'hover:border-cyan-500/50',
      glow: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.2)]',
      gradient: 'from-cyan-500/20 to-transparent'
  },
  'attendance': { 
      icon: Users, 
      color: 'text-rose-400', 
      bg: 'bg-rose-500/10', 
      border: 'hover:border-rose-500/50',
      glow: 'hover:shadow-[0_0_30px_rgba(244,63,94,0.2)]',
      gradient: 'from-rose-500/20 to-transparent'
  },
  'it_check': { 
      icon: Wifi, 
      color: 'text-blue-400', 
      bg: 'bg-blue-500/10', 
      border: 'hover:border-blue-500/50',
      glow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]',
      gradient: 'from-blue-500/20 to-transparent'
  },
};

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [activeDeptId, setActiveDeptId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [embeddedLink, setEmbeddedLink] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showOwnerLogin, setShowOwnerLogin] = useState(false);
  const [ownerPin, setOwnerPin] = useState('');
  const [ownerError, setOwnerError] = useState('');

  // --- 🔒 LOCKDOWN MODE ---
  useEffect(() => {
    if (embeddedLink) {
      document.body.style.overscrollBehaviorX = 'none';
      window.history.pushState(null, '', window.location.href);
      const handlePopState = () => {
        window.history.pushState(null, '', window.location.href);
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        document.body.style.overscrollBehaviorX = 'auto';
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [embeddedLink]);

  const fetchData = async () => {
    try {
      await new Promise(r => setTimeout(r, 1500));
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
    if (!res.ok) { alert(json.error || "Failed."); } 
    else { await fetchData(); setActiveDeptId(null); setEmbeddedLink(null); if (deptId === 'it_check') generateWhatsAppReport(name); }
    setSubmitting(null);
  };

  const handleOwnerLogin = () => {
    if (ownerPin === MASTER_PIN) { setOwnerError(''); router.push('/dashboard'); } 
    else { setOwnerError('Incorrect PIN'); setOwnerPin(''); }
  };

  const handleSaveAndClose = () => {
    setIsSyncing(true);
    setTimeout(() => { setIsSyncing(false); setEmbeddedLink(null); }, 1500);
  };

  const generateWhatsAppReport = (itName: string) => {
      window.location.href = `https://wa.me/${OWNER_PHONE}`;
  };

  const completedCount = data.filter(d => d.completed).length;
  const tasksCompleted = data.filter(d => d.id !== 'it_check' && d.completed).length;
  const progress = (completedCount / 6) * 100;
  const dateStr = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
  
  const activeDept = data.find(d => d.id === activeDeptId);
  const currentLink = activeDept?.savedLink || DEFAULT_LINKS[activeDept?.id || ''] || '';

  if (loading) return <TechLoader />;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans overflow-hidden relative selection:bg-blue-500 selection:text-white flex flex-col">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#0f172a]" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-[pulse_8s_infinite]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] animate-[pulse_10s_infinite_reverse]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 mix-blend-overlay"></div>
      </div>

      {showOwnerLogin && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-[#1e293b] border border-slate-700 p-8 rounded-3xl w-full max-w-sm text-center relative shadow-2xl">
              <button onClick={() => {setShowOwnerLogin(false); setOwnerError('')}} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
              <div className="mx-auto w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mb-4 text-blue-400 ring-4 ring-blue-500/10"><BarChart3 size={32} /></div>
              <h2 className="text-xl font-bold text-white mb-1">Command Access</h2>
              <p className="text-slate-400 text-xs mb-6">Master Verification Required</p>
              <input 
                type="password" 
                className={`w-full bg-slate-900 border rounded-xl h-14 text-center text-white text-xl font-bold tracking-[0.5em] mb-4 focus:outline-none transition-all ${ownerError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'}`}
                maxLength={4} value={ownerPin} onChange={e => {setOwnerPin(e.target.value); setOwnerError('')}} placeholder="••••"
                onKeyDown={(e) => e.key === 'Enter' && handleOwnerLogin()}
              />
              <button onClick={handleOwnerLogin} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/20">ACCESS CONSOLE</button>
              {ownerError && <div className="text-red-400 text-xs font-bold mt-4 animate-pulse flex items-center justify-center gap-1"><AlertTriangle size={12}/> {ownerError}</div>}
           </div>
        </div>
      )}

      {embeddedLink && (
         <div className="fixed inset-0 z-[60] flex flex-col animate-in slide-in-from-bottom-10 duration-500 bg-[#0f172a]">
            <div className="h-16 bg-[#0f172a]/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 shadow-2xl z-50">
                <div className="flex items-center gap-4">
                    <div className="relative h-8 w-8 md:h-10 md:w-10">
                        <Image src="/logo.webp" alt="Sol France" fill className="object-contain" />
                    </div>
                    <div className="w-px h-8 bg-white/10 mx-2"></div>
                    <div>
                        <h3 className="text-base font-bold text-white leading-tight">{activeDept?.name}</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>Live Workspace</p>
                    </div>
                </div>
                <button onClick={handleSaveAndClose} disabled={isSyncing} className="flex items-center gap-3 bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-green-600/20">
                   {isSyncing ? <><Loader2 size={16} className="animate-spin" /><span>SYNCING...</span></> : <><Save size={16} /><span>SAVE & CLOSE</span></>}
                </button>
            </div>
            
            <div className="flex-1 relative bg-[#0f172a]">
                {isSyncing ? (
                    <TechLoader /> 
                ) : (
                   <iframe 
                     src={embeddedLink} 
                     className={`relative z-10 w-full h-full border-0 transition-opacity duration-700 opacity-100`} 
                     allow="clipboard-write; clipboard-read; popups; presentations" 
                     sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation allow-downloads allow-modals"
                   />
                )}
            </div>

            <div className="bg-[#0f172a] py-2 text-center text-[9px] text-slate-600 font-medium uppercase tracking-widest border-t border-white/5 z-50">
                © 2025 Sol France. All rights reserved.
            </div>
         </div>
      )}

      <header className="relative z-10 w-full px-6 md:px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
           <div className="relative h-10 w-32 md:h-12 md:w-40 hover:opacity-80 transition-opacity cursor-pointer">
             <Image src="/logo.webp" alt="Logo" fill className="object-contain object-left" priority />
           </div>
           
           <div className="hidden lg:block h-8 w-px bg-white/10"></div>
           
           <Link href="/leaderboard" className="hidden lg:flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-lg text-xs font-bold border border-yellow-500/20 transition-all hover:scale-105">
             <Trophy size={14} /> TOP PERFORMERS
           </Link>

           <button onClick={() => setShowOwnerLogin(true)} className="hidden lg:flex items-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-xs font-bold border border-white/5 transition-all">
             <BarChart3 size={14} /> DASHBOARD
           </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Current Date</div>
            <div className="text-lg font-bold text-white tracking-tight">{dateStr}</div>
          </div>
          <div className="relative h-14 w-14 flex items-center justify-center">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
              <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
              <path className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-all duration-1000 ease-out" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{Math.round(progress)}%</div>
          </div>
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-6 py-6 flex-1 flex flex-col justify-center">
        
        <div className="mb-8 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-center gap-3 text-amber-200 backdrop-blur-sm max-w-4xl mx-auto w-full">
            <div className="p-2 bg-amber-500/10 rounded-full"><AlertTriangle size={16} className="animate-pulse" /></div>
            <span className="text-xs md:text-sm font-medium tracking-wide">
                <strong className="text-amber-400">7:30 PM DEADLINE:</strong> Late submissions are automatically flagged in the Owner's Console.
            </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
          {data.map((dept) => {
            const isIT = dept.id === 'it_check';
            const isLocked = isIT ? tasksCompleted < 5 : false;
            const isCompleted = dept.completed;
            const isLate = dept.timestamp.includes('LATE');
            const theme = DEPT_THEME[dept.id] || { icon: Activity, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-700' };
            const Icon = theme.icon;

            return (
              <button
                key={dept.id}
                disabled={isLocked}
                onClick={() => !isLocked && setActiveDeptId(dept.id)}
                className={`
                  group relative w-full min-h-[180px] rounded-[2rem] p-6 text-left transition-all duration-500 border backdrop-blur-xl flex flex-col justify-between overflow-hidden
                  ${isCompleted 
                    ? isLate 
                        ? 'bg-red-900/10 border-red-500/30 hover:bg-red-900/20' 
                        : 'bg-emerald-900/10 border-emerald-500/30 hover:bg-emerald-900/20'
                    : isLocked 
                      ? 'bg-slate-900/40 border-slate-800 opacity-50 grayscale cursor-not-allowed' 
                      : `bg-[#1e293b]/40 border-slate-700/50 hover:bg-[#1e293b]/60 ${theme.border} hover:-translate-y-1 hover:shadow-2xl`
                  }
                `}
              >
                {!isLocked && !isCompleted && (
                    <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${theme.gradient} blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>
                )}

                <div className="flex justify-between items-start w-full relative z-10">
                  <div className={`
                    p-3.5 rounded-2xl transition-all duration-500 shadow-inner
                    ${isCompleted 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : isLocked 
                            ? 'bg-slate-800 text-slate-500' 
                            : `${theme.bg} ${theme.color} group-hover:scale-110 group-hover:shadow-lg`
                    }
                  `}>
                    {isCompleted ? <CheckCircle2 size={28} strokeWidth={2.5}/> : isLocked ? <Lock size={28} /> : <Icon size={28} strokeWidth={1.5}/>}
                  </div>
                  
                  <div className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5
                    ${isCompleted 
                        ? isLate ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                        : isLocked ? 'bg-slate-900 border-slate-700 text-slate-500' 
                        : 'bg-slate-700/30 border-slate-600 text-slate-400 group-hover:bg-white/5 group-hover:text-white group-hover:border-white/20'}
                  `}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? (isLate ? 'bg-red-500' : 'bg-emerald-500') : isLocked ? 'bg-slate-600' : 'bg-blue-500 animate-pulse'}`}></span>
                    {isCompleted ? (isLate ? 'Late' : 'Done') : isLocked ? 'Locked' : 'Active'}
                  </div>
                </div>

                <div className="mt-8 relative z-10">
                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-white transition-colors tracking-tight">
                    {dept.name}
                  </h3>
                  {isCompleted ? (
                    <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-2">
                       By {dept.supervisor} • {dept.timestamp.replace('🔴 LATE', '')}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 group-hover:text-slate-300 flex items-center gap-2 font-medium mt-2">
                       {isLocked ? 'Waiting for previous steps...' : 'Tap to open workspace'}
                       {!isLocked && <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="relative z-10 py-6 text-center text-[10px] text-slate-600 font-medium uppercase tracking-widest mt-auto">
         © 2025 Sol France. All rights reserved.
      </footer>

      {activeDept && !embeddedLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setActiveDeptId(null)}/>
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-slate-700 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="bg-[#1e293b]/80 p-6 border-b border-slate-700/50 flex justify-between items-center backdrop-blur-md">
              <div>
                <h2 className="text-xl font-bold text-white">{activeDept.name}</h2>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><ShieldCheck size={12}/> Secure Protocol</p>
              </div>
              <button onClick={() => setActiveDeptId(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
            </div>

            <div className="p-8">
              {activeDept.completed ? (
                <div className="text-center py-8">
                  <div className="inline-flex p-5 bg-emerald-500/10 rounded-full text-emerald-400 mb-6 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                    <CheckCircle2 size={56} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-white font-bold text-xl">Submission Received</h3>
                  <div className="mt-6 bg-slate-900/50 rounded-2xl p-5 border border-slate-800 text-left space-y-2">
                     <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                        <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Log Details</span>
                        <div className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">VERIFIED</div>
                     </div>
                     <p className="text-sm text-slate-400 flex justify-between">Supervisor: <span className="text-white font-bold">{activeDept.supervisor}</span></p>
                     <p className="text-sm text-slate-400 flex justify-between">Time: <span className="text-white font-bold">{activeDept.timestamp}</span></p>
                  </div>
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

// --- FORM COMPONENT ---
function ActiveForm({ dept, requiredPin, savedLink, onOpenSheet, onSubmit, isSubmitting }: any) {
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [link, setLink] = useState('');
  
  // DYNAMIC FIELDS
  const [prodCount, setProdCount] = useState('');
  const [boxesUsed, setBoxesUsed] = useState('');
  const [totalPresent, setTotalPresent] = useState('');
  const [totalAbsent, setTotalAbsent] = useState('');
  const [piecesReceived, setPiecesReceived] = useState('');
  const [okPieces, setOkPieces] = useState('');
  const [rejCount, setRejCount] = useState('');
  const [itemsAdded, setItemsAdded] = useState('');
  
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [pin, setPin] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  
  // ERROR STATE FOR FIELDS
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const handleVerify = () => {
    if (pin !== requiredPin) { setError('Incorrect PIN'); return; }
    setIsVerified(true); setError('');
  };

  const handleFinalSubmit = () => {
    // RESET ERRORS
    setError('');
    setFieldErrors({});
    let hasError = false;
    const newFieldErrors: Record<string, boolean> = {};

    // 1. MANDATORY NAME CHECK
    if (!name.trim()) { 
        hasError = true; 
        newFieldErrors['name'] = true;
    }

    // 2. MANDATORY DYNAMIC FIELDS CHECK
    if (dept.id === 'floor' || dept.id === 'basement') {
        if (!prodCount) { hasError = true; newFieldErrors['prodCount'] = true; }
        if (!boxesUsed) { hasError = true; newFieldErrors['boxesUsed'] = true; }
    } else if (dept.id === 'attendance') {
        if (!totalPresent) { hasError = true; newFieldErrors['totalPresent'] = true; }
        if (!totalAbsent) { hasError = true; newFieldErrors['totalAbsent'] = true; }
    } else if (dept.id === 'quality') {
        if (!piecesReceived) { hasError = true; newFieldErrors['piecesReceived'] = true; }
        if (!okPieces) { hasError = true; newFieldErrors['okPieces'] = true; }
        if (!rejCount) { hasError = true; newFieldErrors['rejCount'] = true; }
    } else if (dept.id === 'stock') {
        if (!itemsAdded) { hasError = true; newFieldErrors['itemsAdded'] = true; }
    }

    if (hasError) {
        setFieldErrors(newFieldErrors);
        setError("Please fill all mandatory red fields.");
        return;
    }
    
    // 3. OPTIONAL LINK CHECK (Only check if user typed something)
    if (link.trim() !== '' && !link.includes('docs.google.com/spreadsheets')) { 
        setError("Invalid Google Sheet Link (Leave empty if not updating)"); return; 
    }

    // --- SMART PACKING LOGIC ---
    let finalComment = comment;
    const metrics = [];

    if (dept.id === 'floor' || dept.id === 'basement') {
        if (prodCount) metrics.push(`Prod: ${prodCount}`);
        if (boxesUsed) metrics.push(`Boxes: ${boxesUsed}`);
    } else if (dept.id === 'attendance') {
        if (totalPresent) metrics.push(`Present: ${totalPresent}`);
        if (totalAbsent) metrics.push(`Absent: ${totalAbsent}`);
    } else if (dept.id === 'quality') {
        if (piecesReceived) metrics.push(`Rec: ${piecesReceived}`);
        if (okPieces) metrics.push(`OK: ${okPieces}`);
        if (rejCount) metrics.push(`Rej: ${rejCount}`);
    } else if (dept.id === 'stock') {
        if (itemsAdded) metrics.push(`Items Added: ${itemsAdded}`);
    }

    if (metrics.length > 0) {
        finalComment = `[${metrics.join(' | ')}] ${comment}`;
    }

    onSubmit(dept.id, name, finalComment, link.trim() ? link : null);
  };

  const getBorderColor = (fieldName: string) => {
      return fieldErrors[fieldName] ? 'border-red-500 animate-[shake_0.5s]' : 'border-slate-700 focus:border-blue-500';
  };

  if (!isVerified) {
    return (
      <div className="space-y-8 text-center py-4">
        <div className="mx-auto w-20 h-20 bg-slate-800/50 rounded-[2rem] flex items-center justify-center text-slate-400 border border-slate-700 shadow-inner">
           <KeyRound size={36} strokeWidth={1.5} />
        </div>
        <div>
           <h3 className="text-white font-bold text-xl">Identity Verification</h3>
           <p className="text-slate-400 text-sm mt-2">Enter your 4-digit Department PIN</p>
        </div>
        <div className="flex justify-center">
          <input 
            type="password" maxLength={4} className="w-56 h-16 bg-slate-900 border border-slate-600 rounded-2xl text-center text-3xl font-bold text-white tracking-[0.5em] focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all placeholder:text-slate-800" placeholder="••••" value={pin} 
            onChange={(e) => { setPin(e.target.value); setError(''); }} onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          />
        </div>
        <button onClick={handleVerify} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5">VERIFY & PROCEED</button>
        {error && <div className="text-red-400 text-xs font-bold animate-pulse flex items-center justify-center gap-1"><AlertTriangle size={12}/> {error}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-300">
      
      {dept.id !== 'it_check' && (
        <button onClick={() => onOpenSheet(savedLink || '#')} className="group flex items-center justify-between w-full bg-[#1e293b] border border-slate-700 hover:border-blue-500/50 p-4 rounded-2xl transition-all hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors"><Maximize2 size={24}/></div>
             <div className="text-left"><div className="text-sm font-bold text-white">Launch Work Sheet</div><div className="text-[10px] text-slate-400">Opens integrated workspace</div></div>
          </div>
          <ExternalLink size={18} className="text-slate-500 group-hover:text-white transition-colors"/>
        </button>
      )}

      <div className="h-px bg-slate-800 w-full"></div>

      <div className="space-y-4">
        <div className="relative group">
            <input className={`w-full bg-slate-900 border rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none peer placeholder-transparent transition-all ${getBorderColor('name')}`} id="n" placeholder="N" value={name} onChange={e => setName(e.target.value)}/>
            <label htmlFor="n" className="absolute left-4 top-[-10px] bg-[#0f172a] px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-slate-500 peer-focus:top-[-10px] peer-focus:text-blue-500 pointer-events-none">Supervisor Name</label>
        </div>

        {/* --- DYNAMIC FIELDS PER DEPARTMENT --- */}
        
        {/* 1. FLOOR & BASEMENT */}
        {(dept.id === 'floor' || dept.id === 'basement') && (
            <div className="grid grid-cols-2 gap-4">
                <div className="relative group">
                    <div className="absolute left-3 top-3 text-slate-500"><Hash size={16}/></div>
                    <input type="number" className={`w-full bg-slate-900 border rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:outline-none peer placeholder-transparent transition-all ${getBorderColor('prodCount')}`} value={prodCount} onChange={e => setProdCount(e.target.value)}/>
                    <label className="absolute left-10 top-[-10px] bg-[#0f172a] px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-slate-500 peer-focus:top-[-10px] peer-focus:text-blue-500 pointer-events-none">Total Production</label>
                </div>
                <div className="relative group">
                    <div className="absolute left-3 top-3 text-slate-500"><Box size={16}/></div>
                    <input type="number" className={`w-full bg-slate-900 border rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:outline-none peer placeholder-transparent transition-all ${getBorderColor('boxesUsed')}`} value={boxesUsed} onChange={e => setBoxesUsed(e.target.value)}/>
                    <label className="absolute left-10 top-[-10px] bg-[#0f172a] px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-slate-500 peer-focus:top-[-10px] peer-focus:text-blue-500 pointer-events-none">Total Boxes Used</label>
                </div>
            </div>
        )}

        {/* 2. ATTENDANCE */}
        {dept.id === 'attendance' && (
            <div className="grid grid-cols-2 gap-4">
                <div className="relative group">
                    <div className="absolute left-3 top-3 text-emerald-500"><UserCheck size={16}/></div>
                    <input type="number" className={`w-full bg-slate-900 border rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:outline-none peer placeholder-transparent transition-all ${getBorderColor('totalPresent')}`} value={totalPresent} onChange={e => setTotalPresent(e.target.value)}/>
                    <label className="absolute left-10 top-[-10px] bg-[#0f172a] px-1 text-[10px] font-bold text-emerald-500 uppercase tracking-wider transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-slate-500 peer-focus:top-[-10px] peer-focus:text-emerald-500 pointer-events-none">Total Present</label>
                </div>
                <div className="relative group">
                    <div className="absolute left-3 top-3 text-red-500"><UserX size={16}/></div>
                    <input type="number" className={`w-full bg-slate-900 border rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:outline-none peer placeholder-transparent transition-all ${getBorderColor('totalAbsent')}`} value={totalAbsent} onChange={e => setTotalAbsent(e.target.value)}/>
                    <label className="absolute left-10 top-[-10px] bg-[#0f172a] px-1 text-[10px] font-bold text-red-500 uppercase tracking-wider transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-slate-500 peer-focus:top-[-10px] peer-focus:text-red-500 pointer-events-none">Total Absent</label>
                </div>
            </div>
        )}

        {/* 3. QUALITY */}
        {dept.id === 'quality' && (
            <div className="space-y-4">
                 <div className="relative group">
                    <div className="absolute left-3 top-3 text-slate-500"><Layers size={16}/></div>
                    <input type="number" className={`w-full bg-slate-900 border rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:outline-none peer placeholder-transparent transition-all ${getBorderColor('piecesReceived')}`} value={piecesReceived} onChange={e => setPiecesReceived(e.target.value)}/>
                    <label className="absolute left-10 top-[-10px] bg-[#0f172a] px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-slate-500 peer-focus:top-[-10px] peer-focus:text-blue-500 pointer-events-none">Total Pieces Received</label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="relative group">
                        <div className="absolute left-3 top-3 text-emerald-500"><CheckCircle2 size={16}/></div>
                        <input type="number" className={`w-full bg-slate-900 border rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:outline-none peer placeholder-transparent transition-all ${getBorderColor('okPieces')}`} value={okPieces} onChange={e => setOkPieces(e.target.value)}/>
                        <label className="absolute left-10 top-[-10px] bg-[#0f172a] px-1 text-[10px] font-bold text-emerald-500 uppercase tracking-wider transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-slate-500 peer-focus:top-[-10px] peer-focus:text-emerald-500 pointer-events-none">Total OK Pieces</label>
                    </div>
                    <div className="relative group">
                        <div className="absolute left-3 top-3 text-red-500"><Ban size={16}/></div>
                        <input type="number" className={`w-full bg-slate-900 border rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:outline-none peer placeholder-transparent transition-all ${getBorderColor('rejCount')}`} value={rejCount} onChange={e => setRejCount(e.target.value)}/>
                        <label className="absolute left-10 top-[-10px] bg-[#0f172a] px-1 text-[10px] font-bold text-red-500 uppercase tracking-wider transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-slate-500 peer-focus:top-[-10px] peer-focus:text-red-500 pointer-events-none">Total Rejected</label>
                    </div>
                </div>
            </div>
        )}

        {/* 4. STOCK */}
        {dept.id === 'stock' && (
            <div className="relative group">
                <div className="absolute left-3 top-3 text-cyan-500"><Package size={16}/></div>
                <input type="number" className={`w-full bg-slate-900 border rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:outline-none peer placeholder-transparent transition-all ${getBorderColor('itemsAdded')}`} value={itemsAdded} onChange={e => setItemsAdded(e.target.value)}/>
                <label className="absolute left-10 top-[-10px] bg-[#0f172a] px-1 text-[10px] font-bold text-cyan-500 uppercase tracking-wider transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-slate-500 peer-focus:top-[-10px] peer-focus:text-cyan-500 pointer-events-none">Total Items Added to Sheet</label>
            </div>
        )}

        <div className="relative group">
            <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-sm text-white focus:border-blue-500 focus:outline-none peer placeholder-transparent transition-all" id="c" placeholder="C" value={comment} onChange={e => setComment(e.target.value)}/>
            <label htmlFor="c" className="absolute left-4 top-[-10px] bg-[#0f172a] px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-slate-500 peer-focus:top-[-10px] peer-focus:text-blue-500 pointer-events-none">Comments</label>
        </div>

        {/* --- OPTIONAL LINK UPDATER --- */}
        {dept.id !== 'it_check' && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => setShowLinkInput(!showLinkInput)} className="w-full flex items-center justify-between p-4 text-xs font-bold text-slate-400 hover:text-white transition-colors">
                    <span className="flex items-center gap-2"><LinkIcon size={14}/> UPDATE SHEET LINK? (OPTIONAL)</span>
                    {showLinkInput ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </button>
                {showLinkInput && (
                    <div className="p-4 pt-0 animate-in slide-in-from-top-2">
                        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-green-500 focus:outline-none placeholder:text-slate-700" placeholder="Paste new Google Sheet URL here..." value={link} onChange={e => setLink(e.target.value)}/>
                    </div>
                )}
            </div>
        )}
      </div>

      <button disabled={isSubmitting} onClick={handleFinalSubmit} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40 hover:-translate-y-0.5">
          {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <><span>CONFIRM & SUBMIT</span><CheckCircle2 size={18} /></>}
      </button>
      
      {error && <div className="text-center text-xs text-red-400 font-bold animate-pulse">{error}</div>}
      <style jsx global>{`
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
            20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}