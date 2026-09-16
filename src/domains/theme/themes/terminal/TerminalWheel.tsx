import tinycolor from 'tinycolor2';

import { fitText } from '@utils/common.utils';
import { WheelItem, WheelItemWithAngle } from '@models/wheel.model';
import CanvasSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/CanvasSpinningWheel';
import { fitSectorText } from '@domains/wheel/BaseWheel/parts/sectorText';

import { AMBER, AMBER_BRIGHT, MONO, amber } from './palette';

import type { FC } from 'react';
import type { SpinningWheelProps } from '@domains/wheel/BaseWheel/parts/types';

const borderWidth = 5;
const innerBorderWidth = 2;
const bezelWidth = 14;
const maxTextLength = 21;

/**
 * Maps a participant colour onto the amber CRT palette. The hue is pinned to a
 * warm brown and only the lightness varies, so neighbouring sectors still
 * differ while the whole wheel reads as one monochrome screen. Greyscale input
 * (highlight mode) stays a neutral dark grey.
 */
const toTerminalColor = (color: string): { fill: string; edge: string } => {
  const hsl = tinycolor(color).toHsl();
  const isGrey = hsl.s < 0.05;
  // 11 is prime, so evenly stepped palettes do not collapse onto one lightness
  const seed = Math.round(hsl.h) * 5 + Math.round(hsl.l * 100) * 7;
  const lightness = 0.04 + (seed % 11) * 0.012;
  const hue = 34;
  const saturation = isGrey ? 0.04 : 0.6;

  return {
    fill: tinycolor({ h: hue, s: saturation, l: lightness }).toHexString(),
    edge: tinycolor({ h: hue, s: saturation, l: lightness + 0.06 }).toHexString(),
  };
};

