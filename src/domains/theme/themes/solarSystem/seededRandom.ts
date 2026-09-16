export type SeededRandom = () => number;

/** FNV-1a hash of the seed string, so any participant id becomes a 32-bit state */
const hashSeed = (seed: string): number => {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

/**
 * Deterministic PRNG (mulberry32). The wheel canvas is cached and redrawn on
 * roster or highlight changes, so a sector's texture must come out identical
 * every time; seeding by item id keeps a participant's granules and sunspots put.
 */
export const createSeededRandom = (seed: string): SeededRandom => {
  let state = hashSeed(seed) || 0x9e3779b9;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
