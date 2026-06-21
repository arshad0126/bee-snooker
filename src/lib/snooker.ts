export const BALL_VALUES: Record<string, number> = {
  red: 1,
  yellow: 2,
  green: 3,
  brown: 4,
  blue: 5,
  pink: 6,
  black: 7,
};

export const COLOR_SEQUENCE = ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];

/**
 * Calculates the remaining points on the table.
 * @param redsRemaining Number of reds remaining.
 * @param currentColorOn The next color ball to pot (if reds are 0). E.g. 'yellow', 'green', etc.
 */
export const calculatePointsRemaining = (
  redsRemaining: number,
  currentColorOn: string | null = 'yellow'
): number => {
  if (redsRemaining > 0) {
    // Each red can be followed by a black (8 points).
    // Plus the 27 points for all colors.
    return redsRemaining * 8 + 27;
  }

  if (!currentColorOn) return 0;

  const startIndex = COLOR_SEQUENCE.indexOf(currentColorOn.toLowerCase());
  if (startIndex === -1) return 0;

  return COLOR_SEQUENCE.slice(startIndex).reduce(
    (sum, color) => sum + (BALL_VALUES[color] || 0),
    0
  );
};

export interface FrameScoreStatus {
  scores: Record<string, number>; // player_id -> score
  pointsRemaining: number;
  leaderId: string | null;
  leaderName: string;
  isSecured: boolean;
  requiresSnookers: Record<string, boolean>; // player_id -> requires snookers
  statusText: string;
}

/**
 * Evaluates the mathematical state of the frame.
 */
export const evaluateFrameStatus = (
  scores: Record<string, number>,
  players: { id: string; name: string }[],
  pointsRemaining: number
): FrameScoreStatus => {
  const playerEntries = players.map(p => ({
    id: p.id,
    name: p.name,
    score: scores[p.id] || 0,
  }));

  // Sort by score descending
  playerEntries.sort((a, b) => b.score - a.score);

  const leader = playerEntries[0] || null;
  const runnerUp = playerEntries[1] || null;

  const requiresSnookers: Record<string, boolean> = {};
  let statusText = 'Frame in progress';
  let isSecured = false;

  if (leader && runnerUp) {
    const lead = leader.score - runnerUp.score;

    playerEntries.forEach(p => {
      if (p.id === leader.id) {
        requiresSnookers[p.id] = false;
      } else {
        const diff = leader.score - p.score;
        requiresSnookers[p.id] = diff > pointsRemaining;
      }
    });

    if (lead > pointsRemaining) {
      isSecured = true;
      statusText = `${leader.name} has secured the frame.`;
      
      // Check if others are mathematically out
      const outPlayers = playerEntries
        .filter(p => p.id !== leader.id && leader.score - p.score > pointsRemaining)
        .map(p => p.name);
      
      if (outPlayers.length > 0) {
        statusText += ` ${outPlayers.join(', ')} mathematically require snookers.`;
      }
    } else {
      statusText = `Points remaining: ${pointsRemaining}. Lead is ${lead}.`;
    }
  }

  return {
    scores,
    pointsRemaining,
    leaderId: leader ? leader.id : null,
    leaderName: leader ? leader.name : '',
    isSecured,
    requiresSnookers,
    statusText,
  };
};

/**
 * Calculates ELO rating changes for two entities.
 * @returns [ratingChangeA, ratingChangeB]
 */
export const calculateEloChange = (
  ratingA: number,
  ratingB: number,
  outcome: 1 | 0.5 | 0, // 1 = A wins, 0.5 = Draw, 0 = B wins
  kFactor = 32
): [number, number] => {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

  const changeA = Math.round(kFactor * (outcome - expectedA));
  const changeB = Math.round(kFactor * ((1 - outcome) - expectedB));

  return [changeA, changeB];
};

/**
 * Calculates multiplayer ELO adjustments (Free For All).
 * Treats the multiplayer game as N(N-1)/2 pairwise matches.
 * Scales the adjustments to prevent rating inflation.
 */
export const calculateMultiplayerElo = (
  players: { id: string; rating: number; rank: number }[], // rank: 1 for winner, 2 for second, etc.
  kFactor = 32
): Record<string, number> => {
  const adjustments: Record<string, number> = {};
  players.forEach(p => {
    adjustments[p.id] = 0;
  });

  const n = players.length;
  if (n <= 1) return adjustments;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const pA = players[i];
      const pB = players[j];

      let outcome: 1 | 0.5 | 0 = 0.5;
      if (pA.rank < pB.rank) outcome = 1;
      else if (pA.rank > pB.rank) outcome = 0;

      const [changeA, changeB] = calculateEloChange(pA.rating, pB.rating, outcome, kFactor);

      adjustments[pA.id] += changeA;
      adjustments[pB.id] += changeB;
    }
  }

  // Normalize adjustments by dividing by (n - 1)
  players.forEach(p => {
    adjustments[p.id] = Math.round(adjustments[p.id] / (n - 1));
  });

  return adjustments;
};

/**
 * Calculates ELO adjustments for Team Mode (e.g. 2v2).
 */
export const calculateTeamElo = (
  teamA: { id: string; rating: number }[],
  teamB: { id: string; rating: number }[],
  winner: 'team_a' | 'team_b' | 'draw',
  kFactor = 32
): Record<string, number> => {
  const avgRatingA = teamA.reduce((sum, p) => sum + p.rating, 0) / teamA.length;
  const avgRatingB = teamB.reduce((sum, p) => sum + p.rating, 0) / teamB.length;

  const outcome = winner === 'team_a' ? 1 : winner === 'team_b' ? 0 : 0.5;
  const [changeA, changeB] = calculateEloChange(avgRatingA, avgRatingB, outcome, kFactor);

  const adjustments: Record<string, number> = {};

  teamA.forEach(p => {
    adjustments[p.id] = changeA;
  });
  teamB.forEach(p => {
    adjustments[p.id] = changeB;
  });

  return adjustments;
};
