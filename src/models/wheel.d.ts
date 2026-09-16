import { WheelStyle } from '@models/wheel.model.ts';

declare global {
  namespace Wheel {
    /** YouTube video as audio source */
    interface SoundtrackSourceYoutube {
      type: 'youtube';
      videoId: string;
      title: string;
      channelTitle: string;
      duration: number; // seconds
      thumbnailUrl: string;
    }

    /** Local audio file as source */
    interface SoundtrackSourceFile {
      type: 'file';
      /** Base64 data URL for persistence in IndexedDB */
      dataUrl: string;
      fileName: string;
      /** MIME type (audio/mp3, audio/wav, etc.) */
      mimeType: string;
      duration: number; // seconds
      /** File size in bytes for display */
      fileSize: number;
    }

    /** Discriminated union - enables type-safe handling per source type */
    type SoundtrackSource = SoundtrackSourceYoutube | SoundtrackSourceFile;

    interface SoundtrackConfig {
      enabled: boolean;
      source: SoundtrackSource | null;
      /** Start position in seconds - where in the track to begin playback */
      offset: number;
      /** Volume level 0-1 */
      volume: number;
      /** Cached waveform peaks (0-1 normalized) for timeline visualization */
      waveformData?: number[];
    }

    interface Settings {
      spinTime: number | null;
      randomSpinConfig: { min: number; max: number };
      randomSpinEnabled: boolean;

      coreImage?: string | null;
      wheelStyles?: WheelStyle | null;

      soundtrack?: SoundtrackConfig;
    }
  }
}

export {};
