export interface SpinResult {
  id: string;
  participantId: string;
  participantName: string;
  spunAt: number;
}

export interface ParticipantStats {
  participantId: string;
  name: string;
  wins: number;
  /** Share of all counted spins, 0-1 */
  share: number;
  lastWinAt: number | null;
  /** Longest run of consecutive wins */
  longestStreak: number;
  /** True while this participant won the most recent spin(s) in a row */
  isOnStreak: boolean;
  currentStreak: number;
  isActive: boolean;
}

export interface SpinStatsSummary {
  totalSpins: number;
  firstSpinAt: number | null;
  lastSpinAt: number | null;
  /** How many wins each active participant would have if the wheel were perfectly even */
  expectedWinsPerActive: number | null;
  rows: ParticipantStats[];
}
