import React from 'react';

interface MathematicalPanelProps {
  redsRemaining: number;
  pointsRemaining: number;
  isFrameSecured: boolean;
  statusText: string;
  currentColorOn: string | null;
  activePlayerName?: string;
}

const BALL_DOT_COLORS: Record<string, string> = {
  red: 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]',
  color: 'bg-gradient-to-r from-yellow-400 via-green-500 to-blue-600 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
  yellow: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]',
  green: 'bg-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
  brown: 'bg-amber-800 shadow-[0_0_8px_rgba(146,64,14,0.5)]',
  blue: 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]',
  pink: 'bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.5)]',
  black: 'bg-zinc-900 border border-zinc-600 shadow-[0_0_8px_rgba(39,39,42,0.5)]',
};

const BALL_TEXT_COLORS: Record<string, string> = {
  red: 'text-red-500',
  color: 'text-emerald-500',
  yellow: 'text-yellow-500',
  green: 'text-emerald-600 dark:text-emerald-400',
  brown: 'text-amber-800 dark:text-amber-500',
  blue: 'text-blue-500',
  pink: 'text-pink-500',
  black: 'text-zinc-900 dark:text-zinc-355',
};

export const MathematicalPanel: React.FC<MathematicalPanelProps> = ({
  redsRemaining,
  pointsRemaining,
  isFrameSecured,
  statusText,
  currentColorOn,
  activePlayerName,
}) => {
  const ballDot = currentColorOn ? BALL_DOT_COLORS[currentColorOn] || 'bg-zinc-500' : 'bg-zinc-500';
  const ballTextColor = currentColorOn ? BALL_TEXT_COLORS[currentColorOn] || 'text-zinc-500' : 'text-zinc-500';
  
  // Try to parse lead from statusText
  const leadMatch = statusText ? statusText.match(/Lead is (-?\d+)/i) : null;
  const parsedLead = leadMatch ? leadMatch[1] : null;

  return (
    <div className="w-full bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs select-none">
      <div className="flex items-center gap-3 md:gap-4 overflow-x-auto no-scrollbar">
        {/* Ball On */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">On:</span>
          <div className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${ballDot}`} />
            <span className={`font-black uppercase text-[10px] ${ballTextColor}`}>
              {currentColorOn || '—'}
            </span>
          </div>
        </div>

        <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-800 shrink-0" />

        {/* Reds */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Reds:</span>
          <span className="font-mono font-black text-red-650 dark:text-red-500">{redsRemaining}</span>
        </div>

        <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-800 shrink-0" />

        {/* Points Remaining */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Points Left:</span>
          <span className="font-mono font-black text-emerald-650 dark:text-emerald-400">{pointsRemaining}</span>
        </div>

        {parsedLead !== null && (
          <>
            <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-800 shrink-0" />
            {/* Lead */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Lead:</span>
              <span className="font-mono font-black text-amber-600 dark:text-amber-500">{parsedLead}</span>
            </div>
          </>
        )}

        <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-800 shrink-0" />

        {/* Active Striker */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-semibold">Striker:</span>
          <span className="font-bold text-zinc-850 dark:text-zinc-200">{activePlayerName || '—'}</span>
        </div>
      </div>

      {/* Frame Status */}
      <div className="shrink-0 pl-2">
        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
          isFrameSecured 
            ? 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border border-emerald-500/20' 
            : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-850'
        }`}>
          {isFrameSecured ? 'Secured' : 'Active'}
        </span>
      </div>
    </div>
  );
};
