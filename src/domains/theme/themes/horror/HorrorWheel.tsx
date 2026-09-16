import tinycolor from 'tinycolor2';

import { fitText } from '@utils/common.utils';
import { WheelItem, WheelItemWithAngle } from '@models/wheel.model';
import CanvasSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/CanvasSpinningWheel';
import { fitSectorText } from '@domains/wheel/BaseWheel/parts/sectorText';

import type { FC } from 'react';
import type { SpinningWheelProps } from '@domains/wheel/BaseWheel/parts/types';

const rimWidth = 12;
const innerBorderWidth = 2;
const maxTextLength = 21;
const RIM_SEED = 0x6f0d;

export const HORROR_RED = '#9f1239';
const HORROR_TEXT = '#ece3c4';
const HORROR_FONT = 'Georgia, "Times New Roman", Times, serif';

const BONE_DARK = '#2c251e';
const BONE_MID = '#6b5f4c';
const BONE_LIGHT = '#8c7e66';

interface Point {
  x: number;
  y: number;
}

interface HorrorPalette {
  fill: string;
  dark: string;
  glow: string;
  vein: string;
}

type Scale = (value: number) => number;

/** FNV-1a hash so every participant gets stable veins across redraws */
const hashSeed = (value: string | number): number => {
  const text = String(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

/** Tiny LCG: deterministic pseudo-random numbers for the cached wheel canvas */
const createRandom = (seed: number): (() => number) => {
  let state = seed || 1;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;

    return state / 4294967296;
  };
};

const polar = (center: number, radius: number, angle: number): Point => ({
  x: center + Math.cos(angle) * radius,
  y: center + Math.sin(angle) * radius,
});

const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * Crushes any participant color into the ink → plum → crimson band while
 * keeping neighbours distinguishable through lightness. Greyscale input
 * (highlight mode) stays a lifeless grey.
 */
const toHorrorColor = (color: string): HorrorPalette => {
  const hsl = tinycolor(color).toHsl();
  const isGrey = hsl.s < 0.05;
  const hue = isGrey ? 350 : (230 + (hsl.h / 360) * 150) % 360;
  const saturation = isGrey ? 0.04 : 0.52;
  const lightness = 0.08 + ((Math.round(hsl.l * 100) * 7) % 13) / 100;

  return {
    fill: tinycolor({ h: hue, s: saturation, l: lightness }).toHexString(),
    dark: tinycolor({ h: hue, s: saturation, l: Math.max(0.03, lightness - 0.05) }).toHexString(),
    glow: tinycolor({ h: hue, s: isGrey ? 0.04 : 0.66, l: lightness + 0.14 }).toHexString(),
    vein: tinycolor({ h: hue, s: isGrey ? 0.05 : 0.72, l: lightness + 0.26 }).toHexString(),
  };
};

/** Smooth quadratic curve through points, thick at the start and thin at the end */
const strokeTapered = (ctx: CanvasRenderingContext2D, points: Point[], fromWidth: number, toWidth: number): void => {
  const segments = points.length - 1;
  for (let i = 0; i < segments; i++) {
    const from = i === 0 ? points[0] : midpoint(points[i - 1], points[i]);
    const to = i === segments - 1 ? points[i + 1] : midpoint(points[i], points[i + 1]);
    ctx.lineWidth = fromWidth + (toWidth - fromWidth) * (i / Math.max(1, segments - 1));
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(points[i].x, points[i].y, to.x, to.y);
    ctx.stroke();
  }
};

/** Organic veins crawling from the hub towards the rim, kept inside the sector by the caller's clip */
const drawVeins = (
  ctx: CanvasRenderingContext2D,
  center: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  color: string,
  random: () => number,
  scale: Scale,
): void => {
  const span = endAngle - startAngle;
  if (span < 0.035) {
    return;
  }

  const veinCount = span > 0.16 ? 2 : 1;
  const steps = 5;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = tinycolor(color).setAlpha(0.6).toRgbString();
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = scale(6);
  ctx.shadowColor = tinycolor(color).setAlpha(0.75).toRgbString();

  for (let v = 0; v < veinCount; v++) {
    const side = veinCount === 1 ? 0.5 : v === 0 ? 0.3 : 0.7;
    const points: Point[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const wobble = (random() - 0.5) * 0.5 * t + (random() - 0.5) * 0.08;
      const fraction = Math.min(0.94, Math.max(0.06, side + wobble));
      points.push(polar(center, radius * (0.12 + t * 0.84), startAngle + span * fraction));
    }

    strokeTapered(ctx, points, scale(2.4), scale(0.5));

    const branchCount = span > 0.1 ? 1 + Math.floor(random() * 2) : 0;
    for (let b = 0; b < branchCount; b++) {
      const index = 1 + Math.floor(random() * 3);
      const origin = points[index];
      const originAngle = Math.atan2(origin.y - center, origin.x - center);
      const direction = originAngle + (random() < 0.5 ? -1 : 1) * (0.5 + random() * 0.6);
      const length = radius * (0.1 + random() * 0.16);
      const tip = { x: origin.x + Math.cos(direction) * length, y: origin.y + Math.sin(direction) * length };
      const control = {
        x: (origin.x + tip.x) / 2 + (random() - 0.5) * length * 0.6,
        y: (origin.y + tip.y) / 2 + (random() - 0.5) * length * 0.6,
      };

      strokeTapered(ctx, [origin, control, tip], scale(1.2), scale(0.4));
    }
  }

  ctx.restore();
};

/** Points of a ring whose radius is jittered with sharp teeth; `direction` says where the teeth point */
const ringPoints = (
  center: number,
  radius: number,
  count: number,
  direction: 1 | -1,
  random: () => number,
  scale: Scale,
): Point[] =>
  Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const isTooth = random() < 0.2;
    const offset = isTooth ? scale(3 + random() * (direction > 0 ? 8 : 5)) : scale(random() * 1.4);

    return polar(center, radius + direction * offset, angle);
  });

