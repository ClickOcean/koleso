import { db } from '@shared/lib/database/db';

import { SpinResult } from '../model/types';

export const spinsRepository = {
  async getAll(): Promise<SpinResult[]> {
    return db.spins.orderBy('spunAt').toArray();
  },

  async add(input: { participantId: string; participantName: string }): Promise<SpinResult> {
    const record: SpinResult = { id: crypto.randomUUID(), spunAt: Date.now(), ...input };
    await db.spins.add(record);
    return record;
  },

  async remove(id: string): Promise<void> {
    await db.spins.delete(id);
  },

  async clear(): Promise<void> {
    await db.spins.clear();
  },
};
