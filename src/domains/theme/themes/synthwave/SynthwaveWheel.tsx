import tinycolor from 'tinycolor2';

import { fitText } from '@utils/common.utils';
import { WheelItem, WheelItemWithAngle } from '@models/wheel.model';
import CanvasSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/CanvasSpinningWheel';
import { fitSectorText } from '@domains/wheel/BaseWheel/parts/sectorText';

import { SYNTH_CYAN, SYNTH_FONT, SYNTH_NAVY, SYNTH_PINK } from './palette';

import type { FC } from 'react';
import type { SpinningWheelProps } from '@domains/wheel/BaseWheel/parts/types';

const borderWidth = 5;
const innerBorderWidth = 2;
const maxTextLength = 21;

interface SectorPalette {
  /** Neon version of the participant color: dividers and glow */
  neon: string;
  /** Sector fill near the hub */
  core: string;
  /** Sector fill in the middle */
  fill: string;
  /** Sector fill at the rim */
  edge: string;
}

/**
 * Keeps the participant color but squeezes the whole hue circle into the
 * cyan → blue → purple → magenta → pink arc, so every sector reads as neon
 * while neighbours stay distinguishable. The fill is that neon mixed into
 * dark navy; greyscale input (highlight mode) stays a muted blue-grey.
 *
 * Two independent things keep look-alike inputs apart (the default palette
 * has four blues within a few degrees of hue and the same lightness):
 * - `depth` hashes lightness *and* saturation into 19 levels and drives how far
 *   the fill leaves the navy (18–37 % in the middle, 38–57 % at the rim), so
 *   colors that agree on one of the two still land on different levels;
 * - saturation also nudges the neon hue by up to ±16°, vivid inputs toward the
 *   pink end and pale ones toward cyan, so the dividers of such pairs separate
 *   even when the hash puts them on the same level.
 */
const toSynthwaveColor = (color: string): SectorPalette => {
  const hsl = tinycolor(color).toHsl();
  const isGrey = hsl.s < 0.05;
  const normalizedHue = ((hsl.h % 360) + 360) % 360;
  const depth = ((Math.round(hsl.l * 100) * 7 + Math.round(hsl.s * 100) * 6) % 19) / 18; // 0..1
  const hue = isGrey ? 250 : 182 + (normalizedHue / 360) * 162 + (hsl.s - 0.5) * 32;

  const neon = tinycolor({
    h: hue,
    s: isGrey ? 0.06 : 1,
    l: isGrey ? 0.5 : 0.55 + depth * 0.13,
  }).toHexString();
  const towardNeon = (amount: number): string => tinycolor.mix(SYNTH_NAVY, neon, amount).toHexString();

  return {
    neon,
    core: towardNeon(6 + depth * 10),
    fill: towardNeon(18 + depth * 19),
    edge: towardNeon(38 + depth * 19),
  };
};

