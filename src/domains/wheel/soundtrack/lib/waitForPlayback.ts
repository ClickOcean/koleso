/** The media element API both players expose: HTMLAudioElement and react-player's YouTube element */
interface PlayableMedia {
  readonly paused: boolean;
  readonly currentTime: number;
}

const POLL_MS = 30;
/** A player that has not started by then never will; the caller gives up earlier anyway */
const GIVE_UP_MS = 15000;
/** How far past the offset the position must move before the sound counts as playing */
const PROGRESS_S = 0.03;

/**
 * Resolves true once the media is really playing from `offset`: not paused, and the position has
 * moved past the offset. `play()` resolving is not enough for YouTube, which still seeks and
 * buffers after it, and events differ between the two players, so the position is polled.
 * Resolves false if that does not happen within `GIVE_UP_MS`.
 */
export const waitForPlayback = (media: PlayableMedia, offset: number): Promise<boolean> =>
  new Promise((resolve) => {
    const startedAt = performance.now();

    const check = () => {
      if (!media.paused && media.currentTime >= offset + PROGRESS_S) {
        resolve(true);
        return;
      }
      if (performance.now() - startedAt > GIVE_UP_MS) {
        resolve(false);
        return;
      }
      window.setTimeout(check, POLL_MS);
    };

    check();
  });

/**
 * Starts `play` and waits until the sound is actually heard, for at most `timeoutMs`.
 * Resolves false on a failed start or a timeout; the caller then stops the player.
 */
export const startPlaybackWithin = async (play: () => Promise<boolean>, timeoutMs: number): Promise<boolean> => {
  let timer: number | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = window.setTimeout(() => resolve(false), timeoutMs);
  });

  try {
    return await Promise.race([play(), timeout]);
  } finally {
    window.clearTimeout(timer);
  }
};
