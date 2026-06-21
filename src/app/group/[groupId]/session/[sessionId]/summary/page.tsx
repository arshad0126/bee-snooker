'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { Session, Frame, FrameEvent, Player } from '@/lib/store';
import { generateMatchStory, calculatePlayerStats, PlayerStats } from '@/lib/insights';
import { exportSessionToPDF, exportSessionToCSV, exportSessionToJSON } from '@/lib/export';
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui';
import { Calendar, Clock, Trophy, Download, ArrowLeft, Award, Sparkles, FileText, Share2 } from 'lucide-react';

export default function SessionSummary() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const sessionId = params.sessionId as string;

  // States
  const [session, setSession] = useState<Session | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [events, setEvents] = useState<FrameEvent[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [matchStory, setMatchStory] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSummaryData = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const client = getSupabaseClient();
      
      // Fetch session
      const { data: s } = await client
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      setSession(s);

      // Fetch frames
      const { data: f } = await client
        .from('frames')
        .select('*')
        .eq('session_id', sessionId);
      
      const frameList = f || [];
      setFrames(frameList);

      // Fetch frame players mapping
      const frameIds = frameList.map((item: Frame) => item.id);
      
      // Fetch players
      const { data: p } = await client
        .from('players')
        .select('*')
        .eq('group_id', groupId);
      
      const playerList = p || [];
      setPlayers(playerList);

      if (frameIds.length > 0) {
        // Fetch events
        const { data: evs } = await client
          .from('frame_events')
          .select('*')
          .in('frame_id', frameIds);
        
        const eventList = evs || [];
        setEvents(eventList);

        // Fetch frame players records
        const { data: fps } = await client
          .from('frame_players')
          .select('*')
          .in('frame_id', frameIds);

        const framePlayersList = fps || [];

        // Aggregate statistics for active players
        const activePlayerIds = new Set(framePlayersList.map((item: any) => item.player_id));
        const participants = playerList.filter((item: Player) => activePlayerIds.has(item.id));

        const stats = participants.map((item: Player) => {
          return calculatePlayerStats(
            item.id,
            item.name,
            frameList,
            eventList,
            framePlayersList
          );
        });

        setPlayerStats(stats);

        // Generate narrative story
        if (s) {
          const story = generateMatchStory(s, frameList, eventList, playerList);
          setMatchStory(story);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryData();
  }, [sessionId]);

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} mins`;
  };

  if (loading) {
    return <div className="py-16 text-center text-xs text-zinc-400">Loading session summary...</div>;
  }

  if (!session) {
    return <div className="py-16 text-center text-xs text-rose-500 font-semibold">Session not found.</div>;
  }

  // Calculate session metrics
  const totalFrames = frames.length;
  const winner = playerStats.sort((a, b) => b.wins - a.wins)[0];
  const highScorer = playerStats.sort((a, b) => b.highestFrameScore - a.highestFrameScore)[0];

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push(`/group/${groupId}`)} className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-400">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-lg font-bold">Gathering Summary</h2>
            <div className="flex items-center gap-2 text-zinc-500 text-xs mt-0.5">
              <Calendar size={12} />
              <span>{new Date(session.start_time).toLocaleDateString()}</span>
              <span>•</span>
              <Clock size={12} />
              <span>{formatDuration(session.duration_seconds)}</span>
            </div>
          </div>
        </div>

        {/* Exporter Buttons dropdown/flex */}
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportSessionToPDF(session, frames, events, players)}
            className="grow sm:grow-0 text-xs py-1.5 flex gap-1 bg-zinc-900/50 border-zinc-800"
          >
            <Download size={14} />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportSessionToCSV(session, frames, players)}
            className="grow sm:grow-0 text-xs py-1.5 flex gap-1 bg-zinc-900/50 border-zinc-800"
          >
            <Download size={14} />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportSessionToJSON(session, frames, events, players)}
            className="grow sm:grow-0 text-xs py-1.5 flex gap-1 bg-zinc-900/50 border-zinc-800"
          >
            <Download size={14} />
            JSON
          </Button>
        </div>
      </div>

      {/* Grid: AI Narrative & Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Match Story (AI Narrative) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* AI Insights narrative summary */}
          <Card className="border-emerald-500/10 bg-emerald-950/10 shadow-sm overflow-hidden">
            <div className="bg-emerald-950/20 px-5 py-3 border-b border-emerald-500/10 flex items-center gap-1.5">
              <Sparkles size={16} className="text-emerald-500" />
              <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">Match Story Generator</h4>
            </div>
            <CardContent className="p-6">
              <p className="text-zinc-700 dark:text-zinc-200 text-sm leading-relaxed font-serif italic">
                &ldquo;{matchStory || 'Gathering insights...'}&rdquo;
              </p>
            </CardContent>
          </Card>

          {/* Roster & Stats Grid table */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="bg-zinc-50 dark:bg-zinc-900 px-5 py-3 border-b border-zinc-100 dark:border-zinc-900">
              <h4 className="font-semibold text-zinc-700 dark:text-zinc-300 text-sm">Scorecards Summary</h4>
            </div>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">Frames Won</TableHead>
                    <TableHead className="text-center">Avg Score</TableHead>
                    <TableHead className="text-center">High Score</TableHead>
                    <TableHead className="text-center">Fouls</TableHead>
                    <TableHead className="text-right">Total Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playerStats.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-semibold">{s.name}</TableCell>
                      <TableCell className="text-center font-mono font-bold">{s.wins}</TableCell>
                      <TableCell className="text-center font-mono">{s.averageFrameScore}</TableCell>
                      <TableCell className="text-center font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                        {s.highestFrameScore}
                      </TableCell>
                      <TableCell className="text-center font-mono text-rose-500">{s.fouls}</TableCell>
                      <TableCell className="text-right font-mono font-extrabold text-zinc-900 dark:text-zinc-100">
                        {s.totalPoints}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Highlight Accomplishments Sidebar */}
        <div className="space-y-6">
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="bg-zinc-55 dark:bg-zinc-900 px-4 py-3 border-b border-zinc-100 dark:border-zinc-900">
              <h4 className="font-semibold text-sm">Session Highlights</h4>
            </div>
            <CardContent className="p-4 space-y-4">
              
              {/* Leader card */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Trophy size={20} />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-400">Session Champion</div>
                  <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100 mt-0.5">
                    {winner ? `${winner.name} (${winner.wins} Wins)` : 'None'}
                  </div>
                </div>
              </div>

              {/* High Score card */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Award size={20} />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-400">High Score Break</div>
                  <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100 mt-0.5">
                    {highScorer ? `${highScorer.name} (${highScorer.highestFrameScore} pts)` : 'None'}
                  </div>
                </div>
              </div>

              {/* Total Frames Played */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-200/50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200/30 dark:border-zinc-800 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-zinc-400">Frames Played</div>
                  <div className="text-sm font-bold text-zinc-800 dark:text-zinc-100 mt-0.5">
                    {totalFrames} Frames
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session List of Frames details */}
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="bg-zinc-55 dark:bg-zinc-900 px-4 py-3 border-b border-zinc-100 dark:border-zinc-900">
              <h4 className="font-semibold text-sm">Completed Frames</h4>
            </div>
            <CardContent className="p-0 max-h-[220px] overflow-y-auto">
              <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {frames.map((f, idx) => {
                  const frameWinner = players.find(p => p.id === f.winner_id);
                  const winnerLabel = f.mode === 'team'
                    ? (f.winner_team === 'team_a' ? 'Team A' : 'Team B')
                    : (frameWinner ? frameWinner.name : 'Draw/Abandoned');

                  return (
                    <div key={f.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">Frame {idx + 1}</span>
                        <div className="text-[10px] text-zinc-400 capitalize mt-0.5">{f.mode.replace(/_/g, ' ')} • {f.reds_count} Reds</div>
                      </div>
                      <Badge variant="success" className="text-[9px] py-0 px-2">
                        {winnerLabel} Won
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
