'use client';

import { useEffect, useState } from 'react';
import { Loader2, ArrowLeft, BarChart3, Database, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

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
        <span className="text-sm font-bold tracking-widest text-blue-400">ANALYZING PRODUCTION SHEETS...</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans p-6 md:p-12 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 mix-blend-overlay"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <BarChart3 className="text-blue-500" size={32} />
              Owner's Console
            </h1>
            <p className="text-slate-400 mt-1 text-sm font-medium">Live Production Aggregation</p>
          </div>
          <Link href="/" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg border border-white/10">
            <ArrowLeft size={16} /> EXIT DASHBOARD
          </Link>
        </div>

        {/* METRICS TABLE CARD */}
        <div className="bg-[#1e293b]/50 border border-slate-700 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
          
          {/* Card Header */}
          <div className="bg-slate-900/50 p-6 border-b border-slate-700 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="bg-green-500/10 p-2 rounded-lg text-green-400">
                    <Database size={20} />
                </div>
                <h2 className="text-lg font-bold text-white">Cone Production Update</h2>
             </div>
             <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold bg-slate-800 px-3 py-1 rounded-full">
                Floor + Basement
             </div>
          </div>
          
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-950/30">
                  <th className="p-5 border-b border-slate-800">Key Metric</th>
                  <th className="p-5 border-b border-slate-800 text-right">Aggregated Value</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium divide-y divide-slate-700/50">
                {/* High Priority Metrics */}
                <MetricRow label="Total Production" value={metrics?.Production} unit="Units" highlight />
                <MetricRow label="Target" value={metrics?.Target} unit="Units" />
                
                {/* Resource Metrics */}
                <MetricRow label="Total Manpower" value={metrics?.Manpower} unit="Staff" />
                <MetricRow label="Total SKU / Brands" value={metrics?.Brands} unit="" />
                
                {/* Technical Metrics */}
                <MetricRow label="Total RFS" value={metrics?.RFS} unit="" />
                <MetricRow label="Total Rollers" value={metrics?.Rollers} unit="" />
                
                {/* Material Metrics */}
                <MetricRow label="Gum Consumption" value={metrics?.Gum} unit="Kg" />
                <MetricRow label="Paper Consumption" value={metrics?.Paper} unit="Kg" />
                <MetricRow label="Paper Rejection" value={metrics?.PaperReject} unit="Kg" isBad />
                <MetricRow label="Filter Consumption" value={metrics?.Filter} unit="Pcs" />
                <MetricRow label="Filter Rejection" value={metrics?.FilterReject} unit="Pcs" isBad />
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 flex items-start gap-3 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl">
           <AlertTriangle size={18} className="text-blue-400 mt-0.5 shrink-0" />
           <div className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-blue-300 block mb-1">How this works:</strong>
              This dashboard automatically opens the latest Google Sheets submitted by the Floor and Basement supervisors. It scans for keywords like "Production", "Gum Used", or "Manpower" anywhere in their sheets and sums them up here.
           </div>
        </div>

      </div>
    </div>
  );
}

// Helper Component for Table Rows
function MetricRow({ label, value, unit, highlight = false, isBad = false }: any) {
  // If value is missing/undefined, show 0 or "-"
  const displayValue = value ? value : "0";
  
  return (
    <tr className="hover:bg-white/5 transition-colors group">
      <td className="p-5 text-slate-300 group-hover:text-white transition-colors">{label}</td>
      <td className={`p-5 text-right font-bold text-lg 
        ${highlight ? 'text-green-400 text-xl shadow-green-500/50 drop-shadow-sm' : isBad ? 'text-red-400' : 'text-white'}
      `}>
        {displayValue} <span className="text-xs text-slate-500 font-normal ml-1">{unit}</span>
      </td>
    </tr>
  );
}