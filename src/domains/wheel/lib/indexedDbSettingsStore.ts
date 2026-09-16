import { db, WheelSettingsParsedRecord } from '@shared/lib/database/db';

export interface WheelSettingsSavedRecord {
  id?: string;
  data: Wheel.Settings;
}

/**
 * Persists the single wheel settings record in IndexedDB.
 */
class WheelSettingsStore {
  async get(): Promise<WheelSettingsParsedRecord | null> {
    const records = await db.wheelSettings.toArray();

    if (records.length === 0) {
      return null;
    }

    const firstRecord = records[0];

    try {
      return { id: firstRecord.id, data: JSON.parse(firstRecord.data) as Wheel.Settings };
    } catch (err) {
      console.error('Failed to parse wheel settings:', err);
      return null;
    }
  }

  async getId(): Promise<string> {
    const records = await db.wheelSettings.toArray();
    return records.length > 0 ? records[0].id : crypto.randomUUID();
  }

  async save(settings: WheelSettingsSavedRecord): Promise<void> {
    const id = settings.id ?? (await this.getId());
    await db.wheelSettings.put({ id, data: JSON.stringify(settings.data) });
  }

  async delete(): Promise<void> {
    await db.wheelSettings.clear();
  }
}

export const wheelSettingsStore = new WheelSettingsStore();