const tracePolygon = (ctx: CanvasRenderingContext2D, points: Point[]): void => {
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.closePath();
};

/** Curved, tapering bone tendrils reaching out from the rim into the padding */
const drawTendrils = (
  ctx: CanvasRenderingContext2D,
  center: number,
  rimRadius: number,
  random: () => number,
  scale: Scale,
): void => {
  const count = 9;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(12, 5, 4, 0.9)';
  ctx.lineWidth = scale(1.2);

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * 0.35;
    const length = scale(26 + random() * 30);
    const width = scale(9 + random() * 6);
    const bend = (random() < 0.5 ? -1 : 1) * (0.14 + random() * 0.24);
    const base = polar(center, rimRadius - scale(3), angle);
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);
    const tip = polar(center, rimRadius + length, angle + bend);
    const mid = polar(center, rimRadius + length * 0.55, angle + bend * 0.4);

    const gradient = ctx.createLinearGradient(base.x, base.y, tip.x, tip.y);
    gradient.addColorStop(0, BONE_MID);
    gradient.addColorStop(0.6, BONE_LIGHT);
    gradient.addColorStop(1, BONE_DARK);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(base.x + perpX * width * 0.5, base.y + perpY * width * 0.5);
    ctx.quadraticCurveTo(mid.x + perpX * width * 0.38, mid.y + perpY * width * 0.38, tip.x, tip.y);
    ctx.quadraticCurveTo(
      mid.x - perpX * width * 0.38,
      mid.y - perpY * width * 0.38,
      base.x - perpX * width * 0.5,
      base.y - perpY * width * 0.5,
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
};

