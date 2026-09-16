import tinycolor from 'tinycolor2';

import { fitText } from '@utils/common.utils';
import { WheelItem, WheelItemWithAngle } from '@models/wheel.model';
import CanvasSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/CanvasSpinningWheel';
import { fitSectorText } from '@domains/wheel/BaseWheel/parts/sectorText';

import type { FC } from 'react';
import type { SpinningWheelProps } from '@domains/wheel/BaseWheel/parts/types';

const borderWidth = 5;
const innerBorderWidth = 2;
const maxTextLength = 21;

export const NAUTICAL_INK = '#2b1d0e';
export const NAUTICAL_FONT = 'Georgia, "Times New Roman", Times, serif';
const INK_RGB = '58, 38, 16';
const CREAM_RGB = '248, 240, 220';
const BAND_FILL = 'rgba(239, 227, 198, 0.94)';
const DISC_FILL = '#f4ead2';
const NORTH_RED = '#8a2e22';

interface ParchmentTone {
  h: number;
  s: number;
  l: number;
}

interface Cardinal {
  letter: string;
  angle: number;
  color: string;
}

/** Sea-chart families, one per 72° of the source hue: faded red, tan, muted teal, ink-blue, warm beige. */
const TONE_FAMILIES: ParchmentTone[] = [
  { h: 8, s: 0.36, l: 0.64 },
  { h: 34, s: 0.44, l: 0.72 },
  { h: 186, s: 0.28, l: 0.6 },
  { h: 214, s: 0.3, l: 0.62 },
  { h: 42, s: 0.36, l: 0.78 },
];

/** Lightness ladder inside a family: four rungs this far apart, centred on the family lightness. */
const LADDER_RUNGS = 4;
const LADDER_STEP = 0.07;

/** Ink variants of a rung: faded (greyer, hue pulled back) and fresh (more saturated, hue pushed on). */
const INK_VARIANTS: { h: number; s: number }[] = [
  { h: -5, s: -0.05 },
  { h: 8, s: 0.12 },
];

const CARDINALS: Cardinal[] = [
  { letter: 'N', angle: -Math.PI / 2, color: NORTH_RED },
  { letter: 'E', angle: 0, color: NAUTICAL_INK },
  { letter: 'S', angle: Math.PI / 2, color: NAUTICAL_INK },
  { letter: 'W', angle: Math.PI, color: NAUTICAL_INK },
];

/**
 * Maps any participant color onto desaturated parchment tones. The family is
 * chosen by hue; inside it the color lands on one of 8 slots (4 lightness rungs
 * x 2 ink variants) picked by a hash of its RGB bytes, so palette neighbours
 * with almost the same hue and lightness still get clearly different paper.
 * Greyscale input (highlight mode) becomes a faded, warm grey on the same ladder.
 *
 * The hash was checked against `COLORS.WHEEL` as `participantsToWheelItems`
 * assigns it: for every roster size up to the palette length, neighbouring
 * sectors of the same family (including the last-to-first pair) land on
 * different slots; on the default 20-name roster all neighbours differ by at
 * least 0.05 in lightness and about 10 dE.
 */
const toParchmentColor = (color: string): { fill: string; light: string; dark: string } => {
  const source = tinycolor(color);
  const hsl = source.toHsl();
  const { r, g, b } = source.toRgb();
  const isGrey = hsl.s < 0.05;

  const slot = (Math.round(r) * 3 + Math.round(g) * 4 + Math.round(b) * 6) % (LADDER_RUNGS * INK_VARIANTS.length);
  const lift = ((slot % LADDER_RUNGS) - (LADDER_RUNGS - 1) / 2) * LADDER_STEP;
  const variant = INK_VARIANTS[Math.floor(slot / LADDER_RUNGS)];

  let tone: ParchmentTone;
  if (isGrey) {
    tone = { h: 40, s: 0.08, l: 0.5 + hsl.l * 0.24 + lift * 0.4 };
  } else {
    const shifted = (Math.round(hsl.h) + 18) % 360;
    const family = TONE_FAMILIES[Math.min(TONE_FAMILIES.length - 1, Math.floor(shifted / 72))];
    tone = { h: (family.h + variant.h + 360) % 360, s: family.s + variant.s, l: family.l + lift };
  }

  const base = tinycolor({ h: tone.h, s: tone.s, l: tone.l });

  return {
    fill: base.toHexString(),
    light: base.clone().lighten(5).toHexString(),
    dark: base.clone().darken(7).desaturate(4).toHexString(),
  };
};

