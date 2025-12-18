'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function TechLoader() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        // Burning starts fast then varies speed for realism
        return prev + (Math.random() * 0.8 + 0.2); 
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Calculate position: 0% progress = Fire at Tip (Right), 100% progress = Fire at Filter (Left)
  // We want the burn to travel from Right to Left.
  // The 'left' position of the flame relative to the paper body (0 to 100%)
  const flamePosition = 100 - progress; 

  return (
    <div className="fixed inset-0 z-[9999] bg-[#080808] flex flex-col items-center justify-center overflow-hidden font-sans">
      
      {/* --- CINEMATIC BACKGROUND --- */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#000000_120%)]"></div>
         {/* Subtle Smoke Atmosphere */}
         <div className="absolute top-0 left-0 w-full h-full opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse"></div>
      </div>

      {/* --- MAIN STAGE --- */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl scale-90 md:scale-110 transition-transform duration-700">
        
        {/* LOGO */}
        <div className="relative w-28 h-28 mb-20 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] animate-[float_4s_ease-in-out_infinite]">
           <Image src="/logo.webp" alt="Sol France" fill className="object-contain" priority />
        </div>

        {/* --- 3D CONE ASSEMBLY --- */}
        {/* Rotated slightly for 3D perspective */}
        <div className="relative w-[600px] h-[120px] flex items-center transform -rotate-[5deg]">
            
            {/* 1. THE FILTER (Static Base - Left Side) */}
            <div className="relative w-[140px] h-[60px] z-30 drop-shadow-2xl">
                {/* 3D Cylinder Look */}
                <div className="absolute inset-0 rounded-l-sm border-r border-black/20"
                     style={{
                         background: 'linear-gradient(180deg, #c7a78b 0%, #e8d0ba 30%, #8b6c4e 60%, #5e4630 100%)',
                         clipPath: 'polygon(0% 10%, 100% 0%, 100% 100%, 0% 90%)'
                     }}>
                     {/* Filter Texture Pattern */}
                     <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0px, transparent 2px, #3e2b18 2px, #3e2b18 3px)' }}></div>
                     {/* Gold Band (Branding) */}
                     <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-r from-yellow-600 via-yellow-300 to-yellow-700 opacity-80 mix-blend-overlay"></div>
                </div>
                {/* 3D End Cap (The mouth end) */}
                <div className="absolute left-[-5px] top-1/2 -translate-y-1/2 w-4 h-[48px] bg-[#3e2b18] rounded-[50%] blur-[0.5px]"></div>
            </div>

            {/* 2. THE PAPER BODY (Burning Area) */}
            <div className="relative w-[460px] h-[80px] -ml-[2px] z-20 origin-left">
                
                {/* Main Cone Shape Mask */}
                <div className="absolute inset-0 overflow-hidden"
                     style={{ 
                         clipPath: 'polygon(0% 12%, 100% 0%, 100% 100%, 0% 88%)'
                     }}>
                    
                    {/* A. UNBURNT PAPER (White/Cream) */}
                    {/* This sits across the whole width, but we cover it with Ash as we burn */}
                    <div className="absolute inset-0 w-full h-full"
                         style={{
                             background: 'linear-gradient(180deg, #d1d1d1 0%, #ffffff 40%, #f0f0f0 60%, #a1a1a1 100%)', // 3D Lighting
                         }}>
                         {/* Paper Fibers Texture */}
                         <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper-fibers.png")', filter: 'contrast(150%)' }}></div>
                    </div>

                    {/* B. THE ASH TRAIL (Gray/Black) */}
                    {/* This layer sits on TOP of the paper and grows from Right to Left */}
                    <div className="absolute inset-0 z-10 transition-all duration-75 ease-linear"
                         style={{
                             // We use a gradient mask to reveal the ash from right to left
                             background: `linear-gradient(to left, #2b2b2b ${progress}%, transparent ${progress + 5}%)`
                         }}>
                         {/* Ash Texture (Cracked) */}
                         <div className="absolute inset-0 opacity-40 mix-blend-multiply" 
                              style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cracked-ground.png")' }}>
                         </div>
                         {/* Darken the ash cylinder 3D effect */}
                         <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60"></div>
                    </div>

                    {/* C. THE GLOWING EMBER (The "Cherry") */}
                    {/* Positioned exactly at the burn line */}
                    <div className="absolute top-0 bottom-0 w-[20px] z-20 blur-[2px]"
                         style={{ 
                             left: `${flamePosition}%`, 
                             background: 'radial-gradient(circle, #ffeb3b 10%, #ff5722 50%, transparent 80%)',
                             opacity: progress < 100 ? 1 : 0
                         }}>
                    </div>
                </div>

                {/* 3. PARTICLE SYSTEM (Fire & Smoke) */}
                {/* Moves with the burn line */}
                {progress < 99 && (
                    <div className="absolute top-1/2 -translate-y-1/2 z-50 pointer-events-none transition-all duration-75 linear"
                         style={{ left: `${flamePosition}%` }}>
                        
                        {/* THE FLAME CORE */}
                        <div className="relative -top-6 -left-4">
                            {/* Inner White Hot Core */}
                            <div className="absolute bottom-0 left-2 w-4 h-8 bg-white rounded-[50%] blur-md animate-[flicker_0.1s_infinite_alternate]"></div>
                            {/* Middle Orange Flame */}
                            <div className="absolute bottom-0 left-0 w-8 h-16 bg-orange-500 rounded-[50%] blur-lg opacity-80 mix-blend-screen animate-[flicker_0.15s_infinite_alternate-reverse]"></div>
                            {/* Outer Red Glow */}
                            <div className="absolute bottom-[-10px] left-[-10px] w-14 h-24 bg-red-600 rounded-[50%] blur-2xl opacity-40 mix-blend-screen animate-[pulse_0.2s_infinite]"></div>
                        </div>

                        {/* RISING SMOKE */}
                        <div className="absolute -top-12 -left-2">
                            <div className="absolute w-12 h-12 bg-gray-400 rounded-full blur-xl opacity-20 animate-[smoke_2s_linear_infinite]"></div>
                            <div className="absolute w-10 h-10 bg-gray-500 rounded-full blur-xl opacity-15 animate-[smoke_2.5s_linear_infinite_0.5s]"></div>
                            <div className="absolute w-14 h-14 bg-white rounded-full blur-2xl opacity-10 animate-[smoke_3s_linear_infinite_1s]"></div>
                        </div>

                        {/* FALLING SPARKS */}
                        <div className="absolute top-0 left-0">
                             <div className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-[spark_1s_ease-out_infinite]"></div>
                             <div className="absolute w-1 h-1 bg-orange-400 rounded-full animate-[spark_1.5s_ease-out_infinite_0.3s]"></div>
                        </div>
                    </div>
                )}

            </div>
        </div>

        {/* --- LOADING TEXT --- */}
        <div className="mt-24 text-center">
            <h2 className="text-2xl font-black tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-200 animate-pulse">
                INITIALIZING
            </h2>
            <div className="text-[10px] text-white/40 font-mono mt-3 tracking-[0.5em] uppercase">
                Preparing Production Line • {Math.round(progress)}%
            </div>
        </div>

      </div>

      {/* --- CSS ANIMATIONS --- */}
      <style jsx>{`
        @keyframes flicker {
            0% { transform: scale(1) skewX(0deg); opacity: 0.9; }
            50% { transform: scale(1.05) skewX(2deg); opacity: 0.8; }
            100% { transform: scale(0.95) skewX(-2deg); opacity: 1; }
        }
        @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
        }
        @keyframes smoke {
            0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
            20% { opacity: 0.3; }
            100% { transform: translate(20px, -80px) scale(2); opacity: 0; }
        }
        @keyframes spark {
            0% { transform: translate(0, 0); opacity: 1; }
            100% { transform: translate(-30px, 40px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}