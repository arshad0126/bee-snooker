'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMatchStore, Player, Session } from '@/lib/store';
import { getSupabaseClient } from '@/lib/supabase';
import { Button, Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter, Input, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge } from '@/components/ui';
import { calculatePlayerStats, PlayerStats } from '@/lib/insights';
import { Trophy, Play, Star, Plus, UserPlus, RefreshCw, Award, ArrowUp, Zap, HelpCircle } from 'lucide-react';

export default function GroupDashboard() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { activeGroup, startSession } = useMatchStore();

  // State
  const [players, setPlayers] = useState<Player[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [hallOfFame, setHallOfFame] = useState<{
    highestScore: { name: string; score: number } | null;
    mostWins: { name: string; wins: number } | null;
    mostActive: { name: string; frames: number } | null;
    mostPoints: { name: string; points: number } | null;
  }>({ highestScore: null, mostWins: null, mostActive: null, mostPoints: null });

  const [loading, setLoading] = useState(true);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const fetchDashboardData = async () => {
    if (!groupId) return;
    setLoading(true);

    try {
      const client = getSupabaseClient();

      // 1. Fetch Players
      const { data: playersData } = await client
        .from('players')
        .select('*')
        .eq('group_id', groupId)
        .order('elo_rating', { ascending: false });

      const playerList = playersData || [];
      setPlayers(playerList);

      // 2. Check for active session
      const { data: activeSessionData } = await client
        .from('sessions')
        .select('*')
        .eq('group_id', groupId)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1);

      if (activeSessionData && activeSessionData.length > 0) {
        setActiveSession(activeSessionData[0]);
      } else {
        setActiveSession(null);
      }

      // 3. Fetch all completed frames and events to build stats and Hall of Fame
      // We limit events to prevent fetching massive historical data on the client (or we join aggregates).
      // For absolute correctness, let's fetch frames and events.
      const { data: frames } = await client
        .from('frames')
        .select('*, session:sessions!inner(*)')
        .eq('session.group_id', groupId);

      const { data: framePlayers } = await client
        .from('frame_players')
        .select('*, frame:frames!inner(*, session:sessions!inner(*))')
        .eq('frame.session.group_id', groupId);

      const { data: events } = await client
        .from('frame_events')
        .select('*, frame:frames!inner(*, session:sessions!inner(*))')
        .eq('frame.session.group_id', groupId);

      if (playerList.length > 0 && frames && framePlayers && events) {
        const stats = playerList.map((p: Player) => {
          return calculatePlayerStats(
            p.id,
            p.name,
            frames,
            events,
            framePlayers
          );
        });

        setPlayerStats(stats);

        // Calculate Hall of Fame
        let highestScore: { name: string; score: number } | null = null;
        let mostWins: { name: string; wins: number } | null = null;
        let mostActive: { name: string; frames: number } | null = null;
        let mostPoints: { name: string; points: number } | null = null;

        stats.forEach((s: PlayerStats) => {
          // Highest frame
          if (!highestScore || s.highestFrameScore > highestScore.score) {
            highestScore = { name: s.name, score: s.highestFrameScore };
          }
          // Most wins
          if (!mostWins || s.wins > mostWins.wins) {
            mostWins = { name: s.name, wins: s.wins };
          }
          // Most active (frames played)
          if (!mostActive || s.framesPlayed > mostActive.frames) {
            mostActive = { name: s.name, frames: s.framesPlayed };
          }
          // Most points
          if (!mostPoints || s.totalPoints > mostPoints.points) {
            mostPoints = { name: s.name, points: s.totalPoints };
          }
        });

        setHallOfFame({
          highestScore: highestScore && (highestScore as any).score > 0 ? highestScore : null,
          mostWins: mostWins && (mostWins as any).wins > 0 ? mostWins : null,
          mostActive: mostActive && (mostActive as any).frames > 0 ? mostActive : null,
          mostPoints: mostPoints && (mostPoints as any).points > 0 ? mostPoints : null,
        });
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [groupId]);

  const handleStartSession = async () => {
    try {
      const sessionId = await startSession(groupId);
      router.push(`/group/${groupId}/session/${sessionId}`);
    } catch (err) {
      alert('Failed to start session.');
    }
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    setCreateLoading(true);
    try {
      const client = getSupabaseClient();
      const { error } = await client
        .from('players')
        .insert({
          group_id: groupId,
          name: newPlayerName.trim(),
          elo_rating: 1000,
          status: 'active',
        });

      if (error) throw error;
      setNewPlayerName('');
      await fetchDashboardData();
    } catch (err) {
      alert('Error creating player.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleStatus = async (player: Player) => {
    try {
      const client = getSupabaseClient();
      const newStatus = player.status === 'active' ? 'inactive' : 'active';
      const { error } = await client
        .from('players')
        .update({ status: newStatus })
        .eq('id', player.id);

      if (error) throw error;
      await fetchDashboardData();
    } catch (err) {
      alert('Error updating player status.');
    }
  };

  const activePlayers = players.filter(p => p.status === 'active');
  const inactivePlayers = players.filter(p => p.status === 'inactive');

  return (
    <div className="space-y-6">
      
      {/* Session Management Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-emerald-950/10 border border-emerald-500/10 shadow-inner">
        <div>
          <h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
            {activeSession ? 'Session in Progress' : 'Start Scoring'}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {activeSession 
              ? 'An active match session is currently running. Tap below to resume or spectate.'
              : 'Gathering with friends? Start a session to track scores, frames, and ELO changes.'}
          </p>
        </div>
        
        {activeSession ? (
          <Button
            onClick={() => router.push(`/group/${groupId}/session/${activeSession.id}`)}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 flex gap-1.5 shadow-md shadow-amber-600/15"
          >
            <Play size={16} fill="currentColor" />
            Resume Session
          </Button>
        ) : (
          <Button
            onClick={handleStartSession}
            className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-700 font-bold px-6 flex gap-1.5 shadow-md shadow-emerald-700/15"
          >
            <Play size={16} fill="currentColor" />
            Start Session
          </Button>
        )}
      </div>

      {/* Hall of Fame Summary */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
          <Star size={12} className="text-emerald-500" />
          Hall of Fame
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm p-4 text-center">
            <div className="text-[10px] uppercase font-bold text-zinc-400">Highest Frame</div>
            <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-mono mt-1">
              {hallOfFame.highestScore ? `${hallOfFame.highestScore.score} pts` : '--'}
            </div>
            <div className="text-xs text-zinc-500 truncate mt-1">
              {hallOfFame.highestScore ? hallOfFame.highestScore.name : 'No frames recorded'}
            </div>
          </Card>

          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm p-4 text-center">
            <div className="text-[10px] uppercase font-bold text-zinc-400">Most Wins</div>
            <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-mono mt-1">
              {hallOfFame.mostWins ? `${hallOfFame.mostWins.wins} Wins` : '--'}
            </div>
            <div className="text-xs text-zinc-500 truncate mt-1">
              {hallOfFame.mostWins ? hallOfFame.mostWins.name : 'No wins recorded'}
            </div>
          </Card>

          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm p-4 text-center">
            <div className="text-[10px] uppercase font-bold text-zinc-400">Most Active</div>
            <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-mono mt-1">
              {hallOfFame.mostActive ? `${hallOfFame.mostActive.frames} Frames` : '--'}
            </div>
            <div className="text-xs text-zinc-500 truncate mt-1">
              {hallOfFame.mostActive ? hallOfFame.mostActive.name : 'No frames recorded'}
            </div>
          </Card>

          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm p-4 text-center">
            <div className="text-[10px] uppercase font-bold text-zinc-400">Lifetime Points</div>
            <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-mono mt-1">
              {hallOfFame.mostPoints ? `${hallOfFame.mostPoints.points} pts` : '--'}
            </div>
            <div className="text-xs text-zinc-500 truncate mt-1">
              {hallOfFame.mostPoints ? hallOfFame.mostPoints.name : 'No points recorded'}
            </div>
          </Card>
        </div>
      </div>

      {/* Leaderboard & Player list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ELO Leaderboard Table */}
        <Card className="lg:col-span-2 border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-900 flex flex-row items-center justify-between py-3.5">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Trophy size={16} className="text-yellow-500" />
                ELO Leaderboard
              </CardTitle>
            </div>
            <button
              onClick={fetchDashboardData}
              className="p-1.5 text-zinc-500 hover:text-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            >
              <RefreshCw size={14} />
            </button>
          </CardHeader>
          <CardContent className="p-0 grow">
            {loading ? (
              <div className="py-12 text-center text-xs text-zinc-400">Loading leaderboard...</div>
            ) : activePlayers.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400 italic">No active players yet. Use the sidebar to add players.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">Wins/Losses</TableHead>
                    <TableHead className="text-center">Win Rate</TableHead>
                    <TableHead className="text-right">ELO Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePlayers.map((p, idx) => {
                    const stats = playerStats.find(s => s.id === p.id);
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30"
                        onClick={() => router.push(`/group/${groupId}/player/${p.id}`)}
                      >
                        <TableCell className="font-bold text-center text-zinc-500">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {p.name}
                        </TableCell>
                        <TableCell className="text-center text-xs text-zinc-500 font-mono">
                          {stats ? `${stats.wins}W - ${stats.losses}L` : '0W - 0L'}
                        </TableCell>
                        <TableCell className="text-center text-xs font-semibold">
                          <Badge variant="default" className="bg-emerald-700/10 text-emerald-700 dark:text-emerald-300 font-mono">
                            {stats ? `${stats.winRate}%` : '0%'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-800 dark:text-emerald-400 font-mono">
                          {p.elo_rating}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Sidebar Player Administration */}
        <div className="space-y-6">
          {/* Add Player Box */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <UserPlus size={16} className="text-emerald-600" />
                Add Player
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePlayer} className="space-y-3">
                <Input
                  placeholder="Player full name"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                  required
                  disabled={createLoading}
                />
                <Button
                  type="submit"
                  disabled={createLoading || !newPlayerName}
                  className="w-full flex gap-1.5 text-xs font-semibold"
                >
                  <Plus size={14} />
                  Add to Club Roster
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Inactive Roster Box */}
          {inactivePlayers.length > 0 && (
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CardHeader className="py-4 border-b border-zinc-100 dark:border-zinc-900">
                <CardTitle className="text-sm font-semibold">
                  Inactive Players ({inactivePlayers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                  {inactivePlayers.map(p => (
                    <div key={p.id} className="p-3.5 flex items-center justify-between text-sm">
                      <span className="text-zinc-500 font-medium">{p.name}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(p)}
                        className="text-xs px-2.5 py-1 text-zinc-500 hover:text-emerald-600 border-zinc-350"
                      >
                        Reactivate
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Player Status Modifier (so they can be toggled inactive) */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="py-4 border-b border-zinc-100 dark:border-zinc-900">
              <CardTitle className="text-sm font-semibold">
                Manage Active Roster
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[220px] overflow-y-auto">
              <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {activePlayers.map(p => (
                  <div key={p.id} className="p-3 flex items-center justify-between text-xs">
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">{p.name}</span>
                    <button
                      onClick={() => handleToggleStatus(p)}
                      className="text-rose-500 hover:text-rose-700 font-semibold"
                    >
                      Deactivate
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
