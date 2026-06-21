import React from 'react';
import { ShieldCheck, Info, ChevronDown } from 'lucide-react';

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
  red: 'bg-red-600',
  color: 'bg-gradient-to-r from-yellow-400 via-green-500 to-blue-600',
  yellow: 'bg-yellow-500',
  green: 'bg-emerald-600',
  brown: 'bg-amber-800',
  blue: 'bg-blue-600',
  pink: 'bg-pink-400',
  black: 'bg-zinc-900 border border-zinc-600',
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
  const ballDot = currentColorOn ? BALL_DOT_COLORS[currentColorOn] || 'bg-zinc-500' : 'bg-zinc-500';

  return (
    <div className={`rounded-xl border transition-all duration-300 ${
      isFrameSecured
        ? 'border-emerald-500/30 bg-emerald-500/5'
        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30'
    }`}>
      {/* Compact info bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-xs">
        {/* Reds Left */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400 dark:text-zinc-500 font-medium">Reds</span>
          <span className="font-bold font-mono text-rose-600 dark:text-rose-400">{redsRemaining}</span>
        </div>

        <div className="w-px h-3.5 bg-zinc-200 dark:bg-zinc-800" />

        {/* Points Left */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400 dark:text-zinc-500 font-medium">Points</span>
          <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">{pointsRemaining}</span>
        </div>

        <div className="w-px h-3.5 bg-zinc-200 dark:bg-zinc-800" />

        {/* Ball On */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400 dark:text-zinc-500 font-medium">Ball On</span>
          <div className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-full ${ballDot}`} />
            <span className="font-bold text-zinc-700 dark:text-zinc-300 uppercase">
              {currentColorOn || 'None'}
            </span>
          </div>
        </div>

        <div className="w-px h-3.5 bg-zinc-200 dark:bg-zinc-800" />

        {/* Current Striker */}
        {activePlayerName && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 dark:text-zinc-500 font-medium">Striker</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">{activePlayerName}</span>
            </div>
            <div className="w-px h-3.5 bg-zinc-200 dark:bg-zinc-800" />
          </>
        )}

        {/* Frame Status Indicator */}
        <div className="flex items-center gap-1.5">
          {isFrameSecured ? (
            <ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Info size={13} className="text-zinc-400" />
          )}
          <span className={`font-semibold ${
            isFrameSecured ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'
          }`}>
            {isFrameSecured ? 'Secured' : 'Active'}
          </span>
        </div>

        {/* Expand/collapse toggle for analysis text */}
        {statusText && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-auto flex items-center gap-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            <span className="text-[10px] font-medium">Details</span>
            <ChevronDown size={12} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Expandable analysis section */}
      {expanded && statusText && (
        <div className="px-3 pb-2.5 animate-fade-in">
          <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2">
            {statusText}
          </div>
        </div>
      )}
    </div>
  );
};
