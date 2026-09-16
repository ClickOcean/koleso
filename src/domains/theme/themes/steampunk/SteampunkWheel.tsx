import { useRef } from 'react';
import tinycolor from 'tinycolor2';

import { fitText } from '@utils/common.utils';
import { WheelItem, WheelItemWithAngle } from '@models/wheel.model';
import CanvasSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/CanvasSpinningWheel';
import { fitSectorText } from '@domains/wheel/BaseWheel/parts/sectorText';

import { traceGear } from './drawGear';

import type { FC } from 'react';
import type { SpinningWheelProps } from '@domains/wheel/BaseWheel/parts/types';

const borderWidth = 7;
const innerBorderWidth = 2;
const maxTextLength = 21;

const SERIF_FONT = 'Georgia, "Times New Roman", Times, serif';
const TEXT_DARK = '#2a170a';
const TEXT_DARK_HALO = 'rgba(247, 230, 196, 0.8)';
const TEXT_PALE = '#f7e6c4';
const TEXT_PALE_OUTLINE = 'rgba(28, 16, 5, 0.92)';
/** Plates at least this luminous get dark engraved lettering; darker metals get pale painted lettering */
const ENGRAVED_TEXT_LUMINANCE = 0.22;
const BRASS_LIGHT = '#f0d58c';
const BRASS = '#c0913a';
const BRASS_DARK = '#7a5518';
const EDGE_DARK = 'rgba(32, 19, 6, 0.9)';

const RIM_TEETH = 72;
const HUB_RIVETS = 16;
const SHADE_STEPS = 5;
const SHADE_STEP = 0.05;

interface MetalColor {
  fill: string;
  light: string;
  sheen: string;
  dark: string;
}

/** Hue families of the brief: brass, copper, bronze, oxidized green, dark iron */
const METALS = [
  { h: 42, s: 0.62, l: 0.47 },
  { h: 18, s: 0.64, l: 0.42 },
  { h: 30, s: 0.5, l: 0.33 },
  { h: 158, s: 0.3, l: 0.34 },
  { h: 214, s: 0.1, l: 0.25 },
];

const BRASS_METAL: MetalColor = {
  fill: BRASS,
  light: BRASS_LIGHT,
  sheen: '#fbeec0',
  dark: BRASS_DARK,
};

/**
 * Maps any participant color onto the metallic palette while keeping sectors
 * distinguishable. The RGB bytes are hashed into a metal family, one of five
 * lightness steps (±0.10) and a small hue nudge, so near-identical inputs such
 * as #355f56/#375f4e or #b062e7/#978fbc land on clearly different plates.
 * Greyscale input (highlight mode) stays a dull grey iron with the same steps.
 */
const toMetalColor = (color: string): MetalColor => {
  const parsed = tinycolor(color);
  const { r, g, b } = parsed.toRgb();
  const isGrey = parsed.toHsl().s < 0.05;
  const seed = r * 5 + g * 13 + b * 17;
  const metal = METALS[seed % METALS.length];
  const shade = Math.floor(seed / METALS.length) % SHADE_STEPS;
  const lightnessShift = (shade - (SHADE_STEPS - 1) / 2) * SHADE_STEP;
  const hueShift = (Math.floor(seed / (METALS.length * SHADE_STEPS)) % 9) - 4;
  const base = tinycolor(
    isGrey
      ? { h: 30, s: 0.04, l: 0.3 + lightnessShift }
      : { h: metal.h + hueShift, s: metal.s, l: metal.l + lightnessShift },
  );

  return {
    fill: base.toHexString(),
    light: base.clone().lighten(16).toHexString(),
    sheen: base.clone().lighten(30).toHexString(),
    dark: base.clone().darken(12).toHexString(),
  };
};

/** Radial gradient with faint alternating rings: brushed metal plate lit from the hub */
const createBrushedGradient = (
  ctx: CanvasRenderingContext2D,
  center: number,
  radius: number,
  metal: MetalColor,
): CanvasGradient => {
  const gradient = ctx.createRadialGradient(center, center, radius * 0.12, center, center, radius);
  const base = tinycolor(metal.fill).toHsl();
  const rings = 18;

  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const ripple = (i % 2 === 0 ? 1 : -1) * 0.018;
    const trend = 0.1 * (1 - t) * (1 - t) - 0.07 * t;
    const l = Math.min(0.95, Math.max(0.05, base.l + trend + ripple));
    gradient.addColorStop(t, tinycolor({ h: base.h, s: base.s, l }).toHexString());
  }

  return gradient;
};

