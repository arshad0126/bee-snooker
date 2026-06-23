'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMatchStore, Player } from '@/lib/store';
import { getSupabaseClient } from '@/lib/supabase';
import { announceEvent } from '@/lib/announcer';
import { Button, Card, Dialog, Input, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui';
import { SetupFlow } from '@/components/match/SetupFlow';
import { ScoreBoard } from '@/components/match/ScoreBoard';
import { ControllerPanel } from '@/components/match/ControllerPanel';
import { MathematicalPanel } from '@/components/match/MathematicalPanel';
import { TimelinePanel } from '@/components/match/TimelinePanel';
import { StopCircle, Loader2, ArrowLeft, ClipboardList, X, BarChart3, Trophy } from 'lucide-react';


export default function ActiveSession() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const sessionId = params.sessionId as string;

  // Zustand Actions
  const {
    deviceId,
    activeFrame,
    framePlayers,
    frameEvents,
    scores,
    teamScores,
    activePlayerId,
    redsRemaining,
    currentColorOn,
    pointsRemaining,
    isFrameSecured,
    statusText,
    requiresSnookers,
    isController,
    isRealtimeConnected,
    undoTimerActive,
    lastActionAt,
    frameAnalytics,
    currentBreak,
    
    initializeDevice,
    setupFrame,
    recordPot,
    recordFoul,
    recordPassTurn,
    triggerUndo,
    resetFrame,
    endFrame,
    endSession,
    subscribeToFrameEvents,
  } = useMatchStore();

  // Local Page States
  const [groupPlayers, setGroupPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [endSessionOpen, setEndSessionOpen] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [frameSummaryData, setFrameSummaryData] = useState<{
    winnerName: string;
    mode: 'free_for_all' | 'team';
    duration: string;
    players: { name: string; score: number; stats?: any }[];
    notes?: string;
  } | null>(null);

  // Helper to format seconds to MM:SS
  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleEndFrame = async (winnerId?: string, winnerTeam?: 'team_a' | 'team_b', notes?: string) => {
    if (!activeFrame) return;

    // 1. Gather stats before resetting state
    const winnerName = activeFrame.mode === 'team'
      ? (winnerTeam === 'team_a' ? 'Team A' : 'Team B')
      : (framePlayers.find(fp => fp.player_id === winnerId)?.player.name || 'Unknown Player');

    // Calculate total duration from frame events
    let totalSeconds = 0;
    const undoneEventIds = new Set<string>();
    frameEvents.forEach(e => {
      if (e.event_type === 'undo' && e.metadata?.undoes_event_id) {
        undoneEventIds.add(e.metadata.undoes_event_id);
        undoneEventIds.add(e.id);
      }
    });
    frameEvents.forEach(e => {
      if (!undoneEventIds.has(e.id) && e.event_type !== 'undo') {
        totalSeconds += e.metadata?.duration_seconds || 0;
      }
    });

    const summaryPlayers = framePlayers.map(fp => ({
      name: fp.player.name,
      score: scores[fp.player_id] || 0,
      stats: frameAnalytics[fp.player_id],
    }));

    setFrameSummaryData({
      winnerName,
      mode: activeFrame.mode,
      duration: formatTime(totalSeconds),
      players: summaryPlayers,
      notes,
    });

    // 2. Call store endFrame
    await endFrame(winnerId, winnerTeam, notes);
  };

  // Fetch all players in the group
  const fetchGroupPlayers = async () => {
    setLoadingPlayers(true);
    try {
      const client = getSupabaseClient();
      const { data } = await client
        .from('players')
        .select('*')
        .eq('group_id', groupId)
        .eq('status', 'active');
      
      setGroupPlayers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPlayers(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchGroupPlayers();
      initializeDevice(groupId);
    }
  }, [groupId]);

  // Subscribe to active frame events
  useEffect(() => {
    if (activeFrame?.id) {
      const unsubscribe = subscribeToFrameEvents(activeFrame.id);
      return () => unsubscribe();
    }
  }, [activeFrame?.id]);

  // Speech announcer tracking
  const prevEventsLength = useRef(frameEvents.length);
  
  useEffect(() => {
    if (frameEvents.length === prevEventsLength.current + 1) {
      const lastEvent = frameEvents[frameEvents.length - 1];
      announceEvent(frameEvents, lastEvent, framePlayers, scores);
    }
    prevEventsLength.current = frameEvents.length;
  }, [frameEvents, framePlayers, scores]);

  // Add a new player inline
  const handleAddPlayer = async (name: string): Promise<Player> => {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('players')
      .insert({
        group_id: groupId,
        name,
        status: 'active',
        elo_rating: 1000,
      })
      .select()
      .single();

    if (error) throw error;
    setGroupPlayers(prev => [...prev, data]);
    return data;
  };

  const handleStartMatch = async (config: {
    redsCount: number;
    mode: 'free_for_all' | 'team';
    players: { id: string; play_order: number; team_id?: 'team_a' | 'team_b'; is_breaker: boolean }[];
  }) => {
    try {
      await setupFrame(sessionId, config.redsCount, config.mode, config.players);
    } catch (err) {
      alert('Failed to start frame.');
    }
  };

  const handleEndSession = async () => {
    try {
      await endSession(sessionId, sessionNotes);
      setEndSessionOpen(false);
      router.push(`/group/${groupId}/session/${sessionId}/summary`);
    } catch (err) {
      alert('Failed to end session.');
    }
  };

  const activePlayer = framePlayers.find(p => p.player_id === activePlayerId)?.player;
  const activePlayerName = activePlayer ? activePlayer.name : 'Unknown';
  const groupPlayersLookup = framePlayers.map(fp => fp.player);

  return (
    <div className="space-y-3 landscape-compact active-scoring-page" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      
      {/* Active Session Header */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-900 pb-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push(`/group/${groupId}`)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-400">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-sm font-bold">Active Gathering</h2>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">
                {isRealtimeConnected ? 'Synced' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Analytics toggle */}
          {activeFrame && (
            <button
              onClick={() => setAnalyticsOpen(true)}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 transition-all"
              title="Time Analytics"
            >
              <BarChart3 size={15} />
            </button>
          )}
          {/* Timeline drawer toggle (visible on mobile/landscape) */}
          {activeFrame && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 transition-all"
              title="Show Timeline"
            >
              <ClipboardList size={15} />
            </button>
          )}
          <Button
            variant="danger"
            onClick={() => setEndSessionOpen(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] py-1.5 px-3 font-bold flex gap-1 shrink-0"
          >
            <StopCircle size={13} />
            End
          </Button>
        </div>
      </div>

      {/* Frame setup versus active Match Controller */}
      {!activeFrame ? (
        loadingPlayers ? (
          <div className="py-16 text-center text-zinc-400 flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin text-emerald-500" />
            <span>Loading player list...</span>
          </div>
        ) : (
          <SetupFlow
            availablePlayers={groupPlayers}
            onAddPlayer={handleAddPlayer}
            onStartMatch={handleStartMatch}
          />
        )
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3">
          
          {/* Main Game Interface — mobile-first split layout */}
          <div className="lg:col-span-2 scoring-layout-container">
            
            {/* Left Column: Scoreboard + Info Strip */}
            <div className="scoring-layout-left space-y-2">
              <ScoreBoard
                mode={activeFrame.mode}
                players={framePlayers}
                scores={scores}
                teamScores={teamScores}
                activePlayerId={activePlayerId}
                requiresSnookers={requiresSnookers}
                lastActionAt={lastActionAt}
                frameAnalytics={frameAnalytics}
                currentBreak={currentBreak}
              />

              <MathematicalPanel
                redsRemaining={redsRemaining}
                pointsRemaining={pointsRemaining}
                isFrameSecured={isFrameSecured}
                statusText={statusText}
                currentColorOn={currentColorOn}
                activePlayerName={activePlayerName}
              />
            </div>

            {/* Right Column: Scoring Controls */}
            <div className="scoring-layout-right">
              <ControllerPanel
                activePlayerName={activePlayerName}
                activePlayerId={activePlayerId || ''}
                isController={isController}
                currentColorOn={currentColorOn}
                undoTimerActive={undoTimerActive}
                onRecordPot={recordPot}
                onRecordFoul={recordFoul}
                onRecordPass={recordPassTurn}
                onUndo={triggerUndo}
                onResetFrame={resetFrame}
                onEndFrame={handleEndFrame}
                players={framePlayers.map(p => ({
                  id: p.player_id,
                  name: p.player.name,
                  team_id: p.team_id,
                }))}
                mode={activeFrame.mode}
              />
            </div>
          </div>

          {/* Sidebar — Desktop only (hidden on mobile, accessible via drawer) */}
          <div className="hidden lg:block space-y-3">
            <TimelinePanel events={frameEvents} players={groupPlayersLookup} />
            
            {/* Controller status */}
            <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm p-3">
              <div className="text-[10px] uppercase font-bold text-zinc-400">Device Authority</div>
              <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                {isController ? 'Write Access' : 'Spectator'}
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {isController ? 'This device controls scoring.' : 'Score updates sync in real time.'}
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* ===== Mobile Timeline Drawer ===== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl animate-drawer-in flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Timeline & Log</span>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TimelinePanel events={frameEvents} players={groupPlayersLookup} />
            </div>
            <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
              <Card className="border-zinc-200 dark:border-zinc-800 p-2.5">
                <div className="text-[10px] uppercase font-bold text-zinc-400">Device</div>
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {isController ? 'Write Access' : 'Spectator'}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* END SESSION DIALOG */}
      <Dialog isOpen={endSessionOpen} onClose={() => setEndSessionOpen(false)} title="End Session Gathering">
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 bg-rose-100 dark:bg-rose-950/30 text-rose-600 rounded-full flex items-center justify-center">
            <StopCircle size={24} />
          </div>
          <div className="text-center">
            <h4 className="font-bold text-sm">Finish and archive session?</h4>
            <p className="text-xs text-zinc-500 mt-1">
              This will calculate session leaders, award ELO ranking adjustments, and log achievements.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-450 mb-2">Session Summary Notes</label>
            <Input
              placeholder="e.g. Great frame comebacks, fun night!"
              value={sessionNotes}
              onChange={e => setSessionNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <Button variant="outline" className="grow" onClick={() => setEndSessionOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="grow" onClick={handleEndSession}>
              End & Generate Story
            </Button>
          </div>
        </div>
      </Dialog>

      {/* TIME ANALYTICS DIALOG */}
      <Dialog isOpen={analyticsOpen} onClose={() => setAnalyticsOpen(false)} title="Player Time Analytics">
        <div className="space-y-4 font-sans select-none">
          <div className="text-xs text-zinc-550 dark:text-zinc-400">
            Track thinking times, averages, and table visits for the active frame.
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] uppercase font-bold py-2 px-2.5">Player</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold py-2 px-2.5 text-center">Visits</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold py-2 px-2.5 text-center">Total Time</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold py-2 px-2.5 text-center">Avg Shot</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold py-2 px-2.5 text-center">Fastest/Slowest</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold py-2 px-2.5 text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {framePlayers.map(fp => {
                  const stats = frameAnalytics[fp.player_id];
                  const timeStr = stats ? formatTime(stats.totalTime) : '00:00';
                  const avgStr = stats && stats.averageShot > 0 ? `${stats.averageShot.toFixed(1)}s` : '-';
                  const fastestStr = stats && stats.fastestShot !== Infinity && stats.fastestShot > 0 ? `${stats.fastestShot.toFixed(1)}s` : '-';
                  const slowestStr = stats && stats.slowestShot > 0 ? `${stats.slowestShot.toFixed(1)}s` : '-';
                  const visits = stats ? stats.visits : 0;
                  const share = stats ? stats.share : 0;

                  return (
                    <TableRow key={fp.player_id}>
                      <TableCell className="text-xs font-bold py-2 px-2.5 truncate max-w-[90px]">{fp.player.name}</TableCell>
                      <TableCell className="text-xs py-2 px-2.5 text-center font-mono">{visits}</TableCell>
                      <TableCell className="text-xs py-2 px-2.5 text-center font-mono">{timeStr}</TableCell>
                      <TableCell className="text-xs py-2 px-2.5 text-center font-mono">{avgStr}</TableCell>
                      <TableCell className="text-[10px] py-2 px-2.5 text-center font-mono text-zinc-450 dark:text-zinc-500">
                        {fastestStr} / {slowestStr}
                      </TableCell>
                      <TableCell className="text-xs py-2 px-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-450">
                        {share}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={() => setAnalyticsOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* FRAME SUMMARY RECEIPT DIALOG */}
      <Dialog 
        isOpen={frameSummaryData !== null} 
        onClose={() => setFrameSummaryData(null)} 
        title="Frame Completed Summary"
      >
        {frameSummaryData && (
          <div className="space-y-4 font-sans select-none">
            <div className="text-center py-2">
              <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-600 rounded-full mb-2">
                <Trophy size={28} />
              </div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                {frameSummaryData.winnerName} Wins!
              </h3>
              <p className="text-xs text-zinc-450 dark:text-zinc-500 mt-0.5">
                Frame Duration: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{frameSummaryData.duration}</span>
              </p>
              {frameSummaryData.notes && (
                <p className="text-xs text-zinc-550 dark:text-zinc-400 italic mt-1 bg-zinc-55 dark:bg-zinc-900/50 p-2 rounded-lg border border-zinc-100 dark:border-zinc-900">
                  &ldquo;{frameSummaryData.notes}&rdquo;
                </p>
              )}
            </div>

            <div className="border-t border-b border-zinc-100 dark:border-zinc-900 py-3 space-y-2.5">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-zinc-450 dark:text-zinc-555 mb-1">Player Statistics</h4>
              {frameSummaryData.players.map(p => {
                const totalT = p.stats ? formatTime(p.stats.totalTime) : '00:00';
                const avgS = p.stats && p.stats.averageShot > 0 ? `${p.stats.averageShot.toFixed(1)}s` : '-';
                const fastS = p.stats && p.stats.fastestShot !== Infinity && p.stats.fastestShot > 0 ? `${p.stats.fastestShot.toFixed(1)}s` : '-';
                const slowS = p.stats && p.stats.slowestShot > 0 ? `${p.stats.slowestShot.toFixed(1)}s` : '-';
                const visits = p.stats ? p.stats.visits : 0;
                const share = p.stats ? p.stats.share : 0;

                return (
                  <div key={p.name} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-900">
                    <div>
                      <div className="font-bold text-zinc-800 dark:text-zinc-200">{p.name}</div>
                      <div className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-0.5 font-medium">
                        Avg: {avgS} • Visits: {visits} • Shot: {fastS} to {slowS}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-sm text-zinc-800 dark:text-zinc-200">{p.score} pts</div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{totalT} ({share}%)</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex pt-2">
              <Button 
                variant="primary" 
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                onClick={() => setFrameSummaryData(null)}
              >
                Close & Start Next Frame
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
