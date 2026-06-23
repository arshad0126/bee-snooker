'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMatchStore, Player } from '@/lib/store';
import { getSupabaseClient } from '@/lib/supabase';
import { announceEvent } from '@/lib/announcer';
import { Button, Card, Dialog, Input, Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Select } from '@/components/ui';
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

  // Zustand Actions & State
  const {
    deviceId,
    activeGroup,
    activeSession,
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
    visitStartAt,
    
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
  
  // Landscape scoring page states
  const [isLandscape, setIsLandscape] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  
  // End Frame dialog state
  const [endFrameDialogOpen, setEndFrameDialogOpen] = useState(false);
  const [frameWinnerId, setFrameWinnerId] = useState('');
  const [frameWinnerTeam, setFrameWinnerTeam] = useState<'team_a' | 'team_b'>('team_a');
  const [frameNotes, setFrameNotes] = useState('');

  // Frame summary receipt & YES/NO flow states
  const [frameSummaryData, setFrameSummaryData] = useState<{
    winnerName: string;
    mode: 'free_for_all' | 'team';
    duration: string;
    players: { name: string; score: number; stats?: any }[];
    notes?: string;
  } | null>(null);

  const [lastFrameConfig, setLastFrameConfig] = useState<{
    redsCount: number;
    mode: 'free_for_all' | 'team';
    players: { id: string; play_order: number; team_id?: 'team_a' | 'team_b' }[];
  } | null>(null);

  const [breakerSelectionOpen, setBreakerSelectionOpen] = useState(false);
  const [selectedBreakerId, setSelectedBreakerId] = useState('');
  
  // Frame counts & wins state
  const [completedFramesCount, setCompletedFramesCount] = useState(0);
  const [frameWins, setFrameWins] = useState<Record<string, number>>({});

  // Helper to format seconds to MM:SS
  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Detect orientation for Match Mode
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Fetch completed frames count and wins in the current session
  const fetchFrameWins = async () => {
    if (!sessionId) return;
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('frames')
        .select(`
          id,
          winner_id,
          winner_team,
          frame_players (
            player_id,
            team_id
          )
        `)
        .eq('session_id', sessionId)
        .eq('status', 'completed');
      
      if (error) throw error;

      const wins: Record<string, number> = {};
      (data as any[])?.forEach((f: any) => {
        if (f.winner_id) {
          wins[f.winner_id] = (wins[f.winner_id] || 0) + 1;
        } else if (f.winner_team && f.frame_players) {
          const fps = f.frame_players as any[];
          fps.forEach((fp: any) => {
            if (fp.team_id === f.winner_team) {
              wins[fp.player_id] = (wins[fp.player_id] || 0) + 1;
            }
          });
        }
      });
      setFrameWins(wins);
    } catch (e) {
      console.error('Failed to fetch frame wins:', e);
    }
  };

  const fetchSessionFramesCount = async () => {
    if (!sessionId) return;
    try {
      const client = getSupabaseClient();
      const { count, error } = await client
        .from('frames')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('status', 'completed');
      
      if (!error && count !== null) {
        setCompletedFramesCount(count);
      }
    } catch (e) {
      console.error('Failed to fetch frames count:', e);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchFrameWins();
      fetchSessionFramesCount();
    }
  }, [sessionId, activeFrame?.id]);

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

    // Save previous frame config for YES flow
    const configPlayers = framePlayers.map(fp => ({
      id: fp.player_id,
      play_order: fp.play_order,
      team_id: fp.team_id,
    }));
    setLastFrameConfig({
      redsCount: activeFrame.reds_count,
      mode: activeFrame.mode,
      players: configPlayers,
    });

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

  const handleOpenEndFrameDialog = () => {
    if (!activeFrame) return;

    if (activeFrame.mode === 'team') {
      const winnerTeam = teamScores.team_a >= teamScores.team_b ? 'team_a' : 'team_b';
      setFrameWinnerTeam(winnerTeam);
    } else {
      let highestScore = -1;
      let winnerId = activePlayerId || '';
      
      framePlayers.forEach(p => {
        const score = scores[p.player_id] || 0;
        if (score > highestScore) {
          highestScore = score;
          winnerId = p.player_id;
        }
      });
      
      setFrameWinnerId(winnerId);
    }
    setEndFrameDialogOpen(true);
  };

  const handleEndFrameSubmit = async () => {
    if (!activeFrame) return;
    setEndFrameDialogOpen(false);
    
    await handleEndFrame(
      activeFrame.mode === 'team' ? undefined : frameWinnerId,
      activeFrame.mode === 'team' ? frameWinnerTeam : undefined,
      frameNotes
    );
    // Reset inputs
    setFrameNotes('');
  };

  const handleStartNextFrame = async () => {
    if (!lastFrameConfig || !selectedBreakerId) return;
    
    const config = {
      redsCount: lastFrameConfig.redsCount,
      mode: lastFrameConfig.mode,
      players: lastFrameConfig.players.map(p => ({
        ...p,
        is_breaker: p.id === selectedBreakerId,
      })),
    };
    
    try {
      await setupFrame(sessionId, config.redsCount, config.mode, config.players);
      // Close summary and selection views
      setFrameSummaryData(null);
      setBreakerSelectionOpen(false);
      setSelectedBreakerId('');
    } catch (err) {
      alert('Failed to start next frame.');
    }
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
      // Save configuration for easy restarts
      const configPlayers = config.players.map(p => ({
        id: p.id,
        play_order: p.play_order,
        team_id: p.team_id,
      }));
      setLastFrameConfig({
        redsCount: config.redsCount,
        mode: config.mode,
        players: configPlayers,
      });

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

  // =====================================================================
  // 1. LANDSCAPE MODE ONLY — Dedicate Match Scoring Screen
  // =====================================================================
  if (activeFrame) {
    return (
      <div className="fixed inset-0 bg-zinc-950 text-zinc-100 flex flex-col justify-between p-3 select-none active-scoring-page z-40 overflow-hidden font-sans">
        
        {/* Landscape orientation warning overlay */}
        {!isLandscape && (
          <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center text-center p-6 text-white select-none">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <svg className="w-8 h-8 animate-[spin_4s_linear_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <path d="M12 18h.01" />
                <path d="M17 5H7" />
              </svg>
            </div>
            <h3 className="text-lg font-black tracking-tight text-emerald-400 mb-1">Landscape Mode Required</h3>
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
              Please rotate your device to landscape mode to continue scoring.
            </p>
          </div>
        )}

        {/* Top Row */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-2 shrink-0">
          <div className="flex items-center gap-3">
            {/* Frame Count */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded text-xs font-black text-emerald-450">
              Frame {completedFramesCount + 1}
            </div>
            {/* Session Name & Sync Status */}
            <div className="flex flex-col">
              <h2 className="text-xs font-black text-zinc-300 truncate max-w-[150px]">
                {activeGroup?.name || 'Active Match'}
              </h2>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span className="text-[8px] text-zinc-500 uppercase tracking-wider font-mono font-bold leading-none">
                  {isRealtimeConnected ? 'Synced' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAnalyticsOpen(true)}
              className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-400 transition-all"
              title="Time Analytics"
            >
              <BarChart3 size={14} />
            </button>
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 text-zinc-400 transition-all"
              title="Show Timeline"
            >
              <ClipboardList size={14} />
            </button>
            <Button
              variant="outline"
              onClick={handleOpenEndFrameDialog}
              className="border-rose-500/20 hover:bg-rose-500/10 text-rose-400 text-[10px] font-black py-1 px-2.5 h-7 rounded flex items-center gap-1 cursor-pointer"
            >
              End Frame
            </Button>
          </div>
        </div>

        {/* Scoreboard Row */}
        <div className="grow flex items-center py-1 overflow-hidden min-h-[96px]">
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
            frameWins={frameWins}
            visitStartAt={visitStartAt}
          />
        </div>

        {/* Frame Status Row */}
        <div className="shrink-0 py-1">
          <MathematicalPanel
            redsRemaining={redsRemaining}
            pointsRemaining={pointsRemaining}
            isFrameSecured={isFrameSecured}
            statusText={statusText}
            currentColorOn={currentColorOn}
            activePlayerName={activePlayerName}
          />
        </div>

        {/* Ball Grid & Actions */}
        <div className="shrink-0 pt-1">
          <ControllerPanel
            activePlayerId={activePlayerId || ''}
            isController={isController}
            currentColorOn={currentColorOn}
            undoTimerActive={undoTimerActive}
            onRecordPot={recordPot}
            onRecordFoul={recordFoul}
            onRecordPass={recordPassTurn}
            onUndo={triggerUndo}
            onResetFrame={resetFrame}
            players={framePlayers.map(p => ({
              id: p.player_id,
              name: p.player.name,
              team_id: p.team_id,
            }))}
            mode={activeFrame.mode}
          />
        </div>

        {/* Mobile Timeline Drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-zinc-800 shrink-0">
                <span className="text-xs font-black uppercase text-zinc-350 tracking-wider">Timeline & Log</span>
                <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400">
                  <X size={15} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <TimelinePanel events={frameEvents} players={groupPlayersLookup} />
              </div>
            </div>
          </div>
        )}

        {/* TIME ANALYTICS DIALOG */}
        <Dialog isOpen={analyticsOpen} onClose={() => setAnalyticsOpen(false)} title="Player Time Analytics">
          <div className="space-y-4 font-sans select-none text-zinc-900 dark:text-zinc-100">
            <div className="text-xs text-zinc-500 dark:text-zinc-450">
              Track visits and table times for the active frame.
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-bold py-2 px-2">Player</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold py-2 px-2 text-center">Visits</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold py-2 px-2 text-center">Total Time</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold py-2 px-2 text-center">Avg Shot</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold py-2 px-2 text-center">Avg Visit</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold py-2 px-2 text-right">Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {framePlayers.map(fp => {
                    const stats = frameAnalytics[fp.player_id];
                    const timeStr = stats ? formatTime(stats.totalTime) : '00:00';
                    const avgShotStr = stats && stats.averageShot > 0 ? `${stats.averageShot.toFixed(1)}s` : '-';
                    const avgVisitStr = stats && stats.averageVisit && stats.averageVisit > 0 ? `${stats.averageVisit.toFixed(1)}s` : '-';
                    const visits = stats ? stats.visits : 0;
                    const share = stats ? stats.share : 0;

                    return (
                      <TableRow key={fp.player_id}>
                        <TableCell className="text-xs font-bold py-2 px-2 truncate max-w-[80px]">{fp.player.name}</TableCell>
                        <TableCell className="text-xs py-2 px-2 text-center font-mono">{visits}</TableCell>
                        <TableCell className="text-xs py-2 px-2 text-center font-mono">{timeStr}</TableCell>
                        <TableCell className="text-xs py-2 px-2 text-center font-mono">{avgShotStr}</TableCell>
                        <TableCell className="text-xs py-2 px-2 text-center font-mono">{avgVisitStr}</TableCell>
                        <TableCell className="text-xs py-2 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-450">
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

        {/* END FRAME DIALOG */}
        <Dialog isOpen={endFrameDialogOpen} onClose={() => setEndFrameDialogOpen(false)} title="Complete Frame">
          <div className="space-y-4 text-zinc-900 dark:text-zinc-100">
            {activeFrame.mode === 'team' ? (
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-450 mb-2">Winning Team</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFrameWinnerTeam('team_a')}
                    className={`py-3 rounded-xl border text-center font-bold text-sm transition-all ${
                      frameWinnerTeam === 'team_a'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-850 dark:text-emerald-400'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                    }`}
                  >
                    TEAM A
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrameWinnerTeam('team_b')}
                    className={`py-3 rounded-xl border text-center font-bold text-sm transition-all ${
                      frameWinnerTeam === 'team_b'
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-850 dark:text-emerald-455'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'
                    }`}
                  >
                    TEAM B
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-455 mb-2">Winner Player</label>
                <Select
                  value={frameWinnerId}
                  onChange={e => setFrameWinnerId(e.target.value)}
                >
                  {framePlayers.map(p => (
                    <option key={p.player_id} value={p.player_id}>
                      {p.player.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-zinc-455 mb-2">Frame Summary Notes</label>
              <Input
                placeholder="e.g. Black ball finish, Great comeback"
                value={frameNotes}
                onChange={e => setFrameNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-zinc-150 dark:border-zinc-850">
              <Button variant="outline" className="grow h-12" onClick={() => setEndFrameDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" className="grow bg-emerald-700 hover:bg-emerald-800 text-white h-12" onClick={handleEndFrameSubmit}>
                Save & Complete
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    );
  }

  // =====================================================================
  // 2. PORTRAIT MODE — Setup Flow & Frame Complete Receipt
  // =====================================================================
  return (
    <div 
      className="space-y-4 max-w-md mx-auto p-4 active-scoring-page min-h-screen flex flex-col justify-between select-none" 
      style={{ 
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', 
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)' 
      }}
    >
      {frameSummaryData ? (
        // Frame Completed Screen
        <div className="space-y-4 flex-1 flex flex-col justify-between py-6 animate-fade-in">
          <div className="text-center">
            <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-600 rounded-full mb-3 animate-bounce">
              <Trophy size={32} />
            </div>
            <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
              {frameSummaryData.winnerName} Wins!
            </h3>
            <p className="text-xs text-zinc-450 dark:text-zinc-500 mt-1">
              Duration: <span className="font-bold text-zinc-700 dark:text-zinc-300">{frameSummaryData.duration}</span>
            </p>
            {frameSummaryData.notes && (
              <p className="text-xs text-zinc-550 dark:text-zinc-400 italic mt-2 bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                &ldquo;{frameSummaryData.notes}&rdquo;
              </p>
            )}
          </div>

          <div className="border-t border-b border-zinc-200 dark:border-zinc-800 py-3 flex-1 overflow-y-auto max-h-[220px] space-y-2 pr-1">
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 mb-1">Player Statistics</h4>
            {frameSummaryData.players.map(p => {
              const totalT = p.stats ? formatTime(p.stats.totalTime) : '00:00';
              const avgS = p.stats && p.stats.averageShot > 0 ? `${p.stats.averageShot.toFixed(1)}s` : '-';
              const fastS = p.stats && p.stats.fastestShot !== Infinity && p.stats.fastestShot > 0 ? `${p.stats.fastestShot.toFixed(1)}s` : '-';
              const slowS = p.stats && p.stats.slowestShot > 0 ? `${p.stats.slowestShot.toFixed(1)}s` : '-';
              const visits = p.stats ? p.stats.visits : 0;
              const share = p.stats ? p.stats.share : 0;

              return (
                <div key={p.name} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-850">
                  <div>
                    <div className="font-bold text-zinc-800 dark:text-zinc-200">{p.name}</div>
                    <div className="text-[9px] text-zinc-400 mt-0.5">
                      Avg: {avgS} • Visits: {visits} • Shot: {fastS} to {slowS}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{p.score} pts</div>
                    <div className="text-[9px] text-zinc-400 mt-0.5">{totalT} ({share}%)</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* YES/NO Start Another Frame Flow */}
          {!breakerSelectionOpen ? (
            <div className="space-y-3">
              <div className="text-center text-xs font-bold text-zinc-700 dark:text-zinc-350">
                Start another frame?
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="primary"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-12"
                  onClick={() => {
                    setBreakerSelectionOpen(true);
                    if (lastFrameConfig && lastFrameConfig.players.length > 0) {
                      setSelectedBreakerId(lastFrameConfig.players[0].id);
                    }
                  }}
                >
                  YES
                </Button>
                <Button
                  variant="secondary"
                  className="font-bold h-12"
                  onClick={() => {
                    setFrameSummaryData(null);
                  }}
                >
                  NO
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-2">Who breaks this frame?</label>
                <div className="space-y-1.5">
                  {lastFrameConfig?.players.map(p => {
                    const name = groupPlayers.find(gp => gp.id === p.id)?.name || p.id;
                    const isSelected = selectedBreakerId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedBreakerId(p.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-sm font-semibold transition-all ${
                          isSelected
                            ? 'border-emerald-605 bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-900 dark:text-emerald-350'
                            : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-55 text-zinc-650 dark:text-zinc-350'
                        }`}
                      >
                        <span>{name}</span>
                        {isSelected && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Select</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => setBreakerSelectionOpen(false)}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-11"
                  onClick={handleStartNextFrame}
                  disabled={!selectedBreakerId}
                >
                  Start Frame
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Standard Setup view
        <div className="flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-900 pb-3 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => router.push(`/group/${groupId}`)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-400">
                <ArrowLeft size={16} />
              </button>
              <div>
                <h2 className="text-sm font-bold">Active Session</h2>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">
                    {isRealtimeConnected ? 'Synced' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="danger"
              onClick={() => setEndSessionOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] py-1.5 px-3 font-bold flex gap-1 shrink-0"
            >
              <StopCircle size={13} />
              End Session
            </Button>
          </div>

          <div className="flex-1">
            {loadingPlayers ? (
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
            )}
          </div>
        </div>
      )}

      {/* END SESSION DIALOG */}
      <Dialog isOpen={endSessionOpen} onClose={() => setEndSessionOpen(false)} title="End Session Gathering">
        <div className="space-y-4 text-zinc-900 dark:text-zinc-100 font-sans">
          <div className="mx-auto w-12 h-12 bg-rose-100 dark:bg-rose-950/30 text-rose-600 rounded-full flex items-center justify-center">
            <StopCircle size={24} />
          </div>
          <div className="text-center">
            <h4 className="font-bold text-sm">Finish and archive session?</h4>
            <p className="text-xs text-zinc-550 dark:text-zinc-500 mt-1">
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

          <div className="flex gap-3 pt-4 border-t border-zinc-150 dark:border-zinc-850">
            <Button variant="outline" className="grow" onClick={() => setEndSessionOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="grow" onClick={handleEndSession}>
              End & Save
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
