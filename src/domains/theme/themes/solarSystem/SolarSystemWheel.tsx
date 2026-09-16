import { useMemo } from 'react';

import { fitText } from '@utils/common.utils';
import { WheelItem, WheelItemWithAngle } from '@models/wheel.model';
import CanvasSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/CanvasSpinningWheel';
import { fitSectorText } from '@domains/wheel/BaseWheel/parts/sectorText';

import { drawProminence } from './prominence';
import { createSeededRandom } from './seededRandom';
import { createSectorPalette } from './solarPalette';
import { CORONA_REACH, RIM_WIDTH, SOLAR_FONT, SOLAR_RIM, SOLAR_TEXT, SOLAR_TEXT_OUTLINE } from './solarTokens';

import type { FC } from 'react';
import type { SpinningWheelProps, WheelPartLayout } from '@domains/wheel/BaseWheel/parts/types';
import type { SeededRandom } from './seededRandom';
import type { SliceColors } from './solarPalette';

type Scale = (value: number) => number;
type Tone = 'light' | 'dark';

const TAU = 2 * Math.PI;
const innerBorderWidth = 2;
const maxTextLength = 21;
/** Granules per full circle, shared out by sector angle */
const GRAIN_DENSITY = 5200;
const GRAIN_MIN = 30;
const GRAIN_MAX = 420;
/** The hub image covers the centre; texture and dividers start outside it */
const HUB_RATIO = 0.16;
const RAY_COUNT = 96;
const TONGUE_COUNT = 8;

interface SectorGeometry {
  center: number;
  radius: number;
  startAngle: number;
  endAngle: number;
}

interface Granule {
  x: number;
  y: number;
  size: number;
}

/** A short arc along the sector, like a convection cell stretched by rotation */
interface Filament {
  radius: number;
  angle: number;
  halfSpan: number;
}

/** Static plasma grain: a few hundred dots and short arcs in lighter and darker tones */
const drawGranules = (
  ctx: CanvasRenderingContext2D,
  random: SeededRandom,
  colors: SliceColors,
  { center, radius, startAngle, endAngle }: SectorGeometry,
  scale: Scale,
): void => {
  const span = endAngle - startAngle;
  const count = Math.round(Math.min(GRAIN_MAX, Math.max(GRAIN_MIN, (span / TAU) * GRAIN_DENSITY)));
  const innerArea = HUB_RATIO * HUB_RATIO;
  const dots: Record<Tone, Granule[]> = { light: [], dark: [] };
  const filaments: Record<Tone, Filament[]> = { light: [], dark: [] };

  for (let index = 0; index < count; index++) {
    // uniform over the sector area rather than bunched at the hub
    const r = radius * Math.sqrt(innerArea + random() * (1 - innerArea));
    const angle = startAngle + random() * span;
    const tone: Tone = random() < 0.5 ? 'light' : 'dark';

    if (random() < 0.62) {
      dots[tone].push({
        x: center + Math.cos(angle) * r,
        y: center + Math.sin(angle) * r,
        size: scale(0.9 + random() * 1.5),
      });
    } else {
      filaments[tone].push({ radius: r, angle, halfSpan: scale(2 + random() * 5) / r });
    }
  }

  const paint = (tone: Tone) => {
    const style = tone === 'light' ? colors.grainLight : colors.grainDark;
    ctx.fillStyle = style;
    ctx.strokeStyle = style;
    ctx.globalAlpha = colors.dimmed ? 0.3 : tone === 'light' ? 0.55 : 0.42;

    ctx.beginPath();
    dots[tone].forEach(({ x, y, size }) => {
      ctx.moveTo(x + size, y);
      ctx.arc(x, y, size, 0, TAU);
    });
    ctx.fill();

    ctx.lineWidth = scale(1.3);
    ctx.lineCap = 'round';
    ctx.beginPath();
    filaments[tone].forEach(({ radius: r, angle, halfSpan }) => {
      ctx.moveTo(center + Math.cos(angle - halfSpan) * r, center + Math.sin(angle - halfSpan) * r);
      ctx.arc(center, center, r, angle - halfSpan, angle + halfSpan);
    });
    ctx.stroke();
  };

  paint('light');
  paint('dark');
  ctx.globalAlpha = 1;
};

