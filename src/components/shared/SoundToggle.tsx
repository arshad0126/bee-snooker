'use client';

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useMatchStore } from '@/lib/store';
import { sounds } from '@/lib/sound';

export default function SoundToggle() {
  const soundEnabled = useMatchStore((state) => state.soundEnabled);
  const setSoundEnabled = useMatchStore((state) => state.setSoundEnabled);

  const toggle = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      sounds.playPotColor();
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={soundEnabled ? 'Mute application' : 'Unmute application'}
      className="fixed top-3 right-14 z-50 w-9 h-9 rounded-full flex items-center justify-center
        bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-md
        border border-zinc-200/60 dark:border-zinc-700/40
        shadow-sm
        hover:scale-105 active:scale-95
        transition-all duration-300 ease-out
        text-zinc-600 dark:text-zinc-400"
    >
      <div key={soundEnabled ? 'volume' : 'mute'} className="animate-theme-icon">
        {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
      </div>
    </button>
  );
}
