'use client';
// Test Commit
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, TrendingUp, Activity, AlertTriangle, Users, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import TechLoader from '@/components/TechLoader';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(json => {
        if(json.success) setData(json);
        setLoading(false);
      });
  }, []);

  if (loading) return <TechLoader />;
  
  if (!data) return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-4">
        <AlertTriangle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold">System Offline</h2>
        <p className="text-slate-400">Unable to connect to Factory Database.</p>
        <Link href="/" className="mt-6 px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition">Return Home</Link>
    </div>
  );

  const { kpis, graphData, supervisorScores, anomalies } = data;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-6 md:p-10 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
            <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3 tracking-tight">
                <BarChart3 className="text-blue-500" size={32} /> Command Center
            </h1>
            <p className="text-slate-400 text-sm font-medium mt-1">Real-time Factory Intelligence & Analytics</p>
        </div>
        <Link href="/" className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold transition-all border border-slate-700">
            <ArrowLeft size={16} /> Back to Floor
        </Link>
      </div>

      {/* ANOMALY ALERT BANNER */}
      {anomalies && anomalies.length > 0 && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
            <AlertTriangle className="text-red-500 shrink-0" size={20} />
            <div>
                <h4 className="text-red-400 font-bold text-sm uppercase tracking-wide">Operational Risk Detected</h4>
                {anomalies.map((a: any, i: number) => (
                    <p key={i} className="text-sm text-slate-300 mt-1">
                        {a.dept} {a.metric} is <strong>{a.value}</strong> (Avg: {a.average}). This is a {a.severity} deviation.
                    </p>
                ))}
            </div>
        </div>
      )}

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
        <KpiCard label="Daily Production" value={kpis.totalProduction.toLocaleString()} unit="Units" color="blue" />
        <KpiCard label="Efficiency Rate" value={kpis.efficiency} unit="%" color={kpis.efficiency > 90 ? "green" : "yellow"} />
        <KpiCard label="Rejection Rate" value={kpis.rejectionRate} unit="%" color={Number(kpis.rejectionRate) < 2 ? "green" : "red"} />
        <KpiCard label="Quality Score" value={kpis.qualityScore} unit="/100" color="purple" />
        <KpiCard label="Staff Present" value={kpis.staffPresent} unit="Workers" color="orange" />
      </div>

      {/* ANALYTICS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* GRAPH 1: Production Trend (Main) */}
        <div className="lg:col-span-2 bg-[#1e293b]/50 p-8 rounded-3xl border border-slate-700/50 backdrop-blur-xl shadow-xl">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp size={20} className="text-green-400"/> 14-Day Production Trend
                </h3>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Live Data</div>
            </div>
            
            <div className="h-[300px] w-full">
                {graphData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={graphData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                                cursor={{ fill: '#334155', opacity: 0.2 }}
                            />
                            <Bar dataKey="production" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-500 font-medium">
                        Not enough data to display trend
                    </div>
                )}
            </div>
        </div>

        {/* GRAPH 2: Supervisor Leaderboard (Side) */}
        <div className="bg-[#1e293b]/50 p-8 rounded-3xl border border-slate-700/50 backdrop-blur-xl shadow-xl flex flex-col">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Trophy size={20} className="text-yellow-400"/> Top Supervisors (SPI)
            </h3>
            
            <div className="flex-1 space-y-4">
                {supervisorScores && supervisorScores.length > 0 ? (
                    supervisorScores.map((sup: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${i === 0 ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-slate-300'}`}>
                                    {i + 1}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">{sup.name}</div>
                                    <div className="text-[10px] text-slate-400">Total Output: {sup.totalOutput}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-emerald-400">{sup.score}x</div>
                                <div className="text-[10px] text-slate-500">Efficiency</div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex-1 flex flex-col justify-center items-center text-center opacity-50">
                        <Users size={32} className="text-slate-600 mb-2" />
                        <span className="text-sm text-slate-400">Awaiting Data</span>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}

function KpiCard({ label, value, unit, color }: any) {
    const colors: any = {
        blue: "text-blue-400 border-blue-500/20 bg-blue-500/5",
        green: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
        red: "text-rose-400 border-rose-500/20 bg-rose-500/5",
        yellow: "text-amber-400 border-amber-500/20 bg-amber-500/5",
        purple: "text-purple-400 border-purple-500/20 bg-purple-500/5",
        orange: "text-orange-400 border-orange-500/20 bg-orange-500/5",
    };
    return (
        <div className={`p-6 rounded-2xl border ${colors[color] || colors.blue} transition-transform hover:scale-[1.02]`}>
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-2">{label}</div>
            <div className="text-3xl font-black tracking-tight">{value} <span className="text-sm opacity-60 font-medium ml-1">{unit}</span></div>
        </div>
    );
}