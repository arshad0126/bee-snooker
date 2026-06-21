'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { Player, Frame, FrameEvent, FramePlayer } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardContent, Select, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge } from '@/components/ui';
import { Swords, ArrowLeft, Trophy, ShieldAlert, Award, Calendar, HelpCircle } from 'lucide-react';

export default function Rivalries() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  // States
  const [players, setPlayers] = useState<Player[]>([]);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [events, setEvents] = useState<FrameEvent[]>([]);
  const [framePlayers, setFramePlayers] = useState<FramePlayer[]>([]);
  const [loading, setLoading] = useState(true);

  // Selector states
  const [playerAId, setPlayerAId] = useState('');
  const [playerBId, setPlayerBId] = useState('');

  // Rivalry stats
  const [rivalryStats, setRivalryStats] = useState<{
    matchesPlayed: number;
    playerAWins: number;
    playerBWins: number;
    draws: number;
    biggestVictoryA: number;
    biggestVictoryB: number;
    history: { frameNum: number; winnerId: string | null; scoreA: number; scoreB: number; date: string }[];
  } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const client = getSupabaseClient();
      
      const { data: playersData } = await client
        .from('players')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'active');
      setPlayers(playersData || []);

      const { data: framesData } = await client
        .from('frames')
        .select('*, session:sessions!inner(*)')
        .eq('sessions.group_id', groupId);
      setFrames(framesData || []);

      const { data: framePlayersData } = await client
        .from('frame_players')
        .select('*, frame:frames!inner(*, session:sessions!inner(*))')
        .eq('frame.session.group_id', groupId);
      setFramePlayers(framePlayersData || []);

      const { data: eventsData } = await client
        .from('frame_events')
        .select('*, frame:frames!inner(*, session:sessions!inner(*))')
        .eq('frame.session.group_id', groupId);
      setEvents(eventsData || []);

      // Pre-select first two players if available
      if (playersData && playersData.length >= 2) {
        setPlayerAId(playersData[0].id);
        setPlayerBId(playersData[1].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [groupId]);

  // Re-calculate H2H rivalry stats whenever player selections change
  useEffect(() => {
    if (!playerAId || !playerBId || playerAId === playerBId) {
      setRivalryStats(null);
      return;
    }

    // 1. Find frames where both Player A and Player B participated in Free For All,
    // or were on opposing teams in Team Mode.
    // To make it simple: let's filter completed frames where BOTH players participated
    const sharedFrameIds = new Set<string>();
    
    // Group players by frame ID
    const playersByFrame: Record<string, string[]> = {};
    framePlayers.forEach(fp => {
      if (!playersByFrame[fp.frame_id]) {
        playersByFrame[fp.frame_id] = [];
      }
      playersByFrame[fp.frame_id].push(fp.player_id);
    });

    Object.entries(playersByFrame).forEach(([frameId, playerIds]) => {
      if (playerIds.includes(playerAId) && playerIds.includes(playerBId)) {
        sharedFrameIds.add(frameId);
      }
    });

    const sharedFrames = frames.filter(f => f.status === 'completed' && sharedFrameIds.has(f.id));

    let playerAWins = 0;
    let playerBWins = 0;
    let draws = 0;
    let biggestVictoryA = 0;
    let biggestVictoryB = 0;
    const historyList: any[] = [];

    sharedFrames.forEach((frame, idx) => {
      // Get scores for A and B in this frame
      const frameEvents = events.filter(e => e.frame_id === frame.id);
      
      // Filter undos
      const undoneIds = new Set<string>();
      frameEvents.forEach(e => {
        if (e.event_type === 'undo' && e.metadata?.undoes_event_id) {
          undoneIds.add(e.metadata.undoes_event_id);
        }
      });
      const activeEvents = frameEvents.filter(e => !undoneIds.has(e.id));

      let scoreA = 0;
      let scoreB = 0;

      activeEvents.forEach(e => {
        if (e.event_type === 'pot' && e.player_id === playerAId) {
          scoreA += e.points;
        } else if (e.event_type === 'pot' && e.player_id === playerBId) {
          scoreB += e.points;
        }
        // If foul, opponents get points
        else if (e.event_type === 'foul') {
          // If A fouled, B gets points
          if (e.player_id === playerAId) {
            scoreB += Math.max(4, e.points);
          }
          // If B fouled, A gets points
          else if (e.player_id === playerBId) {
            scoreA += Math.max(4, e.points);
          }
        }
      });

      // Check frame winner
      let winnerId: string | null = null;
      if (frame.winner_id === playerAId) {
        playerAWins++;
        winnerId = playerAId;
        const margin = scoreA - scoreB;
        if (margin > biggestVictoryA) biggestVictoryA = margin;
      } else if (frame.winner_id === playerBId) {
        playerBWins++;
        winnerId = playerBId;
        const margin = scoreB - scoreA;
        if (margin > biggestVictoryB) biggestVictoryB = margin;
      } else {
        draws++;
      }

      historyList.push({
        frameNum: idx + 1,
        winnerId,
        scoreA,
        scoreB,
        date: new Date(frame.created_at).toLocaleDateString(),
      });
    });

    setRivalryStats({
      matchesPlayed: sharedFrames.length,
      playerAWins,
      playerBWins,
      draws,
      biggestVictoryA,
      biggestVictoryB,
      history: historyList.reverse(), // most recent first
    });

  }, [playerAId, playerBId, frames, framePlayers, events]);

  if (loading) {
    return <div className="py-16 text-center text-xs text-zinc-400">Loading rivalries database...</div>;
  }

  const playerA = players.find(p => p.id === playerAId);
  const playerB = players.find(p => p.id === playerBId);

  const winRateA = rivalryStats && rivalryStats.matchesPlayed > 0
    ? Math.round((rivalryStats.playerAWins / rivalryStats.matchesPlayed) * 100)
    : 0;

  const winRateB = rivalryStats && rivalryStats.matchesPlayed > 0
    ? Math.round((rivalryStats.playerBWins / rivalryStats.matchesPlayed) * 100)
    : 0;

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
        <Swords className="text-emerald-500" size={20} />
        <div>
          <h2 className="text-lg font-bold">Rivalry System</h2>
          <p className="text-xs text-zinc-500">Track head-to-head match histories and bragging rights.</p>
        </div>
      </div>

      {/* Selectors card */}
      <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-2">Player A</label>
            <Select
              value={playerAId}
              onChange={e => setPlayerAId(e.target.value)}
              className="border-zinc-200 dark:border-zinc-800"
            >
              <option value="">Select player...</option>
              {players.map(p => (
                <option key={p.id} value={p.id} disabled={p.id === playerBId}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-2">Player B</label>
            <Select
              value={playerBId}
              onChange={e => setPlayerBId(e.target.value)}
              className="border-zinc-200 dark:border-zinc-800"
            >
              <option value="">Select player...</option>
              {players.map(p => (
                <option key={p.id} value={p.id} disabled={p.id === playerAId}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* H2H Statistics Panel */}
      {playerA && playerB && rivalryStats ? (
        <div className="space-y-6">
          
          {/* Comparison summary card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            
            {/* Player A Stats card */}
            <Card className="p-6 text-center border-blue-500/10 bg-blue-500/5">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold text-xl mx-auto shadow-md shadow-blue-500/10">
                {playerA.name.charAt(0)}
              </div>
              <h4 className="font-bold text-base mt-3 truncate">{playerA.name}</h4>
              <div className="text-xs text-zinc-500 mt-1">ELO {playerA.elo_rating}</div>
              
              <div className="mt-4 pt-4 border-t border-zinc-200/40 space-y-2">
                <div className="flex justify-between items-center text-xs text-zinc-500">
                  <span>Head-to-head Wins</span>
                  <span className="font-bold font-mono text-zinc-800 dark:text-zinc-100">{rivalryStats.playerAWins}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-zinc-500">
                  <span>Win Rate</span>
                  <span className="font-bold font-mono text-zinc-800 dark:text-zinc-100">{winRateA}%</span>
                </div>
                <div className="flex justify-between items-center text-xs text-zinc-500">
                  <span>Biggest Win Margin</span>
                  <span className="font-bold font-mono text-zinc-800 dark:text-zinc-100">+{rivalryStats.biggestVictoryA} pts</span>
                </div>
              </div>
            </Card>

            {/* Mid comparison metric */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 font-bold text-sm mx-auto shadow-inner">
                VS
              </div>
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                {rivalryStats.matchesPlayed} Matches Played
              </div>
              {rivalryStats.draws > 0 && (
                <Badge variant="default" className="bg-zinc-800 text-zinc-400 text-[10px] py-0 px-2.5">
                  {rivalryStats.draws} Draws / Abandons
                </Badge>
              )}
            </div>

            {/* Player B Stats card */}
            <Card className="p-6 text-center border-orange-500/10 bg-orange-500/5">
              <div className="w-12 h-12 bg-orange-600 text-white rounded-xl flex items-center justify-center font-bold text-xl mx-auto shadow-md shadow-orange-500/10">
                {playerB.name.charAt(0)}
              </div>
              <h4 className="font-bold text-base mt-3 truncate">{playerB.name}</h4>
              <div className="text-xs text-zinc-500 mt-1">ELO {playerB.elo_rating}</div>

              <div className="mt-4 pt-4 border-t border-zinc-200/40 space-y-2">
                <div className="flex justify-between items-center text-xs text-zinc-500">
                  <span>Head-to-head Wins</span>
                  <span className="font-bold font-mono text-zinc-800 dark:text-zinc-100">{rivalryStats.playerBWins}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-zinc-500">
                  <span>Win Rate</span>
                  <span className="font-bold font-mono text-zinc-800 dark:text-zinc-100">{winRateB}%</span>
                </div>
                <div className="flex justify-between items-center text-xs text-zinc-500">
                  <span>Biggest Win Margin</span>
                  <span className="font-bold font-mono text-zinc-800 dark:text-zinc-100">+{rivalryStats.biggestVictoryB} pts</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Historical match breakdown table */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="bg-zinc-50 dark:bg-zinc-900 px-5 py-3 border-b border-zinc-100 dark:border-zinc-900">
              <h4 className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">Chronological Rivalry Matches</h4>
            </div>
            <CardContent className="p-0">
              {rivalryStats.history.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-400 italic">No head-to-head frames logged yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Match</TableHead>
                      <TableHead>{playerA.name} Score</TableHead>
                      <TableHead>{playerB.name} Score</TableHead>
                      <TableHead className="text-center">Outcome</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rivalryStats.history.map((h, idx) => {
                      const isWinnerA = h.winnerId === playerAId;
                      const isWinnerB = h.winnerId === playerBId;

                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-bold text-zinc-500 font-mono">#{rivalryStats.history.length - idx}</TableCell>
                          <TableCell className={`font-mono ${isWinnerA ? 'font-extrabold text-blue-600 dark:text-blue-400' : 'text-zinc-500'}`}>
                            {h.scoreA} {isWinnerA && '👑'}
                          </TableCell>
                          <TableCell className={`font-mono ${isWinnerB ? 'font-extrabold text-orange-600 dark:text-orange-400' : 'text-zinc-500'}`}>
                            {h.scoreB} {isWinnerB && '👑'}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-xs">
                            {h.winnerId === null && <Badge variant="default">Draw</Badge>}
                            {isWinnerA && <Badge variant="default" className="bg-blue-500/10 text-blue-500 border-none">A Won</Badge>}
                            {isWinnerB && <Badge variant="default" className="bg-orange-500/10 text-orange-500 border-none">B Won</Badge>}
                          </TableCell>
                          <TableCell className="text-right text-xs text-zinc-500 font-mono">{h.date}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-dashed border-zinc-800 bg-zinc-900/10 py-16 text-center">
          <CardContent className="flex flex-col items-center justify-center space-y-2 text-zinc-500 text-sm">
            <Swords size={28} />
            <p>Please select two separate players to view head-to-head rivalry analytics.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