const drawRivet = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  metal: MetalColor,
  scale: (value: number) => number,
): void => {
  ctx.save();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.arc(x + scale(0.7), y + scale(1), size, 0, 2 * Math.PI);
  ctx.fill();

  const dome = ctx.createRadialGradient(x - size * 0.35, y - size * 0.35, size * 0.1, x, y, size);
  dome.addColorStop(0, metal.sheen);
  dome.addColorStop(0.55, metal.light);
  dome.addColorStop(1, metal.dark);
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, 2 * Math.PI);
  ctx.fill();

  ctx.strokeStyle = 'rgba(20, 10, 2, 0.55)';
  ctx.lineWidth = Math.max(0.6, scale(0.6));
  ctx.stroke();

  ctx.restore();
};

/** Bevelled seam between two plates, from the hub out to the rim */
const drawSeam = (
  ctx: CanvasRenderingContext2D,
  center: number,
  radius: number,
  angle: number,
  scale: (value: number) => number,
): void => {
  const edgeX = center + Math.cos(angle) * radius;
  const edgeY = center + Math.sin(angle) * radius;

  ctx.lineCap = 'butt';
  ctx.strokeStyle = 'rgba(24, 13, 4, 0.6)';
  ctx.lineWidth = scale(3);
  ctx.beginPath();
  ctx.moveTo(center, center);
  ctx.lineTo(edgeX, edgeY);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 228, 170, 0.22)';
  ctx.lineWidth = scale(1);
  ctx.beginPath();
  ctx.moveTo(center, center);
  ctx.lineTo(edgeX, edgeY);
  ctx.stroke();
};

