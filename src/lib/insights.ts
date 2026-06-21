import { Frame, FrameEvent, Player, FramePlayer, Session } from './store';

export interface PlayerStats {
  id: string;
  name: string;
  totalPoints: number;
  wins: number;
  losses: number;
  draws: number;
  framesPlayed: number;
  winRate: number;
  highestFrameScore: number;
  averageFrameScore: number;
  pots: Record<string, number>; // ball_color -> count
  fouls: number;
  foulRate: number; // fouls per frame
  cleanFrames: number; // frames with 0 fouls
}

/**
 * Aggregates a player's stats from historical frames and events.
 */
export const calculatePlayerStats = (
  playerId: string,
  playerName: string,
  frames: Frame[],
  events: FrameEvent[],
  framePlayers: FramePlayer[]
): PlayerStats => {
  // Filter frames where player participated
  const participatedFrameIds = new Set(
    framePlayers.filter(fp => fp.player_id === playerId).map(fp => fp.frame_id)
  );

  const playerFrames = frames.filter(f => participatedFrameIds.has(f.id));
  const framesPlayed = playerFrames.length;

  let totalPoints = 0;
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let highestFrameScore = 0;
  let totalFouls = 0;
  let cleanFrames = 0;

  const pots: Record<string, number> = {
    red: 0,
    yellow: 0,
    green: 0,
    brown: 0,
    blue: 0,
    pink: 0,
    black: 0,
  };

  playerFrames.forEach(frame => {
    // Check if winner
    if (frame.status === 'completed') {
      if (frame.winner_id === playerId) {
        wins++;
      } else if (frame.winner_id === null) {
        draws++;
      } else {
        losses++;
      }
    }

    // Filter events for this player and frame
    const frameEvents = events.filter(e => e.frame_id === frame.id);
    
    // Check undos
    const undoneIds = new Set<string>();
    frameEvents.forEach(e => {
      if (e.event_type === 'undo' && e.metadata?.undoes_event_id) {
        undoneIds.add(e.metadata.undoes_event_id);
        undoneIds.add(e.id);
      }
    });

    const activeFrameEvents = frameEvents.filter(e => !undoneIds.has(e.id));
    const playerActiveEvents = activeFrameEvents.filter(e => e.player_id === playerId);

    let frameScore = 0;
    let frameFouls = 0;

    playerActiveEvents.forEach(e => {
      if (e.event_type === 'pot') {
        frameScore += e.points;
        const ball = e.ball || 'red';
        pots[ball] = (pots[ball] || 0) + 1;
      } else if (e.event_type === 'foul') {
        frameFouls++;
      }
    });

    totalPoints += frameScore;
    totalFouls += frameFouls;
    if (frameFouls === 0) cleanFrames++;
    if (frameScore > highestFrameScore) highestFrameScore = frameScore;
  });

  const winRate = framesPlayed > 0 ? Math.round((wins / framesPlayed) * 100) : 0;
  const averageFrameScore = framesPlayed > 0 ? Math.round(totalPoints / framesPlayed) : 0;
  const foulRate = framesPlayed > 0 ? parseFloat((totalFouls / framesPlayed).toFixed(2)) : 0;

  return {
    id: playerId,
    name: playerName,
    totalPoints,
    wins,
    losses,
    draws,
    framesPlayed,
    winRate,
    highestFrameScore,
    averageFrameScore,
    pots,
    fouls: totalFouls,
    foulRate,
    cleanFrames,
  };
};

/**
 * Generates custom AI Insights based on accumulated player statistics.
 */
