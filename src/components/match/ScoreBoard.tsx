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
      <div className="space-y-3">
        {/* Team Score Headers */}
        <div className="grid grid-cols-2 gap-3">
          {/* Team A */}
          <div className="rounded-xl border border-blue-500/15 bg-blue-600/5 dark:bg-blue-950/15 p-3 text-center">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Team A</span>
            <div className="text-4xl font-extrabold text-blue-700 dark:text-blue-400 font-mono mt-1">
              {teamScores.team_a}
            </div>
          </div>
          {/* Team B */}
          <div className="rounded-xl border border-orange-500/15 bg-orange-600/5 dark:bg-orange-950/15 p-3 text-center">
            <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Team B</span>
            <div className="text-4xl font-extrabold text-orange-700 dark:text-orange-400 font-mono mt-1">
              {teamScores.team_b}
            </div>
          </div>
        </div>

        {/* Individual Team Members */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            {teamAPlayers.map(p => {
              const isActive = activePlayerId === p.player_id;
              const snookered = requiresSnookers[p.player_id];
              return (
                <div
                  key={p.player_id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all duration-300 ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-700/5 dark:bg-emerald-950/20 animate-active-glow'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      isActive ? 'bg-emerald-700 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {p.player.photo_url ? (
                        <img src={p.player.photo_url} alt={p.player.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        p.player.name.charAt(0)
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{p.player.name}</div>
                      <div className="text-[9px] text-zinc-400">{p.player.elo_rating}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {snookered && <ShieldAlert size={13} className="text-rose-500" />}
                    <span className="font-mono font-bold text-sm text-zinc-800 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-900 py-0.5 px-2 rounded-lg">
                      {scores[p.player_id] || 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="space-y-1.5">
            {teamBPlayers.map(p => {
              const isActive = activePlayerId === p.player_id;
              const snookered = requiresSnookers[p.player_id];
              return (
                <div
                  key={p.player_id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all duration-300 ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-700/5 dark:bg-emerald-950/20 animate-active-glow'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      isActive ? 'bg-emerald-700 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {p.player.photo_url ? (
                        <img src={p.player.photo_url} alt={p.player.name} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        p.player.name.charAt(0)
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{p.player.name}</div>
                      <div className="text-[9px] text-zinc-400">{p.player.elo_rating}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {snookered && <ShieldAlert size={13} className="text-rose-500" />}
                    <span className="font-mono font-bold text-sm text-zinc-800 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-900 py-0.5 px-2 rounded-lg">
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
    <div className="flex flex-row gap-2 overflow-x-auto pb-1">
      {players.map(p => {
        const isActive = activePlayerId === p.player_id;
        const snookered = requiresSnookers[p.player_id];
        return (
          <div
            key={p.player_id}
            className={`flex-1 min-w-0 p-2.5 rounded-xl border flex items-center justify-between transition-all duration-300 ${
              isActive
                ? 'border-emerald-500 bg-emerald-700/5 dark:bg-emerald-950/20 animate-active-glow'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                isActive ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20' : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
              }`}>
                {p.player.photo_url ? (
                  <img src={p.player.photo_url} alt={p.player.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  p.player.name.charAt(0)
                )}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1">
                  <span>{p.player.name}</span>
                  {p.is_breaker && (
                    <Badge variant="default" className="bg-emerald-700/10 text-emerald-700 dark:text-emerald-300 text-[8px] py-0 px-1 border-none">
                      BRK
                    </Badge>
                  )}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">{p.player.elo_rating}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              {snookered && (
                <span title="Requires snookers" className="text-rose-500">
                  <ShieldAlert size={13} />
                </span>
              )}
              <span className="font-mono text-2xl font-extrabold text-zinc-800 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-900 py-1 px-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800">
                {scores[p.player_id] || 0}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
