import { useMemo } from 'react';
import tinycolor from 'tinycolor2';

import { fitText } from '@utils/common.utils';
import { WheelItem, WheelItemWithAngle } from '@models/wheel.model';
import CanvasSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/CanvasSpinningWheel';
import { fitSectorText } from '@domains/wheel/BaseWheel/parts/sectorText';

import { drawProminence } from './prominence';
import { createSeededRandom } from './seededRandom';
import { createSectorPalette, sectorVariant } from './solarPalette';
import { CORONA_REACH, RIM_WIDTH, SOLAR_FONT, SOLAR_RIM, SOLAR_TEXT, SOLAR_TEXT_OUTLINE } from './solarTokens';
import { SUN_DISC, useSunTexture } from './sunImage';

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

/**
 * Затмение: колесо — диск Луны, закрывший Солнце. Фото Солнца остаётся под ним едва заметной
 * фактурой (гранулы и пятна проступают сквозь тёмный диск), корона живёт на фоне и в слое эффектов.
 * Секторы — очень слабые тёплые подсветки поверх тьмы, чтобы соседей можно было различить.
 */
const ECLIPSE_DISC_CENTER = 'rgba(12, 12, 18, 0.86)';
const ECLIPSE_DISC_EDGE = 'rgba(4, 4, 8, 0.94)';
/** Свет короны, затекающий на край лунного диска */
const ECLIPSE_EDGE_GLOW = 'rgba(255, 205, 150, 0.22)';
const TINT_BLEND: GlobalCompositeOperation = 'source-over';
const TINT_ALPHA = 0.09;
/** Highlight mode: the losing sectors sink deeper into the dark */
const DIM_SHADE = 'rgba(0, 0, 0, 0.55)';
const PHOTO_TEXT = '#fff3d6';
const PHOTO_TEXT_OUTLINE = 'rgba(0, 0, 0, 0.85)';

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

/** How strong the static corona on the wheel canvas is: painted plasma needs more of it than the photo */
interface CoronaStyle {
  /** Radial gradient stops from the rim (0) to CORONA_REACH (1) */
  glow: [offset: number, color: string][];
  rayCount: number;
  rayAlpha: number;
  tongueCount: number;
  tongueAlpha: number;
  tongueHot: number;
}

const PLASMA_CORONA: CoronaStyle = {
  glow: [
    [0, 'rgba(255, 232, 160, 0.92)'],
    [0.1, 'rgba(255, 185, 70, 0.6)'],
    [0.35, 'rgba(255, 135, 35, 0.26)'],
    [0.7, 'rgba(255, 100, 20, 0.08)'],
    [1, 'rgba(255, 90, 10, 0)'],
  ],
  rayCount: 96,
  rayAlpha: 0.07,
  tongueCount: 8,
  tongueAlpha: 0.5,
  tongueHot: 0.3,
};

