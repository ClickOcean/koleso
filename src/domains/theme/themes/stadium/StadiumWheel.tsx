import tinycolor from 'tinycolor2';

import { fitText } from '@utils/common.utils';
import { WheelItem, WheelItemWithAngle } from '@models/wheel.model';
import CanvasSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/CanvasSpinningWheel';
import { fitSectorText } from '@domains/wheel/BaseWheel/parts/sectorText';

import type { FC } from 'react';
import type { SpinningWheelProps } from '@domains/wheel/BaseWheel/parts/types';

const maxTextLength = 21;

/** Ring geometry: distances from the rim, tuned for an 800px wheel and passed through `scale` */
const SCOREBOARD_WIDTH = 24; // dark outer ring carrying the LED dots
const TOUCHLINE_OFFSET = 28; // centre of the white chalk ring
const TOUCHLINE_WIDTH = 4;
const BAND_OUTER = 33; // team-colour band
const BAND_INNER = 54;
const CENTER_CIRCLE_RADIUS = 150;
const STRIPE_COUNT = 9;
const LED_COUNT = 96;

export const STADIUM_FONT = "'Arial Black', Impact, Arial, sans-serif";
const CHALK = 'rgba(255, 255, 255, 0.92)';
const CHALK_HALO = 'rgba(255, 255, 255, 0.2)';
const TEXT_OUTLINE = '#0b0f14';

interface PitchPalette {
  /** Two mown-grass greens */
  light: string;
  dark: string;
  /** Thin lighter line on every mow edge */
  mowLine: string;
  /** Team band and its shading */
  band: string;
  bandLight: string;
  bandDark: string;
}

/**
 * Turns a participant colour into a patch of pitch: two mown-grass greens whose
 * hue and lightness follow the input so neighbours differ, plus the colour
 * itself for the team band near the rim. Greyscale input (highlight mode)
 * yields grey turf and a grey band.
 */
const toPitchPalette = (color: string): PitchPalette => {
  const source = tinycolor(color);
  const hsl = source.toHsl();
  const isGrey = hsl.s < 0.05;
  const hue = isGrey ? 120 : 112 + (Math.round(hsl.h) % 28);
  const lightness = 0.2 + ((Math.round(hsl.l * 100) * 7) % 9) / 100;
  const saturation = isGrey ? 0.03 : 0.5;

  const band = isGrey ? source.clone() : source.clone().saturate(8);
  // keep very dark team colours visible against the turf
  if (band.getLuminance() < 0.04) {
    band.lighten(14);
  }

  return {
    dark: tinycolor({ h: hue, s: saturation, l: lightness }).toHexString(),
    light: tinycolor({ h: hue, s: saturation, l: lightness + 0.06 }).toHexString(),
    mowLine: tinycolor({ h: hue, s: saturation, l: lightness + 0.18 })
      .setAlpha(0.35)
      .toRgbString(),
    band: band.toHexString(),
    bandLight: band.clone().lighten(10).toHexString(),
    bandDark: band.clone().darken(16).toHexString(),
  };
};

