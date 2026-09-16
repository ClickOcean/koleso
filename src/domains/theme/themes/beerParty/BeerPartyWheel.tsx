import { useMemo } from 'react';
import tinycolor from 'tinycolor2';

import { fitText } from '@utils/common.utils';
import { WheelItem, WheelItemWithAngle } from '@models/wheel.model';
import CanvasSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/CanvasSpinningWheel';
import { fitSectorText } from '@domains/wheel/BaseWheel/parts/sectorText';

import { createSectorPalette } from './beerPalette';
import {
  BEER_CREAM,
  BEER_DARK,
  BEER_FONT,
  FOAM_BASE_INNER,
  FOAM_BASE_OUTER,
  FOAM_BUBBLE_COUNT,
  FOAM_BUBBLE_MAX,
  FOAM_BUBBLE_MIN,
  FOAM_CREAM,
  FOAM_LINE,
  FOAM_RING_OFFSET,
  FOAM_WHITE,
  WOOD_INNER,
  WOOD_OUTER,
} from './beerPartyTokens';
import { createSeededRandom, hashString } from './seededRandom';

import type { FC } from 'react';
import type { SpinningWheelProps } from '@domains/wheel/BaseWheel/parts/types';

const innerBorderWidth = 2;
const maxTextLength = 21;
/** Fixed seed for the foam ring and caps, so the cached wheel redraws identically */
const RIM_SEED = 0xbee12;
const TWO_PI = 2 * Math.PI;

