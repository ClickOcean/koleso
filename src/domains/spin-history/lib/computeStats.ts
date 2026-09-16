import { Participant } from '@domains/participants/model/types';

import { ParticipantStats, SpinResult, SpinStatsSummary } from '../model/types';

interface ComputeStatsParams {
  spins: SpinResult[];
  participants: Participant[];
  /** Only spins at or after this timestamp are counted; omit for all time */
  since?: number | null;
}

/**
 * Aggregates confirmed spins into per-participant rows.
 *
 * Rows are built for every current participant (so people with zero wins are
 * visible) plus anyone who appears in history but was removed from the roster.
 * Streaks are computed over the chronological spin order.
 */
export const computeStats = ({ spins, participants, since }: ComputeStatsParams): SpinStatsSummary => {
  const counted = [...spins].filter((spin) => since == null || spin.spunAt >= since).sort((a, b) => a.spunAt - b.spunAt);
  const totalSpins = counted.length;

  const byId = new Map<string, ParticipantStats>();
  const ensureRow = (participantId: string, name: string, isActive: boolean): ParticipantStats => {
    let row = byId.get(participantId);
    if (!row) {
      row = {
        participantId,
        name,
        wins: 0,
        share: 0,
        lastWinAt: null,
        longestStreak: 0,
        isOnStreak: false,
        currentStreak: 0,
        isActive,
      };
      byId.set(participantId, row);
    }
    return row;
  };

  participants.forEach((participant) => ensureRow(participant.id, participant.name, participant.isActive));

  let previousWinnerId: string | null = null;
  let runLength = 0;

  counted.forEach((spin) => {
    const row = ensureRow(spin.participantId, spin.participantName, false);
    row.wins += 1;
    row.lastWinAt = spin.spunAt;

    runLength = spin.participantId === previousWinnerId ? runLength + 1 : 1;
    previousWinnerId = spin.participantId;
    row.longestStreak = Math.max(row.longestStreak, runLength);
  });

  if (previousWinnerId) {
    const lastRow = byId.get(previousWinnerId);
    if (lastRow) {
      lastRow.currentStreak = runLength;
      lastRow.isOnStreak = runLength > 1;
    }
  }

  const rows = Array.from(byId.values())
    .map((row) => ({ ...row, share: totalSpins ? row.wins / totalSpins : 0 }))
    .sort((a, b) => b.wins - a.wins || (b.lastWinAt ?? 0) - (a.lastWinAt ?? 0) || a.name.localeCompare(b.name));

  const activeCount = participants.filter((participant) => participant.isActive).length;

  return {
    totalSpins,
    firstSpinAt: counted[0]?.spunAt ?? null,
    lastSpinAt: counted[counted.length - 1]?.spunAt ?? null,
    expectedWinsPerActive: activeCount > 0 ? totalSpins / activeCount : null,
    rows,
  };
};
