import {
  FOAM_DRIP_COUNT,
  FOAM_DRIP_MAX,
  FOAM_DRIP_MIN,
  FOAM_HEAD_INNER,
  FOAM_HEAD_INNER_NOISE,
  FOAM_HEAD_OUTER,
  FOAM_HEAD_OUTER_NOISE,
  FOAM_TILE_SIZE,
} from './beerPartyTokens';
import { createSeededRandom } from './seededRandom';

import type { WheelPartLayout } from '@domains/wheel/BaseWheel/parts/types';

/** Fixed seed: the head keeps its shape across resizes and texture reloads */
const HEAD_SEED = 0xf0a3;
/** Contour samples around the ring (0.25° apart), enough for the narrow drip tongues */
const SAMPLES = 1440;
/** Integer harmonics keep the edge noise periodic, so the contour closes without a seam */
const HARMONICS = [3, 5, 8, 13, 21];
const TWO_PI = 2 * Math.PI;

interface Drip {
  angle: number;
  /** How far the tongue runs past the outer edge, px */
  length: number;
  /** Gaussian half-width of the tongue, px */
  width: number;
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Wraps an angle difference into (-PI, PI] */
const wrapAngle = (delta: number): number => {
  let wrapped = delta % TWO_PI;
  if (wrapped > Math.PI) {
    wrapped -= TWO_PI;
  }
  if (wrapped <= -Math.PI) {
    wrapped += TWO_PI;
  }

  return wrapped;
};

/** Smooth periodic noise around the ring, roughly within [-1, 1] */
const createEdgeNoise = (random: () => number): ((angle: number) => number) => {
  const phases = HARMONICS.map(() => random() * TWO_PI);
  const weights = HARMONICS.map((frequency) => 1 / Math.sqrt(frequency));
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  return (angle) =>
    (1.4 / total) *
    HARMONICS.reduce((sum, frequency, index) => sum + weights[index] * Math.sin(frequency * angle + phases[index]), 0);
};

/**
 * Downscales the 1024 px tile to the size the pattern is drawn at, in two steps so the
 * bubbles keep their edges. A plain `createPattern` of the original would need a
 * pattern transform; a pre-scaled tile works everywhere.
 */
const createTile = (texture: HTMLImageElement, size: number): HTMLCanvasElement | null => {
  const half = document.createElement('canvas');
  half.width = Math.ceil(texture.naturalWidth / 2);
  half.height = Math.ceil(texture.naturalHeight / 2);
  const halfCtx = half.getContext('2d');
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const tileCtx = tile.getContext('2d');
  if (!halfCtx || !tileCtx) {
    return null;
  }

  halfCtx.drawImage(texture, 0, 0, half.width, half.height);
  tileCtx.drawImage(half, 0, 0, size, size);

  return tile;
};

/**
 * Pre-renders the foam head once per layout: an annulus around the rim filled with the
 * repeating foam photo, its outer edge bumpy with a few drips running over the rim,
 * shaded like a real head (dark where it meets the beer, lit from the top-left, a thin
 * bright rim outside) and casting a soft shadow. The effects layer just `drawImage`s the
 * result every frame; nothing here runs per frame.
 */
export const buildFoamRing = (layout: WheelPartLayout, texture: HTMLImageElement): HTMLCanvasElement | null => {
  const { canvasSize, center, wheelRadius, scale } = layout;
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  const random = createSeededRandom(HEAD_SEED);
  const outerNoise = createEdgeNoise(random);
  const innerNoise = createEdgeNoise(random);
  const baseInner = wheelRadius - FOAM_HEAD_INNER * scale;
  const baseOuter = wheelRadius + FOAM_HEAD_OUTER * scale;
  const drips: Drip[] = Array.from({ length: FOAM_DRIP_COUNT }, (_, index) => ({
    angle: ((index + 0.2 + random() * 0.6) * TWO_PI) / FOAM_DRIP_COUNT,
    length: (FOAM_DRIP_MIN + random() * (FOAM_DRIP_MAX - FOAM_DRIP_MIN)) * scale,
    width: (4.5 + random() * 2.5) * scale,
  }));

  const outerRadius = (angle: number): number => {
    let radius = baseOuter + outerNoise(angle) * FOAM_HEAD_OUTER_NOISE * scale;
    drips.forEach((drip) => {
      const along = wrapAngle(angle - drip.angle) * baseOuter;
      radius += drip.length * Math.exp(-((along / drip.width) ** 2));
    });

    return radius;
  };
  const innerRadius = (angle: number): number => baseInner + innerNoise(angle) * FOAM_HEAD_INNER_NOISE * scale;

  // outer contour and drip bulbs run clockwise, the inner contour counter-clockwise: nonzero fill leaves the hole
  const outerEdge = new Path2D();
  for (let index = 0; index <= SAMPLES; index++) {
    const angle = (index / SAMPLES) * TWO_PI;
    const radius = outerRadius(angle);
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    if (index === 0) {
      outerEdge.moveTo(x, y);
    } else {
      outerEdge.lineTo(x, y);
    }
  }
  outerEdge.closePath();
  drips.forEach((drip) => {
    const bulb = drip.width * 0.95;
    const reach = outerRadius(drip.angle) - bulb * 0.5;
    const x = center + Math.cos(drip.angle) * reach;
    const y = center + Math.sin(drip.angle) * reach;
    outerEdge.moveTo(x + bulb, y);
    outerEdge.arc(x, y, bulb, 0, TWO_PI);
  });

  const innerEdge = new Path2D();
  for (let index = SAMPLES; index >= 0; index--) {
    const angle = (index / SAMPLES) * TWO_PI;
    const radius = innerRadius(angle);
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    if (index === SAMPLES) {
      innerEdge.moveTo(x, y);
    } else {
      innerEdge.lineTo(x, y);
    }
  }
  innerEdge.closePath();

  const ring = new Path2D();
  ring.addPath(outerEdge);
  ring.addPath(innerEdge);

  // soft shadow: onto the background outside the head and onto the beer inside it
  ctx.save();
  // kept tight: the head sits just inside the rim now, and a wide shadow would be the one
  // thing still reaching past the bottom of the window (see MAX_OVERHANG)
  ctx.shadowColor = 'rgba(25, 12, 0, 0.5)';
  ctx.shadowBlur = 8 * scale;
  ctx.shadowOffsetX = 2 * scale;
  ctx.shadowOffsetY = 3 * scale;
  ctx.fillStyle = '#e8d9b4';
  ctx.fill(ring);
  ctx.restore();

  ctx.save();
  ctx.clip(ring);

  // the foam photo as a repeating tile, scaled so its bubbles are a few px across
  const tile = createTile(texture, Math.max(64, Math.round(FOAM_TILE_SIZE * scale)));
  const pattern = tile ? ctx.createPattern(tile, 'repeat') : null;
  ctx.fillStyle = pattern ?? '#f3e6c8';
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // cross-section: dark where the head meets the beer, a lit crest, warmer towards the outer edge
  const sectionStart = baseInner - 4 * scale;
  const sectionEnd = baseOuter + 10 * scale;
  const stopAt = (radius: number): number => clamp((radius - sectionStart) / (sectionEnd - sectionStart), 0, 1);
  const section = ctx.createRadialGradient(center, center, sectionStart, center, center, sectionEnd);
  section.addColorStop(0, 'rgba(95, 55, 12, 0.62)');
  section.addColorStop(stopAt(baseInner + 6 * scale), 'rgba(95, 55, 12, 0.22)');
  section.addColorStop(stopAt(baseInner + 14 * scale), 'rgba(255, 250, 235, 0.1)');
  section.addColorStop(stopAt(baseOuter - 8 * scale), 'rgba(255, 250, 235, 0)');
  section.addColorStop(stopAt(baseOuter - 2 * scale), 'rgba(130, 85, 30, 0.14)');
  section.addColorStop(1, 'rgba(130, 85, 30, 0.28)');
  ctx.fillStyle = section;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // light from the top-left of the screen, the far side in shade
  const light = ctx.createLinearGradient(
    center - baseOuter,
    center - baseOuter,
    center + baseOuter,
    center + baseOuter,
  );
  light.addColorStop(0, 'rgba(255, 255, 245, 0.3)');
  light.addColorStop(0.42, 'rgba(255, 255, 245, 0)');
  light.addColorStop(0.62, 'rgba(70, 40, 10, 0)');
  light.addColorStop(1, 'rgba(70, 40, 10, 0.26)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  // thin bright rim on the outer edge and a faint meniscus on the inner one; half of each stroke is clipped away
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255, 253, 244, 0.75)';
  ctx.lineWidth = 2.6 * scale;
  ctx.stroke(outerEdge);
  ctx.strokeStyle = 'rgba(70, 40, 10, 0.4)';
  ctx.lineWidth = 2.4 * scale;
  ctx.stroke(innerEdge);
  ctx.restore();

  return canvas;
};