type Scale = (value: number) => number;
const BeerPartySpinningWheel: FC<SpinningWheelProps> = (props) => {
  // lightness variants follow sector order, so they are fixed per draw pass in beforeDraw
  const palette = useMemo(() => createSectorPalette(), []);

  return (
    <CanvasSpinningWheel
      {...props}
      renderer={{
        beforeDraw(_ctx, items) {
          palette.beginPass(items);
        },
        drawText(ctx, { id, startAngle, endAngle, name, displayName }: WheelItemWithAngle, { layout, scale }) {
          if ((endAngle - startAngle) / Math.PI / 2 < 0.016) {
            return;
          }

          const radius = layout.wheelRadius - scale(3);
          const text = fitText(displayName || name, maxTextLength).toUpperCase();

          ctx.save();
          ctx.font = `${scale(19)}px ${BEER_FONT}`;
          ctx.textBaseline = 'middle';

          const textRadius = fitSectorText(ctx, text, layout, { outerRatio: 0.84 }).startRadius;
          const centerAngle = endAngle - (endAngle - startAngle) / 2;

          ctx.translate(
            textRadius * Math.cos(centerAngle) + layout.center,
            textRadius * Math.sin(centerAngle) + layout.center,
          );
          ctx.rotate(centerAngle);

          ctx.lineJoin = 'round';
          ctx.shadowOffsetX = scale(1);
          ctx.shadowOffsetY = scale(1.5);
          ctx.shadowBlur = scale(3);
          ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';

          if (palette.isLightFor(id)) {
            // dark brown glyphs on lager with a thin cream halo so they stay crisp
            ctx.strokeStyle = 'rgba(255, 246, 220, 0.85)';
            ctx.lineWidth = scale(1.6);
            ctx.strokeText(text, 0, 0);
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = BEER_DARK;
          } else {
            ctx.strokeStyle = 'rgba(20, 8, 2, 0.9)';
            ctx.lineWidth = scale(2.4);
            ctx.strokeText(text, 0, 0);
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = BEER_CREAM;
          }
          ctx.fillText(text, 0, 0);

          ctx.restore();
        },
        drawSlice(ctx, item: WheelItemWithAngle, getColor: (item: WheelItem) => string, { layout, scale }) {
          const { startAngle, endAngle } = item;
          const { fill, sheen, shade } = palette.colorsFor(item, getColor);
          const { center } = layout;
          const radius = layout.wheelRadius - scale(innerBorderWidth);
          const span = endAngle - startAngle;
          const random = createSeededRandom(hashString(String(item.id)));

          const wedge = () => {
            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius, startAngle, endAngle);
            ctx.closePath();
          };
          const ringArc = (distance: number) => {
            ctx.beginPath();
            ctx.arc(center, center, distance, startAngle, endAngle);
            ctx.stroke();
          };

          ctx.save();

          // beer: lit through near the hub, darker where the glass thickens at the edge
          const beer = ctx.createRadialGradient(center, center, radius * 0.06, center, center, radius);
          beer.addColorStop(0, shade);
          beer.addColorStop(0.18, sheen);
          beer.addColorStop(0.5, fill);
          beer.addColorStop(0.88, fill);
          beer.addColorStop(1, shade);
          wedge();
          ctx.fillStyle = beer;
          ctx.fill();

          wedge();
          ctx.clip();

          // wet glass: a light band along the leading edge, fading into the sector
          const bandCount = 4;
          const bandSpan = Math.min(span * 0.24, 0.16);
          for (let index = 0; index < bandCount; index++) {
            ctx.fillStyle = `rgba(255, 250, 230, ${0.16 - index * 0.04})`;
            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(
              center,
              center,
              radius,
              startAngle + (bandSpan * index) / bandCount,
              startAngle + (bandSpan * (index + 1)) / bandCount,
            );
            ctx.closePath();
            ctx.fill();
          }

          // reflection ring across the glass and a darker meniscus at its edge
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
          ctx.lineWidth = radius * 0.08;
          ringArc(radius * 0.63);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.lineWidth = scale(1.8);
          ringArc(radius * 0.685);
          ctx.strokeStyle = 'rgba(60, 30, 5, 0.3)';
          ctx.lineWidth = radius * 0.06;
          ringArc(radius * 0.97);

          // tiny bubbles, seeded per participant so the cached wheel redraws them in place
          const bubbleCount = Math.max(3, Math.min(16, Math.round((span / TWO_PI) * 200)));
          const margin = Math.min(span * 0.12, 0.04);
          for (let index = 0; index < bubbleCount; index++) {
            const angle = startAngle + margin + random() * (span - 2 * margin);
            const distance = radius * (0.26 + random() * 0.66);
            const size = scale(1.1 + random() * 2.1);
            const x = center + Math.cos(angle) * distance;
            const y = center + Math.sin(angle) * distance;

            ctx.fillStyle = `rgba(255, 252, 240, ${(0.3 + random() * 0.4).toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, TWO_PI);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.3, 0, TWO_PI);
            ctx.fill();
          }

          ctx.restore();

          // foam dividers on both edges so every boundary ends up fully on top
          ctx.save();
          ctx.lineCap = 'round';
          [startAngle, endAngle].forEach((angle) => {
            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.lineTo(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius);

            ctx.strokeStyle = 'rgba(50, 28, 8, 0.6)';
            ctx.lineWidth = scale(3.6);
            ctx.stroke();

            ctx.strokeStyle = FOAM_LINE;
            ctx.lineWidth = scale(1.8);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.lineWidth = scale(0.6);
            ctx.stroke();
          });

          // a couple of drops that ran down the leading divider from the foam
          for (let index = 0; index < 2; index++) {
            const distance = radius - scale(12 + index * 20 + random() * 10);
            const angle = startAngle + Math.min(span * 0.25, scale(3.2) / distance);
            const dropSize = scale(2.4 + random() * 1.2);
            const x = center + Math.cos(angle) * distance;
            const y = center + Math.sin(angle) * distance;
            const tailDistance = distance + scale(7);

            ctx.strokeStyle = FOAM_LINE;
            ctx.lineWidth = scale(1.4);
            ctx.beginPath();
            ctx.moveTo(center + Math.cos(startAngle) * tailDistance, center + Math.sin(startAngle) * tailDistance);
            ctx.lineTo(x, y);
            ctx.stroke();

            ctx.fillStyle = FOAM_LINE;
            ctx.beginPath();
            ctx.arc(x, y, dropSize, 0, TWO_PI);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.beginPath();
            ctx.arc(x - dropSize * 0.3, y - dropSize * 0.3, dropSize * 0.32, 0, TWO_PI);
            ctx.fill();
          }
          ctx.restore();
        },
        afterDraw(ctx, _items, { layout, scale }) {
          const { center, canvasSize, wheelRadius } = layout;
          const beerRadius = wheelRadius - scale(innerBorderWidth);
          const woodInner = wheelRadius - scale(WOOD_INNER);
          const woodOuter = wheelRadius + scale(WOOD_OUTER);
          const foamInner = wheelRadius + scale(FOAM_BASE_INNER);
          const foamOuter = wheelRadius + scale(FOAM_BASE_OUTER);
          const foamRadius = wheelRadius + scale(FOAM_RING_OFFSET);
          const random = createSeededRandom(RIM_SEED);

          const ring = (distance: number, width: number, style: string | CanvasGradient) => {
            ctx.strokeStyle = style;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.arc(center, center, distance, 0, TWO_PI);
            ctx.stroke();
          };

          // vignette and hub shadow on the beer, clipped to the wheel
          ctx.save();
          ctx.beginPath();
          ctx.arc(center, center, beerRadius, 0, TWO_PI);
          ctx.clip();

          const vignette = ctx.createRadialGradient(center, center, beerRadius * 0.6, center, center, beerRadius);
          vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
          vignette.addColorStop(0.85, 'rgba(0, 0, 0, 0.14)');
          vignette.addColorStop(1, 'rgba(0, 0, 0, 0.36)');
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, canvasSize, canvasSize);

          const hubShadow = ctx.createRadialGradient(center, center, 0, center, center, beerRadius * 0.3);
          hubShadow.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
          hubShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = hubShadow;
          ctx.fillRect(0, 0, canvasSize, canvasSize);
          ctx.restore();

          // dark wood bar counter around the glass
          ctx.save();
          ring(woodInner - scale(0.8), scale(1.6), 'rgba(0, 0, 0, 0.5)');

          const wood = ctx.createRadialGradient(center, center, woodInner, center, center, woodOuter);
          wood.addColorStop(0, '#2a1608');
          wood.addColorStop(0.15, '#5a3416');
          wood.addColorStop(0.5, '#43250d');
          wood.addColorStop(0.85, '#5c3a19');
          wood.addColorStop(1, '#1e1006');
          ring((woodInner + woodOuter) / 2, woodOuter - woodInner, wood);

          for (let index = 0; index < 28; index++) {
            const distance = woodInner + scale(1) + random() * (woodOuter - woodInner - scale(2));
            const start = random() * TWO_PI;
            ctx.strokeStyle = `rgba(0, 0, 0, ${(0.12 + random() * 0.18).toFixed(2)})`;
            ctx.lineWidth = scale(0.6 + random() * 0.7);
            ctx.beginPath();
            ctx.arc(center, center, distance, start, start + 0.3 + random() * 1.4);
            ctx.stroke();
          }

          ring(woodInner + scale(0.7), scale(1.4), 'rgba(255, 226, 170, 0.35)');
          ring(beerRadius + scale(0.4), scale(1.2), 'rgba(255, 244, 210, 0.5)');
          ctx.restore();

          // foam ring: soft translucent bubbles of many sizes over a cream base, shaded like real head
          ctx.save();
          ring((foamInner + foamOuter) / 2 + scale(2), foamOuter - foamInner + scale(4), 'rgba(60, 35, 10, 0.4)');

          const foamBase = ctx.createRadialGradient(center, center, foamInner, center, center, foamOuter);
          foamBase.addColorStop(0, '#e6d3a6');
          foamBase.addColorStop(0.35, '#f7ecd2');
          foamBase.addColorStop(0.7, '#fbf3df');
          foamBase.addColorStop(1, '#e9d8b0');
          ring((foamInner + foamOuter) / 2, foamOuter - foamInner, foamBase);

          // big lazy bubbles first, small ones on top; no hard outlines, just a faint shadow on the far side
          const foamLayers: [number, number, number, number][] = [
            // count, min size, max size, alpha
            [90, 9, 15, 0.78],
            [170, 5, 9, 0.85],
            [260, 2.2, 5, 0.9],
          ];
          foamLayers.forEach(([count, minSize, maxSize, alpha]) => {
            for (let index = 0; index < count; index++) {
              const angle = random() * TWO_PI;
              const spread = (random() + random() - 1) * scale(12);
              const distance = foamRadius + spread;
              const size = scale(minSize + random() * (maxSize - minSize));
              const x = center + Math.cos(angle) * distance;
              const y = center + Math.sin(angle) * distance;
              // light comes from the top-left of the screen
              const lx = x - size * 0.35;
              const ly = y - size * 0.35;

              ctx.globalAlpha = alpha;
              const body = ctx.createRadialGradient(lx, ly, size * 0.1, x, y, size);
              body.addColorStop(0, '#fffdf7');
              body.addColorStop(0.55, '#f9efd8');
              body.addColorStop(0.92, '#eadcb6');
              body.addColorStop(1, 'rgba(200, 175, 125, 0.55)');
              ctx.fillStyle = body;
              ctx.beginPath();
              ctx.arc(x, y, size, 0, TWO_PI);
              ctx.fill();

              // glossy highlight
              ctx.globalAlpha = alpha * 0.9;
              ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
              ctx.beginPath();
              ctx.arc(lx, ly, size * 0.22, 0, TWO_PI);
              ctx.fill();
            }
          });
          ctx.globalAlpha = 1;

          // shadow where the head meets the beer, and a warm tint towards the counter
          const foamShade = ctx.createRadialGradient(
            center,
            center,
            foamInner - scale(2),
            center,
            center,
            foamOuter + scale(2),
          );
          foamShade.addColorStop(0, 'rgba(120, 80, 30, 0.35)');
          foamShade.addColorStop(0.18, 'rgba(120, 80, 30, 0)');
          foamShade.addColorStop(0.85, 'rgba(160, 120, 60, 0)');
          foamShade.addColorStop(1, 'rgba(120, 80, 30, 0.28)');
          ring((foamInner + foamOuter) / 2, foamOuter - foamInner + scale(4), foamShade);
          ctx.restore();

          // foam running over the counter onto the beer
          ctx.save();
          ctx.lineCap = 'round';
          for (let index = 0; index < 5; index++) {
            const angle = random() * TWO_PI;
            const from = wheelRadius + scale(8);
            const to = wheelRadius - scale(8 + random() * 14);
            const width = scale(4 + random() * 3);
            const fromX = center + Math.cos(angle) * from;
            const fromY = center + Math.sin(angle) * from;
            const toX = center + Math.cos(angle) * to;
            const toY = center + Math.sin(angle) * to;

            ctx.strokeStyle = 'rgba(60, 35, 10, 0.4)';
            ctx.lineWidth = width + scale(2);
            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(toX + scale(1), toY + scale(1.4));
            ctx.stroke();

            ctx.strokeStyle = '#fbf2dc';
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(toX, toY);
            ctx.stroke();

            ctx.fillStyle = FOAM_WHITE;
            ctx.beginPath();
            ctx.arc(toX, toY, width * 0.62, 0, TWO_PI);
            ctx.fill();
          }
          ctx.restore();
        },
      }}
    />
  );
};

BeerPartySpinningWheel.displayName = 'BeerPartySpinningWheel';

export default BeerPartySpinningWheel;
