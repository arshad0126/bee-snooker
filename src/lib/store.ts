import { create } from 'zustand';
import { supabase, getSupabaseClient } from './supabase';
import { calculatePointsRemaining, evaluateFrameStatus, BALL_VALUES, COLOR_SEQUENCE } from './snooker';

export interface Player {
  id: string;
  name: string;
  photo_url?: string;
  status: 'active' | 'inactive';
  elo_rating: number;
}

export interface Group {
  id: string;
  name: string;
  secret_code: string;
}

export interface Session {
  id: string;
  group_id: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  photos: string[];
  notes?: string;
}

export interface Frame {
  id: string;
  session_id: string;
  reds_count: number;
  mode: 'free_for_all' | 'team';
  status: 'active' | 'completed';
  winner_id?: string;
  winner_team?: 'team_a' | 'team_b';
  notes?: string;
  created_at: string;
}

export interface FramePlayer {
  frame_id: string;
  player_id: string;
  play_order: number;
  team_id?: 'team_a' | 'team_b';
  is_breaker: boolean;
}

export interface FrameEvent {
  id: string;
  frame_id: string;
  player_id?: string;
  event_type: 'pot' | 'foul' | 'undo' | 'end_frame' | 'reset_frame' | 'pass_turn';
  ball?: 'red' | 'yellow' | 'green' | 'brown' | 'blue' | 'pink' | 'black';
  points: number;
  sequence_no: number;
  device_info: string;
  created_at: string;
  metadata?: {
    undoes_event_id?: string;
    red_pocketed?: boolean;
  };
}

export interface MatchState {
  // Authentication & Device Details
  deviceId: string;
  activeGroup: Group | null;
  activeSession: Session | null;
  activeFrame: Frame | null;
  framePlayers: (FramePlayer & { player: Player })[];
  frameEvents: FrameEvent[];
  
  // Realtime Status
  isController: boolean;
  controllerDeviceId: string | null;
  isRealtimeConnected: boolean;

  // Calculated Match State (Derived via Reducer)
  scores: Record<string, number>; // player_id -> score
  teamScores: { team_a: number; team_b: number };
  activePlayerId: string | null;
  redsRemaining: number;
  currentColorOn: string | null; // 'red', 'yellow', 'green', etc.
  pointsRemaining: number;
  isFrameSecured: boolean;
  statusText: string;
  requiresSnookers: Record<string, boolean>;

  // Undo protection timer state
  lastEventId: string | null;
  undoTimerActive: boolean;

  // Actions
  initializeDevice: (groupId: string) => Promise<void>;
  setGroup: (group: Group) => void;
  startSession: (groupId: string) => Promise<string>;
  endSession: (sessionId: string, notes?: string) => Promise<void>;
  setupFrame: (
    sessionId: string,
    redsCount: number,
    mode: 'free_for_all' | 'team',
    players: { id: string; play_order: number; team_id?: 'team_a' | 'team_b'; is_breaker: boolean }[]
  ) => Promise<string>;
  
  // Event-Sourced Frame Scorers
  recordPot: (playerId: string, ball: string) => Promise<void>;
  recordFoul: (playerId: string, ball: string, customPoints?: number, metadata?: any) => Promise<void>;
  recordPassTurn: (playerId: string) => Promise<void>;
  triggerUndo: () => Promise<void>;
  resetFrame: () => Promise<void>;
  endFrame: (winnerId?: string, winnerTeam?: 'team_a' | 'team_b', notes?: string) => Promise<void>;

  // Realtime syncing
  subscribeToFrameEvents: (frameId: string) => () => void;
  syncControllerStatus: (groupId: string) => Promise<void>;
  claimController: () => Promise<void>;
  transferController: (targetDeviceId: string) => Promise<void>;
}

// Helper to get or create device_id
const getOrCreateDeviceId = (): string => {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('bee_snooker_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('bee_snooker_device_id', id);
  }
  return id;
};