/** Whiter and more restrained: the photo's own limb darkening has to stay visible next to it */
const PHOTO_CORONA: CoronaStyle = {
  glow: [
    [0, 'rgba(255, 242, 205, 0.7)'],
    [0.1, 'rgba(255, 205, 120, 0.42)'],
    [0.35, 'rgba(255, 150, 50, 0.18)'],
    [0.7, 'rgba(255, 110, 25, 0.05)'],
    [1, 'rgba(255, 90, 10, 0)'],
  ],
  rayCount: 72,
  rayAlpha: 0.05,
  tongueCount: 6,
  tongueAlpha: 0.34,
  tongueHot: 0.34,
};

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
const drawCorona = (ctx: CanvasRenderingContext2D, layout: WheelPartLayout, scale: Scale, style: CoronaStyle): void => {
  const { center, wheelRadius, overflowPadding } = layout;
  const random = createSeededRandom('solar-corona');
  const reach = wheelRadius + overflowPadding * CORONA_REACH;

  ctx.save();

  const glow = ctx.createRadialGradient(center, center, wheelRadius - scale(2), center, center, reach);
  style.glow.forEach(([offset, color]) => glow.addColorStop(offset, color));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(center, center, reach, 0, TAU);
  ctx.arc(center, center, wheelRadius - scale(2), 0, TAU, true);
  ctx.fill();

  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';

  for (let index = 0; index < style.rayCount; index++) {
    const angle = random() * TAU;
    const from = wheelRadius + scale(1 + random() * 6);
    const to = from + scale(12 + random() * 48);

    ctx.strokeStyle = `rgba(255, ${185 + Math.round(random() * 60)}, 120, ${style.rayAlpha + random() * 0.13})`;
    ctx.lineWidth = scale(0.8 + random() * 2.2);
    ctx.beginPath();
    ctx.moveTo(center + Math.cos(angle) * from, center + Math.sin(angle) * from);
    ctx.lineTo(center + Math.cos(angle) * to, center + Math.sin(angle) * to);
    ctx.stroke();
  }

  for (let index = 0; index < style.tongueCount; index++) {
    const angle = (index / style.tongueCount) * TAU + (random() - 0.5) * 0.6;

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
      { alpha: style.tongueAlpha + random() * 0.25, hot: style.tongueHot + random() * 0.2 },
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

/**
 * The photo of the Sun under the lunar disc of the eclipse. The disc on the photo is off-centre, so the
 * square around its measured circle (`SUN_DISC`) is mapped onto the square around the wheel disc:
 * (SUN_DISC.x, SUN_DISC.y) lands on (center, center) and SUN_DISC.radius becomes `discRadius`,
 * i.e. scale = discRadius / SUN_DISC.radius. Clipped to the disc, so the black margins never show.
 */
const drawPhotosphere = (
  ctx: CanvasRenderingContext2D,
  texture: HTMLImageElement,
  layout: WheelPartLayout,
  discRadius: number,
): void => {
  const { center } = layout;
  const { x, y, radius } = SUN_DISC;

  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, discRadius, 0, TAU);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    texture,
    x - radius,
    y - radius,
    radius * 2,
    radius * 2,
    center - discRadius,
    center - discRadius,
    discRadius * 2,
    discRadius * 2,
  );

  // лунный диск поверх: почти чёрный, чуть светлее к центру, фото проступает как призрак
  const moon = ctx.createRadialGradient(center, center, 0, center, center, discRadius);
  moon.addColorStop(0, ECLIPSE_DISC_CENTER);
  moon.addColorStop(1, ECLIPSE_DISC_EDGE);
  ctx.fillStyle = moon;
  ctx.fillRect(0, 0, layout.canvasSize, layout.canvasSize);
  ctx.restore();
};

/**
 * Tint over the photo for one sector, derived from the palette colour of the sector: variant 0 is
 * the palette gold as is (close to the photo itself), 1 a pale yellow that brightens under
 * soft-light, 2 a deep orange that deepens. Warm hues only, so the disc stays one Sun.
 */
const photoTint = (colors: SliceColors, variant: number): string => {
  const base = tinycolor(colors.fill);

  switch (variant % 3) {
    case 1:
      return base.lighten(18).spin(6).toHexString();
    case 2:
      return base.darken(14).spin(-18).toHexString();
    default:
      return base.toHexString();
  }
};

/**
 * Variant of every sector for the photo tints, mirroring the palette's rule: cycles 0,1,2 with
 * sector order so neighbours differ. The dropout animation redraws just the two neighbours of the
 * removed sector; that partial pass keeps the variants they already had.
 */
const assignTintVariants = (variants: Map<WheelItem['id'], number>, items: WheelItem[]): void => {
  const isPartial = items.length === 2 && variants.size > 2 && items.every((item) => variants.has(item.id));
  if (isPartial) {
    return;
  }

  variants.clear();
  items.forEach((item, index) => variants.set(item.id, sectorVariant(index, items.length)));
};

/** Photo mode: thin bright dividers with a faint glow, one per boundary, from outside the hub to the rim */
const drawPhotoDividers = (
  ctx: CanvasRenderingContext2D,
  items: WheelItemWithAngle[],
  center: number,
  radius: number,
  scale: Scale,
): void => {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255, 225, 185, 0.22)';
  ctx.lineWidth = scale(1);
  ctx.beginPath();
  items.forEach(({ startAngle }) => {
    const cos = Math.cos(startAngle);
    const sin = Math.sin(startAngle);
    ctx.moveTo(center + cos * radius * HUB_RATIO, center + sin * radius * HUB_RATIO);
    ctx.lineTo(center + cos * radius, center + sin * radius);
  });
  ctx.stroke();
  ctx.restore();
};

/**
 * Eclipse edge: corona light spilling onto the rim of the dark disc and the thin bright
 * chromosphere ring right at the limb.
 */
