import { RIM_INNER, RIM_STUDS, TW_GOLD, TW_GOLD_DARK, TW_GOLD_LIGHT, TW_RED_DEEP } from './taiwanTokens';

import type { WheelPartLayout } from '@domains/wheel/BaseWheel/parts/types';

/** Polished gold lit from the top-left */
export const goldMetal = (ctx: CanvasRenderingContext2D, center: number, radius: number): CanvasGradient => {
  const gradient = ctx.createLinearGradient(center - radius, center - radius, center + radius, center + radius);
  gradient.addColorStop(0, TW_GOLD_LIGHT);
  gradient.addColorStop(0.45, TW_GOLD);
  gradient.addColorStop(0.75, TW_GOLD_DARK);
  gradient.addColorStop(1, TW_GOLD_LIGHT);

  return gradient;
};

/**
 * Thin temple rim over the sector edges: a band of polished gold from `RIM_INNER` to the wheel
 * edge with a lacquer groove along it and gold studs in the groove. Drawn into the cached wheel
 * canvas, so the studs turn with the wheel. Nothing sticks out past the wheel edge.
 */
export const drawRim = (ctx: CanvasRenderingContext2D, layout: WheelPartLayout): void => {
  const { center, wheelRadius, scale } = layout;
  const inner = wheelRadius * RIM_INNER;
  const width = wheelRadius - inner;
  const middle = inner + width / 2;
  const gold = goldMetal(ctx, center, wheelRadius);

  ctx.save();

  // soft shadow the rim casts onto the sectors
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.arc(center, center, inner - 1.5 * scale, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(center, center, wheelRadius, 0, 2 * Math.PI);
  ctx.arc(center, center, inner, 0, 2 * Math.PI, true);
  ctx.fill();

  ctx.strokeStyle = TW_RED_DEEP;
  ctx.lineWidth = width * 0.38;
  ctx.beginPath();
  ctx.arc(center, center, middle, 0, 2 * Math.PI);
  ctx.stroke();

  const studRadius = width * 0.3;
  for (let index = 0; index < RIM_STUDS; index++) {
    const angle = (index * 2 * Math.PI) / RIM_STUDS;
    const x = center + Math.cos(angle) * middle;
    const y = center + Math.sin(angle) * middle;
    const stud = ctx.createRadialGradient(
      x - studRadius * 0.35,
      y - studRadius * 0.35,
      studRadius * 0.1,
      x,
      y,
      studRadius,
    );
    stud.addColorStop(0, TW_GOLD_LIGHT);
    stud.addColorStop(0.6, TW_GOLD);
    stud.addColorStop(1, TW_GOLD_DARK);
    ctx.fillStyle = stud;
    ctx.beginPath();
    ctx.arc(x, y, studRadius, 0, 2 * Math.PI);
    ctx.fill();
  }

  ctx.restore();
};
