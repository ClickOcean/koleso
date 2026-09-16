import { fitText } from '@utils/common.utils';
import { WheelItem } from '@models/wheel.model';
import CanvasSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/CanvasSpinningWheel';

import {
  ARCADE_OUTLINE,
  ARCADE_WHITE,
  ARCADE_YELLOW,
  NUDGE_LIMIT,
  paletteIndexWithNudge,
  quantizeIndex,
  toArcadeTones,
} from './palette';
import { getPixelTextMetrics, renderPixelText } from './pixelText';

import type { ComponentProps, FC } from 'react';
import type { SpinningWheelProps } from '@domains/wheel/BaseWheel/parts/types';

type ArcadeRenderer = ComponentProps<typeof CanvasSpinningWheel>['renderer'];

const maxTextLength = 21;
const TWO_PI = Math.PI * 2;
/** Rim thickness in cells: dark outline, two of yellow, one of white, dark inner outline */
const RIM_CELLS = 5;
/** Radius share of the recessed hub disc and of the checkerboard transition outside it */
const SHADE_RADIUS = 0.42;
const DITHER_WIDTH = 0.07;
const TEXT_FILL = '#ffffff';
const TEXT_OUTLINE = '#000000';

interface RimBand {
  /** Depth from the wheel edge, in cells, where the band ends */
  upTo: number;
  color: string;
}

const RIM_BANDS: RimBand[] = [
  { upTo: 1, color: ARCADE_OUTLINE },
  { upTo: 3, color: ARCADE_YELLOW },
  { upTo: 4, color: ARCADE_WHITE },
  { upTo: RIM_CELLS, color: ARCADE_OUTLINE },
];

/** Size of one "pixel" on the wheel canvas; an integer so the grid stays crisp */
const getCell = (scale: (value: number) => number): number => Math.max(2, Math.round(scale(4)));

const containsAngle = (startAngle: number, endAngle: number, angle: number): boolean => {
  const delta = (((angle - startAngle) % TWO_PI) + TWO_PI) % TWO_PI;

  return delta <= endAngle - startAngle;
};

const rimColor = (depth: number): string | null => {
  for (const band of RIM_BANDS) {
    if (depth < band.upTo) {
      return band.color;
    }
  }

  return null;
};

/** Rasterises a ray from the hub as a staircase of cells, the way an 8-bit line would be drawn */
const drawPixelRay = (ctx: CanvasRenderingContext2D, center: number, angle: number, length: number, cell: number) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  if (cell <= 1) {
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + cos * length, center + sin * length);
    ctx.stroke();

    return;
  }

  const step = cell / 4;
  let lastX = Number.NaN;
  let lastY = Number.NaN;
  for (let distance = 0; distance <= length; distance += step) {
    const gx = Math.floor((center + cos * distance) / cell);
    const gy = Math.floor((center + sin * distance) / cell);
    if (gx === lastX && gy === lastY) {
      continue;
    }
    lastX = gx;
    lastY = gy;
    ctx.fillRect(gx * cell, gy * cell, cell, cell);
  }
};

/** Palette shifts chosen in beforeDraw for the full ring so neighbouring sectors never share a color */
const nudges = new Map<WheelItem['id'], number>();

/**
 * The dropout collapse animation redraws just the two sectors beside the eaten one.
 * Their shifts must stay the ones chosen for the full ring, otherwise a sector
 * changes color for the duration of the animation.
 */
const isPartialRedraw = (items: WheelItem[]): boolean => items.length < 3 && items.every((item) => nudges.has(item.id));

