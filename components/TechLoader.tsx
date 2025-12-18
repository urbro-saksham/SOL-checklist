'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function TechLoader() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        // Variable burn speed for realism (gusts of wind effect)
        return prev + (Math.random() * 0.5 + 0.2); 
      });
    }, 40);

    return () => clearInterval(interval);
  }, []);

  // 0% Progress = Full Cone (Flame at 100% right)
  // 100% Progress = Cone Gone (Flame at 0% left)
  const burnPoint = 100 - progress; 

  return (
    <div className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* --- CINEMATIC ATMOSPHERE --- */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#000000_100%)]"></div>
         <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl scale-90 md:scale-110 transition-transform duration-700">
        
        {/* LOGO */}
        <div className="relative w-28 h-28 mb-16 drop-shadow-[0_0_35px_rgba(255,255,255,0.15)] animate-[float_5s_ease-in-out_infinite]">
           <Image src="/logo.webp" alt="Sol France" fill className="object-contain" priority />
        </div>

        {/* --- 3D BURNING CONE --- */}
        <div className="relative w-[600px] h-[120px] flex items-center transform -rotate-[8deg]">
            
            {/* 1. FILTER TIP (Indestructible Base) */}
            <div className="relative w-[140px] h-[60px] z-30 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                {/* 3D Cylinder Shape */}
                <div className="absolute inset-0 rounded-l-md border-r border-black/30"
                     style={{
                         background: 'linear-gradient(180deg, #c7a78b 0%, #e8d0ba 35%, #8b6c4e 65%, #5e4630 100%)',
                         clipPath: 'polygon(0% 12%, 100% 0%, 100% 100%, 0% 88%)'
                     }}>
                     <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent 2px, #3e2b18 2px, #3e2b18 3px)' }}></div>
                     {/* Shiny Gold Branding Band */}
                     <div className="absolute right-0 top-0 bottom-0 w-5 bg-gradient-to-r from-yellow-700 via-yellow-300 to-yellow-800 opacity-90 mix-blend-overlay border-l border-white/20"></div>
                </div>
                {/* 3D End Cap (Mouthpiece) */}
                <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-5 h-[46px] bg-[#3e2b18] rounded-[50%] blur-[0.5px] shadow-[inset_-2px_0_5px_rgba(0,0,0,0.5)]"></div>
            </div>

            {/* 2. THE PAPER BODY (Consumable) */}
            <div className="relative w-[460px] h-[80px] -ml-[2px] z-20 origin-left">
                
                {/* --- MASK CONTAINER: This makes the cone disappear --- */}
                {/* The mask-image makes pixels transparent to the right of the burnPoint */}
                <div className="absolute inset-0 w-full h-full"
                     style={{
                         maskImage: `linear-gradient(to right, black ${burnPoint}%, transparent ${burnPoint}%)`,
                         WebkitMaskImage: `linear-gradient(to right, black ${burnPoint}%, transparent ${burnPoint}%)`
                     }}>
                    
                    {/* The Cone Shape */}
                    <div className="absolute inset-0 w-full h-full"
                         style={{ 
                             clipPath: 'polygon(0% 12%, 100% 0%, 100% 100%, 0% 88%)',
                             background: 'linear-gradient(180deg, #d4d4d4 0%, #ffffff 40%, #f2f2f2 60%, #a6a6a6 100%)' // 3D Lighting
                         }}>
                         {/* Texture */}
                         <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper-fibers.png")', filter: 'contrast(150%)' }}></div>
                    </div>

                    {/* Internal Shadow (The Hollow Look at the Burn Edge) */}
                    {/* This creates a dark "inside" look right where the paper vanishes */}
                    <div className="absolute top-0 bottom-0 w-8 blur-md z-10"
                         style={{ 
                             left: `${burnPoint}%`, 
                             transform: 'translateX(-50%)',
                             background: 'linear-gradient(to right, transparent, #000000 80%)'
                         }}>
                    </div>
                </div>

                {/* 3. THE BURNING EDGE (Glowing Ember) */}
                {/* Sits EXACTLY at the cut-off point */}
                {progress < 99 && (
                    <div className="absolute top-[-10%] bottom-[-10%] w-[12px] z-40 blur-[3px]"
                         style={{ 
                             left: `${burnPoint}%`, 
                             transform: 'translateX(-50%)',
                             background: 'linear-gradient(to bottom, #ff5722, #ffeb3b, #ff5722)',
                             opacity: 0.9,
                             mixBlendMode: 'screen'
                         }}>
                    </div>
                )}

                {/* 4. FIRE & SMOKE PARTICLES */}
                {/* Follows the burnPoint */}
                {progress < 99 && (
                    <div className="absolute top-1/2 -translate-y-1/2 z-50 pointer-events-none transition-all duration-75 linear"
                         style={{ left: `${burnPoint}%` }}>
                        
                        {/* FLAME CORE (Bright, erratic) */}
                        <div className="relative -top-6 -left-3 scale-110">
                            <div className="absolute bottom-0 left-2 w-5 h-10 bg-white rounded-[50%] blur-md animate-[flicker_0.08s_infinite_alternate]"></div>
                            <div className="absolute bottom-0 left-0 w-10 h-20 bg-orange-500 rounded-[50%] blur-lg opacity-90 mix-blend-screen animate-[flicker_0.12s_infinite_alternate-reverse]"></div>
                            <div className="absolute bottom-[-10px] left-[-8px] w-16 h-28 bg-red-600 rounded-[50%] blur-2xl opacity-50 mix-blend-screen animate-[pulse_0.15s_infinite]"></div>
                        </div>

                        {/* RISING SMOKE (Thick at source, dissipates up) */}
                        <div className="absolute -top-16 -left-4">
                            <div className="absolute w-14 h-14 bg-gray-500/30 rounded-full blur-xl animate-[smoke_1.5s_linear_infinite]"></div>
                            <div className="absolute w-10 h-10 bg-gray-400/20 rounded-full blur-lg animate-[smoke_2s_linear_infinite_0.3s]"></div>
                            <div className="absolute w-16 h-16 bg-white/5 rounded-full blur-2xl animate-[smoke_2.5s_linear_infinite_0.6s]"></div>
                        </div>

                        {/* SPARKS (Flying off) */}
                        <div className="absolute top-0 left-0">
                             <div className="absolute w-1 h-1 bg-yellow-200 rounded-full animate-[spark_0.8s_ease-out_infinite]"></div>
                             <div className="absolute w-1.5 h-1.5 bg-orange-300 rounded-full animate-[spark_1s_ease-out_infinite_0.2s]"></div>
                        </div>
                    </div>
                )}

            </div>
        </div>

        {/* --- STATUS TEXT --- */}
        <div className="mt-24 text-center space-y-2">
            <h2 className="text-3xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-orange-200 via-white to-orange-200 animate-pulse drop-shadow-lg">
                IGNITING
            </h2>
            <div className="flex items-center justify-center gap-3 text-[10px] text-white/30 font-mono tracking-[0.3em] uppercase">
                <span>Production Line</span>
                <span className="w-12 h-[1px] bg-white/20"></span>
                <span>{Math.round(progress)}%</span>
            </div>
        </div>

      </div>

      <style jsx>{`
        @keyframes flicker {
            0% { transform: scale(1) skewX(0deg); opacity: 1; }
            25% { transform: scale(1.05) skewX(3deg); opacity: 0.9; }
            50% { transform: scale(0.95) skewX(-2deg); opacity: 0.8; }
            75% { transform: scale(1.02) skewX(1deg); opacity: 1; }
            100% { transform: scale(1) skewX(0deg); opacity: 0.9; }
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-12px) rotate(1deg); }
        }
        @keyframes smoke {
            0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
            20% { opacity: 0.4; }
            100% { transform: translate(30px, -120px) scale(3); opacity: 0; }
        }
        @keyframes spark {
            0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
            100% { transform: translate(-40px, 50px) rotate(90deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}