const drawPhotoLimb = (
  ctx: CanvasRenderingContext2D,
  layout: WheelPartLayout,
  discRadius: number,
  scale: Scale,
): void => {
  const { center, canvasSize, wheelRadius } = layout;

  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, discRadius, 0, TAU);
  ctx.clip();
  const spill = ctx.createRadialGradient(center, center, discRadius * 0.9, center, center, discRadius);
  spill.addColorStop(0, 'rgba(255, 205, 150, 0)');
  spill.addColorStop(1, ECLIPSE_EDGE_GLOW);
  ctx.fillStyle = spill;
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  ctx.restore();

  // хромосфера: тонкое яркое кольцо на самом краю диска
  ctx.save();
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = scale(18);
  ctx.shadowColor = 'rgba(255, 190, 110, 0.9)';
  ctx.strokeStyle = 'rgba(255, 238, 205, 0.95)';
  ctx.lineWidth = scale(2.5);
  ctx.beginPath();
  ctx.arc(center, center, wheelRadius - scale(1), 0, TAU);
  ctx.stroke();
  ctx.restore();
};

const SolarSystemSpinningWheel: FC<SpinningWheelProps> = (props) => {
  // lightness variants follow sector order, so they are fixed per draw pass in beforeDraw
  const palette = useMemo(() => createSectorPalette(), []);
  const tintVariants = useMemo(() => new Map<WheelItem['id'], number>(), []);
  // the photo replaces the painted plasma the moment it is loaded; a missing file keeps the plasma
  // (the value is read inside the renderer, so its arrival rebuilds the cached wheel canvas)
  const texture = useSunTexture();

  return (
    <CanvasSpinningWheel
      {...props}
      renderer={{
        beforeDraw(ctx, items, { layout, scale }) {
          palette.beginPass(items);
          if (texture) {
            assignTintVariants(tintVariants, items);
            drawPhotosphere(ctx, texture, layout, layout.wheelRadius - scale(innerBorderWidth));
          }
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
          ctx.lineJoin = 'round';
          ctx.lineWidth = scale(4);
          ctx.shadowOffsetX = 0;

          if (texture) {
            // светлые буквы с чёрной обводкой и тёплым свечением на тёмном лунном диске
            ctx.strokeStyle = PHOTO_TEXT_OUTLINE;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 0;
            ctx.strokeText(text, 0, 0);

            ctx.shadowBlur = scale(8);
            ctx.shadowColor = 'rgba(255, 200, 120, 0.45)';
            ctx.fillStyle = PHOTO_TEXT;
          } else {
            // warm light outline with a faint glow keeps dark glyphs readable on every plasma tone
            ctx.strokeStyle = SOLAR_TEXT_OUTLINE;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = scale(5);
            ctx.shadowColor = 'rgba(255, 220, 140, 0.8)';
            ctx.strokeText(text, 0, 0);

            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = SOLAR_TEXT;
          }
          ctx.fillText(text, 0, 0);

          ctx.restore();
        },
        drawSlice(ctx, item: WheelItemWithAngle, getColor: (item: WheelItem) => string, { layout, scale }) {
          const { startAngle, endAngle } = item;
          const { center } = layout;
          const radius = layout.wheelRadius - scale(innerBorderWidth);
          const geometry: SectorGeometry = { center, radius, startAngle, endAngle };
          const colors = palette.colorsFor(item, getColor);

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(center, center);
          ctx.arc(center, center, radius, startAngle, endAngle);
          ctx.closePath();

          if (texture) {
            // translucent tint over the photo; a dimmed sector is desaturated and shaded instead
            ctx.clip();
            if (colors.dimmed) {
              ctx.fillStyle = DIM_SHADE;
              ctx.fillRect(0, 0, layout.canvasSize, layout.canvasSize);
            } else {
              ctx.globalCompositeOperation = TINT_BLEND;
              ctx.globalAlpha = TINT_ALPHA;
              ctx.fillStyle = photoTint(colors, tintVariants.get(item.id) ?? 0);
              ctx.fillRect(0, 0, layout.canvasSize, layout.canvasSize);
            }
            ctx.restore();
            return;
          }

          const random = createSeededRandom(`solar-${String(item.id)}`);

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
        afterDraw(ctx, items, { layout, scale }) {
          const discRadius = layout.wheelRadius - scale(innerBorderWidth);

          if (texture) {
            drawPhotoLimb(ctx, layout, discRadius, scale);
            drawPhotoDividers(ctx, items, layout.center, discRadius, scale);
            drawCorona(ctx, layout, scale, PHOTO_CORONA);
            return;
          }

          drawLimb(ctx, layout, discRadius);
          drawCorona(ctx, layout, scale, PLASMA_CORONA);
          drawRim(ctx, layout, scale);
        },
      }}
    />
  );
};

SolarSystemSpinningWheel.displayName = 'SolarSystemSpinningWheel';

export default SolarSystemSpinningWheel;
