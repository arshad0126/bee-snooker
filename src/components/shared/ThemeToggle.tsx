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
      className="fixed bottom-4 right-4 z-50 w-9 h-9 rounded-full flex items-center justify-center
        bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-md
        border border-zinc-200/60 dark:border-zinc-700/40
        shadow-sm
        hover:scale-105 active:scale-95
        transition-all duration-300 ease-out
        text-zinc-600 dark:text-zinc-400"
    >
      <div key={isDark ? 'moon' : 'sun'} className="animate-theme-icon">
        {isDark ? <Moon size={14} /> : <Sun size={14} />}
      </div>
    </button>
  );
}