const SynthwaveSpinningWheel: FC<SpinningWheelProps> = (props) => {
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
          ctx.font = `italic 900 ${scale(18)}px ${SYNTH_FONT}`;
          ctx.textBaseline = 'middle';

          const textRadius = fitSectorText(ctx, text, layout, { outerRatio: 0.88 }).startRadius;
          const centerAngle = endAngle - (endAngle - startAngle) / 2;

          ctx.translate(
            textRadius * Math.cos(centerAngle) + layout.center,
            textRadius * Math.sin(centerAngle) + layout.center,
          );
          ctx.rotate(centerAngle);

          // dark halo keeps the glyphs legible over neon dividers
          ctx.lineJoin = 'round';
          ctx.strokeStyle = 'rgba(6, 3, 22, 0.85)';
          ctx.lineWidth = scale(4);
          ctx.strokeText(text, 0, 0);

          // chromatic aberration: cyan copy to the left, magenta copy to the right
          const shift = scale(1.5);
          ctx.fillStyle = 'rgba(30, 242, 255, 0.85)';
          ctx.fillText(text, -shift, 0);
          ctx.fillStyle = 'rgba(255, 45, 149, 0.85)';
          ctx.fillText(text, shift, 0);

          // white body with a soft glow
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(8);
          ctx.shadowColor = 'rgba(255, 255, 255, 0.55)';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, 0, 0);

          ctx.restore();
        },
        drawSlice(ctx, item: WheelItemWithAngle, getColor: (item: WheelItem) => string, { layout, scale }) {
          const { startAngle, endAngle } = item;
          const { neon, core, fill, edge } = toSynthwaveColor(getColor(item));
          const { center } = layout;
          const radius = layout.wheelRadius - scale(innerBorderWidth);

          ctx.save();

          const gradient = ctx.createRadialGradient(center, center, radius * 0.12, center, center, radius);
          gradient.addColorStop(0, core);
          gradient.addColorStop(0.55, fill);
          gradient.addColorStop(1, edge);

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.moveTo(center, center);
          ctx.arc(center, center, radius, startAngle, endAngle);
          ctx.closePath();
          ctx.fill();

          // faint arcs echoing the floor grid
          ctx.strokeStyle = tinycolor(neon).setAlpha(0.14).toRgbString();
          ctx.lineWidth = scale(1);
          [0.42, 0.6, 0.76, 0.9].forEach((factor) => {
            ctx.beginPath();
            ctx.arc(center, center, radius * factor, startAngle, endAngle);
            ctx.stroke();
          });

          // neon dividers on both edges: the slice drawn later repaints the shared
          // edge on top of its own fill, so every boundary ends up fully lit
          ctx.lineCap = 'round';
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(10);
          ctx.shadowColor = tinycolor(neon).setAlpha(0.95).toRgbString();
          ctx.strokeStyle = tinycolor.mix(neon, '#ffffff', 45).toHexString();
          ctx.lineWidth = scale(1.6);
          const dividerStart = radius * 0.08;
          [startAngle, endAngle].forEach((angle) => {
            ctx.beginPath();
            ctx.moveTo(center + Math.cos(angle) * dividerStart, center + Math.sin(angle) * dividerStart);
            ctx.lineTo(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius);
            ctx.stroke();
          });

          ctx.restore();
        },
        afterDraw(ctx, _items, { layout, scale }) {
          const { center, canvasSize } = layout;
          const pinkRadius = layout.wheelRadius - scale(borderWidth) / 2;
          const innerRadius = layout.wheelRadius - scale(borderWidth);
          const cyanRadius = innerRadius - scale(10);

          ctx.save();

          // everything inside the rim: faint scanlines, vignette, dark band under the rings
          ctx.beginPath();
          ctx.arc(center, center, innerRadius, 0, 2 * Math.PI);
          ctx.clip();

          ctx.fillStyle = 'rgba(0, 0, 0, 0.07)';
          const step = Math.max(3, scale(4));
          for (let y = 0; y < canvasSize; y += step) {
            ctx.fillRect(0, y, canvasSize, Math.max(1, scale(1.2)));
          }

          const vignette = ctx.createRadialGradient(center, center, innerRadius * 0.55, center, center, innerRadius);
          vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
          vignette.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, canvasSize, canvasSize);

          ctx.fillStyle = 'rgba(6, 3, 22, 0.55)';
          ctx.beginPath();
          ctx.arc(center, center, innerRadius, 0, 2 * Math.PI);
          ctx.arc(center, center, cyanRadius - scale(2), 0, 2 * Math.PI, true);
          ctx.fill();

          ctx.restore();

          ctx.save();
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          // outer pink ring with a hot core
          ctx.shadowBlur = scale(18);
          ctx.shadowColor = 'rgba(255, 45, 149, 0.95)';
          ctx.strokeStyle = SYNTH_PINK;
          ctx.lineWidth = scale(3.5);
          ctx.beginPath();
          ctx.arc(center, center, pinkRadius, 0, 2 * Math.PI);
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(255, 214, 236, 0.85)';
          ctx.lineWidth = scale(1);
          ctx.beginPath();
          ctx.arc(center, center, pinkRadius, 0, 2 * Math.PI);
          ctx.stroke();

          // inner cyan ring
          ctx.shadowBlur = scale(12);
          ctx.shadowColor = 'rgba(30, 242, 255, 0.9)';
          ctx.strokeStyle = SYNTH_CYAN;
          ctx.lineWidth = scale(2);
          ctx.beginPath();
          ctx.arc(center, center, cyanRadius, 0, 2 * Math.PI);
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(220, 255, 255, 0.8)';
          ctx.lineWidth = scale(0.8);
          ctx.beginPath();
          ctx.arc(center, center, cyanRadius, 0, 2 * Math.PI);
          ctx.stroke();

          // gauge ticks between the rings
          const tickCount = 48;
          for (let i = 0; i < tickCount; i++) {
            const angle = (i * 2 * Math.PI) / tickCount;
            const isMajor = i % 4 === 0;
            const from = cyanRadius + scale(3);
            const to = from + scale(isMajor ? 5 : 3);
            ctx.strokeStyle = isMajor ? 'rgba(255, 45, 149, 0.9)' : 'rgba(30, 242, 255, 0.55)';
            ctx.lineWidth = scale(isMajor ? 1.5 : 1);
            ctx.beginPath();
            ctx.moveTo(center + Math.cos(angle) * from, center + Math.sin(angle) * from);
            ctx.lineTo(center + Math.cos(angle) * to, center + Math.sin(angle) * to);
            ctx.stroke();
          }

          ctx.restore();
        },
      }}
    />
  );
};

SynthwaveSpinningWheel.displayName = 'SynthwaveSpinningWheel';

export default SynthwaveSpinningWheel;
