import tinycolor from 'tinycolor2';

import { fitText } from '@utils/common.utils';
import { WheelItem, WheelItemWithAngle } from '@models/wheel.model';
import CanvasSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/CanvasSpinningWheel';
import { fitSectorText } from '@domains/wheel/BaseWheel/parts/sectorText';

import { GARLAND_GREEN, NEW_YEAR_FONT, RIM_WIDTH } from './palette';

import type { FC } from 'react';
import type { SpinningWheelProps } from '@domains/wheel/BaseWheel/parts/types';

const innerBorderWidth = 2;
const maxTextLength = 21;

interface JewelColor {
  fill: string;
  light: string;
  dark: string;
}

/**
 * Deterministic LCG. The wheel canvas is cached and redrawn on participant
 * changes, so decorative scatter must not reshuffle between redraws.
 */
const seededRandom = (seed: number): (() => number) => {
  let state = (Math.abs(Math.floor(seed * 1000003)) % 2147483646) + 1;

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

/**
 * Deepens any participant color into a jewel tone: hue is kept (yellows nudged
 * toward gold), saturation pushed up, lightness pulled down. Greyscale input
 * (highlight mode) becomes a cold slate so the highlighted sector still pops.
 */
const toJewelColor = (color: string): JewelColor => {
  const hsl = tinycolor(color).toHsl();
  const isGrey = hsl.s < 0.05;
  const isWarm = !isGrey && hsl.h >= 20 && hsl.h <= 70;
  const hue = isGrey ? 215 : hsl.h >= 48 && hsl.h <= 72 ? 42 + (hsl.h - 48) * 0.25 : hsl.h;
  const saturation = isGrey ? 0.1 : 0.72 + Math.min(hsl.s, 1) * 0.2;
  const lightness = (isGrey ? 0.2 : 0.26) + hsl.l * 0.18 + (isWarm ? 0.06 : 0);

  return {
    fill: tinycolor({ h: hue, s: saturation, l: lightness }).toHexString(),
    light: tinycolor({ h: hue, s: saturation, l: lightness + 0.12 }).toHexString(),
    dark: tinycolor({ h: hue, s: saturation, l: Math.max(0.08, lightness - 0.1) }).toHexString(),
  };
};

/**
 * Festive winter wheel: jewel-toned sectors with a frosted edge, white-silver
 * dividers, white text with a gold glow and a dark green garland ring. The
 * bulbs themselves live in NewYearEffects so they can twinkle.
 */
const NewYearWheel: FC<SpinningWheelProps> = (props) => {
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
          ctx.font = `bold ${scale(20)}px ${NEW_YEAR_FONT}`;
          ctx.textBaseline = 'middle';

          const textRadius = fitSectorText(ctx, text, layout, { outerRatio: 0.88 }).startRadius;
          const centerAngle = endAngle - (endAngle - startAngle) / 2;

          ctx.translate(
            textRadius * Math.cos(centerAngle) + layout.center,
            textRadius * Math.sin(centerAngle) + layout.center,
          );
          ctx.rotate(centerAngle);

          // dark halo keeps white glyphs legible on every jewel tone and on the frost
          ctx.lineJoin = 'round';
          ctx.strokeStyle = 'rgba(5, 12, 32, 0.85)';
          ctx.lineWidth = scale(4);
          ctx.strokeText(text, 0, 0);

          // wide gold glow, then a tight warm pass so the glow still reads at small sizes
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(12);
          ctx.shadowColor = 'rgba(212, 175, 55, 0.9)';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, 0, 0);

          ctx.shadowBlur = scale(3);
          ctx.shadowColor = 'rgba(255, 226, 150, 0.9)';
          ctx.fillText(text, 0, 0);

          ctx.restore();
        },
        drawSlice(ctx, item: WheelItemWithAngle, getColor: (item: WheelItem) => string, { layout, scale }) {
          const { startAngle, endAngle } = item;
          const { center } = layout;
          const { fill, light, dark } = toJewelColor(getColor(item));
          const radius = layout.wheelRadius - scale(innerBorderWidth);

          const traceSector = () => {
            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius, startAngle, endAngle);
            ctx.closePath();
          };

          ctx.save();

          // jewel body: lit near the hub, deepening toward the rim
          const body = ctx.createRadialGradient(center, center, radius * 0.15, center, center, radius);
          body.addColorStop(0, light);
          body.addColorStop(0.45, fill);
          body.addColorStop(1, dark);
          ctx.fillStyle = body;
          traceSector();
          ctx.fill();

          // frosted white edge just inside the garland ring
          const frost = ctx.createRadialGradient(center, center, radius * 0.78, center, center, radius);
          frost.addColorStop(0, 'rgba(255, 255, 255, 0)');
          frost.addColorStop(0.5, 'rgba(226, 240, 255, 0.2)');
          frost.addColorStop(0.85, 'rgba(240, 248, 255, 0.55)');
          frost.addColorStop(1, 'rgba(255, 255, 255, 0.85)');
          ctx.fillStyle = frost;
          traceSector();
          ctx.fill();

          // ice crystals scattered over the frost, fixed per sector
          const span = endAngle - startAngle;
          if (span > 0.05) {
            const random = seededRandom(startAngle + 1);
            const speckCount = Math.min(60, Math.round(span * 45));

            traceSector();
            ctx.clip();
            for (let i = 0; i < speckCount; i++) {
              const angle = startAngle + span * random();
              const distance = radius * (0.83 + random() * 0.14);
              const size = scale(0.8 + random() * 1.4);

              ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + random() * 0.5})`;
              ctx.beginPath();
              ctx.arc(center + Math.cos(angle) * distance, center + Math.sin(angle) * distance, size, 0, 2 * Math.PI);
              ctx.fill();
            }
          }
          ctx.restore();

          // white-silver divider with a soft shadow so it stands off the sectors
          ctx.save();
          ctx.lineCap = 'round';
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(4);
          ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
          ctx.strokeStyle = 'rgba(238, 245, 255, 0.92)';
          ctx.lineWidth = scale(2.2);
          ctx.beginPath();
          ctx.moveTo(center, center);
          ctx.lineTo(center + Math.cos(startAngle) * radius, center + Math.sin(startAngle) * radius);
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(170, 190, 220, 0.8)';
          ctx.lineWidth = scale(0.8);
          ctx.stroke();
          ctx.restore();
        },
        afterDraw(ctx, _items, { layout, scale }) {
          const { center, canvasSize, wheelRadius } = layout;
          const ringWidth = scale(RIM_WIDTH);
          const ringOuter = wheelRadius - scale(1);
          const ringInner = ringOuter - ringWidth;
          const ringMid = (ringOuter + ringInner) / 2;

          // deepen the jewel tones toward the edge
          ctx.save();
          ctx.beginPath();
          ctx.arc(center, center, ringInner, 0, 2 * Math.PI);
          ctx.clip();
          const vignette = ctx.createRadialGradient(center, center, ringInner * 0.55, center, center, ringInner);
          vignette.addColorStop(0, 'rgba(3, 8, 24, 0)');
          vignette.addColorStop(1, 'rgba(3, 8, 24, 0.32)');
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, canvasSize, canvasSize);
          ctx.restore();

          // dark green garland ring
          ctx.save();
          ctx.strokeStyle = GARLAND_GREEN;
          ctx.lineWidth = ringWidth;
          ctx.beginPath();
          ctx.arc(center, center, ringMid, 0, 2 * Math.PI);
          ctx.stroke();

          // pine needles: short strokes, mostly tangential, clipped to the ring
          ctx.beginPath();
          ctx.arc(center, center, ringOuter + scale(2), 0, 2 * Math.PI);
          ctx.arc(center, center, ringInner - scale(1), 0, 2 * Math.PI, true);
          ctx.clip();

          const random = seededRandom(0.37);
          const needleCount = 900;
          ctx.lineCap = 'round';
          ctx.lineWidth = scale(1);
          for (let i = 0; i < needleCount; i++) {
            const angle = (i * 2 * Math.PI) / needleCount + (random() - 0.5) * 0.02;
            const from = ringInner + random() * ringWidth;
            const tilt = angle + Math.PI / 2 + (random() - 0.5) * 1.4;
            const length = scale(3 + random() * 5);
            const x = center + Math.cos(angle) * from;
            const y = center + Math.sin(angle) * from;

            ctx.strokeStyle = random() < 0.5 ? 'rgba(52, 130, 78, 0.5)' : 'rgba(6, 30, 16, 0.6)';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(tilt) * length, y + Math.sin(tilt) * length);
            ctx.stroke();
          }

          // snow settled on the garland
          const snowCount = 56;
          for (let i = 0; i < snowCount; i++) {
            const angle = (i * 2 * Math.PI) / snowCount + (random() - 0.5) * 0.08;
            const distance = ringInner + random() * ringWidth;
            const size = scale(1.5 + random() * 2.5);

            ctx.fillStyle = `rgba(245, 250, 255, ${0.45 + random() * 0.4})`;
            ctx.beginPath();
            ctx.arc(center + Math.cos(angle) * distance, center + Math.sin(angle) * distance, size, 0, 2 * Math.PI);
            ctx.fill();
          }

          // garland wire running through the ring; sockets and bulbs are drawn by the effects layer
          ctx.strokeStyle = 'rgba(30, 70, 40, 0.9)';
          ctx.lineWidth = scale(1.5);
          ctx.beginPath();
          ctx.arc(center, center, ringMid, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.restore();

          // frosted silver edges of the ring with a thin gold thread inside
          ctx.save();
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(6);
          ctx.shadowColor = 'rgba(200, 225, 255, 0.7)';
          ctx.strokeStyle = 'rgba(236, 244, 255, 0.95)';
          ctx.lineWidth = scale(2.5);
          ctx.beginPath();
          ctx.arc(center, center, ringOuter, 0, 2 * Math.PI);
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(214, 228, 250, 0.75)';
          ctx.lineWidth = scale(1.5);
          ctx.beginPath();
          ctx.arc(center, center, ringInner, 0, 2 * Math.PI);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
          ctx.lineWidth = scale(1);
          ctx.beginPath();
          ctx.arc(center, center, ringInner - scale(2), 0, 2 * Math.PI);
          ctx.stroke();
          ctx.restore();
        },
      }}
    />
  );
};

NewYearWheel.displayName = 'NewYearWheel';

export default NewYearWheel;