/** Small deterministic PRNG (mulberry32) so the cached paper grain does not shimmer between redraws. */
const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const NauticalSpinningWheel: FC<SpinningWheelProps> = (props) => {
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
          ctx.font = `bold ${scale(20)}px ${NAUTICAL_FONT}`;
          ctx.textBaseline = 'middle';

          const textRadius = fitSectorText(ctx, text, layout, { outerRatio: 0.84 }).startRadius;
          const centerAngle = endAngle - (endAngle - startAngle) / 2;

          ctx.translate(
            textRadius * Math.cos(centerAngle) + layout.center,
            textRadius * Math.sin(centerAngle) + layout.center,
          );
          ctx.rotate(centerAngle);

          // thin cream halo keeps the ink legible on teal and blue paper; no glow
          ctx.lineJoin = 'round';
          ctx.strokeStyle = `rgba(${CREAM_RGB}, 0.7)`;
          ctx.lineWidth = scale(3);
          ctx.strokeText(text, 0, 0);

          ctx.fillStyle = NAUTICAL_INK;
          ctx.fillText(text, 0, 0);

          ctx.restore();
        },
        drawSlice(ctx, item: WheelItemWithAngle, getColor: (item: WheelItem) => string, { layout, scale }) {
          const { startAngle, endAngle } = item;
          const { center } = layout;
          const { fill, light, dark } = toParchmentColor(getColor(item));
          const radius = layout.wheelRadius - scale(innerBorderWidth);
          const span = endAngle - startAngle;

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(center, center);
          ctx.arc(center, center, radius, startAngle, endAngle);
          ctx.closePath();

          const gradient = ctx.createRadialGradient(center, center, radius * 0.15, center, center, radius);
          gradient.addColorStop(0, light);
          gradient.addColorStop(0.5, fill);
          gradient.addColorStop(1, dark);
          ctx.fillStyle = gradient;
          ctx.fill();

          // paper grain, clipped to the sector
          ctx.clip();
          const random = createRandom(Math.floor(startAngle * 10007) + Math.floor(span * 7919) * 31);
          const dotCount = Math.min(140, Math.max(6, Math.round(span * 110)));
          for (let i = 0; i < dotCount; i++) {
            const angle = startAngle + random() * span;
            const distance = radius * (0.14 + random() * 0.82);
            const size = scale(0.5 + random() * 1.1);
            const alpha = 0.04 + random() * 0.08;
            ctx.fillStyle = random() < 0.3 ? `rgba(${CREAM_RGB}, ${alpha + 0.08})` : `rgba(${INK_RGB}, ${alpha})`;
            ctx.beginPath();
            ctx.arc(center + Math.cos(angle) * distance, center + Math.sin(angle) * distance, size, 0, 2 * Math.PI);
            ctx.fill();
          }

          // faint dashed chart lines under the label
          ctx.strokeStyle = `rgba(${INK_RGB}, 0.1)`;
          ctx.lineWidth = scale(1);
          ctx.setLineDash([scale(3), scale(4)]);
          [0.4, 0.74].forEach((factor) => {
            ctx.beginPath();
            ctx.arc(center, center, radius * factor, startAngle, endAngle);
            ctx.stroke();
          });
          ctx.setLineDash([]);
          ctx.restore();

          // ink divider
          ctx.save();
          ctx.strokeStyle = `rgba(${INK_RGB}, 0.7)`;
          ctx.lineWidth = scale(1.4);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(center, center);
          ctx.lineTo(center + Math.cos(startAngle) * radius, center + Math.sin(startAngle) * radius);
          ctx.stroke();
          ctx.restore();
        },
        afterDraw(ctx, _items, { layout, scale }) {
          const { center, canvasSize, wheelRadius } = layout;
          const innerRadius = wheelRadius - scale(borderWidth);
          // the longest labels (21 chars + ellipsis) end around wheelRadius - scale(16); keep the bezel clear of them
          const bandInner = wheelRadius - scale(15);

          // aged paper: sepia vignette towards the rim, clipped to the wheel
          ctx.save();
          ctx.beginPath();
          ctx.arc(center, center, innerRadius, 0, 2 * Math.PI);
          ctx.clip();
          const vignette = ctx.createRadialGradient(center, center, innerRadius * 0.5, center, center, innerRadius);
          vignette.addColorStop(0, 'rgba(96, 64, 24, 0)');
          vignette.addColorStop(1, 'rgba(96, 64, 24, 0.2)');
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, canvasSize, canvasSize);
          ctx.restore();

          ctx.save();

          // parchment bezel under the degree scale
          ctx.beginPath();
          ctx.arc(center, center, wheelRadius, 0, 2 * Math.PI);
          ctx.arc(center, center, bandInner, 0, 2 * Math.PI, true);
          ctx.fillStyle = BAND_FILL;
          ctx.fill();

          // degree ticks every 2.5°, longer every 10°, longest at the intercardinals
          const tickCount = 144;
          for (let i = 0; i < tickCount; i++) {
            if (i % 36 === 0) {
              continue; // cardinals carry a letter instead
            }

            const angle = (i * 2 * Math.PI) / tickCount;
            const isIntercardinal = i % 36 === 18;
            const isMajor = i % 4 === 0;
            const from = wheelRadius - scale(5.5);
            const to = wheelRadius - scale(isIntercardinal ? 13.5 : isMajor ? 11 : 8.5);
            ctx.strokeStyle = `rgba(${INK_RGB}, ${isMajor || isIntercardinal ? 0.9 : 0.5})`;
            ctx.lineWidth = scale(isIntercardinal ? 2 : isMajor ? 1.4 : 1);
            ctx.beginPath();
            ctx.moveTo(center + Math.cos(angle) * from, center + Math.sin(angle) * from);
            ctx.lineTo(center + Math.cos(angle) * to, center + Math.sin(angle) * to);
            ctx.stroke();
          }

          // outer ink ring
          ctx.strokeStyle = NAUTICAL_INK;
          ctx.lineWidth = scale(3.5);
          ctx.beginPath();
          ctx.arc(center, center, wheelRadius - scale(borderWidth) / 2, 0, 2 * Math.PI);
          ctx.stroke();

          // thin decorative second ring with a hairline companion
          ctx.lineWidth = scale(1.1);
          ctx.beginPath();
          ctx.arc(center, center, bandInner + scale(0.6), 0, 2 * Math.PI);
          ctx.stroke();

          ctx.strokeStyle = `rgba(${INK_RGB}, 0.45)`;
          ctx.lineWidth = scale(0.8);
          ctx.beginPath();
          ctx.arc(center, center, bandInner - scale(2.5), 0, 2 * Math.PI);
          ctx.stroke();

          // cardinal letters on small parchment discs, upright towards the rim
          const discRadius = scale(10);
          const discDistance = wheelRadius - scale(8.5);
          ctx.font = `bold ${scale(12.5)}px ${NAUTICAL_FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          CARDINALS.forEach(({ letter, angle, color }) => {
            const x = center + Math.cos(angle) * discDistance;
            const y = center + Math.sin(angle) * discDistance;

            ctx.fillStyle = DISC_FILL;
            ctx.strokeStyle = NAUTICAL_INK;
            ctx.lineWidth = scale(1.4);
            ctx.beginPath();
            ctx.arc(x, y, discRadius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle + Math.PI / 2);
            ctx.fillStyle = color;
            ctx.fillText(letter, 0, scale(1));
            ctx.restore();
          });

          // pivot rings framing the hub
          const hubRadius = wheelRadius * 0.2;
          ctx.strokeStyle = `rgba(${INK_RGB}, 0.85)`;
          ctx.lineWidth = scale(2);
          ctx.beginPath();
          ctx.arc(center, center, hubRadius + scale(5), 0, 2 * Math.PI);
          ctx.stroke();

          ctx.strokeStyle = `rgba(${INK_RGB}, 0.4)`;
          ctx.lineWidth = scale(1);
          ctx.beginPath();
          ctx.arc(center, center, hubRadius + scale(10), 0, 2 * Math.PI);
          ctx.stroke();

          ctx.restore();
        },
      }}
    />
  );
};

NauticalSpinningWheel.displayName = 'NauticalSpinningWheel';

export default NauticalSpinningWheel;
