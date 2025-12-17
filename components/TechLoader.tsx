'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function TechLoader() {
  const [text, setText] = useState("INITIALIZING FACTORY OS...");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const phrases = [
      "PACKING CONES...",
      "CALIBRATING FLAME...",
      "IGNITING ENGINE...",
      "QUALITY CHECK: PASSED",
      "READY FOR LAUNCH."
    ];
    
    let currentPhrase = 0;
    const textInterval = setInterval(() => {
      if (currentPhrase < phrases.length) {
        setText(phrases[currentPhrase]);
        currentPhrase++;
      }
    }, 800);

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + Math.random() * 6; // Random speed for realism
      });
    }, 100);

    return () => {
      clearInterval(textInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0f172a] flex flex-col items-center justify-center font-mono overflow-hidden">
      
      {/* Background Tech Grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(rgba(245, 158, 11, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-lg p-8">
        
        {/* LOGO AREA */}
        <div className="relative w-24 h-24 mb-12 animate-pulse drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
           <Image src="/logo.webp" alt="Sol France" fill className="object-contain" />
        </div>

        {/* --- 3D BURNING CONE ANIMATION --- */}
        <div className="relative w-80 h-32 mb-12 flex items-center justify-center">
            
            {/* Wrapper to rotate the whole cone */}
            <div className="relative w-full h-full transform -rotate-12">
                
                {/* 1. THE FILTER (Crutch) - Stays static */}
                <div className="absolute left-0 bottom-2 w-16 h-10 bg-[#c2a278] rounded-l-sm z-20 border-r border-[#a38663]"
                     style={{ 
                         clipPath: 'polygon(0% 20%, 100% 0%, 100% 100%, 0% 80%)',
                         background: 'linear-gradient(to bottom, #d4b58b 0%, #c2a278 50%, #8f7450 100%)'
                     }}>
                     {/* Filter texture details */}
                     <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, #6b5336 2px, #6b5336 3px)' }}></div>
                </div>

                {/* 2. THE CONE BODY (Paper) */}
                <div className="absolute left-16 bottom-2 w-64 h-14 z-10 origin-left"
                     style={{ 
                         clipPath: 'polygon(0% 28%, 100% 0%, 100% 100%, 0% 72%)'
                     }}>
                    
                    {/* Unburnt Paper (Base) */}
                    <div className="absolute inset-0 bg-[#f3f0eb]" 
                         style={{ background: 'linear-gradient(to bottom, #ffffff 0%, #f3f0eb 40%, #dcdcdc 100%)' }}>
                        {/* Paper Texture lines */}
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 11px)' }}></div>
                    </div>

                    {/* 🔥 THE BURNING PROGRESS (Fills from Right to Left) */}
                    {/* We translate this div to show progress. Starts at translateX(100%) [unburnt] to translateX(0%) [fully burnt] */}
                    <div className="absolute inset-0 z-20 transition-transform duration-100 ease-linear"
                         style={{ transform: `translateX(${100 - progress}%)` }}>
                        
                        {/* The Ash/Ember Fill */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500 to-gray-900"></div>
                        
                        {/* The Glowing Ember Line (The leading edge) */}
                        <div className="absolute left-0 top-0 bottom-0 w-4 bg-red-600 blur-sm animate-pulse box-content border-l-4 border-yellow-300"></div>
                        
                        {/* Actual Fire Flame Particles (CSS Animation) */}
                        <div className="absolute left-[-20px] top-[-30px] w-20 h-32 opacity-80 mix-blend-screen pointer-events-none">
                             <div className="absolute bottom-10 left-8 w-4 h-4 bg-orange-400 rounded-full blur-md animate-[rise_1s_infinite]"></div>
                             <div className="absolute bottom-10 left-6 w-3 h-3 bg-red-500 rounded-full blur-md animate-[rise_1.5s_infinite_0.2s]"></div>
                             <div className="absolute bottom-10 left-10 w-2 h-2 bg-yellow-300 rounded-full blur-md animate-[rise_0.8s_infinite_0.4s]"></div>
                        </div>
                    </div>

                </div>

                {/* 3. SMOKE EFFECT (At the burning tip) */}
                <div className="absolute right-[-10px] top-[-40px] z-30" style={{ opacity: progress > 5 ? 1 : 0, transition: 'opacity 1s' }}>
                    <div className="absolute w-8 h-8 bg-gray-400 rounded-full blur-xl opacity-40 animate-[smoke_3s_infinite]"></div>
                    <div className="absolute w-6 h-6 bg-gray-300 rounded-full blur-xl opacity-30 animate-[smoke_4s_infinite_1s]"></div>
                </div>

            </div>
        </div>

        {/* Text Status */}
        <h1 className="text-xl font-bold tracking-[0.3em] text-white mb-3 text-shadow-glow">
            SOL FRANCE
        </h1>
        
        {/* Progress Text */}
        <div className="w-64 flex justify-between text-[10px] font-bold text-amber-500/80 tracking-widest font-mono">
            <span>{text}</span>
            <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes rise {
            0% { transform: translateY(0) scale(1); opacity: 1; }
            100% { transform: translateY(-40px) scale(0); opacity: 0; }
        }
        @keyframes smoke {
            0% { transform: translateY(0) translateX(0) scale(1); opacity: 0.2; }
            50% { opacity: 0.4; }
            100% { transform: translateY(-80px) translateX(20px) scale(3); opacity: 0; }
        }
        .text-shadow-glow {
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}