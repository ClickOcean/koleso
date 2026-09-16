import { db } from '@shared/lib/database/db';

import { DEFAULT_PARTICIPANT_NAMES } from '../config/defaultParticipants';
import { Participant } from '../model/types';

/** Set once the default roster has been written, so an intentionally emptied list is not refilled */
const SEEDED_STORAGE_KEY = 'participants.seeded.v1';

const normalizeName = (name: string): string => name.trim().replace(/\s+/g, ' ');

const buildRecords = (rawNames: string[], knownNames: Set<string>): Participant[] => {
  const now = Date.now();
  const records: Participant[] = [];

  rawNames.forEach((rawName, index) => {
    const name = normalizeName(rawName);
    const key = name.toLowerCase();

    if (!name || knownNames.has(key)) return;

    knownNames.add(key);
    records.push({ id: crypto.randomUUID(), name, isActive: true, createdAt: now + index });
  });

  return records;
};

const checkIsSeeded = (): boolean => {
  try {
    return localStorage.getItem(SEEDED_STORAGE_KEY) === 'true';
  } catch {
    return true;
  }
};

const markSeeded = (): void => {
  try {
    localStorage.setItem(SEEDED_STORAGE_KEY, 'true');
  } catch {
    // storage unavailable: nothing to remember
  }
};

/**
 * Fills the roster with the team's default names on the first launch only.
 */
const seedDefaultsIfEmpty = async (): Promise<void> => {
  if (checkIsSeeded()) return;

  const count = await db.participants.count();

  if (count === 0) {
    await db.participants.bulkAdd(buildRecords(DEFAULT_PARTICIPANT_NAMES, new Set()));
  }

  markSeeded();
};

export const participantsRepository = {
  async getAll(): Promise<Participant[]> {
    await seedDefaultsIfEmpty();
    return db.participants.orderBy('createdAt').toArray();
  },

  /**
   * Adds one participant per non-empty line. Names already present (case-insensitive) are skipped.
   * Returns the number of participants actually added.
   */
  async addMany(rawNames: string[]): Promise<number> {
    const existing = await db.participants.toArray();
    const known = new Set(existing.map((participant) => participant.name.toLowerCase()));
    const records = buildRecords(rawNames, known);

    if (records.length) {
      await db.participants.bulkAdd(records);
    }

    return records.length;
  },

  async rename(id: string, name: string): Promise<void> {
    const normalized = normalizeName(name);
    if (!normalized) return;
    await db.participants.update(id, { name: normalized });
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    await db.participants.update(id, { isActive });
  },

  async setAllActive(isActive: boolean): Promise<void> {
    await db.participants.toCollection().modify({ isActive });
  },

  async remove(id: string): Promise<void> {
    await db.participants.delete(id);
  },
};