const TerminalSpinningWheel: FC<SpinningWheelProps> = (props) => {
  return (
    <CanvasSpinningWheel
      {...props}
      renderer={{
        drawText(ctx, { startAngle, endAngle, name, displayName }: WheelItemWithAngle, { layout, scale }) {
          if ((endAngle - startAngle) / Math.PI / 2 < 0.016) {
            return;
          }

          const radius = layout.wheelRadius - scale(3);
          const text = fitText(displayName || name, maxTextLength).toUpperCase();

          ctx.save();
          ctx.font = `bold ${scale(19)}px ${MONO}`;
          ctx.textBaseline = 'middle';

          const textRadius = fitSectorText(ctx, text, layout, { outerRatio: 0.86 }).startRadius;
          const centerAngle = endAngle - (endAngle - startAngle) / 2;

          ctx.translate(
            textRadius * Math.cos(centerAngle) + layout.center,
            textRadius * Math.sin(centerAngle) + layout.center,
          );
          ctx.rotate(centerAngle);

          ctx.lineJoin = 'round';
          ctx.strokeStyle = 'rgba(12, 6, 0, 0.9)';
          ctx.lineWidth = scale(4);
          ctx.strokeText(text, 0, 0);

          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(8);
          ctx.shadowColor = amber(0.75);
          ctx.fillStyle = AMBER_BRIGHT;
          ctx.fillText(text, 0, 0);

          ctx.restore();
        },
        drawSlice(ctx, item: WheelItemWithAngle, getColor: (item: WheelItem) => string, { layout, scale }) {
          const { startAngle, endAngle } = item;
          const { fill, edge } = toTerminalColor(getColor(item));
          const radius = layout.wheelRadius - scale(innerBorderWidth);

          ctx.save();

          const gradient = ctx.createRadialGradient(
            layout.center,
            layout.center,
            radius * 0.2,
            layout.center,
            layout.center,
            radius,
          );
          gradient.addColorStop(0, edge);
          gradient.addColorStop(0.4, fill);
          gradient.addColorStop(1, tinycolor(fill).darken(3).toHexString());

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.moveTo(layout.center, layout.center);
          ctx.arc(layout.center, layout.center, radius, startAngle, endAngle);
          ctx.closePath();
          ctx.fill();

          // faint amber grid: concentric rings inside the sector
          ctx.strokeStyle = amber(0.09);
          ctx.lineWidth = scale(1);
          [0.3, 0.45, 0.6, 0.75, 0.9].forEach((factor) => {
            ctx.beginPath();
            ctx.arc(layout.center, layout.center, radius * factor, startAngle, endAngle);
            ctx.stroke();
          });

          // glowing amber divider
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(7);
          ctx.shadowColor = amber(0.8);
          ctx.strokeStyle = amber(0.85);
          ctx.lineWidth = scale(1.5);
          ctx.beginPath();
          ctx.moveTo(layout.center, layout.center);
          ctx.lineTo(layout.center + Math.cos(startAngle) * radius, layout.center + Math.sin(startAngle) * radius);
          ctx.stroke();

          ctx.restore();
        },
        afterDraw(ctx, _items, { layout, scale }) {
          const { center, canvasSize, wheelRadius } = layout;
          const outerRadius = wheelRadius - scale(borderWidth) / 2;
          const innerRadius = wheelRadius - scale(borderWidth);

          // CRT treatment clipped to the disk: scanlines, hub bloom, rim vignette
          ctx.save();
          ctx.beginPath();
          ctx.arc(center, center, innerRadius, 0, 2 * Math.PI);
          ctx.clip();

          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
          const step = Math.max(3, scale(4));
          for (let y = 0; y < canvasSize; y += step) {
            ctx.fillRect(0, y, canvasSize, Math.max(1, scale(1.2)));
          }

          const bloom = ctx.createRadialGradient(center, center, 0, center, center, innerRadius * 0.55);
          bloom.addColorStop(0, amber(0.1));
          bloom.addColorStop(1, amber(0));
          ctx.fillStyle = bloom;
          ctx.fillRect(0, 0, canvasSize, canvasSize);

          const vignette = ctx.createRadialGradient(center, center, innerRadius * 0.72, center, center, innerRadius);
          vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
          vignette.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, canvasSize, canvasSize);
          ctx.restore();

          // bezel: a soft dark ring outside the amber ring, lit like a rounded tube edge
          ctx.save();
          const bezelOuter = wheelRadius + scale(bezelWidth);
          const bezel = ctx.createRadialGradient(center, center, wheelRadius, center, center, bezelOuter);
          bezel.addColorStop(0, 'rgba(24, 15, 5, 0.96)');
          bezel.addColorStop(0.35, 'rgba(56, 36, 14, 0.96)');
          bezel.addColorStop(0.8, 'rgba(18, 11, 4, 0.96)');
          bezel.addColorStop(1, 'rgba(10, 6, 2, 0)');
          ctx.fillStyle = bezel;
          ctx.beginPath();
          ctx.arc(center, center, bezelOuter, 0, 2 * Math.PI);
          ctx.arc(center, center, wheelRadius, 0, 2 * Math.PI, true);
          ctx.fill();

          ctx.strokeStyle = amber(0.28);
          ctx.lineWidth = scale(1);
          ctx.beginPath();
          ctx.arc(center, center, bezelOuter - scale(2), 0, 2 * Math.PI);
          ctx.stroke();
          ctx.restore();

          ctx.save();
          // main amber ring with phosphor glow
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(14);
          ctx.shadowColor = amber(0.85);
          ctx.strokeStyle = AMBER;
          ctx.lineWidth = scale(3);
          ctx.beginPath();
          ctx.arc(center, center, outerRadius, 0, 2 * Math.PI);
          ctx.stroke();

          // thin inner ring closing the dial scale
          ctx.shadowBlur = 0;
          ctx.strokeStyle = amber(0.4);
          ctx.lineWidth = scale(1);
          ctx.beginPath();
          ctx.arc(center, center, innerRadius - scale(18), 0, 2 * Math.PI);
          ctx.stroke();

          // dial ticks between the two rings
          const tickCount = 60;
          for (let i = 0; i < tickCount; i++) {
            const angle = (i * 2 * Math.PI) / tickCount;
            const isMajor = i % 5 === 0;
            const from = innerRadius - scale(isMajor ? 16 : 10);
            const to = innerRadius - scale(3);
            ctx.strokeStyle = isMajor ? amber(0.9) : amber(0.45);
            ctx.lineWidth = scale(isMajor ? 2 : 1);
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

TerminalSpinningWheel.displayName = 'TerminalSpinningWheel';

export default TerminalSpinningWheel;
