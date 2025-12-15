'use client';

import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft, BarChart3, Database, AlertTriangle, CheckCircle2, Package, Users, Activity, Box } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('production'); // Controls which view is shown

  useEffect(() => {
    async function getData() {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        setMetrics(json.metrics);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, []);

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-[#000510] text-white">
      <div className="flex flex-col items-center gap-6 animate-pulse">
        <div className="h-16 w-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-bold tracking-widest text-blue-400">ANALYZING LIVE DATA...</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans p-4 md:p-8 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <BarChart3 className="text-blue-500" size={32} />
              Owner's Console
            </h1>
            <p className="text-slate-400 mt-1 text-sm font-medium">Real-time Manufacturing Intelligence</p>
          </div>
          <Link href="/" className="self-start md:self-auto flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg border border-white/10">
            <ArrowLeft size={16} /> EXIT
          </Link>
        </div>

        {/* --- NAVIGATION TABS --- */}
        <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl w-full md:w-fit border border-slate-700 backdrop-blur-md overflow-x-auto">
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
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="bg-[#1e293b]/50 border border-slate-700 rounded-3xl backdrop-blur-xl shadow-2xl p-6 min-h-[500px]">
            
            {/* 1. PRODUCTION TAB */}
            {activeTab === 'production' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                    
                    {/* Header */}
                    <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
                        <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400"><Database size={24} /></div>
                        <h2 className="text-2xl font-bold text-white">Cone Production Update</h2>
                    </div>

                    {/* Progress Bar: Target vs Actual */}
                    <ProgressBar label="Daily Target Achievement" current={metrics?.Production} total={metrics?.Target} color="blue" />

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Left Column: Core Metrics */}
                        <TableCard title="Operational Metrics">
                            <MetricRow label="Total SKU / Brands" value={metrics?.Brands || '-'} />
                            <MetricRow label="Total RFS" value={metrics?.RFS} />
                            <MetricRow label="Total Rollers" value={metrics?.Rollers} />
                            <MetricRow label="Total Manpower" value={metrics?.Manpower} unit="Staff" />
                            <MetricRow label="Target" value={metrics?.Target} unit="Units" />
                            <MetricRow label="Total Production" value={metrics?.Production} unit="Units" highlight />
                        </TableCard>

                        {/* Right Column: Materials */}
                        <TableCard title="Material Consumption">
                            <MetricRow label="Gum Used" value={metrics?.Gum} unit="Kg" />
                            <MetricRow label="Paper Used" value={metrics?.Paper} unit="Kg" />
                            <MetricRow label="Paper Rejection" value={metrics?.PaperReject} unit="Kg" isBad />
                            <MetricRow label="Filter Used" value={metrics?.Filter} unit="Pcs" />
                            <MetricRow label="Filter Rejection" value={metrics?.FilterReject} unit="Pcs" isBad />
                        </TableCard>
                    </div>
                </div>
            )}

            {/* 2. QUALITY CHECK TAB */}
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
                                {metrics?.CorrectPieces || 0} OK <span className="text-slate-600">|</span> <span className="text-red-400">{metrics?.QCRejected || 0} Rejected</span>
                            </span>
                        </div>
                        {/* Visual Bar Graph */}
                        <div className="h-6 bg-slate-800 rounded-full overflow-hidden flex w-full">
                            <div className="h-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]" style={{ width: `${(metrics?.CorrectPieces / (metrics?.QCDone || 1)) * 100}%` }}></div>
                            <div className="h-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" style={{ width: `${(metrics?.QCRejected / (metrics?.QCDone || 1)) * 100}%` }}></div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-slate-500">
                            <span>Success Rate</span>
                            <span>Defect Rate</span>
                        </div>
                     </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <TableCard title="Team & Scope">
                            <MetricRow label="Brands Checked" value={metrics?.Brands || '-'} />
                            <MetricRow label="Total Checkers" value={metrics?.Checkers} unit="Staff" />
                            <MetricRow label="Equal Checkers" value={metrics?.CheckersEqual} unit="Staff" />
                            <MetricRow label="Total QC Verified" value={metrics?.QCDone} unit="Pcs" highlight />
                        </TableCard>
                        
                        <TableCard title="Defect Analysis">
                            <MetricRow label="Correct Pieces" value={metrics?.CorrectPieces} unit="Pcs" />
                            <MetricRow label="Rejected Pieces" value={metrics?.QCRejected} unit="Pcs" isBad />
                            <MetricRow label="Rejection Rate" value={metrics?.QCRejectionPercent} unit="%" isBad />
                        </TableCard>
                    </div>
                </div>
            )}

            {/* 3. EQUAL TEAM TAB */}
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
                            value={metrics?.BoxesChecked} 
                            icon={<Box size={32}/>}
                            color="blue" 
                        />
                        <BigCard 
                            label="Rejected Pieces" 
                            value={metrics?.EqualRejected} 
                            icon={<AlertTriangle size={32}/>}
                            color="red" 
                        />
                        <BigCard 
                            label="Ready for Packing" 
                            value={metrics?.EqualPacking} 
                            icon={<Package size={32}/>}
                            color="green" 
                        />
                    </div>
                    
                    <div className="p-4 bg-slate-900/30 border border-slate-700 rounded-xl text-center">
                        <p className="text-sm text-slate-400">
                            The Equal Team ensures final packaging standards. <br/>
                            <span className="text-white font-bold">{metrics?.EqualPacking || 0}</span> units are cleared for dispatch today.
                        </p>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS FOR CONSISTENT DESIGN ---

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
    // Handling long lists of brands to not break layout
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
    const safeTotal = Number(total) || 1; // Avoid divide by zero
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