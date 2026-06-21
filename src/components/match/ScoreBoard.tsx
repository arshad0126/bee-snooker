import React from 'react';
import { Badge } from '../ui';
import { Player, FramePlayer } from '../../lib/store';
import { ShieldAlert } from 'lucide-react';

interface ScoreBoardProps {
  mode: 'free_for_all' | 'team';
  players: (FramePlayer & { player: Player })[];
  scores: Record<string, number>;
  teamScores: { team_a: number; team_b: number };
  activePlayerId: string | null;
  requiresSnookers: Record<string, boolean>;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  mode,
  players,
  scores,
  teamScores,
  activePlayerId,
  requiresSnookers,
}) => {
  if (mode === 'team') {
    const teamAPlayers = players.filter(p => p.team_id === 'team_a');
    const teamBPlayers = players.filter(p => p.team_id === 'team_b');

    return (
      <div className="space-y-4">
        {/* Team Score Headers */}
        <div className="grid grid-cols-2 gap-4">
          {/* Team A */}
          <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-b from-blue-500/5 to-blue-500/10 dark:from-blue-950/20 dark:to-blue-950/40 p-4 text-center shadow-lg shadow-blue-500/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.15),transparent_70%)] pointer-events-none" />
            <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Team A</span>
            <div className="text-4xl font-black text-blue-700 dark:text-blue-400 font-mono mt-1.5 drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">
              {teamScores.team_a}
            </div>
          </div>
          {/* Team B */}
          <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-b from-orange-500/5 to-orange-500/10 dark:from-orange-950/20 dark:to-orange-950/40 p-4 text-center shadow-lg shadow-orange-500/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(249,115,22,0.15),transparent_70%)] pointer-events-none" />
            <span className="text-[11px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Team B</span>
            <div className="text-4xl font-black text-orange-700 dark:text-orange-400 font-mono mt-1.5 drop-shadow-[0_0_10px_rgba(249,115,22,0.3)]">
              {teamScores.team_b}
            </div>
          </div>
        </div>

        {/* Individual Team Members */}
        <div className="grid grid-cols-2 gap-4">
          {/* Team A Roster */}
          <div className="space-y-2">
            {teamAPlayers.map(p => {
              const isActive = activePlayerId === p.player_id;
              const snookered = requiresSnookers[p.player_id];
              return (
                <div
                  key={p.player_id}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-all duration-300 shadow-sm ${
                    isActive
                      ? 'border-emerald-500 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 dark:from-emerald-950/30 dark:to-emerald-900/10 animate-active-glow'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                      isActive 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30' 
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-650 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
                    }`}>
                      {p.player.photo_url ? (
                        <img src={p.player.photo_url} alt={p.player.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        p.player.name.charAt(0)
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{p.player.name}</div>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">{p.player.elo_rating} ELO</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {snookered && <ShieldAlert size={14} className="text-rose-500 animate-pulse" />}
                    <span className={`font-mono font-black text-base py-1 px-3 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-emerald-950/20 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800'
                    }`}>
                      {scores[p.player_id] || 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Team B Roster */}
          <div className="space-y-2">
            {teamBPlayers.map(p => {
              const isActive = activePlayerId === p.player_id;
              const snookered = requiresSnookers[p.player_id];
              return (
                <div
                  key={p.player_id}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-all duration-300 shadow-sm ${
                    isActive
                      ? 'border-emerald-500 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 dark:from-emerald-950/30 dark:to-emerald-900/10 animate-active-glow'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                      isActive 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30' 
                        : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-650 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
                    }`}>
                      {p.player.photo_url ? (
                        <img src={p.player.photo_url} alt={p.player.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        p.player.name.charAt(0)
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{p.player.name}</div>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">{p.player.elo_rating} ELO</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {snookered && <ShieldAlert size={14} className="text-rose-500 animate-pulse" />}
                    <span className={`font-mono font-black text-base py-1 px-3 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-emerald-950/20 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800'
                    }`}>
                      {scores[p.player_id] || 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // =============================================
  // FREE FOR ALL — Single Row Player Cards
  // =============================================
  return (
    <div className="flex flex-row gap-3 overflow-x-auto pb-1">
      {players.map(p => {
        const isActive = activePlayerId === p.player_id;
        const snookered = requiresSnookers[p.player_id];
        return (
          <div
            key={p.player_id}
            className={`flex-1 min-w-[200px] p-3.5 rounded-2xl border flex items-center justify-between transition-all duration-300 shadow-sm ${
              isActive
                ? 'border-emerald-500 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 dark:from-emerald-950/30 dark:to-emerald-900/10 animate-active-glow'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                isActive 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-555/20 ring-2 ring-emerald-500/50' 
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-450 border border-zinc-200 dark:border-zinc-800'
              }`}>
                {p.player.photo_url ? (
                  <img src={p.player.photo_url} alt={p.player.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  p.player.name.charAt(0)
                )}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate flex items-center gap-1.5">
                  <span className="truncate">{p.player.name}</span>
                  {p.is_breaker && (
                    <Badge variant="default" className="bg-emerald-700/15 text-emerald-700 dark:text-emerald-450 text-[8px] py-0 px-1 border-none font-bold shrink-0 leading-none">
                      BRK
                    </Badge>
                  )}
                </div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono tracking-wide mt-0.5">{p.player.elo_rating} ELO</div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              {snookered && (
                <span title="Requires snookers" className="text-rose-500 animate-pulse">
                  <ShieldAlert size={14} />
                </span>
              )}
              <span className={`font-mono text-2xl font-black py-1 px-3.5 rounded-xl border transition-all ${
                isActive
                  ? 'bg-emerald-950/20 dark:bg-emerald-950/50 text-emerald-650 dark:text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
                  : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800'
              }`}>
                {scores[p.player_id] || 0}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
