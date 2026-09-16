import { describe, expect, it } from 'vitest';

import { computeStats } from './computeStats';

const participants = [
  { id: 'a', name: 'Anna', isActive: true, createdAt: 1 },
  { id: 'b', name: 'Boris', isActive: true, createdAt: 2 },
  { id: 'c', name: 'Cyril', isActive: false, createdAt: 3 },
];

const spin = (participantId: string, spunAt: number) => ({
  id: `${participantId}-${spunAt}`,
  participantId,
  participantName: participants.find((p) => p.id === participantId)?.name ?? participantId,
  spunAt,
});

describe('computeStats', () => {
  it('counts wins, shares, streaks and keeps zero-win participants visible', () => {
    const spins = [spin('a', 10), spin('a', 20), spin('b', 30), spin('a', 40), spin('a', 50)];
    const stats = computeStats({ spins, participants });

    expect(stats.totalSpins).toBe(5);
    expect(stats.expectedWinsPerActive).toBe(2.5);
    expect(stats.rows.map((row) => row.name)).toEqual(['Anna', 'Boris', 'Cyril']);

    const [anna, boris, cyril] = stats.rows;
    expect(anna).toMatchObject({ wins: 4, share: 0.8, longestStreak: 2, currentStreak: 2, isOnStreak: true });
    expect(boris).toMatchObject({ wins: 1, share: 0.2, longestStreak: 1, isOnStreak: false, lastWinAt: 30 });
    expect(cyril).toMatchObject({ wins: 0, share: 0, lastWinAt: null, isActive: false });
  });

  it('includes removed participants from history and respects the since filter', () => {
    const spins = [spin('a', 10), { id: 'x', participantId: 'ghost', participantName: 'Ghost', spunAt: 20 }];

    const allTime = computeStats({ spins, participants });
    expect(allTime.rows.find((row) => row.participantId === 'ghost')).toMatchObject({ wins: 1, isActive: false });

    const recent = computeStats({ spins, participants, since: 15 });
    expect(recent.totalSpins).toBe(1);
    expect(recent.rows.find((row) => row.participantId === 'a')?.wins).toBe(0);
  });
});