const renderer: ArcadeRenderer = {
  beforeDraw(_ctx, items) {
    if (isPartialRedraw(items)) {
      return;
    }

    nudges.clear();
    const resolved: number[] = [];

    items.forEach((item, position) => {
      const base = quantizeIndex(item.color || '#000');
      const previous = position > 0 ? resolved[position - 1] : -1;
      const first = position === items.length - 1 && items.length > 2 ? resolved[0] : -1;
      let nudge = 0;

      for (let candidate = 0; candidate < NUDGE_LIMIT; candidate++) {
        const index = paletteIndexWithNudge(base, candidate);
        if (index !== previous && index !== first) {
          nudge = candidate;
          break;
        }
      }

      resolved.push(paletteIndexWithNudge(base, nudge));
      nudges.set(item.id, nudge);
    });
  },
  drawSlice(ctx, item, getColor, { layout, scale }) {
    const { startAngle, endAngle } = item;
    const { center, wheelRadius: radius } = layout;
    const { fill, shade } = toArcadeTones(getColor(item), nudges.get(item.id) ?? 0);
    const cell = getCell(scale);

    ctx.save();

    // flat body, no gradients: the sector is a single palette entry. It stops one cell
    // short of the edge so its smooth outline is always hidden under the pixel rim.
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius - cell, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    // recessed hub disc in the darker tone
    const shadeRadius = radius * SHADE_RADIUS;
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, shadeRadius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    // checkerboard dither between the two tones, cells on the shared wheel grid
    const ditherOuter = radius * (SHADE_RADIUS + DITHER_WIDTH);
    const firstCell = Math.floor((center - ditherOuter) / cell);
    const lastCell = Math.ceil((center + ditherOuter) / cell);
    for (let gy = firstCell; gy <= lastCell; gy++) {
      for (let gx = firstCell; gx <= lastCell; gx++) {
        if ((gx + gy) % 2 !== 0) {
          continue;
        }
        const dx = gx * cell + cell / 2 - center;
        const dy = gy * cell + cell / 2 - center;
        const distance = Math.hypot(dx, dy);
        if (distance < shadeRadius || distance >= ditherOuter) {
          continue;
        }
        if (!containsAngle(startAngle, endAngle, Math.atan2(dy, dx))) {
          continue;
        }
        ctx.fillRect(gx * cell, gy * cell, cell, cell);
      }
    }

    ctx.restore();
  },
  drawText(ctx, { startAngle, endAngle, name, displayName }, { layout, scale }) {
    if ((endAngle - startAngle) / Math.PI / 2 < 0.016) {
      return;
    }

    const radius = layout.wheelRadius - scale(3);
    const text = fitText(displayName || name, maxTextLength);

    // 10px normal Lucida Console at x2 is as wide as the reference's 19px bold Courier,
    // so the geometry below keeps a 24-character label between the core image and the rim
    const { pixel, fontSize } = getPixelTextMetrics(layout.scale);
    const sprite = renderPixelText(text, { fontSize, fill: TEXT_FILL, outline: TEXT_OUTLINE });
    if (!sprite) {
      return;
    }

    ctx.save();

    const textWidth = sprite.textWidth * pixel;
    // right-align the sprite to the label zone and shrink it when a long name would hit the rim
    const outerRadius = layout.wheelRadius * 0.88;
    const availableWidth = layout.wheelRadius * (0.88 - 0.3);
    const fit = Math.min(1, availableWidth / textWidth);
    const textRadius = outerRadius - textWidth * fit;
    const centerAngle = endAngle - (endAngle - startAngle) / 2;

    ctx.translate(
      textRadius * Math.cos(centerAngle) + layout.center,
      textRadius * Math.sin(centerAngle) + layout.center,
    );
    ctx.rotate(centerAngle);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sprite.canvas,
      -sprite.padding * pixel * fit,
      -(sprite.height * pixel * fit) / 2,
      sprite.width * pixel * fit,
      sprite.height * pixel * fit,
    );

    ctx.restore();
  },
  afterDraw(ctx, items, { layout, scale }) {
    const { center, wheelRadius: radius } = layout;
    const cell = getCell(scale);
    const rimInner = radius - cell * RIM_CELLS;

    ctx.save();

    // dividers: drawn after every fill so the seam between the last and first sector is covered too
    ctx.fillStyle = ARCADE_OUTLINE;
    ctx.strokeStyle = ARCADE_OUTLINE;
    items.forEach((item, position) => {
      const previous = items[(position - 1 + items.length) % items.length];
      const span = Math.min(item.endAngle - item.startAngle, previous.endAngle - previous.startAngle);
      // thin sectors get thinner steps so the divider never swallows the fill
      const dividerCell = Math.max(1, Math.min(cell, Math.floor((span * radius * 0.5) / 3)));
      drawPixelRay(ctx, center, item.startAngle, rimInner, dividerCell);
    });

    // chunky rim: concentric bands rasterised on the same cell grid
    const firstCell = Math.floor((center - radius) / cell) - 1;
    const lastCell = Math.ceil((center + radius) / cell) + 1;
    for (let gy = firstCell; gy <= lastCell; gy++) {
      for (let gx = firstCell; gx <= lastCell; gx++) {
        const distance = Math.hypot(gx * cell + cell / 2 - center, gy * cell + cell / 2 - center);
        const depth = (radius - distance) / cell;
        // cells centred just outside the edge still belong to the outline, otherwise the
        // jagged ring would leave gaps over the sector fill
        if (depth < -0.8) {
          continue;
        }
        const color = rimColor(depth);
        if (!color) {
          continue;
        }
        ctx.fillStyle = color;
        ctx.fillRect(gx * cell, gy * cell, cell, cell);
      }
    }

    ctx.restore();
  },
};

/** Flat palette sectors with dithered shading, staircase dividers and a pixel rim. */
const ArcadeSpinningWheel: FC<SpinningWheelProps> = (props) => {
  return <CanvasSpinningWheel {...props} renderer={renderer} />;
};

ArcadeSpinningWheel.displayName = 'ArcadeSpinningWheel';

export default ArcadeSpinningWheel;
