import { useMemo } from 'react';

import { fitText } from '@utils/common.utils';
import { WheelItem, WheelItemWithAngle } from '@models/wheel.model';
import CanvasSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/CanvasSpinningWheel';
import { fitSectorText } from '@domains/wheel/BaseWheel/parts/sectorText';

import { createSectorPalette, TextStyle } from './highSocietyPalette';
import {
  BAND_INNER,
  BAND_OUTER,
  GLOW_REACH,
  HS_BLACK,
  HS_GOLD,
  HS_GOLD_LIGHT,
  HS_GOLD_PALE,
  HS_SERIF,
  SECTOR_INSET,
  TICK_OUTER,
} from './highSocietyTokens';

import type { FC } from 'react';
import type { SpinningWheelProps } from '@domains/wheel/BaseWheel/parts/types';

const maxTextLength = 21;
const RAY_COUNT = 144;
const TICK_COUNT = 96;

/** Metallic gold: light from the top-left, a darker turn and a second glint towards the bottom-right */
const goldMetal = (ctx: CanvasRenderingContext2D, center: number, radius: number): CanvasGradient => {
  const gradient = ctx.createLinearGradient(center - radius, center - radius, center + radius, center + radius);
  gradient.addColorStop(0, HS_GOLD_PALE);
  gradient.addColorStop(0.3, HS_GOLD_LIGHT);
  gradient.addColorStop(0.5, HS_GOLD);
  gradient.addColorStop(0.72, '#8f6d12');
  gradient.addColorStop(1, '#efd27a');

  return gradient;
};

/** Glyph fill and outline for the three text treatments; gradients span the glyph height */
const glyphStyle = (
  ctx: CanvasRenderingContext2D,
  style: TextStyle,
  halfHeight: number,
): { fill: string | CanvasGradient; stroke: string; glow: string | null } => {
  const gradient = ctx.createLinearGradient(0, -halfHeight, 0, halfHeight);

  if (style === 'gold') {
    gradient.addColorStop(0, HS_GOLD_PALE);
    gradient.addColorStop(0.5, '#e6c45c');
    gradient.addColorStop(1, '#b8901a');

    return { fill: gradient, stroke: 'rgba(8, 5, 2, 0.9)', glow: 'rgba(201, 162, 39, 0.45)' };
  }

  if (style === 'muted') {
    return { fill: '#b9b1a3', stroke: 'rgba(0, 0, 0, 0.8)', glow: null };
  }

  gradient.addColorStop(0, '#3d2f20');
  gradient.addColorStop(0.55, '#241a10');
  gradient.addColorStop(1, '#3a2a16');

  return { fill: gradient, stroke: 'rgba(255, 248, 232, 0.85)', glow: null };
};

/**
 * Art-deco champagne wheel: ivory and black satin sectors alternate by order, the
 * participant hue survives as a jewel inlay under a gold sunburst rim, and the
 * outer black band carries small gold ticks.
 */
