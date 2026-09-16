import Dexie, { type EntityTable } from 'dexie';

export interface ParticipantRecord {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: number;
}

export interface SpinRecord {
  id: string;
  participantId: string;
  /** Name snapshot so history survives participant removal or renaming */
  participantName: string;
  spunAt: number;
}

export interface WheelSettingsRecord {
  id: string;
  data: string; // JSON string
}

export interface WheelSettingsParsedRecord {
  id: string;
  data: Wheel.Settings;
}

/**
 * Single local database for the app: roster of participants, confirmed spin
 * results and wheel settings. Everything lives in the browser (IndexedDB).
 */
class KolesoDatabase extends Dexie {
  participants!: EntityTable<ParticipantRecord, 'id'>;
  spins!: EntityTable<SpinRecord, 'id'>;
  wheelSettings!: EntityTable<WheelSettingsRecord, 'id'>;

  constructor() {
    super('koleso');
    this.version(1).stores({
      participants: 'id, name, isActive, createdAt',
      spins: 'id, participantId, spunAt',
      wheelSettings: 'id',
    });
  }
}

export const db = new KolesoDatabase();