export const generateAIInsights = (
  targetPlayer: PlayerStats,
  allPlayers: PlayerStats[]
): string[] => {
  const insights: string[] = [];

  if (targetPlayer.framesPlayed < 3) {
    return ['Play at least 3 frames to generate AI Insights.'];
  }

  // Calculate averages across all players to compare
  const count = allPlayers.length || 1;
  const avgBlacks = allPlayers.reduce((sum, p) => sum + (p.pots.black || 0), 0) / count;
  const avgFoulRate = allPlayers.reduce((sum, p) => sum + p.foulRate, 0) / count;

  // 1. Black ball proficiency
  const playerBlacks = targetPlayer.pots.black || 0;
  if (playerBlacks > avgBlacks * 1.3 && playerBlacks > 2) {
    const percent = Math.round(((playerBlacks - avgBlacks) / (avgBlacks || 1)) * 100);
    insights.push(`${targetPlayer.name} pots ${percent}% more black balls than the group average.`);
  }

  // 2. Win rate accolade
  if (targetPlayer.winRate > 60) {
    insights.push(`${targetPlayer.name} maintains a stellar win rate of ${targetPlayer.winRate}%, dominating critical frame finishes.`);
  }

  // 3. Foul analysis
  if (targetPlayer.foulRate > avgFoulRate * 1.3 && targetPlayer.fouls > 3) {
    insights.push(`${targetPlayer.name}'s foul rate is currently higher than average, costing critical safety points.`);
  } else if (targetPlayer.foulRate < avgFoulRate * 0.5 && targetPlayer.framesPlayed > 4) {
    insights.push(`${targetPlayer.name} plays extremely clean frames, committing fewer fouls than 80% of the group.`);
  }

  // 4. Heavy scorer insight
  if (targetPlayer.averageFrameScore > 35) {
    insights.push(`${targetPlayer.name} averages a high visit break score of ${targetPlayer.averageFrameScore} points per frame.`);
  }

  if (insights.length === 0) {
    insights.push(`${targetPlayer.name} is showing steady performance. Keep playing to uncover deep statistical trends!`);
  }

  return insights;
};

/**
 * Generates a descriptive story of the session based on frame results and statistics.
 */
export const generateMatchStory = (
  session: Session,
  frames: Frame[],
  events: FrameEvent[],
  players: Player[]
): string => {
  const completedFrames = frames.filter(f => f.session_id === session.id && f.status === 'completed');
  if (completedFrames.length === 0) {
    return 'No completed frames to summarize this session.';
  }

  // Count wins
  const winsRecord: Record<string, number> = {};
  const foulCount: Record<string, number> = {};

  players.forEach(p => {
    winsRecord[p.id] = 0;
    foulCount[p.id] = 0;
  });

  completedFrames.forEach(f => {
    if (f.winner_id) {
      winsRecord[f.winner_id] = (winsRecord[f.winner_id] || 0) + 1;
    }
  });

  // Analyze events
  const sessionFrameIds = new Set(completedFrames.map(f => f.id));
  const sessionEvents = events.filter(e => sessionFrameIds.has(e.frame_id));
  
  // Clean up undos
  const undoneIds = new Set<string>();
  sessionEvents.forEach(e => {
    if (e.event_type === 'undo' && e.metadata?.undoes_event_id) {
      undoneIds.add(e.metadata.undoes_event_id);
    }
  });

  const activeEvents = sessionEvents.filter(e => !undoneIds.has(e.id) && e.event_type !== 'undo');

  activeEvents.forEach(e => {
    if (e.event_type === 'foul' && e.player_id) {
      foulCount[e.player_id] = (foulCount[e.player_id] || 0) + 1;
    }
  });

  // Sort winners
  const sortedWinners = Object.entries(winsRecord)
    .map(([id, wins]) => ({
      player: players.find(p => p.id === id),
      wins,
    }))
    .sort((a, b) => b.wins - a.wins);

  const champion = sortedWinners[0];
  const runnerUp = sortedWinners[1];

  const sortedFoulers = Object.entries(foulCount)
    .map(([id, fouls]) => ({
      player: players.find(p => p.id === id),
      fouls,
    }))
    .sort((a, b) => b.fouls - a.fouls);

  const maxFouler = sortedFoulers[0];

  // Story parts
  let intro = '';
  let mid = '';
  let outro = '';

  if (champion && champion.player && champion.wins > 0) {
    if (champion.wins === completedFrames.length) {
      intro = `${champion.player.name} completely dominated the table, securing a clean sweep of all ${completedFrames.length} frames played.`;
    } else {
      intro = `${champion.player.name} emerged as the session champion, winning ${champion.wins} of the ${completedFrames.length} frames.`;
    }
  } else {
    intro = `The session concluded after a highly competitive set of ${completedFrames.length} frames.`;
  }

  if (runnerUp && runnerUp.player && runnerUp.wins > 0) {
    mid = ` ${runnerUp.player.name} mounted a valiant effort, capturing ${runnerUp.wins} frame victories.`;
  }

  if (maxFouler && maxFouler.player && maxFouler.fouls > 2) {
    outro = ` Safety play was a challenge for ${maxFouler.player.name}, who conceded valuable points through ${maxFouler.fouls} fouls.`;
  } else {
    outro = ' Tactical safety play kept fouls to a minimum across all players.';
  }

  return `${intro}${mid}${outro} Overall, it was a memorable gathering that reshaped the group's leaderboard.`;
};
