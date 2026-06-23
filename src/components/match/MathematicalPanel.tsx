import React from 'react';
import { ShieldCheck, Info, ChevronDown, Circle, Target } from 'lucide-react';

interface MathematicalPanelProps {
  redsRemaining: number;
  pointsRemaining: number;
  isFrameSecured: boolean;
  statusText: string;
  currentColorOn: string | null;
  activePlayerName?: string;
}

// Ball color map for the "Ball On" indicator dot
const BALL_DOT_COLORS: Record<string, string> = {
  red: 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]',
  color: 'bg-gradient-to-r from-yellow-400 via-green-500 to-blue-600 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
  yellow: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]',
  green: 'bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
  brown: 'bg-amber-800 shadow-[0_0_8px_rgba(146,64,14,0.5)]',
  blue: 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]',
  pink: 'bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.5)]',
  black: 'bg-zinc-900 border border-zinc-650 shadow-[0_0_8px_rgba(39,39,42,0.5)]',
};

const BALL_TEXT_COLORS: Record<string, string> = {
  red: 'text-red-500',
  color: 'text-emerald-500',
  yellow: 'text-yellow-500',
  green: 'text-emerald-600 dark:text-emerald-400',
  brown: 'text-amber-800 dark:text-amber-500',
  blue: 'text-blue-500',
  pink: 'text-pink-500',
  black: 'text-zinc-900 dark:text-zinc-300',
};

export const MathematicalPanel: React.FC<MathematicalPanelProps> = ({
  redsRemaining,
  pointsRemaining,
  isFrameSecured,
  statusText,
  currentColorOn,
  activePlayerName,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const ballDot = currentColorOn ? BALL_DOT_COLORS[currentColorOn] || 'bg-zinc-550' : 'bg-zinc-550';
  const ballTextColor = currentColorOn ? BALL_TEXT_COLORS[currentColorOn] || 'text-zinc-500' : 'text-zinc-500';

  return (
    <>
      {/* ======================================================== */}
      {/* 1. DESKTOP & PORTRAIT VIEW: Beautiful Dashboard Card    */}
      {/* ======================================================== */}
      <div className={`hidden lg:block rounded-2xl border p-4 sm:p-5 transition-all duration-300 shadow-md ${
        isFrameSecured
          ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-600/10 dark:from-emerald-950/20 dark:to-emerald-900/5 shadow-emerald-500/5'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 backdrop-blur-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800/80 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-sm text-zinc-800 dark:text-zinc-100">Frame Analysis</h3>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Frame Status Badge */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isFrameSecured
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}>
              {isFrameSecured ? (
                <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle size={8} className="fill-zinc-400 text-zinc-400 dark:fill-zinc-500 dark:text-zinc-500" />
              )}
              {isFrameSecured ? 'Frame Secured' : 'Frame Active'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Reds remaining */}
          <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800/50 rounded-xl p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Reds Left</span>
            <div className="text-3xl font-black font-mono text-red-600 dark:text-red-500 mt-1">
              {redsRemaining}
            </div>
          </div>

          {/* Points remaining */}
          <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800/50 rounded-xl p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Points Left</span>
            <div className="text-3xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">
              {pointsRemaining}
            </div>
          </div>

          {/* Ball On */}
          <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800/50 rounded-xl p-3 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">Ball On</span>
            <div className="flex items-center gap-2">
              <div className={`w-4.5 h-4.5 rounded-full ${ballDot} shadow-lg`} />
              <span className={`font-black text-sm uppercase tracking-wide ${ballTextColor}`}>
                {currentColorOn || 'None'}
              </span>
            </div>
          </div>

          {/* Active Striker */}
          <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800/50 rounded-xl p-3 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Striker</span>
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate mt-2.5">
              {activePlayerName || 'None'}
            </div>
          </div>
        </div>

        {statusText && (
          <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-950/30 border border-zinc-100 dark:border-zinc-800/50 rounded-xl">
            <div className="flex items-start gap-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-450">
              <Info size={14} className="text-emerald-600 dark:text-emerald-500 shrink-0 mt-0.5" />
              <span>{statusText}</span>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. MOBILE VIEW: Compact Single-Line Info Strip           */}
      {/* ======================================================== */}
      <div className={`lg:hidden rounded-xl border transition-all duration-300 ${
        isFrameSecured
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30'
      }`}>
        <div className="flex items-center justify-between px-3 py-2 text-xs">
          {/* Left: Key info items */}
          <div className="flex items-center gap-3">
            {/* Ball On */}
            <div className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full shrink-0 ${ballDot}`} />
              <span className={`font-bold uppercase text-[11px] ${ballTextColor}`}>
                {currentColorOn || '—'}
              </span>
            </div>

            <div className="w-px h-3.5 bg-zinc-200 dark:bg-zinc-800" />

            {/* Reds Left */}
            <div className="flex items-center gap-1">
              <span className="text-zinc-400 dark:text-zinc-550 font-medium text-[11px]">Reds</span>
              <span className="font-bold font-mono text-rose-600 dark:text-rose-400">{redsRemaining}</span>
            </div>

            <div className="w-px h-3.5 bg-zinc-200 dark:bg-zinc-800" />

            {/* Points Left */}
            <div className="flex items-center gap-1">
              <span className="text-zinc-400 dark:text-zinc-550 font-medium text-[11px]">Pts</span>
              <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">{pointsRemaining}</span>
            </div>
          </div>

          {/* Right: Frame Status + Expand */}
          <div className="flex items-center gap-2">
            <span className={`font-semibold text-[11px] ${
              isFrameSecured ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-450'
            }`}>
              {isFrameSecured ? '✓ Secured' : 'Active'}
            </span>

            {statusText && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-0.5"
              >
                <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Expandable analysis section */}
        {expanded && statusText && (
          <div className="px-3 pb-2.5 animate-fade-in w-full">
            <div className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2">
              {statusText}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