/** Dark umbra with a softer penumbra on some sectors, kept off the centre line where the name sits */
const drawSunspots = (
  ctx: CanvasRenderingContext2D,
  random: SeededRandom,
  colors: SliceColors,
  { center, radius, startAngle, endAngle }: SectorGeometry,
  scale: Scale,
): void => {
  const span = endAngle - startAngle;
  if (span < 0.05 || random() > 0.45) {
    return;
  }

  const spots = random() < 0.3 ? 2 : 1;
  const centerAngle = startAngle + span / 2;

  for (let index = 0; index < spots; index++) {
    const side = random() < 0.5 ? -1 : 1;
    const angle = centerAngle + side * span * (0.16 + random() * 0.24);
    const r = radius * (0.42 + random() * 0.4);
    const x = center + Math.cos(angle) * r;
    const y = center + Math.sin(angle) * r;
    const size = scale(6 + random() * 9);
    const tilt = angle + (random() - 0.5) * 0.8;

    ctx.globalAlpha = colors.dimmed ? 0.35 : 0.6;
    ctx.fillStyle = colors.penumbra;
    ctx.beginPath();
    ctx.ellipse(x, y, size * 1.7, size * 1.15, tilt, 0, TAU);
    ctx.fill();

    ctx.globalAlpha = colors.dimmed ? 0.5 : 0.92;
    ctx.fillStyle = colors.sunspot;
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.68, tilt, 0, TAU);
    ctx.fill();

    // a small satellite umbra next to the main one
    const satellite = scale(2 + random() * 3);
    ctx.beginPath();
    ctx.ellipse(
      x + Math.cos(tilt) * size * 1.5,
      y + Math.sin(tilt) * size * 1.5,
      satellite,
      satellite * 0.8,
      tilt,
      0,
      TAU,
    );
    ctx.fill();
  }

  ctx.globalAlpha = 1;
};

/** Thin dark-orange dividers with a soft glow, on both edges so every boundary ends up fully on top */
const drawDividers = (
  ctx: CanvasRenderingContext2D,
  { center, radius, startAngle, endAngle }: SectorGeometry,
  scale: Scale,
): void => {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = scale(7);
  ctx.shadowColor = 'rgba(190, 55, 0, 0.85)';
  ctx.strokeStyle = 'rgba(128, 34, 0, 0.9)';
  ctx.lineWidth = scale(1.6);

  [startAngle, endAngle].forEach((angle) => {
    ctx.beginPath();
    ctx.moveTo(center + Math.cos(angle) * radius * HUB_RATIO, center + Math.sin(angle) * radius * HUB_RATIO);
    ctx.lineTo(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius);
    ctx.stroke();
  });

  ctx.restore();
};

/** Limb darkening: the disc gets a little redder and darker towards the edge, like a real photosphere */
const drawLimb = (ctx: CanvasRenderingContext2D, layout: WheelPartLayout, discRadius: number): void => {
  const { center, canvasSize } = layout;

  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, discRadius, 0, TAU);
  ctx.clip();

  const limb = ctx.createRadialGradient(center, center, discRadius * 0.72, center, center, discRadius);
  limb.addColorStop(0, 'rgba(120, 30, 0, 0)');
  limb.addColorStop(0.85, 'rgba(120, 30, 0, 0.18)');
  limb.addColorStop(1, 'rgba(90, 20, 0, 0.42)');
  ctx.fillStyle = limb;
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  ctx.restore();
};

/** Corona: glow spilling into the overscan, faint rays and a few static prominence arches */
const drawCorona = (ctx: CanvasRenderingContext2D, layout: WheelPartLayout, scale: Scale): void => {
  const { center, wheelRadius, overflowPadding } = layout;
  const random = createSeededRandom('solar-corona');
  const reach = wheelRadius + overflowPadding * CORONA_REACH;

  ctx.save();

  const glow = ctx.createRadialGradient(center, center, wheelRadius - scale(2), center, center, reach);
  glow.addColorStop(0, 'rgba(255, 232, 160, 0.92)');
  glow.addColorStop(0.1, 'rgba(255, 185, 70, 0.6)');
  glow.addColorStop(0.35, 'rgba(255, 135, 35, 0.26)');
  glow.addColorStop(0.7, 'rgba(255, 100, 20, 0.08)');
  glow.addColorStop(1, 'rgba(255, 90, 10, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(center, center, reach, 0, TAU);
  ctx.arc(center, center, wheelRadius - scale(2), 0, TAU, true);
  ctx.fill();

  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';

  for (let index = 0; index < RAY_COUNT; index++) {
    const angle = random() * TAU;
    const from = wheelRadius + scale(1 + random() * 6);
    const to = from + scale(12 + random() * 48);

    ctx.strokeStyle = `rgba(255, ${185 + Math.round(random() * 60)}, 120, ${0.07 + random() * 0.13})`;
    ctx.lineWidth = scale(0.8 + random() * 2.2);
    ctx.beginPath();
    ctx.moveTo(center + Math.cos(angle) * from, center + Math.sin(angle) * from);
    ctx.lineTo(center + Math.cos(angle) * to, center + Math.sin(angle) * to);
    ctx.stroke();
  }

  for (let index = 0; index < TONGUE_COUNT; index++) {
    const angle = (index / TONGUE_COUNT) * TAU + (random() - 0.5) * 0.6;

    drawProminence(
      ctx,
      center,
      center,
      {
        angle,
        base: wheelRadius - scale(3),
        height: scale(30 + random() * 52),
        halfWidth: scale(11 + random() * 13),
        lean: scale((random() - 0.5) * 40),
      },
      { alpha: 0.5 + random() * 0.25, hot: 0.3 + random() * 0.2 },
    );
  }

  ctx.restore();
};

/** Bright yellow-white photosphere edge with a glow, plus a thin inner line */
const drawRim = (ctx: CanvasRenderingContext2D, layout: WheelPartLayout, scale: Scale): void => {
  const { center, wheelRadius } = layout;

  ctx.save();
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = scale(16);
  ctx.shadowColor = 'rgba(255, 236, 150, 0.95)';
  ctx.strokeStyle = SOLAR_RIM;
  ctx.lineWidth = scale(RIM_WIDTH);
  ctx.beginPath();
  ctx.arc(center, center, wheelRadius - scale(RIM_WIDTH) / 2, 0, TAU);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 235, 0.5)';
  ctx.lineWidth = scale(1);
  ctx.beginPath();
  ctx.arc(center, center, wheelRadius - scale(RIM_WIDTH) - scale(2.5), 0, TAU);
  ctx.stroke();
  ctx.restore();
};

