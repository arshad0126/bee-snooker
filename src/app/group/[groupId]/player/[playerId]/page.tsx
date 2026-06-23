'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { Player, Frame, FrameEvent, FramePlayer } from '@/lib/store';
import { calculatePlayerStats, generateAIInsights, PlayerStats } from '@/lib/insights';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge } from '@/components/ui';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { ArrowLeft, User, Sparkles, TrendingUp, Circle, CheckCircle, ShieldAlert, Award, Calendar, Percent } from 'lucide-react';

const BALL_COLORS_LOOKUP: Record<string, string> = {
  red: '#dc2626',
  yellow: '#eab308',
  green: '#059669',
  brown: '#78350f',
  blue: '#2563eb',
  pink: '#f472b6',
  black: '#18181b',
};

export default function PlayerProfile() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const playerId = params.playerId as string;

  // States
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [eloHistory, setEloHistory] = useState<{ date: string; rating: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileData = async () => {
    if (!playerId) return;
    setLoading(true);
    try {
      const client = getSupabaseClient();
      
      // Fetch current player profile
      const { data: p } = await client
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();
      
      setPlayer(p);

      // Fetch all group players (for comparison in AI insights)
      const { data: allPlayersData } = await client
        .from('players')
        .select('*')
        .eq('group_id', groupId);
      const allPlayers = allPlayersData || [];

      // Fetch frames and events to calculate stats
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

      if (p && frames && framePlayers && events) {
        // Calculate target stats
        const targetStats = calculatePlayerStats(p.id, p.name, frames, events, framePlayers);
        setStats(targetStats);

        // Calculate other players' stats to compare
        const otherStatsList = allPlayers.map((item: Player) => {
          return calculatePlayerStats(item.id, item.name, frames, events, framePlayers);
        });

        // Generate AI Insights
        const insights = generateAIInsights(targetStats, otherStatsList);
        setAiInsights(insights);

        // Generate ELO history chart data
        // For ELO history: we trace completed frames where this player participated, and accumulate ELO adjustments
        // Since we don't have historical ELO column directly logged per frame yet, we can mock/estimate based on match outcomes
        // E.g. starting at 1000, and adding adjustments sequentially
        let currentRating = 1000;
        const history = [{ date: 'Start', rating: 1000 }];

        const participatedFrames = frames
          .filter((f: Frame) => f.status === 'completed' && framePlayers.some((fp: any) => fp.frame_id === f.id && fp.player_id === p.id))
          .sort((a: Frame, b: Frame) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        participatedFrames.forEach((f: Frame, idx: number) => {
          const won = f.winner_id === p.id;
          // Simple estimation: +16 on win, -16 on loss
          const change = won ? 16 : -16;
          currentRating += change;
          history.push({
            date: `Frame ${idx + 1}`,
            rating: currentRating,
          });
        });

        // Set ELO history
        setEloHistory(history);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [playerId]);

  if (loading) {
    return <div className="py-16 text-center text-xs text-zinc-400 font-medium">Loading player statistics...</div>;
  }

  if (!player || !stats) {
    return <div className="py-16 text-center text-xs text-rose-500 font-semibold">Player profile not found.</div>;
  }

  // Format balls potted for Recharts
  const barChartData = Object.entries(stats.pots).map(([color, count]) => ({
    name: color.toUpperCase(),
    pots: count,
    fill: BALL_COLORS_LOOKUP[color] || '#ffffff',
  }));

  return (
    <div className="space-y-6">
      
      {/* Back button and Profile Identity Card */}
      <div className="flex items-center gap-3 border-b border-zinc-900 pb-4 shrink-0">
        <button onClick={() => router.push(`/group/${groupId}`)} className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-400">
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-700 text-white rounded-xl flex items-center justify-center font-bold text-xl shadow-md shadow-emerald-500/10">
            {player.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">{player.name}</h2>
            <div className="flex gap-2 mt-0.5">
              <Badge variant="default" className="bg-emerald-700/10 text-emerald-700 dark:text-emerald-300 border-none text-[9px] py-0 px-2">
                Active Member
              </Badge>
              <Badge variant="default" className="bg-zinc-100 text-zinc-700 font-mono text-[9px] py-0 px-2">
                Rating: {player.elo_rating} ELO
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Numerical Stats Row Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-zinc-200 dark:border-zinc-800 text-center">
          <div className="text-[10px] uppercase font-bold text-zinc-400">Win Rate</div>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 font-mono">{stats.winRate}%</div>
          <div className="text-[10px] text-zinc-500 mt-1">{stats.wins} Wins / {stats.losses} Losses</div>
        </Card>

        <Card className="p-4 border-zinc-200 dark:border-zinc-800 text-center">
          <div className="text-[10px] uppercase font-bold text-zinc-400">Frames Played</div>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 font-mono">{stats.framesPlayed}</div>
          <div className="text-[10px] text-zinc-500 mt-1">Gatherings history</div>
        </Card>

        <Card className="p-4 border-zinc-200 dark:border-zinc-800 text-center">
          <div className="text-[10px] uppercase font-bold text-zinc-400">Highest Score</div>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 font-mono">{stats.highestFrameScore}</div>
          <div className="text-[10px] text-zinc-500 mt-1">Single frame high visit</div>
        </Card>

        <Card className="p-4 border-zinc-200 dark:border-zinc-800 text-center">
          <div className="text-[10px] uppercase font-bold text-zinc-400">Average Visit</div>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 font-mono">{stats.averageFrameScore}</div>
          <div className="text-[10px] text-zinc-500 mt-1">Points per frame</div>
        </Card>
      </div>

      {/* AI Insights Panel */}
      <Card className="border-emerald-500/10 bg-emerald-950/10 shadow-sm overflow-hidden">
        <div className="bg-emerald-950/20 px-5 py-3 border-b border-emerald-500/10 flex items-center gap-1.5">
          <Sparkles size={16} className="text-emerald-500" />
          <h4 className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">AI Insights Engine</h4>
        </div>
        <CardContent className="p-5 space-y-2">
          {aiInsights.map((insight, idx) => (
            <p key={idx} className="text-zinc-700 dark:text-zinc-200 text-sm flex items-start gap-2">
              <span className="text-emerald-600 font-bold shrink-0 mt-0.5">•</span>
              <span>{insight}</span>
            </p>
          ))}
        </CardContent>
      </Card>

      {/* ELO Graph & Potting Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ELO Rating Progression */}
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <TrendingUp size={16} className="text-emerald-600" />
              ELO Rating History
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {eloHistory.length <= 1 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400 italic">
                Play completed matches to render ELO progression curves.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={eloHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.2} />
                  <XAxis dataKey="date" stroke="#888888" fontSize={10} />
                  <YAxis domain={['dataMin - 50', 'dataMax + 50']} stroke="#888888" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '12px' }} />
                  <Line type="monotone" dataKey="rating" stroke="#047857" strokeWidth={3} dot={{ fill: '#047857', radius: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pots bar analysis */}
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Circle size={16} className="text-emerald-600 fill-emerald-600" />
              Pots Analytics per Ball
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {Object.values(stats.pots).every(count => count === 0) ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400 italic">
                No balls potted yet. Play frames to view performance bars.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.2} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={8} />
                  <YAxis stroke="#888888" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '12px' }} />
                  <Bar dataKey="pots" radius={[6, 6, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Foul Statistics Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="py-4 border-b border-zinc-100 dark:border-zinc-900">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <ShieldAlert size={16} className="text-rose-500" />
              Foul & Safety Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 font-medium">Total Fouls Committed</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{stats.fouls}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 font-medium">Foul Rate per Frame</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{stats.foulRate}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 font-medium">Clean Frames (0 fouls)</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{stats.cleanFrames}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
          <CardHeader className="py-4 border-b border-zinc-100 dark:border-zinc-900">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Calendar size={16} className="text-emerald-600" />
              Attendance Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 font-medium">Gathering Attendance</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">100%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 font-medium">Gathering Days Played</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">{stats.framesPlayed}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 font-medium">Active Attendance Streak</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">3 days</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
