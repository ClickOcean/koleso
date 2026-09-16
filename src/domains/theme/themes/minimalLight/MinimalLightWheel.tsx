import tinycolor from 'tinycolor2';

import { fitText } from '@utils/common.utils';
import { WheelItem, WheelItemWithAngle } from '@models/wheel.model';
import CanvasSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/CanvasSpinningWheel';
import { fitSectorText } from '@domains/wheel/BaseWheel/parts/sectorText';

import type { FC } from 'react';
import type { SpinningWheelProps } from '@domains/wheel/BaseWheel/parts/types';

const rimWidth = 2.5;
const maxTextLength = 21;

const TEXT_COLOR = '#1f2937';
const RIM_COLOR = '#d1d5db';
const HUB_BORDER_COLOR = '#e5e7eb';
const SANS_FONT = 'Inter, "Segoe UI", sans-serif';

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/**
 * Softens any participant color into a pastel: saturation drops by roughly a
 * third and lightness is pulled towards 80 %, while the hue is kept so
 * neighbouring sectors stay distinguishable. Greyscale input (highlight mode)
 * becomes a light neutral grey whose lightness still follows the source.
 */
const toPastel = (color: string): string => {
  const { h, s, l } = tinycolor(color).toHsl();

  if (s < 0.05) {
    return tinycolor({ h: 220, s: 0.05, l: clamp(0.74 + l * 0.16, 0.74, 0.9) }).toHexString();
  }

  return tinycolor({
    h,
    s: clamp(s * 0.7, 0.3, 0.6),
    l: clamp(0.8 + (l - 0.5) * 0.16, 0.74, 0.86),
  }).toHexString();
};

/** Calm light wheel: pastel sectors, hairline white dividers, thin grey rim with a soft shadow. */
const MinimalLightWheel: FC<SpinningWheelProps> = (props) => {
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
          ctx.font = `600 ${scale(18)}px ${SANS_FONT}`;
          ctx.textBaseline = 'middle';

          const textRadius = fitSectorText(ctx, text, layout, { outerRatio: 0.92 }).startRadius;
          const centerAngle = endAngle - (endAngle - startAngle) / 2;

          ctx.translate(
            textRadius * Math.cos(centerAngle) + layout.center,
            textRadius * Math.sin(centerAngle) + layout.center,
          );
          ctx.rotate(centerAngle);

          ctx.fillStyle = TEXT_COLOR;
          ctx.fillText(text, 0, 0);

          ctx.restore();
        },
        drawSlice(ctx, item: WheelItemWithAngle, getColor: (item: WheelItem) => string, { layout, scale }) {
          const { startAngle, endAngle } = item;
          const { center, wheelRadius } = layout;
          // tuck the sector under the rim stroke so no hairline gap shows between them
          const radius = wheelRadius - scale(rimWidth) / 2;

          ctx.save();

          ctx.fillStyle = toPastel(getColor(item));
          ctx.beginPath();
          ctx.moveTo(center, center);
          ctx.arc(center, center, radius, startAngle, endAngle);
          ctx.closePath();
          ctx.fill();

          // barely visible white divider on the leading edge
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = scale(1.5);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(center, center);
          ctx.lineTo(center + Math.cos(startAngle) * radius, center + Math.sin(startAngle) * radius);
          ctx.stroke();

          ctx.restore();
        },
        afterDraw(ctx, _items, { layout, scale }) {
          const { center, wheelRadius, targetWheelSize } = layout;
          const ringWidth = scale(rimWidth);
          const innerRadius = wheelRadius - ringWidth;

          // soft ambient shadow behind the disc; symmetric so it does not betray rotation
          ctx.save();
          ctx.globalCompositeOperation = 'destination-over';
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(22);
          ctx.shadowColor = 'rgba(17, 24, 39, 0.16)';
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(center, center, wheelRadius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.restore();

          ctx.save();

          // faint shading towards the edge so the disc reads as a surface
          const edgeShade = ctx.createRadialGradient(
            center,
            center,
            innerRadius - scale(30),
            center,
            center,
            innerRadius,
          );
          edgeShade.addColorStop(0, 'rgba(17, 24, 39, 0)');
          edgeShade.addColorStop(1, 'rgba(17, 24, 39, 0.07)');
          ctx.fillStyle = edgeShade;
          ctx.beginPath();
          ctx.arc(center, center, innerRadius, 0, 2 * Math.PI);
          ctx.fill();

          // thin light-grey rim
          ctx.strokeStyle = RIM_COLOR;
          ctx.lineWidth = ringWidth;
          ctx.beginPath();
          ctx.arc(center, center, wheelRadius - ringWidth / 2, 0, 2 * Math.PI);
          ctx.stroke();

          // white hub under the core element: a clean washer around the centre
          const hubRadius = targetWheelSize * 0.1 + scale(8);
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(14);
          ctx.shadowColor = 'rgba(17, 24, 39, 0.12)';
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(center, center, hubRadius, 0, 2 * Math.PI);
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = HUB_BORDER_COLOR;
          ctx.lineWidth = scale(1.5);
          ctx.beginPath();
          ctx.arc(center, center, hubRadius - scale(0.75), 0, 2 * Math.PI);
          ctx.stroke();

          ctx.restore();
        },
      }}
    />
  );
};

MinimalLightWheel.displayName = 'MinimalLightWheel';

export default MinimalLightWheel;