const SolarSystemSpinningWheel: FC<SpinningWheelProps> = (props) => {
  // lightness variants follow sector order, so they are fixed per draw pass in beforeDraw
  const palette = useMemo(() => createSectorPalette(), []);

  return (
    <CanvasSpinningWheel
      {...props}
      renderer={{
        beforeDraw(_ctx, items) {
          palette.beginPass(items);
        },
        drawText(ctx, { startAngle, endAngle, name, displayName }: WheelItemWithAngle, { layout, scale }) {
          if ((endAngle - startAngle) / Math.PI / 2 < 0.016) {
            return;
          }

          const text = fitText(displayName || name, maxTextLength);

          ctx.save();
          ctx.font = `bold ${scale(19)}px ${SOLAR_FONT}`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';

          const textRadius = fitSectorText(ctx, text, layout, { outerRatio: 0.88 }).startRadius;
          const centerAngle = endAngle - (endAngle - startAngle) / 2;

          ctx.translate(
            textRadius * Math.cos(centerAngle) + layout.center,
            textRadius * Math.sin(centerAngle) + layout.center,
          );
          ctx.rotate(centerAngle);

          // warm light outline with a faint glow keeps dark glyphs readable on every plasma tone
          ctx.lineJoin = 'round';
          ctx.strokeStyle = SOLAR_TEXT_OUTLINE;
          ctx.lineWidth = scale(4);
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(5);
          ctx.shadowColor = 'rgba(255, 220, 140, 0.8)';
          ctx.strokeText(text, 0, 0);

          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
          ctx.fillStyle = SOLAR_TEXT;
          ctx.fillText(text, 0, 0);

          ctx.restore();
        },
        drawSlice(ctx, item: WheelItemWithAngle, getColor: (item: WheelItem) => string, { layout, scale }) {
          const { startAngle, endAngle } = item;
          const { center } = layout;
          const radius = layout.wheelRadius - scale(innerBorderWidth);
          const geometry: SectorGeometry = { center, radius, startAngle, endAngle };
          const colors = palette.colorsFor(item, getColor);
          const random = createSeededRandom(`solar-${String(item.id)}`);

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(center, center);
          ctx.arc(center, center, radius, startAngle, endAngle);
          ctx.closePath();

          // hottest near the hub (the core image is the Sun's centre), cooler towards the rim
          const plasma = ctx.createRadialGradient(center, center, radius * 0.08, center, center, radius);
          plasma.addColorStop(0, colors.core);
          plasma.addColorStop(0.3, colors.core);
          plasma.addColorStop(0.62, colors.fill);
          plasma.addColorStop(1, colors.edge);
          ctx.fillStyle = plasma;
          ctx.fill();

          ctx.clip();
          drawGranules(ctx, random, colors, geometry, scale);
          drawSunspots(ctx, random, colors, geometry, scale);
          ctx.restore();

          drawDividers(ctx, geometry, scale);
        },
        afterDraw(ctx, _items, { layout, scale }) {
          drawLimb(ctx, layout, layout.wheelRadius - scale(innerBorderWidth));
          drawCorona(ctx, layout, scale);
          drawRim(ctx, layout, scale);
        },
      }}
    />
  );
};

SolarSystemSpinningWheel.displayName = 'SolarSystemSpinningWheel';

export default SolarSystemSpinningWheel;
