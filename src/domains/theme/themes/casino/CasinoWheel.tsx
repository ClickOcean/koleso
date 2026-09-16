import { useMemo } from 'react';

import { fitText } from '@utils/common.utils';
import { WheelItem, WheelItemWithAngle } from '@models/wheel.model';
import CanvasSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/CanvasSpinningWheel';
import { fitSectorText } from '@domains/wheel/BaseWheel/parts/sectorText';

import { createSectorPalette } from './casinoPalette';
import {
  BULB_RING_OFFSET,
  CASINO_CREAM,
  CASINO_GOLD,
  CASINO_SERIF,
  RIM_INNER,
  RIM_OUTER,
  TRACK_WIDTH,
} from './casinoTokens';

import type { FC } from 'react';
import type { SpinningWheelProps } from '@domains/wheel/BaseWheel/parts/types';

const innerBorderWidth = 2;
const maxTextLength = 21;

const CasinoSpinningWheel: FC<SpinningWheelProps> = (props) => {
  // pocket families follow sector order (red, black, red, ... with a green now and then),
  // so they are fixed per draw pass in beforeDraw and looked up per sector in drawSlice
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

          const radius = layout.wheelRadius - scale(3);
          const text = fitText(displayName || name, maxTextLength);

          ctx.save();
          ctx.font = `bold ${scale(20)}px ${CASINO_SERIF}`;
          ctx.textBaseline = 'middle';

          const textRadius = fitSectorText(ctx, text, layout, { outerRatio: 0.88 }).startRadius;
          const centerAngle = endAngle - (endAngle - startAngle) / 2;

          ctx.translate(
            textRadius * Math.cos(centerAngle) + layout.center,
            textRadius * Math.sin(centerAngle) + layout.center,
          );
          ctx.rotate(centerAngle);

          // dark outline plus a soft dark halo keeps cream glyphs readable on red felt
          ctx.lineJoin = 'round';
          ctx.strokeStyle = 'rgba(22, 6, 10, 0.92)';
          ctx.lineWidth = scale(4.5);
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(6);
          ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
          ctx.strokeText(text, 0, 0);

          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';

          const glyphGradient = ctx.createLinearGradient(0, -scale(9), 0, scale(9));
          glyphGradient.addColorStop(0, '#fff9e8');
          glyphGradient.addColorStop(0.55, CASINO_CREAM);
          glyphGradient.addColorStop(1, '#ecc866');
          ctx.fillStyle = glyphGradient;
          ctx.fillText(text, 0, 0);

          ctx.restore();
        },
        drawSlice(ctx, item: WheelItemWithAngle, getColor: (item: WheelItem) => string, { layout, scale }) {
          const { startAngle, endAngle } = item;
          const { fill, sheen, shade } = palette.colorsFor(item, getColor);
          const { center } = layout;
          const radius = layout.wheelRadius - scale(innerBorderWidth);

          ctx.save();

          // felt: a touch of lamp sheen near the hub, darker towards the rim
          const felt = ctx.createRadialGradient(center, center, radius * 0.08, center, center, radius);
          felt.addColorStop(0, shade);
          felt.addColorStop(0.22, sheen);
          felt.addColorStop(0.55, fill);
          felt.addColorStop(1, shade);

          ctx.fillStyle = felt;
          ctx.beginPath();
          ctx.moveTo(center, center);
          ctx.arc(center, center, radius, startAngle, endAngle);
          ctx.closePath();
          ctx.fill();

          // faint nap of the cloth
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.028)';
          ctx.lineWidth = scale(1);
          const napStep = scale(9);
          for (let r = radius * 0.3; r < radius; r += napStep) {
            ctx.beginPath();
            ctx.arc(center, center, r, startAngle, endAngle);
            ctx.stroke();
          }

          // gold dividers on both edges so every boundary ends up fully on top
          [startAngle, endAngle].forEach((angle) => {
            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.lineTo(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius);

            ctx.strokeStyle = 'rgba(48, 30, 4, 0.9)';
            ctx.lineWidth = scale(3.2);
            ctx.stroke();

            ctx.strokeStyle = CASINO_GOLD;
            ctx.lineWidth = scale(1.6);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 240, 190, 0.55)';
            ctx.lineWidth = scale(0.6);
            ctx.stroke();
          });

          ctx.restore();
        },
        afterDraw(ctx, _items, { layout, scale }) {
          const { center, canvasSize, wheelRadius } = layout;
          const feltRadius = wheelRadius - scale(innerBorderWidth);
          const rimInner = wheelRadius - scale(RIM_INNER);
          const rimOuter = wheelRadius + scale(RIM_OUTER);
          const trackRadius = wheelRadius + scale(BULB_RING_OFFSET);
          const trackWidth = scale(TRACK_WIDTH);

          const ring = (radius: number, width: number, style: string | CanvasGradient) => {
            ctx.strokeStyle = style;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.arc(center, center, radius, 0, 2 * Math.PI);
            ctx.stroke();
          };

          // vignette and hub shadow on the felt, clipped to the wheel
          ctx.save();
          ctx.beginPath();
          ctx.arc(center, center, feltRadius, 0, 2 * Math.PI);
          ctx.clip();

          const vignette = ctx.createRadialGradient(center, center, feltRadius * 0.55, center, center, feltRadius);
          vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
          vignette.addColorStop(0.8, 'rgba(0, 0, 0, 0.18)');
          vignette.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, canvasSize, canvasSize);

          const hubShadow = ctx.createRadialGradient(center, center, 0, center, center, feltRadius * 0.28);
          hubShadow.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
          hubShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = hubShadow;
          ctx.fillRect(0, 0, canvasSize, canvasSize);
          ctx.restore();

          ctx.save();
          // shadow the rim casts onto the felt
          ring(rimInner - scale(1.2), scale(2.4), 'rgba(0, 0, 0, 0.55)');

          // thick bevelled gold ring
          const rim = ctx.createRadialGradient(center, center, rimInner, center, center, rimOuter);
          rim.addColorStop(0, '#5a3f06');
          rim.addColorStop(0.1, '#f3d67a');
          rim.addColorStop(0.28, CASINO_GOLD);
          rim.addColorStop(0.5, '#b8860b');
          rim.addColorStop(0.72, CASINO_GOLD);
          rim.addColorStop(0.9, '#f0cf68');
          rim.addColorStop(1, '#4a3205');
          ring((rimInner + rimOuter) / 2, rimOuter - rimInner, rim);

          // recessed marquee channel; the sockets and bulbs live on the effects layer
          // so they stay put while the wheel (and this cached canvas) rotates
          ring(trackRadius, trackWidth, '#1d1104');
          ring(trackRadius - trackWidth / 2 + scale(0.8), scale(1.6), 'rgba(0, 0, 0, 0.6)');
          ring(trackRadius + trackWidth / 2 - scale(0.5), scale(1), 'rgba(255, 236, 170, 0.35)');

          // edge lines
          ring(rimOuter - scale(0.8), scale(1.6), 'rgba(30, 18, 2, 0.9)');
          ring(rimInner + scale(0.6), scale(1.2), 'rgba(255, 244, 200, 0.7)');
          ctx.restore();
        },
      }}
    />
  );
};

CasinoSpinningWheel.displayName = 'CasinoSpinningWheel';

export default CasinoSpinningWheel;
