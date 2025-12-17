'use client';

import { useEffect, useState } from 'react';
import { Trophy, Timer, ArrowLeft, Crown } from 'lucide-react';
import Link from 'next/link';

export default function Leaderboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(json => {
          setData(json.leaderboard || []);
          setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans p-6 overflow-hidden relative">
      {/* Confetti Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-0 left-1/4 w-2 h-2 bg-yellow-500 rounded-full animate-[fall_3s_infinite]" />
         <div className="absolute top-0 left-3/4 w-2 h-2 bg-blue-500 rounded-full animate-[fall_4s_infinite_1s]" />
         <div className="absolute top-0 left-1/2 w-2 h-2 bg-red-500 rounded-full animate-[fall_2.5s_infinite_0.5s]" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* --- HEADER (Updated to match Dashboard) --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
                <h1 className="text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 flex items-center gap-3">
                    Hall of Fame <Trophy className="text-yellow-400" size={32} />
                </h1>
                <p className="text-slate-400 mt-1 text-sm font-medium">Top Performing Supervisors</p>
            </div>

            <Link href="/" className="self-start md:self-auto flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg border border-white/10">
                <ArrowLeft size={16} /> EXIT
            </Link>
        </div>

        {loading ? (
            <div className="text-center mt-20 animate-pulse text-blue-400 font-bold">CALCULATING RANKINGS...</div>
        ) : (
            <div className="space-y-6">
                
                {/* 🥇 TOP 3 PODIUM */}
                <div className="flex justify-center items-end gap-4 mb-12 min-h-[200px]">
                    {/* 2nd Place */}
                    {data[1] && <WinnerCard rank={2} user={data[1]} delay={0.2} height="h-40" />}
                    {/* 1st Place */}
                    {data[0] && <WinnerCard rank={1} user={data[0]} delay={0} height="h-52" />}
                    {/* 3rd Place */}
                    {data[2] && <WinnerCard rank={3} user={data[2]} delay={0.4} height="h-32" />}
                </div>

                {/* THE LIST */}
                <div className="bg-slate-900/50 rounded-3xl border border-slate-800 backdrop-blur-xl overflow-hidden">
                    <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <span>Supervisor</span>
                        <span>Submission Time</span>
                    </div>
                    {data.slice(3).map((user, idx) => (
                        <div key={user.id} className="p-4 flex justify-between items-center border-b border-slate-800 hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-4">
                                <span className="font-mono text-slate-500 w-6">#{idx + 4}</span>
                                <div>
                                    <div className="font-bold text-white">{user.name}</div>
                                    <div className="text-xs text-slate-400">{user.supervisor}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm font-mono text-blue-400">
                                <Timer size={14} />
                                {user.todayTime ? user.todayTime.replace('🔴 LATE', '') : '--:--'}
                            </div>
                        </div>
                    ))}
                    {data.length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-sm">No submissions yet today.</div>
                    )}
                </div>

                {/* Monthly/Weekly Stats */}
                <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 p-6 rounded-2xl border border-purple-500/30 text-center">
                        <h3 className="text-xs font-bold text-purple-300 uppercase mb-2">Weekly Champion</h3>
                        <div className="text-2xl font-black text-white">{data[0]?.name || '-'}</div>
                        <div className="text-xs text-purple-200 mt-1">{data[0]?.weeklyScore || 0} Points</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 p-6 rounded-2xl border border-amber-500/30 text-center">
                        <h3 className="text-xs font-bold text-amber-300 uppercase mb-2">Monthly Legend</h3>
                        <div className="text-2xl font-black text-white">{data[0]?.name || '-'}</div>
                        <div className="text-xs text-amber-200 mt-1">{data[0]?.monthlyScore || 0} Points</div>
                    </div>
                </div>

            </div>
        )}
      </div>
      
      {/* Animations */}
      <style jsx global>{`
        @keyframes fall {
            0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function WinnerCard({ rank, user, delay, height }: any) {
    const colors: any = {
        1: 'bg-gradient-to-b from-yellow-400/20 to-yellow-600/10 border-yellow-500/50 text-yellow-400',
        2: 'bg-gradient-to-b from-slate-300/20 to-slate-500/10 border-slate-400/50 text-slate-300',
        3: 'bg-gradient-to-b from-orange-400/20 to-orange-600/10 border-orange-500/50 text-orange-400',
    };
    
    return (
        <div 
            className={`relative w-1/3 max-w-[140px] rounded-t-2xl border-t border-x ${colors[rank]} flex flex-col justify-end items-center pb-4 animate-in slide-in-from-bottom-20 fade-in duration-1000 ${height}`}
            style={{ animationDelay: `${delay}s`, animationFillMode: 'both' }}
        >
            {rank === 1 && <Crown className="absolute -top-8 text-yellow-400 animate-bounce" size={32} />}
            
            <div className="mb-2 text-center">
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Rank {rank}</div>
                <div className="font-black text-sm md:text-lg leading-tight">{user.name}</div>
                <div className="text-[10px] opacity-70 truncate max-w-[100px] mx-auto">{user.supervisor}</div>
            </div>
            
            <div className="bg-black/30 px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1">
                {user.todayTime ? user.todayTime.replace('🔴 LATE', '').split(' ')[0] : 'N/A'}
            </div>
        </div>
    );
}