const HorrorSpinningWheel: FC<SpinningWheelProps> = (props) => {
  return (
    <CanvasSpinningWheel
      {...props}
      renderer={{
        drawText(ctx, { startAngle, endAngle, name, displayName }: WheelItemWithAngle, { layout, scale }) {
          if ((endAngle - startAngle) / Math.PI / 2 < 0.016) {
            return;
          }

          const radius = layout.wheelRadius - scale(3);
          const text = fitText(displayName || name, maxTextLength);

          ctx.save();
          ctx.font = `bold ${scale(19)}px ${HORROR_FONT}`;
          ctx.textBaseline = 'middle';

          const textRadius = fitSectorText(ctx, text, layout, { outerRatio: 0.88 }).startRadius;
          const centerAngle = endAngle - (endAngle - startAngle) / 2;

          ctx.translate(
            textRadius * Math.cos(centerAngle) + layout.center,
            textRadius * Math.sin(centerAngle) + layout.center,
          );
          ctx.rotate(centerAngle);

          ctx.lineJoin = 'round';
          ctx.strokeStyle = 'rgba(8, 0, 4, 0.92)';
          ctx.lineWidth = scale(4.5);
          ctx.strokeText(text, 0, 0);

          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(10);
          ctx.shadowColor = 'rgba(225, 30, 55, 0.85)';
          ctx.fillStyle = HORROR_TEXT;
          ctx.fillText(text, 0, 0);

          // second pass without the glow keeps the serifs crisp
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
          ctx.fillText(text, 0, 0);

          ctx.restore();
        },
        drawSlice(ctx, item: WheelItemWithAngle, getColor: (item: WheelItem) => string, { layout, scale }) {
          const { startAngle, endAngle } = item;
          const { center } = layout;
          const palette = toHorrorColor(getColor(item));
          const radius = layout.wheelRadius - scale(innerBorderWidth);
          const random = createRandom(hashSeed(item.id));
          const span = endAngle - startAngle;

          ctx.save();

          ctx.beginPath();
          ctx.moveTo(center, center);
          ctx.arc(center, center, radius, startAngle, endAngle);
          ctx.closePath();

          // dim ember near the hub, ink towards the rim
          const base = ctx.createRadialGradient(center, center, radius * 0.1, center, center, radius);
          base.addColorStop(0, palette.glow);
          base.addColorStop(0.3, palette.fill);
          base.addColorStop(1, palette.dark);
          ctx.fillStyle = base;
          ctx.fill();

          // everything below stays inside the sector
          ctx.clip();

          // uneven inner glow: one soft blob sitting somewhere off-centre
          const blobAngle = startAngle + span * (0.3 + random() * 0.4);
          const blobDistance = radius * (0.35 + random() * 0.3);
          const blob = polar(center, blobDistance, blobAngle);
          const blobSize = radius * (0.22 + random() * 0.2);
          const glow = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blobSize);
          glow.addColorStop(0, tinycolor(palette.glow).setAlpha(0.6).toRgbString());
          glow.addColorStop(1, tinycolor(palette.glow).setAlpha(0).toRgbString());
          ctx.fillStyle = glow;
          ctx.fillRect(center - radius, center - radius, radius * 2, radius * 2);

          drawVeins(ctx, center, radius, startAngle, endAngle, palette.vein, random, scale);

          ctx.restore();

          // ink divider with a faint bloody edge
          ctx.save();
          ctx.lineCap = 'round';
          ctx.strokeStyle = 'rgba(6, 0, 3, 0.9)';
          ctx.lineWidth = scale(2.5);
          ctx.beginPath();
          ctx.moveTo(center, center);
          ctx.lineTo(center + Math.cos(startAngle) * radius, center + Math.sin(startAngle) * radius);
          ctx.stroke();

          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(4);
          ctx.shadowColor = 'rgba(200, 30, 60, 0.6)';
          ctx.strokeStyle = 'rgba(200, 40, 70, 0.3)';
          ctx.lineWidth = scale(1);
          ctx.stroke();
          ctx.restore();
        },
        afterDraw(ctx, _items, { layout, scale }) {
          const { center, canvasSize } = layout;
          const outerRadius = layout.wheelRadius - scale(1);
          const innerRadius = layout.wheelRadius - scale(rimWidth);
          const random = createRandom(RIM_SEED);

          // vignette and grime, clipped to the sectors
          ctx.save();
          ctx.beginPath();
          ctx.arc(center, center, innerRadius, 0, Math.PI * 2);
          ctx.clip();

          const vignette = ctx.createRadialGradient(center, center, innerRadius * 0.55, center, center, innerRadius);
          vignette.addColorStop(0, 'rgba(5, 0, 3, 0)');
          vignette.addColorStop(1, 'rgba(5, 0, 3, 0.55)');
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, canvasSize, canvasSize);

          for (let i = 0; i < 6; i++) {
            const spot = polar(center, innerRadius * (0.25 + random() * 0.6), random() * Math.PI * 2);
            const size = scale(35 + random() * 45);
            const grime = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, size);
            grime.addColorStop(0, 'rgba(10, 0, 5, 0.18)');
            grime.addColorStop(1, 'rgba(10, 0, 5, 0)');
            ctx.fillStyle = grime;
            ctx.fillRect(spot.x - size, spot.y - size, size * 2, size * 2);
          }
          ctx.restore();

          // bone rim with jagged teeth on both edges
          const outerPoints = ringPoints(center, outerRadius, 180, 1, random, scale);
          const innerPoints = ringPoints(center, innerRadius, 180, -1, random, scale);

          ctx.save();
          const bone = ctx.createRadialGradient(
            center,
            center,
            innerRadius - scale(6),
            center,
            center,
            outerRadius + scale(6),
          );
          bone.addColorStop(0, BONE_DARK);
          bone.addColorStop(0.3, BONE_MID);
          bone.addColorStop(0.55, BONE_LIGHT);
          bone.addColorStop(0.8, BONE_MID);
          bone.addColorStop(1, BONE_DARK);

          ctx.beginPath();
          tracePolygon(ctx, outerPoints);
          tracePolygon(ctx, innerPoints);
          ctx.fillStyle = bone;
          ctx.fill('evenodd');

          // cracks and pores in the bone
          ctx.strokeStyle = 'rgba(20, 12, 8, 0.6)';
          ctx.lineWidth = scale(1);
          ctx.lineCap = 'round';
          for (let i = 0; i < 28; i++) {
            const angle = random() * Math.PI * 2;
            const from = polar(center, innerRadius + scale(2 + random() * 3), angle);
            const length = scale(4 + random() * 6);
            const tilt = angle + (random() - 0.5) * 0.9;
            const to = { x: from.x + Math.cos(tilt) * length, y: from.y + Math.sin(tilt) * length };
            const control = {
              x: (from.x + to.x) / 2 + (random() - 0.5) * scale(4),
              y: (from.y + to.y) / 2 + (random() - 0.5) * scale(4),
            };
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(20, 12, 8, 0.35)';
          for (let i = 0; i < 48; i++) {
            const pore = polar(center, innerRadius + scale(2 + random() * (rimWidth - 4)), random() * Math.PI * 2);
            ctx.beginPath();
            ctx.arc(pore.x, pore.y, scale(0.5 + random() * 0.7), 0, Math.PI * 2);
            ctx.fill();
          }

          // dark inner edge
          ctx.strokeStyle = 'rgba(12, 4, 3, 0.85)';
          ctx.lineWidth = scale(1.5);
          ctx.lineJoin = 'round';
          ctx.beginPath();
          tracePolygon(ctx, innerPoints);
          ctx.stroke();

          // outer edge bleeds red into the dark
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(14);
          ctx.shadowColor = 'rgba(159, 18, 57, 0.75)';
          ctx.strokeStyle = 'rgba(14, 4, 3, 0.9)';
          ctx.beginPath();
          tracePolygon(ctx, outerPoints);
          ctx.stroke();
          ctx.restore();

          drawTendrils(ctx, center, outerRadius, random, scale);
        },
      }}
    />
  );
};

HorrorSpinningWheel.displayName = 'HorrorSpinningWheel';

export default HorrorSpinningWheel;
