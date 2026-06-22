'use client';

import React, { useState, useEffect } from 'react';
import { RotateCw } from 'lucide-react';

export default function OrientationGuard() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      const mobile = window.innerWidth < 1024; // trigger on mobile and tablet viewports
      setIsPortrait(portrait);
      setIsMobile(mobile);
    };

    // Run on mount
    checkOrientation();

    // Listen to resize/orientationchange
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isMobile || !isPortrait) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-2xl text-white p-6 text-center select-none animate-fade-in">
      <div className="max-w-xs space-y-6">
        
        {/* Animated Icon Container */}
        <div className="relative mx-auto w-24 h-24 bg-emerald-950/30 border border-emerald-500/20 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/10">
          {/* Outer glowing pulse ring */}
          <div className="absolute inset-0 rounded-3xl border border-emerald-500/15 animate-ping opacity-25" />
          
          {/* Phone Rotation graphic */}
          <div className="w-10 h-16 border-2 border-zinc-400 rounded-lg relative flex items-center justify-center animate-[spin_3s_ease-in-out_infinite]">
            <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full absolute bottom-1" />
            <div className="w-4 h-1 bg-zinc-400 rounded-full absolute top-1.5" />
            <div className="w-6 h-6 rounded-full border border-emerald-500/40 bg-emerald-950/40 flex items-center justify-center text-emerald-400">
              <RotateCw size={12} className="animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </div>
        </div>

        {/* Text Guidelines */}
        <div className="space-y-2">
          <h3 className="text-xl font-bold tracking-tight font-sans">
            Rotate Your Device
          </h3>
          <p className="text-sm text-zinc-400 font-medium leading-relaxed">
            The Snooker Scoreboard is specifically optimized for landscape view. Please turn your phone sideways to continue.
          </p>
        </div>

        {/* Apple-style Help Info */}
        <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider font-mono">
          Ensure Portrait Orientation Lock is Off
        </div>
      </div>
    </div>
  );
}