const HighSocietySpinningWheel: FC<SpinningWheelProps> = (props) => {
  // families follow sector order (ivory, black, ivory, ...), so they are fixed per
  // draw pass in beforeDraw and looked up per sector in drawSlice / drawText
  const palette = useMemo(() => createSectorPalette(), []);

  return (
    <CanvasSpinningWheel
      {...props}
      renderer={{
        beforeDraw(_ctx, items) {
          palette.beginPass(items);
        },
        drawText(ctx, item: WheelItemWithAngle, { layout, scale }) {
          const { startAngle, endAngle, name, displayName } = item;
          if ((endAngle - startAngle) / Math.PI / 2 < 0.016) {
            return;
          }

          const text = fitText(displayName || name, maxTextLength);

          ctx.save();
          ctx.font = `italic bold ${scale(19)}px ${HS_SERIF}`;
          ctx.textBaseline = 'middle';

          // shared label geometry: the name ends at 0.88 R, clear of the inner gold ring at
          // R - 14, and the font shrinks when a long name does not fit between hub and ring
          const { startRadius: textRadius, fontPx } = fitSectorText(ctx, text, layout, { outerRatio: 0.88 });
          const centerAngle = endAngle - (endAngle - startAngle) / 2;

          ctx.translate(
            textRadius * Math.cos(centerAngle) + layout.center,
            textRadius * Math.sin(centerAngle) + layout.center,
          );
          ctx.rotate(centerAngle);

          const { fill, stroke, glow } = glyphStyle(ctx, palette.textFor(item), fontPx / 2);

          // thin outline in the opposite tone lifts the glyphs off the satin
          ctx.lineJoin = 'round';
          ctx.strokeStyle = stroke;
          ctx.lineWidth = scale(3);
          ctx.strokeText(text, 0, 0);

          if (glow) {
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = scale(6);
            ctx.shadowColor = glow;
          }
          ctx.fillStyle = fill;
          ctx.fillText(text, 0, 0);

          ctx.restore();
        },
        drawSlice(ctx, item: WheelItemWithAngle, getColor: (item: WheelItem) => string, { layout, scale }) {
          const { startAngle, endAngle } = item;
          const { fill, sheen, edge, tint } = palette.colorsFor(item, getColor);
          const { center } = layout;
          const radius = layout.wheelRadius - scale(SECTOR_INSET);
          const bandInner = layout.wheelRadius - scale(BAND_INNER);
          const bandOuter = layout.wheelRadius + scale(BAND_OUTER);

          ctx.save();

          // satin: shaded at the hub, a soft sheen band, darker again towards the rim
          const satin = ctx.createRadialGradient(center, center, radius * 0.06, center, center, radius);
          satin.addColorStop(0, edge);
          satin.addColorStop(0.18, sheen);
          satin.addColorStop(0.5, fill);
          satin.addColorStop(0.74, sheen);
          satin.addColorStop(1, edge);

          ctx.fillStyle = satin;
          ctx.beginPath();
          ctx.moveTo(center, center);
          ctx.arc(center, center, radius, startAngle, endAngle);
          ctx.closePath();
          ctx.fill();

          // jewel inlay: the only place the participant's own hue shows, under the sunburst rays
          ctx.fillStyle = tint;
          ctx.beginPath();
          ctx.arc(center, center, bandOuter, startAngle, endAngle);
          ctx.arc(center, center, bandInner, endAngle, startAngle, true);
          ctx.closePath();
          ctx.fill();

          // fine double gold dividers on both edges so every boundary ends up fully on top
          [startAngle, endAngle].forEach((angle) => {
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            const nx = -dy;
            const ny = dx;

            const spoke = (offset: number, width: number, style: string) => {
              ctx.strokeStyle = style;
              ctx.lineWidth = width;
              ctx.beginPath();
              ctx.moveTo(center + nx * offset, center + ny * offset);
              ctx.lineTo(center + dx * bandOuter + nx * offset, center + dy * bandOuter + ny * offset);
              ctx.stroke();
            };

            spoke(0, scale(3.6), 'rgba(12, 9, 5, 0.92)');
            spoke(-scale(1), scale(0.9), HS_GOLD);
            spoke(scale(1), scale(0.9), HS_GOLD);
          });

          ctx.restore();
        },
        afterDraw(ctx, _items, { layout, scale }) {
          const { center, canvasSize, wheelRadius } = layout;
          const sectorRadius = wheelRadius - scale(SECTOR_INSET);
          const bandInner = wheelRadius - scale(BAND_INNER);
          const bandOuter = wheelRadius + scale(BAND_OUTER);
          const tickOuter = wheelRadius + scale(TICK_OUTER);
          const glowReach = wheelRadius + scale(GLOW_REACH);

          const ring = (radius: number, width: number, style: string | CanvasGradient) => {
            ctx.strokeStyle = style;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, 2 * Math.PI);
            ctx.stroke();
          };

          const spokes = (count: number, from: number, to: number, width: number, style: string, every = 1) => {
            ctx.strokeStyle = style;
            ctx.lineWidth = width;
            ctx.beginPath();
            for (let i = 0; i < count; i += every) {
              const angle = (i * 2 * Math.PI) / count;
              ctx.moveTo(center + Math.cos(angle) * from, center + Math.sin(angle) * from);
              ctx.lineTo(center + Math.cos(angle) * to, center + Math.sin(angle) * to);
            }
            ctx.stroke();
          };

          // vignette and hub shadow on the satin, clipped to the sectors
          ctx.save();
          ctx.beginPath();
          ctx.arc(center, center, sectorRadius, 0, 2 * Math.PI);
          ctx.clip();

          const vignette = ctx.createRadialGradient(center, center, sectorRadius * 0.6, center, center, sectorRadius);
          vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
          vignette.addColorStop(0.85, 'rgba(0, 0, 0, 0.1)');
          vignette.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, canvasSize, canvasSize);

          const hubShadow = ctx.createRadialGradient(center, center, 0, center, center, sectorRadius * 0.24);
          hubShadow.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
          hubShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = hubShadow;
          ctx.fillRect(0, 0, canvasSize, canvasSize);
          ctx.restore();

          ctx.save();

          // shadow the inner ring casts onto the satin
          ring(bandInner - scale(2.6), scale(2.6), 'rgba(0, 0, 0, 0.35)');

          // depth on the inlay band so the participant hue stays a tint
          const bandShade = ctx.createRadialGradient(center, center, bandInner, center, center, bandOuter);
          bandShade.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
          bandShade.addColorStop(0.3, 'rgba(0, 0, 0, 0.08)');
          bandShade.addColorStop(0.7, 'rgba(0, 0, 0, 0.08)');
          bandShade.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
          ring((bandInner + bandOuter) / 2, bandOuter - bandInner, bandShade);

          // art-deco sunburst: thin gold rays between the two rings, every fourth one longer
          spokes(RAY_COUNT, bandInner + scale(3.6), bandOuter - scale(3.6), scale(0.8), 'rgba(201, 162, 39, 0.72)');
          spokes(RAY_COUNT, bandInner + scale(1.8), bandOuter - scale(1.8), scale(1.3), 'rgba(242, 215, 122, 0.9)', 4);

          // the two gold rings that frame the sunburst
          ring(bandInner, scale(2.4), goldMetal(ctx, center, bandInner));
          ring(bandInner - scale(1.9), scale(0.7), 'rgba(255, 240, 190, 0.6)');
          ring(bandOuter, scale(2.4), goldMetal(ctx, center, bandOuter));

          // outer black band with small gold tick marks
          const tickInner = bandOuter + scale(1.2);
          ring((tickInner + tickOuter) / 2, tickOuter - tickInner, HS_BLACK);
          spokes(TICK_COUNT, wheelRadius + scale(10.5), wheelRadius + scale(15.5), scale(1), 'rgba(201, 162, 39, 0.8)');
          spokes(TICK_COUNT, wheelRadius + scale(8.5), wheelRadius + scale(17.5), scale(1.6), '#e6c45c', 8);

          ring(tickOuter, scale(2.6), goldMetal(ctx, center, tickOuter));
          ring(tickOuter + scale(1.9), scale(1), 'rgba(0, 0, 0, 0.65)');

          // soft gold glow spilling outwards from the rim
          const glow = ctx.createRadialGradient(center, center, tickOuter + scale(2), center, center, glowReach);
          glow.addColorStop(0, 'rgba(201, 162, 39, 0.3)');
          glow.addColorStop(0.4, 'rgba(201, 162, 39, 0.1)');
          glow.addColorStop(1, 'rgba(201, 162, 39, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(center, center, glowReach, 0, 2 * Math.PI);
          ctx.arc(center, center, tickOuter + scale(2), 0, 2 * Math.PI, true);
          ctx.fill();

          ctx.restore();
        },
      }}
    />
  );
};

HighSocietySpinningWheel.displayName = 'HighSocietySpinningWheel';

export default HighSocietySpinningWheel;