/** Bevelled brass annulus between two radii, with dark edges */
const drawBrassRing = (
  ctx: CanvasRenderingContext2D,
  center: number,
  innerRadius: number,
  outerRadius: number,
  scale: (value: number) => number,
): void => {
  const bevel = ctx.createRadialGradient(center, center, innerRadius, center, center, outerRadius);
  bevel.addColorStop(0, BRASS_DARK);
  bevel.addColorStop(0.3, BRASS_LIGHT);
  bevel.addColorStop(0.62, BRASS);
  bevel.addColorStop(1, BRASS_DARK);

  ctx.fillStyle = bevel;
  ctx.beginPath();
  ctx.arc(center, center, outerRadius, 0, 2 * Math.PI);
  ctx.arc(center, center, innerRadius, 0, 2 * Math.PI, true);
  ctx.fill();

  ctx.strokeStyle = EDGE_DARK;
  ctx.lineWidth = scale(1.2);
  ctx.beginPath();
  ctx.arc(center, center, innerRadius, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.lineWidth = scale(1);
  ctx.beginPath();
  ctx.arc(center, center, outerRadius, 0, 2 * Math.PI);
  ctx.stroke();
};

const SteampunkSpinningWheel: FC<SpinningWheelProps> = (props) => {
  /** Plate metal per item, written by drawSlice and read by drawText within the same draw pass */
  const metalsRef = useRef(new Map<WheelItem['id'], MetalColor>());

  return (
    <CanvasSpinningWheel
      {...props}
      renderer={{
        drawText(ctx, item: WheelItemWithAngle, { layout, scale }) {
          const { startAngle, endAngle, name, displayName } = item;
          if ((endAngle - startAngle) / Math.PI / 2 < 0.016) {
            return;
          }

          const text = fitText(displayName || name, maxTextLength);
          const metal = metalsRef.current.get(item.id);
          const engraved = metal ? tinycolor(metal.fill).getLuminance() >= ENGRAVED_TEXT_LUMINANCE : false;

          ctx.save();
          ctx.font = `bold ${scale(20)}px ${SERIF_FONT}`;
          ctx.textBaseline = 'middle';

          const textRadius = fitSectorText(ctx, text, layout, { outerRatio: 0.88 }).startRadius;
          const centerAngle = endAngle - (endAngle - startAngle) / 2;

          ctx.translate(
            textRadius * Math.cos(centerAngle) + layout.center,
            textRadius * Math.sin(centerAngle) + layout.center,
          );
          ctx.rotate(centerAngle);
          ctx.lineJoin = 'round';

          if (engraved) {
            // dark lettering cut into a light plate, with a pale bevel highlight around the glyphs
            ctx.strokeStyle = TEXT_DARK_HALO;
            ctx.lineWidth = scale(2.5);
            ctx.strokeText(text, 0, 0);
            ctx.fillStyle = TEXT_DARK;
          } else {
            // pale painted lettering on a dark plate, outlined so it stays crisp over the brushed texture
            ctx.strokeStyle = TEXT_PALE_OUTLINE;
            ctx.lineWidth = scale(4);
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = scale(1);
            ctx.shadowBlur = scale(3);
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.strokeText(text, 0, 0);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillStyle = TEXT_PALE;
          }
          ctx.fillText(text, 0, 0);

          ctx.restore();
        },
        drawSlice(ctx, item: WheelItemWithAngle, getColor: (item: WheelItem) => string, { layout, scale }) {
          const { startAngle, endAngle } = item;
          const { center } = layout;
          const metal = toMetalColor(getColor(item));
          const radius = layout.wheelRadius - scale(innerBorderWidth);
          metalsRef.current.set(item.id, metal);

          ctx.save();

          ctx.fillStyle = createBrushedGradient(ctx, center, radius, metal);
          ctx.beginPath();
          ctx.moveTo(center, center);
          ctx.arc(center, center, radius, startAngle, endAngle);
          ctx.closePath();
          ctx.fill();

          // rivets along the outer edge of the plate, evenly spaced and clear of the seams
          const rivetRadius = layout.wheelRadius - scale(12);
          const rivetSize = scale(3);
          const arcLength = rivetRadius * (endAngle - startAngle);
          const rivetCount = arcLength >= scale(16) ? Math.max(1, Math.floor(arcLength / scale(30))) : 0;
          for (let i = 0; i < rivetCount; i++) {
            const angle = startAngle + ((endAngle - startAngle) * (i + 0.5)) / rivetCount;
            drawRivet(
              ctx,
              center + Math.cos(angle) * rivetRadius,
              center + Math.sin(angle) * rivetRadius,
              rivetSize,
              metal,
              scale,
            );
          }

          ctx.restore();
        },
        afterDraw(ctx, items, { layout, scale }) {
          const { center, wheelRadius, canvasSize } = layout;
          const plateRadius = wheelRadius - scale(borderWidth);
          const seamRadius = wheelRadius - scale(innerBorderWidth);

          // seams between plates, drawn once over all sectors so every seam keeps its full width
          ctx.save();
          items.forEach(({ startAngle }) => drawSeam(ctx, center, seamRadius, startAngle, scale));
          ctx.restore();

          // darken the plates towards the rim
          ctx.save();
          ctx.beginPath();
          ctx.arc(center, center, plateRadius, 0, 2 * Math.PI);
          ctx.clip();
          const vignette = ctx.createRadialGradient(center, center, plateRadius * 0.7, center, center, plateRadius);
          vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
          vignette.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, canvasSize, canvasSize);
          ctx.restore();

          // gear teeth around the outer edge. traceGear outlines a solid gear, so the plate area
          // is cut out with an even-odd fill: filling the whole outline would bury the sectors and
          // names under one brass disc (the gradient inner stop covers everything inside the root)
          ctx.save();
          const toothRoot = wheelRadius + scale(1);
          const toothTip = wheelRadius + scale(13);
          traceGear(ctx, center, center, toothTip, toothRoot, RIM_TEETH);
          ctx.moveTo(center + plateRadius, center);
          ctx.arc(center, center, plateRadius, 0, 2 * Math.PI);
          const toothGradient = ctx.createRadialGradient(center, center, toothRoot, center, center, toothTip);
          toothGradient.addColorStop(0, BRASS_DARK);
          toothGradient.addColorStop(0.45, BRASS);
          toothGradient.addColorStop(0.8, BRASS_LIGHT);
          toothGradient.addColorStop(1, BRASS_DARK);
          ctx.fillStyle = toothGradient;
          ctx.fill('evenodd');
          traceGear(ctx, center, center, toothTip, toothRoot, RIM_TEETH);
          ctx.lineJoin = 'round';
          ctx.strokeStyle = EDGE_DARK;
          ctx.lineWidth = scale(1.2);
          ctx.stroke();
          ctx.restore();

          // rim band over the tooth roots
          ctx.save();
          drawBrassRing(ctx, center, plateRadius, wheelRadius + scale(2), scale);
          ctx.restore();

          // riveted ring framing the hub
          ctx.save();
          const hubInner = scale(84);
          const hubOuter = scale(108);
          drawBrassRing(ctx, center, hubInner, hubOuter, scale);
          const hubRivetRadius = (hubInner + hubOuter) / 2;
          for (let i = 0; i < HUB_RIVETS; i++) {
            const angle = (i * 2 * Math.PI) / HUB_RIVETS;
            drawRivet(
              ctx,
              center + Math.cos(angle) * hubRivetRadius,
              center + Math.sin(angle) * hubRivetRadius,
              scale(3.6),
              BRASS_METAL,
              scale,
            );
          }
          ctx.restore();
        },
      }}
    />
  );
};

SteampunkSpinningWheel.displayName = 'SteampunkSpinningWheel';

export default SteampunkSpinningWheel;
