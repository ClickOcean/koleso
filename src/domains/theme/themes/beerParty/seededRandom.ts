/** FNV-1a hash of a string, so per-sector bubble layouts can be seeded by the participant id */
export const hashString = (value: string): number => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

/**
 * mulberry32: a tiny deterministic PRNG. The wheel canvas is cached and redrawn on
 * every roster or highlight change, so anything "random" on it has to come from a
 * fixed seed or the bubbles would jump around between redraws.
 */
export const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
