'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('bee_snooker_theme');
    if (stored === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('bee_snooker_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('bee_snooker_theme', 'light');
    }
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="fixed bottom-5 right-5 z-50 w-11 h-11 rounded-full flex items-center justify-center
        bg-zinc-100 dark:bg-zinc-900/80 backdrop-blur-md
        border border-zinc-200/80 dark:border-zinc-700/50
        shadow-lg shadow-emerald-500/10 dark:shadow-emerald-500/5
        hover:shadow-xl hover:shadow-emerald-500/20
        hover:scale-105 active:scale-95
        transition-all duration-300 ease-out
        text-emerald-700 dark:text-emerald-400"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div key={isDark ? 'moon' : 'sun'} className="animate-theme-icon">
        {isDark ? <Moon size={18} /> : <Sun size={18} />}
      </div>
    </button>
  );
}
