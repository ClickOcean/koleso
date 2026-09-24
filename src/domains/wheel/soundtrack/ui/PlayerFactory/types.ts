export interface PlayerProps<T extends Wheel.SoundtrackSource> {
  source: T;
  ref: React.RefObject<PlayerRef | null>;
  //props
  displayAs?: 'thumbnail' | 'hidden';
  // Callbacks
  onReady?: () => void;
  onTimeUpdate?: (progress: number) => void;
  /** Fires once the real media duration (seconds) is known */
  onDurationChange?: (duration: number) => void;
}

export interface PlayerRef {
  /** Starts playback from `offset`; resolves true once the sound is actually playing, false if it fails */
  play(offset: number, volume: number): Promise<boolean>;
  setVolume(volume: number): void;
  stop(): void;
}
