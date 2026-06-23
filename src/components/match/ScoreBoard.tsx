import React from 'react';
import { Player, FramePlayer, PlayerAnalytics } from '../../lib/store';
import { ShieldAlert, Timer, Zap } from 'lucide-react';

interface ScoreBoardProps {
  mode: 'free_for_all' | 'team';
  players: (FramePlayer & { player: Player })[];
  scores: Record<string, number>;
  teamScores: { team_a: number; team_b: number };
  activePlayerId: string | null;
  requiresSnookers: Record<string, boolean>;
  lastActionAt: string | null;
  frameAnalytics: Record<string, PlayerAnalytics>;
  currentBreak?: number;
  frameWins?: Record<string, number>;
  visitStartAt?: string | null;
}

// Helper to format seconds to MM:SS
const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const PlayerCard: React.FC<{
  player: FramePlayer & { player: Player };
  score: number;
  teamScore?: number;
  isActive: boolean;
  snookered: boolean;
  stats?: PlayerAnalytics;
  lastActionAt: string | null;
  currentBreak?: number;
  frameWins?: number;
  visitStartAt?: string | null;
  mode: 'free_for_all' | 'team';
}> = ({ player, score, teamScore, isActive, snookered, stats, lastActionAt, currentBreak, frameWins = 0, visitStartAt, mode }) => {
  const p = player;
  
  const [now, setNow] = React.useState<number>(Date.now());

  React.useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  const getLiveStats = () => {
    if (!isActive) {
      return {
        visitTime: 0,
        totalTime: stats ? stats.totalTime : 0,
        shotTime: 0
      };
    }
    const shotTime = lastActionAt ? Math.floor((now - new Date(lastActionAt).getTime()) / 1000) : 0;
    const visitTime = visitStartAt ? Math.floor((now - new Date(visitStartAt).getTime()) / 1000) : 0;
    const totalTime = (stats ? stats.totalTime : 0) + (lastActionAt ? Math.floor((now - new Date(lastActionAt).getTime()) / 1000) : 0);
    return {
      visitTime: Math.max(0, visitTime),
      totalTime: Math.max(0, totalTime),
      shotTime: Math.max(0, shotTime)
    };
  };

  const liveStats = getLiveStats();
  const displayTotalTime = formatTime(liveStats.totalTime);
  const displayVisitTime = isActive ? formatTime(liveStats.visitTime) : '';
  const displayShotTime = isActive ? `${liveStats.shotTime}s` : '';

  // In team mode, the main score displayed is the teamScore. Otherwise, it is the player's score.
  const mainScore = mode === 'team' && teamScore !== undefined ? teamScore : score;

  return (
    <div
      className={`relative flex flex-col justify-between p-2 rounded-xl border transition-all duration-200 shadow-sm overflow-hidden select-none h-full ${
        isActive
          ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/30 ring-1 ring-emerald-500/20 shadow-md shadow-emerald-500/5'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40'
      }`}
    >
      {/* Active Top Bar Indicator */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" />
      )}

      {/* Top Section: Avatar, Name, Wins */}
      <div className="flex items-center justify-between gap-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Avatar (small & clean) */}
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
            isActive 
              ? 'bg-emerald-600 text-white shadow-sm' 
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
          }`}>
            {p.player.photo_url ? (
              <img src={p.player.photo_url} alt={p.player.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              p.player.name.charAt(0).toUpperCase()
            )}
          </div>
          
          <div className="truncate flex flex-col min-w-0">
            <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-100 truncate flex items-center gap-0.5">
              {p.player.name}
              {p.is_breaker && (
                <span className="text-[7px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-0.5 rounded border border-emerald-500/20 leading-none">B</span>
              )}
            </span>
            {mode === 'team' && (
              <span className={`text-[8px] font-black uppercase tracking-wider leading-none ${
                p.team_id === 'team_a' ? 'text-blue-500' : 'text-orange-500'
              }`}>
                {p.team_id === 'team_a' ? 'Team A' : 'Team B'}
              </span>
            )}
          </div>
        </div>

        {/* Wins Badge */}
        <div className="shrink-0 flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-1 py-0.5 rounded text-[8px] font-black text-zinc-500 dark:text-zinc-400">
          <span>W:</span>
          <span className="text-zinc-800 dark:text-zinc-200">{frameWins}</span>
        </div>
      </div>

      {/* Middle Section: Score & Break */}
      <div className="flex items-end justify-between mt-1">
        {/* Score */}
        <div className="flex items-baseline gap-1">
          <span className={`font-mono text-xl sm:text-2xl font-black transition-all ${
            isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-800 dark:text-zinc-200'
          }`}>
            {mainScore}
          </span>
          {mode === 'team' && (
            <span className="text-[9px] text-zinc-400 font-medium">
              (P: {score})
            </span>
          )}
        </div>

        {/* Active break / snookered state */}
        <div className="flex items-center gap-1">
          {snookered && (
            <span title="Requires snookers" className="text-rose-500 shrink-0">
              <ShieldAlert size={12} />
            </span>
          )}
          {isActive && currentBreak !== undefined && currentBreak > 0 && (
            <div className="flex items-center gap-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1 py-0.5 rounded text-[9px] font-black">
              <Zap size={8} className="shrink-0" />
              <span>B: {currentBreak}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Timers */}
      <div className="flex items-center justify-between text-[9px] text-zinc-400 dark:text-zinc-500 font-mono mt-1 pt-1 border-t border-zinc-100 dark:border-zinc-900 select-none">
        <span className="flex items-center gap-0.5">
          <Timer size={8} />
          <span>{displayTotalTime}</span>
        </span>
        {isActive && (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
            <span>V: {displayVisitTime}</span>
            <span>({displayShotTime})</span>
          </span>
        )}
      </div>
    </div>
  );
};

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  mode,
  players,
  scores,
  teamScores,
  activePlayerId,
  requiresSnookers,
  lastActionAt,
  frameAnalytics,
  currentBreak,
  frameWins = {},
  visitStartAt,
}) => {
  // Sort players by team in team mode, or keep play order in FFA.
  // In either case, they will be side-by-side in equal-width cards.
  const displayPlayers = mode === 'team'
    ? [
        ...players.filter(p => p.team_id === 'team_a'),
        ...players.filter(p => p.team_id === 'team_b')
      ]
    : players;

  const gridColsClass = displayPlayers.length === 2
    ? 'grid-cols-2'
    : displayPlayers.length === 3
      ? 'grid-cols-3'
      : 'grid-cols-4';

  return (
    <div className={`grid gap-2 w-full ${gridColsClass} font-sans select-none items-stretch`}>
      {displayPlayers.map(p => {
        const isActive = activePlayerId === p.player_id;
        const playerWins = frameWins[p.player_id] || 0;
        const teamScore = p.team_id ? teamScores[p.team_id] : undefined;

        return (
          <div key={p.player_id} className="h-[96px]">
            <PlayerCard
              player={p}
              score={scores[p.player_id] || 0}
              teamScore={teamScore}
              isActive={isActive}
              snookered={requiresSnookers[p.player_id] || false}
              stats={frameAnalytics[p.player_id]}
              lastActionAt={lastActionAt}
              currentBreak={isActive ? currentBreak : undefined}
              frameWins={playerWins}
              visitStartAt={visitStartAt}
              mode={mode}
            />
          </div>
        );
      })}
    </div>
  );
};
