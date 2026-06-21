import { describe, test, expect } from 'vitest';
import {
  calculatePointsRemaining,
  evaluateFrameStatus,
  calculateEloChange,
  calculateMultiplayerElo,
  calculateTeamElo,
} from '../lib/snooker';

describe('Snooker Math & Scoring Engine', () => {
  
  test('calculatePointsRemaining computes correctly for different red counts', () => {
    // 15 Reds: (15 * 8) + 27 = 147
    expect(calculatePointsRemaining(15)).toBe(147);
    
    // 10 Reds: (10 * 8) + 27 = 107
    expect(calculatePointsRemaining(10)).toBe(107);
    
    // 0 Reds, Yellow on: 2+3+4+5+6+7 = 27
    expect(calculatePointsRemaining(0, 'yellow')).toBe(27);

    // 0 Reds, Blue on: 5+6+7 = 18
    expect(calculatePointsRemaining(0, 'blue')).toBe(18);

    // 0 Reds, Black on: 7
    expect(calculatePointsRemaining(0, 'black')).toBe(7);

    // 0 Reds, clearance complete (null): 0
    expect(calculatePointsRemaining(0, null)).toBe(0);
  });

  test('evaluateFrameStatus correctly reports lead, secured status, and snookers required', () => {
    const players = [
      { id: '1', name: 'Arshad' },
      { id: '2', name: 'Awais' },
    ];

    // Case 1: Active frame with lead less than points remaining
    const scores1 = { '1': 40, '2': 30 };
    const status1 = evaluateFrameStatus(scores1, players, 35);
    expect(status1.isSecured).toBe(false);
    expect(status1.requiresSnookers['2']).toBe(false);

    // Case 2: Player A leads by 40 with 35 points remaining (needs snookers)
    const scores2 = { '1': 70, '2': 30 };
    const status2 = evaluateFrameStatus(scores2, players, 35);
    expect(status2.isSecured).toBe(true);
    expect(status2.requiresSnookers['2']).toBe(true);
    expect(status2.statusText).toContain('Arshad has secured the frame');
  });

  test('calculateEloChange adjusts ratings correctly', () => {
    const ratingA = 1000;
    const ratingB = 1000;

    // Symmetric game: Winner gets points, loser loses equal points
    const [changeA, changeB] = calculateEloChange(ratingA, ratingB, 1);
    expect(changeA).toBe(16);
    expect(changeB).toBe(-16);

    const [drawA, drawB] = calculateEloChange(ratingA, ratingB, 0.5);
    expect(drawA).toBe(0);
    expect(drawB).toBe(0);
  });

  test('calculateMultiplayerElo handles FFA scenarios without inflating net ELO', () => {
    const ffaPlayers = [
      { id: 'A', rating: 1000, rank: 1 },
      { id: 'B', rating: 1000, rank: 2 },
      { id: 'C', rating: 1000, rank: 3 },
    ];

    const adjustments = calculateMultiplayerElo(ffaPlayers);
    
    // Winner gets positive rating, loser negative
    expect(adjustments['A']).toBeGreaterThan(0);
    expect(adjustments['C']).toBeLessThan(0);
    
    // ELO conservation: Net change should sum to ~0
    const netChange = Object.values(adjustments).reduce((sum, val) => sum + val, 0);
    expect(Math.abs(netChange)).toBeLessThanOrEqual(2);
  });

  test('calculateTeamElo scales team ELO adjustments correctly', () => {
    const teamA = [{ id: 'p1', rating: 1000 }, { id: 'p2', rating: 1000 }];
    const teamB = [{ id: 'p3', rating: 1000 }, { id: 'p4', rating: 1000 }];

    const adjustments = calculateTeamElo(teamA, teamB, 'team_a');
    
    expect(adjustments['p1']).toBe(16);
    expect(adjustments['p2']).toBe(16);
    expect(adjustments['p3']).toBe(-16);
    expect(adjustments['p4']).toBe(-16);
  });

});
