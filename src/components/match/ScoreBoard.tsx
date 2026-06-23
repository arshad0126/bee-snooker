import React from 'react';
import { Badge } from '../ui';
import { Player, FramePlayer, PlayerAnalytics } from '../../lib/store';
import { ShieldAlert, Timer, TrendingUp, Award, Zap } from 'lucide-react';
import { ShotTimer } from './ShotTimer';

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
}

// Helper to format seconds to MM:SS
const formatTime = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// =============================================
// PLAYER CARD — shared between all layouts
// =============================================
const PlayerCard: React.FC<{
  player: FramePlayer & { player: Player };
  score: number;
  isActive: boolean;
  snookered: boolean;
  stats?: PlayerAnalytics;
  lastActionAt: string | null;
  currentBreak?: number;
  compact?: boolean;
  rankIndex?: number;
}> = ({ player, score, isActive, snookered, stats, lastActionAt, currentBreak, compact, rankIndex }) => {
  const timeStr = stats ? formatTime(stats.totalTime) : '00:00';
  const avgStr = stats && stats.averageShot > 0 ? `${stats.averageShot.toFixed(1)}s` : '-';
  const p = player;

  return (
    <div
      className={`p-3 sm:p-3.5 rounded-2xl border flex flex-col justify-between transition-all duration-200 shadow-sm relative overflow-hidden ${
        isActive
          ? 'border-emerald-500 bg-emerald-500/8 dark:bg-emerald-950/25 ring-1 ring-emerald-500/20 shadow-emerald-500/10'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50'
      }`}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" />
      )}

      <div className="flex items-center justify-between min-w-0 w-full">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar */}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 transition-all ${
            isActive 
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30' 
              : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
          }`}>
            {p.player.photo_url ? (
              <img src={p.player.photo_url} alt={p.player.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              p.player.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="truncate">
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate flex items-center gap-1.5">
              {p.player.name}
              {p.is_breaker && (
                <span className="text-[8px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1 py-px rounded border border-emerald-500/20 leading-none">BRK</span>
              )}
            </div>
            {/* Compact stats row */}
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5 flex items-center gap-1.5 select-none">
              <span className="flex items-center gap-0.5">
                <Timer size={9} className="shrink-0" />
                {timeStr}
              </span>
              <span className="opacity-30">·</span>
              <span>Avg {avgStr}</span>
              {rankIndex !== undefined && (
                <>
                  <span className="opacity-30">·</span>
                  <span className="flex items-center gap-0.5">
                    <Award size={9} />
                    #{rankIndex + 1}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Score + Break */}
        <div className="flex items-center gap-2 shrink-0">
          {snookered && (
            <span title="Requires snookers" className="text-rose-500">
              <ShieldAlert size={14} />
            </span>
          )}
          <div className="flex flex-col items-end gap-0.5">
            <span className={`font-mono text-2xl sm:text-3xl font-black py-0.5 px-3 rounded-xl border transition-all ${
              isActive
                ? 'bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800'
            }`}>
              {score}
            </span>
          </div>
        </div>
      </div>

      {/* Active player: Break counter + Shot timer */}
      {isActive && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-500/15 dark:border-emerald-500/10">
          {currentBreak !== undefined && currentBreak > 0 ? (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Zap size={12} className="shrink-0" />
              <span className="text-[11px] font-black">Break: {currentBreak}</span>
            </div>
          ) : (
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">At the table</span>
          )}
          <ShotTimer lastActionAt={lastActionAt} isActive={isActive} />
        </div>
      )}
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
}) => {

  if (mode === 'team') {
    const teamAPlayers = players.filter(p => p.team_id === 'team_a');
    const teamBPlayers = players.filter(p => p.team_id === 'team_b');

    return (
      <div className="space-y-3 font-sans select-none">
        {/* Team Score Headers — Premium Compact */}
        <div className="grid grid-cols-2 gap-3">
          {/* Team A */}
          <div className="rounded-2xl border border-blue-500/25 bg-gradient-to-b from-blue-500/5 to-blue-500/10 dark:from-blue-950/20 dark:to-blue-950/40 p-3 sm:p-4 text-center shadow-lg shadow-blue-500/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.15),transparent_70%)] pointer-events-none" />
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Team A</span>
            <div className="text-4xl sm:text-5xl font-black text-blue-700 dark:text-blue-400 font-mono mt-1 drop-shadow-[0_0_12px_rgba(59,130,246,0.3)]">
              {teamScores.team_a}
            </div>
          </div>
          {/* Team B */}
          <div className="rounded-2xl border border-orange-500/25 bg-gradient-to-b from-orange-500/5 to-orange-500/10 dark:from-orange-950/20 dark:to-orange-950/40 p-3 sm:p-4 text-center shadow-lg shadow-orange-500/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(249,115,22,0.15),transparent_70%)] pointer-events-none" />
            <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Team B</span>
            <div className="text-4xl sm:text-5xl font-black text-orange-700 dark:text-orange-400 font-mono mt-1 drop-shadow-[0_0_12px_rgba(249,115,22,0.3)]">
              {teamScores.team_b}
            </div>
          </div>
        </div>

        {/* Individual Team Members — stacked vertically */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Team A Roster */}
          {teamAPlayers.map(p => (
            <PlayerCard
              key={p.player_id}
              player={p}
              score={scores[p.player_id] || 0}
              isActive={activePlayerId === p.player_id}
              snookered={requiresSnookers[p.player_id] || false}
              stats={frameAnalytics[p.player_id]}
              lastActionAt={lastActionAt}
              currentBreak={activePlayerId === p.player_id ? currentBreak : undefined}
            />
          ))}
          {/* Team B Roster */}
          {teamBPlayers.map(p => (
            <PlayerCard
              key={p.player_id}
              player={p}
              score={scores[p.player_id] || 0}
              isActive={activePlayerId === p.player_id}
              snookered={requiresSnookers[p.player_id] || false}
              stats={frameAnalytics[p.player_id]}
              lastActionAt={lastActionAt}
              currentBreak={activePlayerId === p.player_id ? currentBreak : undefined}
            />
          ))}
        </div>
      </div>
    );
  }

  // =============================================
  // FREE FOR ALL — Mobile-first vertical stack
  // =============================================
  const sortedByScore = [...players].sort((a, b) => {
    const scoreA = scores[a.player_id] || 0;
    const scoreB = scores[b.player_id] || 0;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return a.play_order - b.play_order;
  });

  // 2-player head-to-head: side-by-side on all screens
  if (players.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:gap-3 font-sans select-none">
        {players.map(p => {
          const isActive = activePlayerId === p.player_id;
          const rankIndex = sortedByScore.findIndex(sp => sp.player_id === p.player_id);

          return (
            <PlayerCard
              key={p.player_id}
              player={p}
              score={scores[p.player_id] || 0}
              isActive={isActive}
              snookered={requiresSnookers[p.player_id] || false}
              stats={frameAnalytics[p.player_id]}
              lastActionAt={lastActionAt}
              currentBreak={isActive ? currentBreak : undefined}
              rankIndex={rankIndex}
            />
          );
        })}
      </div>
    );
  }

  // 3+ players: vertical stack on mobile, horizontal scroll on desktop
  return (
    <div className="space-y-2 sm:space-y-0 sm:flex sm:flex-row sm:gap-3 sm:overflow-x-auto sm:pb-2 font-sans select-none">
      {players.map(p => {
        const isActive = activePlayerId === p.player_id;
        const rankIndex = sortedByScore.findIndex(sp => sp.player_id === p.player_id);

        return (
          <div key={p.player_id} className="sm:flex-1 sm:min-w-[210px]">
            <PlayerCard
              player={p}
              score={scores[p.player_id] || 0}
              isActive={isActive}
              snookered={requiresSnookers[p.player_id] || false}
              stats={frameAnalytics[p.player_id]}
              lastActionAt={lastActionAt}
              currentBreak={isActive ? currentBreak : undefined}
              rankIndex={rankIndex}
            />
          </div>
        );
      })}
    </div>
  );
};