export const useMatchStore = create<MatchState>((set, get) => {
  
  // Re-calculates score card and game state from raw frameEvents
  const reduceFrameState = (
    events: FrameEvent[],
    frame: Frame | null,
    fPlayers: (FramePlayer & { player: Player })[]
  ) => {
    if (!frame || fPlayers.length === 0) {
      return {
        scores: {},
        teamScores: { team_a: 0, team_b: 0 },
        activePlayerId: null,
        redsRemaining: frame ? frame.reds_count : 15,
        currentColorOn: 'red',
        pointsRemaining: 147,
        isFrameSecured: false,
        requiresSnookers: {},
        statusText: 'Frame setup incomplete',
      };
    }

    // 1. Filter out undone events
    const undoneEventIds = new Set<string>();
    events.forEach(e => {
      if (e.event_type === 'undo' && e.metadata?.undoes_event_id) {
        undoneEventIds.add(e.metadata.undoes_event_id);
        undoneEventIds.add(e.id);
      }
    });

    const activeEvents = events
      .filter(e => !undoneEventIds.has(e.id) && e.event_type !== 'undo')
      .sort((a, b) => a.sequence_no - b.sequence_no);

    // 2. Initialize accumulator states
    const scores: Record<string, number> = {};
    fPlayers.forEach(fp => {
      scores[fp.player_id] = 0;
    });

    const teamScores = { team_a: 0, team_b: 0 };
    
    // Sort players by order to establish rotation
    const sortedPlayers = [...fPlayers].sort((a, b) => a.play_order - b.play_order);
    
    // Find breaker
    const breaker = sortedPlayers.find(p => p.is_breaker) || sortedPlayers[0];
    let activePlayerId = breaker ? breaker.player_id : null;
    let redsRemaining = frame.reds_count;
    
    // Snooker state tracking
    // Turn logic: we need to track if we are expecting a RED or a COLOR
    // After potting a Red, the player MUST play a Color.
    // If they pot a Color, they must play a Red (if reds remaining > 0)
    let expecting: 'red' | 'color' | 'clearance' = redsRemaining > 0 ? 'red' : 'clearance';
    let clearanceColorIndex = 0; // Index in COLOR_SEQUENCE: 'yellow' (2), 'green' (3), etc.

    // 3. Process events sequentially
    activeEvents.forEach(event => {
      const pId = event.player_id || activePlayerId;
      if (!pId) return;

      // Ensure score slot exists
      if (scores[pId] === undefined) scores[pId] = 0;

      const playerMapping = fPlayers.find(fp => fp.player_id === pId);
      const teamId = playerMapping?.team_id;

      if (event.event_type === 'pot') {
        const ball = event.ball || 'red';
        const val = BALL_VALUES[ball] || 0;
        
        // Add points
        scores[pId] += val;
        if (teamId) {
          teamScores[teamId] += val;
        }

        // Adjust board state
        if (ball === 'red') {
          redsRemaining = Math.max(0, redsRemaining - 1);
          expecting = 'color';
        } else {
          // Color potted
          if (expecting === 'color') {
            expecting = redsRemaining > 0 ? 'red' : 'clearance';
            clearanceColorIndex = 0;
          } else if (expecting === 'clearance') {
            // Colors clearance sequence
            const expectedColor = COLOR_SEQUENCE[clearanceColorIndex];
            if (ball === expectedColor) {
              clearanceColorIndex++;
            }
          }
        }
        // Player potted, so they KEEP the turn. Active player does not change.
        activePlayerId = pId;

      } else if (event.event_type === 'foul') {
        const ball = event.ball || 'red';
        // Foul points: minimum of 4 points, or value of ball involved, whichever is higher
        const ballVal = BALL_VALUES[ball] || 0;
        const foulVal = Math.max(4, ballVal, event.points);

        // In Snooker, foul points are awarded to opponents
        if (frame.mode === 'team') {
          // Add to opposing team
          const opposingTeam: 'team_a' | 'team_b' = teamId === 'team_a' ? 'team_b' : 'team_a';
          teamScores[opposingTeam] += foulVal;
          // Award to first player on opposing team (or split, but let's assign to opposing team active players)
          const opponent = sortedPlayers.find(p => p.team_id === opposingTeam);
          if (opponent) {
            scores[opponent.player_id] += foulVal;
          }
        } else {
          // Free for all: award to all OTHER players
          fPlayers.forEach(fp => {
            if (fp.player_id !== pId) {
              scores[fp.player_id] += foulVal;
            }
          });
        }

        // Foul ends the turn. Advance to next player.
        activePlayerId = getNextPlayerInRotation(pId, sortedPlayers, frame.mode);
        
        // Decrement red ball count if pocketed during foul
        if (event.metadata?.red_pocketed) {
          redsRemaining = Math.max(0, redsRemaining - 1);
        }

        // After a foul, we expect a RED (if any left) or the current clearance color
        expecting = redsRemaining > 0 ? 'red' : 'clearance';

      } else if (event.event_type === 'pass_turn') {
        // Just advance turn
        activePlayerId = getNextPlayerInRotation(pId, sortedPlayers, frame.mode);
        expecting = redsRemaining > 0 ? 'red' : 'clearance';
      }
    });

    // 4. Calculate points remaining
    let currentColorOn: string | null = 'red';
    let pointsRemaining = 0;

    if (redsRemaining > 0) {
      currentColorOn = (expecting as string) === 'color' ? 'color' : 'red';
      pointsRemaining = calculatePointsRemaining(redsRemaining, 'yellow');
    } else {
      const nextColor = COLOR_SEQUENCE[clearanceColorIndex] || null;
      currentColorOn = nextColor;
      pointsRemaining = calculatePointsRemaining(0, nextColor);
    }

    // 5. Evaluate winning status
    const playersList = fPlayers.map(fp => ({ id: fp.player_id, name: fp.player.name }));
    const evaluation = evaluateFrameStatus(scores, playersList, pointsRemaining);

    return {
      scores,
      teamScores,
      activePlayerId,
      redsRemaining,
      currentColorOn,
      pointsRemaining,
      isFrameSecured: evaluation.isSecured,
      requiresSnookers: evaluation.requiresSnookers,
      statusText: evaluation.statusText,
    };
  };

  // Helper to rotate active player
  const getNextPlayerInRotation = (
    currentId: string,
    sortedPlayers: (FramePlayer & { player: Player })[],
    mode: 'free_for_all' | 'team'
  ): string => {
    const currentIndex = sortedPlayers.findIndex(p => p.player_id === currentId);
    if (currentIndex === -1) return sortedPlayers[0]?.player_id || currentId;

    if (mode === 'free_for_all' || sortedPlayers.length < 4) {
      // Direct rotation
      const nextIndex = (currentIndex + 1) % sortedPlayers.length;
      return sortedPlayers[nextIndex].player_id;
    } else {
      // Team rotation: Team A P1 -> Team B P1 -> Team A P2 -> Team B P2
      // Let's assume order is pre-validated in frame_players.play_order.
      const nextIndex = (currentIndex + 1) % sortedPlayers.length;
      return sortedPlayers[nextIndex].player_id;
    }
  };

  return {
    // Initial states
    deviceId: getOrCreateDeviceId(),
    activeGroup: null,
    activeSession: null,
    activeFrame: null,
    framePlayers: [],
    frameEvents: [],
    
    isController: false,
    controllerDeviceId: null,
    isRealtimeConnected: false,

    scores: {},
    teamScores: { team_a: 0, team_b: 0 },
    activePlayerId: null,
    redsRemaining: 15,
    currentColorOn: 'red',
    pointsRemaining: 147,
    isFrameSecured: false,
    requiresSnookers: {},
    statusText: '',
    
    lastEventId: null,
    undoTimerActive: false,

    // Actions
    setGroup: (group: Group) => {
      set({ activeGroup: group });
      if (typeof window !== 'undefined') {
        localStorage.setItem('bee_snooker_active_group', JSON.stringify(group));
      }
    },

    initializeDevice: async (groupId: string) => {
      const devId = getOrCreateDeviceId();
      set({ deviceId: devId });

      // Fetch group details
      const client = getSupabaseClient();
      const { data: group } = await client
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();
      
      if (group) {
        set({ activeGroup: group });
        if (typeof window !== 'undefined') {
          localStorage.setItem('bee_snooker_active_group', JSON.stringify(group));
        }
      }

      await get().syncControllerStatus(groupId);
    },

    syncControllerStatus: async (groupId: string) => {
      const client = getSupabaseClient();
      const { data: controllerRec } = await client
        .from('device_controllers')
        .select('*')
        .eq('group_id', groupId)
        .single();

      const devId = get().deviceId;

      if (controllerRec) {
        set({
          controllerDeviceId: controllerRec.controller_device_id,
          isController: controllerRec.controller_device_id === devId,
        });
      } else {
        // No controller registered, auto-claim
        await get().claimController();
      }
    },

    claimController: async () => {
      const group = get().activeGroup;
      if (!group) return;

      const devId = get().deviceId;
      const client = getSupabaseClient();

      const { error } = await client
        .from('device_controllers')
        .upsert({
          group_id: group.id,
          controller_device_id: devId,
          updated_at: new Date().toISOString(),
        });

      if (!error) {
        set({
          controllerDeviceId: devId,
          isController: true,
        });
      }
    },

    transferController: async (targetDeviceId: string) => {
      const group = get().activeGroup;
      if (!group) return;

      const client = getSupabaseClient();
      const { error } = await client
        .from('device_controllers')
        .update({
          controller_device_id: targetDeviceId,
          updated_at: new Date().toISOString(),
        })
        .eq('group_id', group.id);

      if (!error) {
        set({
          controllerDeviceId: targetDeviceId,
          isController: false,
        });
      }
    },

    startSession: async (groupId: string) => {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from('sessions')
        .insert({
          group_id: groupId,
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      set({ activeSession: data, activeFrame: null, frameEvents: [], framePlayers: [] });
      return data.id;
    },

    endSession: async (sessionId: string, notes?: string) => {
      const client = getSupabaseClient();
      const start = get().activeSession?.start_time;
      let durationSeconds = 0;
      
      if (start) {
        durationSeconds = Math.round((Date.now() - new Date(start).getTime()) / 1000);
      }

      const { error } = await client
        .from('sessions')
        .update({
          end_time: new Date().toISOString(),
          duration_seconds: durationSeconds,
          notes: notes || null,
        })
        .eq('id', sessionId);

      if (error) throw error;
      set({ activeSession: null, activeFrame: null, frameEvents: [], framePlayers: [] });
    },

    setupFrame: async (sessionId, redsCount, mode, players) => {
      const client = getSupabaseClient();
      
      // 1. Create Frame record
      const { data: frame, error: frameError } = await client
        .from('frames')
        .insert({
          session_id: sessionId,
          reds_count: redsCount,
          mode,
          status: 'active',
        })
        .select()
        .single();

      if (frameError) throw frameError;

      // 2. Insert player mapping records
      const playersMapping = players.map(p => ({
        frame_id: frame.id,
        player_id: p.id,
        play_order: p.play_order,
        team_id: p.team_id || null,
        is_breaker: p.is_breaker,
      }));

      const { error: playersError } = await client
        .from('frame_players')
        .insert(playersMapping);

      if (playersError) throw playersError;

      // 3. Query details with profiles joined
      const { data: playersWithProfiles } = await client
        .from('frame_players')
        .select('*, player:players(*)')
        .eq('frame_id', frame.id);

      const fPlayers = (playersWithProfiles || []) as (FramePlayer & { player: Player })[];

      const reduced = reduceFrameState([], frame, fPlayers);

      set({
        activeFrame: frame,
        framePlayers: fPlayers,
        frameEvents: [],
        ...reduced,
      });

      return frame.id;
    },

    recordPot: async (playerId: string, ball: string) => {
      const frame = get().activeFrame;
      if (!frame || !get().isController) return;

      const client = getSupabaseClient();
      const seqNo = get().frameEvents.length + 1;
      
      const { data: event, error } = await client
        .from('frame_events')
        .insert({
          frame_id: frame.id,
          player_id: playerId,
          event_type: 'pot',
          ball: ball as any,
          points: BALL_VALUES[ball] || 0,
          sequence_no: seqNo,
          device_info: `Controller (${get().deviceId.slice(0,6)})`,
        })
        .select()
        .single();

      if (error) throw error;

      // Update state locally (Realtime channel also fires, but local update keeps it responsive)
      const updatedEvents = [...get().frameEvents, event];
      const reduced = reduceFrameState(updatedEvents, frame, get().framePlayers);
      
      set({
        frameEvents: updatedEvents,
        lastEventId: event.id,
        undoTimerActive: true,
        ...reduced,
      });

      // Clear undo protection timer after 10s
      setTimeout(() => {
        if (get().lastEventId === event.id) {
          set({ undoTimerActive: false });
        }
      }, 10000);
    },

    recordFoul: async (playerId: string, ball: string, customPoints?: number, metadata?: any) => {
      const frame = get().activeFrame;
      if (!frame || !get().isController) return;

      const client = getSupabaseClient();
      const seqNo = get().frameEvents.length + 1;
      const basePoints = BALL_VALUES[ball] || 4;
      const points = customPoints !== undefined ? customPoints : Math.max(4, basePoints);

      const { data: event, error } = await client
        .from('frame_events')
        .insert({
          frame_id: frame.id,
          player_id: playerId,
          event_type: 'foul',
          ball: ball as any,
          points,
          sequence_no: seqNo,
          device_info: `Controller (${get().deviceId.slice(0,6)})`,
          metadata: metadata || null,
        })
        .select()
        .single();

      if (error) throw error;

      const updatedEvents = [...get().frameEvents, event];
      const reduced = reduceFrameState(updatedEvents, frame, get().framePlayers);

      set({
        frameEvents: updatedEvents,
        lastEventId: event.id,
        undoTimerActive: true,
        ...reduced,
      });

      setTimeout(() => {
        if (get().lastEventId === event.id) {
          set({ undoTimerActive: false });
        }
      }, 10000);
    },

    recordPassTurn: async (playerId: string) => {
      const frame = get().activeFrame;
      if (!frame || !get().isController) return;

      const client = getSupabaseClient();
      const seqNo = get().frameEvents.length + 1;

      const { data: event, error } = await client
        .from('frame_events')
        .insert({
          frame_id: frame.id,
          player_id: playerId,
          event_type: 'pass_turn',
          points: 0,
          sequence_no: seqNo,
          device_info: `Controller (${get().deviceId.slice(0,6)})`,
        })
        .select()
        .single();

      if (error) throw error;

      const updatedEvents = [...get().frameEvents, event];
      const reduced = reduceFrameState(updatedEvents, frame, get().framePlayers);

      set({
        frameEvents: updatedEvents,
        lastEventId: event.id,
        undoTimerActive: true,
        ...reduced,
      });

      setTimeout(() => {
        if (get().lastEventId === event.id) {
          set({ undoTimerActive: false });
        }
      }, 10000);
    },

    triggerUndo: async () => {
      const frame = get().activeFrame;
      const lastId = get().lastEventId;
      if (!frame || !lastId || !get().isController) return;

      const client = getSupabaseClient();
      const seqNo = get().frameEvents.length + 1;

      const { data: undoEvent, error } = await client
        .from('frame_events')
        .insert({
          frame_id: frame.id,
          event_type: 'undo',
          points: 0,
          sequence_no: seqNo,
          device_info: `Controller (${get().deviceId.slice(0,6)})`,
          metadata: {
            undoes_event_id: lastId,
          },
        })
        .select()
        .single();

      if (error) throw error;

      const updatedEvents = [...get().frameEvents, undoEvent];
      const reduced = reduceFrameState(updatedEvents, frame, get().framePlayers);

      set({
        frameEvents: updatedEvents,
        lastEventId: null,
        undoTimerActive: false,
        ...reduced,
      });
    },

    resetFrame: async () => {
      const frame = get().activeFrame;
      if (!frame || !get().isController) return;

      const client = getSupabaseClient();
      
      // Reset is essentially dropping/deleting all events or writing a massive reset event.
      // Deleting events for the frame is cleaner for reset.
      const { error } = await client
        .from('frame_events')
        .delete()
        .eq('frame_id', frame.id);

      if (error) throw error;

      set({
        frameEvents: [],
        lastEventId: null,
        undoTimerActive: false,
        scores: {},
        teamScores: { team_a: 0, team_b: 0 },
        activePlayerId: get().framePlayers.find(p => p.is_breaker)?.player_id || null,
        redsRemaining: frame.reds_count,
        currentColorOn: 'red',
        pointsRemaining: calculatePointsRemaining(frame.reds_count, 'yellow'),
        isFrameSecured: false,
        requiresSnookers: {},
        statusText: 'Frame reset. Play breaks off.',
      });
    },

    endFrame: async (winnerId, winnerTeam, notes) => {
      const frame = get().activeFrame;
      if (!frame || !get().isController) return;

      const client = getSupabaseClient();
      const resolvedWinnerId = winnerId || get().activePlayerId || null;

      const { error } = await client
        .from('frames')
        .update({
          status: 'completed',
          winner_id: resolvedWinnerId,
          winner_team: winnerTeam || null,
          notes: notes || null,
        })
        .eq('id', frame.id);

      if (error) throw error;

      // Adjust ELO rankings in the background for active frame completion
      // We will perform ELO updates in our page logic or custom RPC
      set({
        activeFrame: null,
        frameEvents: [],
        framePlayers: [],
      });
    },

    subscribeToFrameEvents: (frameId: string) => {
      const client = getSupabaseClient();

      const channel = client
        .channel(`frame-events:${frameId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'frame_events',
            filter: `frame_id=eq.${frameId}`,
          },
          async (payload: any) => {
            // Re-fetch all events to ensure consistency and correct sorting
            const { data: events } = await client
              .from('frame_events')
              .select('*')
              .eq('frame_id', frameId)
              .order('sequence_no', { ascending: true });

            if (events) {
              const frame = get().activeFrame;
              const fPlayers = get().framePlayers;
              const reduced = reduceFrameState(events, frame, fPlayers);
              
              set({
                frameEvents: events,
                ...reduced,
              });
            }
          }
        )
        .subscribe((status: any) => {
          set({ isRealtimeConnected: status === 'SUBSCRIBED' });
        });

      return () => {
        client.removeChannel(channel);
      };
    },
  };
});