const StadiumSpinningWheel: FC<SpinningWheelProps> = (props) => {
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
          ctx.font = `900 ${scale(16)}px ${STADIUM_FONT}`;
          ctx.textBaseline = 'middle';

          const textRadius = fitSectorText(ctx, text, layout, { outerRatio: 0.85 }).startRadius;
          const centerAngle = endAngle - (endAngle - startAngle) / 2;

          ctx.translate(
            textRadius * Math.cos(centerAngle) + layout.center,
            textRadius * Math.sin(centerAngle) + layout.center,
          );
          ctx.rotate(centerAngle);

          // jersey lettering: white with a heavy dark outline and a soft drop shadow
          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = scale(2);
          ctx.shadowBlur = scale(4);
          ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
          ctx.strokeStyle = TEXT_OUTLINE;
          ctx.lineWidth = scale(5);
          ctx.strokeText(text, 0, 0);

          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, 0, 0);

          ctx.restore();
        },
        drawSlice(ctx, item: WheelItemWithAngle, getColor: (item: WheelItem) => string, { layout, scale }) {
          const { startAngle, endAngle } = item;
          const { center } = layout;
          const palette = toPitchPalette(getColor(item));
          const radius = layout.wheelRadius - scale(2);
          const bandOuter = layout.wheelRadius - scale(BAND_OUTER);
          const bandInner = layout.wheelRadius - scale(BAND_INNER);

          ctx.save();

          // turf base
          ctx.fillStyle = palette.dark;
          ctx.beginPath();
          ctx.moveTo(center, center);
          ctx.arc(center, center, radius, startAngle, endAngle);
          ctx.closePath();
          ctx.fill();

          // mown stripes: alternate greens as concentric rings, a lighter line on every mow edge
          const stripeWidth = bandInner / STRIPE_COUNT;
          for (let i = 0; i < STRIPE_COUNT; i++) {
            const inner = i * stripeWidth;

            if (i % 2 === 1) {
              ctx.strokeStyle = palette.light;
              ctx.lineWidth = stripeWidth;
              ctx.beginPath();
              ctx.arc(center, center, inner + stripeWidth / 2, startAngle, endAngle);
              ctx.stroke();
            }

            if (i > 0) {
              ctx.strokeStyle = palette.mowLine;
              ctx.lineWidth = scale(1);
              ctx.beginPath();
              ctx.arc(center, center, inner, startAngle, endAngle);
              ctx.stroke();
            }
          }

          // chalk centre circle
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = scale(2);
          ctx.beginPath();
          ctx.arc(center, center, scale(CENTER_CIRCLE_RADIUS), startAngle, endAngle);
          ctx.stroke();

          // team band near the rim, lit from the outside
          const bandGradient = ctx.createRadialGradient(center, center, bandInner, center, center, bandOuter);
          bandGradient.addColorStop(0, palette.bandDark);
          bandGradient.addColorStop(0.35, palette.band);
          bandGradient.addColorStop(1, palette.bandLight);
          ctx.strokeStyle = bandGradient;
          ctx.lineWidth = bandOuter - bandInner;
          ctx.beginPath();
          ctx.arc(center, center, (bandOuter + bandInner) / 2, startAngle, endAngle);
          ctx.stroke();

          // shadow line where the band meets the turf
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.lineWidth = scale(1.5);
          ctx.beginPath();
          ctx.arc(center, center, bandInner - scale(0.75), startAngle, endAngle);
          ctx.stroke();

          ctx.restore();
        },
        afterDraw(ctx, items, { layout, scale }) {
          const { center, wheelRadius, canvasSize } = layout;
          const touchlineRadius = wheelRadius - scale(TOUCHLINE_OFFSET);
          const scoreboardInner = wheelRadius - scale(SCOREBOARD_WIDTH);

          // floodlit centre, darker towards the stands (symmetric, so it survives rotation)
          ctx.save();
          ctx.beginPath();
          ctx.arc(center, center, scoreboardInner, 0, 2 * Math.PI);
          ctx.clip();
          const lighting = ctx.createRadialGradient(center, center, 0, center, center, scoreboardInner);
          lighting.addColorStop(0, 'rgba(255, 255, 255, 0.07)');
          lighting.addColorStop(0.6, 'rgba(255, 255, 255, 0)');
          lighting.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
          ctx.fillStyle = lighting;
          ctx.fillRect(0, 0, canvasSize, canvasSize);
          ctx.restore();

          // chalk dividers, from the hub to the touchline
          ctx.save();
          ctx.lineCap = 'butt';
          items.forEach(({ startAngle }) => {
            const edgeX = center + Math.cos(startAngle) * touchlineRadius;
            const edgeY = center + Math.sin(startAngle) * touchlineRadius;

            ctx.strokeStyle = CHALK_HALO;
            ctx.lineWidth = scale(6);
            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.lineTo(edgeX, edgeY);
            ctx.stroke();

            ctx.strokeStyle = CHALK;
            ctx.lineWidth = scale(2.5);
            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.lineTo(edgeX, edgeY);
            ctx.stroke();
          });
          ctx.restore();

          // white touchline ring
          ctx.save();
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(3);
          ctx.shadowColor = 'rgba(255, 255, 255, 0.45)';
          ctx.strokeStyle = CHALK;
          ctx.lineWidth = scale(TOUCHLINE_WIDTH);
          ctx.beginPath();
          ctx.arc(center, center, touchlineRadius, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.restore();

          // scoreboard ring: dark bevelled annulus with a row of LED dots
          ctx.save();
          const ringGradient = ctx.createRadialGradient(center, center, scoreboardInner, center, center, wheelRadius);
          ringGradient.addColorStop(0, '#1f232b');
          ringGradient.addColorStop(0.5, '#0e1015');
          ringGradient.addColorStop(1, '#1c2027');
          ctx.fillStyle = ringGradient;
          ctx.beginPath();
          ctx.arc(center, center, wheelRadius, 0, 2 * Math.PI);
          ctx.arc(center, center, scoreboardInner, 0, 2 * Math.PI, true);
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = scale(1.5);
          ctx.beginPath();
          ctx.arc(center, center, wheelRadius - scale(0.75), 0, 2 * Math.PI);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = scale(1);
          ctx.beginPath();
          ctx.arc(center, center, scoreboardInner + scale(0.5), 0, 2 * Math.PI);
          ctx.stroke();

          const ledRadius = wheelRadius - scale(SCOREBOARD_WIDTH / 2);
          for (let i = 0; i < LED_COUNT; i++) {
            const angle = (i * 2 * Math.PI) / LED_COUNT;
            const isLit = i % 8 === 0;
            const x = center + Math.cos(angle) * ledRadius;
            const y = center + Math.sin(angle) * ledRadius;

            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = isLit ? scale(6) : 0;
            ctx.shadowColor = 'rgba(251, 191, 36, 0.9)';
            ctx.fillStyle = isLit ? '#fde68a' : 'rgba(251, 191, 36, 0.32)';
            ctx.beginPath();
            ctx.arc(x, y, scale(isLit ? 2.6 : 1.9), 0, 2 * Math.PI);
            ctx.fill();
          }

          ctx.restore();
        },
      }}
    />
  );
};

StadiumSpinningWheel.displayName = 'StadiumSpinningWheel';

export default StadiumSpinningWheel;
