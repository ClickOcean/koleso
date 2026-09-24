import { useMemo } from 'react';

import { fitText } from '@utils/common.utils';
import { WheelItem, WheelItemWithAngle } from '@models/wheel.model';
import CanvasSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/CanvasSpinningWheel';
import { fitSectorText } from '@domains/wheel/BaseWheel/parts/sectorText';

import { useImageAsset } from '../beerParty/imageAsset';

import { catRingAsset, drawCatRing } from './catRing';
import { createSectorPalette, TextStyle } from './taiwanPalette';
import {
  CAT_RING_INNER,
  HUB_RING,
  INLAY_INNER,
  LABEL_INNER,
  LABEL_OUTER,
  TW_CREAM,
  TW_GOLD,
  TW_GOLD_DARK,
  TW_GOLD_LIGHT,
  TW_INK,
  TW_SERIF,
} from './taiwanTokens';

import type { FC } from 'react';
import type { SpinningWheelProps } from '@domains/wheel/BaseWheel/parts/types';

const maxTextLength = 21;
/** Sectors reach this many px under the cat ring so its feathered inner edge never shows a gap */
const UNDER_RING = 6;

/** Polished gold lit from the top-left */
const goldMetal = (ctx: CanvasRenderingContext2D, center: number, radius: number): CanvasGradient => {
  const gradient = ctx.createLinearGradient(center - radius, center - radius, center + radius, center + radius);
  gradient.addColorStop(0, TW_GOLD_LIGHT);
  gradient.addColorStop(0.45, TW_GOLD);
  gradient.addColorStop(0.75, TW_GOLD_DARK);
  gradient.addColorStop(1, TW_GOLD_LIGHT);

  return gradient;
};

const glyphStyle = (style: TextStyle): { fill: string; stroke: string } => {
  if (style === 'cream') {
    return { fill: TW_CREAM, stroke: 'rgba(40, 6, 6, 0.85)' };
  }

  if (style === 'muted') {
    return { fill: '#b1a799', stroke: 'rgba(0, 0, 0, 0.8)' };
  }

  return { fill: TW_INK, stroke: 'rgba(255, 246, 225, 0.8)' };
};

/**
 * Temple lacquer wheel: red, cream and gold sectors repeat by order, the participant
 * hue survives as a thin inlay under the ring of sleeping cats that spins with the wheel,
 * gold dividers and a gold hub ring.
 */
const TaiwanSpinningWheel: FC<SpinningWheelProps> = (props) => {
  // families follow sector order, so they are fixed per draw pass in beforeDraw and
  // looked up per sector in drawSlice / drawText
  const palette = useMemo(() => createSectorPalette(), []);
  // the wheel canvas is cached, so the ring photo must arrive through a re-render (a new
  // renderer object rebuilds the cache); until then the lacquer rim stands in
  const ringImage = useImageAsset(catRingAsset);

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
          ctx.font = `bold ${scale(20)}px ${TW_SERIF}`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';

          // names end just inside the cat ring and shrink when a long one does not fit next to the hub
          const { startRadius } = fitSectorText(ctx, text, layout, {
            outerRatio: LABEL_OUTER,
            innerRatio: LABEL_INNER,
          });
          const centerAngle = endAngle - (endAngle - startAngle) / 2;

          ctx.translate(
            startRadius * Math.cos(centerAngle) + layout.center,
            startRadius * Math.sin(centerAngle) + layout.center,
          );
          ctx.rotate(centerAngle);

          const { fill, stroke } = glyphStyle(palette.textFor(item));
          ctx.lineJoin = 'round';
          ctx.strokeStyle = stroke;
          ctx.lineWidth = scale(3);
          ctx.strokeText(text, 0, 0);
          ctx.fillStyle = fill;
          ctx.fillText(text, 0, 0);

          ctx.restore();
        },
        drawSlice(ctx, item: WheelItemWithAngle, getColor: (item: WheelItem) => string, { layout, scale }) {
          const { startAngle, endAngle } = item;
          const { fill, sheen, edge, inlay } = palette.colorsFor(item, getColor);
          const { center, wheelRadius } = layout;
          const radius = wheelRadius * CAT_RING_INNER + scale(UNDER_RING);

          ctx.save();

          // lacquer: darker at the hub, a glossy band two thirds out, darker again at the ring
          const lacquer = ctx.createRadialGradient(center, center, radius * 0.08, center, center, radius);
          lacquer.addColorStop(0, edge);
          lacquer.addColorStop(0.32, fill);
          lacquer.addColorStop(0.7, sheen);
          lacquer.addColorStop(1, edge);

          ctx.fillStyle = lacquer;
          ctx.beginPath();
          ctx.moveTo(center, center);
          ctx.arc(center, center, radius, startAngle, endAngle);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = inlay;
          ctx.beginPath();
          ctx.arc(center, center, radius, startAngle, endAngle);
          ctx.arc(center, center, wheelRadius * INLAY_INNER, endAngle, startAngle, true);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        },
        afterDraw(ctx, items, { layout, scale }) {
          const { center, wheelRadius } = layout;
          const radius = wheelRadius * CAT_RING_INNER + scale(UNDER_RING);
          const hubRadius = wheelRadius * HUB_RING;
          const gold = goldMetal(ctx, center, wheelRadius);

          ctx.save();

          // soft gloss from the top-left over the whole lacquer disc
          ctx.beginPath();
          ctx.arc(center, center, radius, 0, 2 * Math.PI);
          ctx.clip();
          const glossX = center - radius * 0.35;
          const glossY = center - radius * 0.45;
          const gloss = ctx.createRadialGradient(glossX, glossY, radius * 0.05, glossX, glossY, radius * 0.95);
          gloss.addColorStop(0, 'rgba(255, 246, 228, 0.17)');
          gloss.addColorStop(1, 'rgba(255, 246, 228, 0)');
          ctx.fillStyle = gloss;
          ctx.fillRect(center - radius, center - radius, radius * 2, radius * 2);

          // gold dividers, drawn after every slice so no later fill covers them
          if (items.length > 1) {
            ctx.strokeStyle = gold;
            ctx.lineWidth = scale(2.4);
            ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
            ctx.shadowBlur = scale(3);
            items.forEach(({ startAngle }) => {
              ctx.beginPath();
              ctx.moveTo(center + Math.cos(startAngle) * hubRadius, center + Math.sin(startAngle) * hubRadius);
              ctx.lineTo(center + Math.cos(startAngle) * radius, center + Math.sin(startAngle) * radius);
              ctx.stroke();
            });
          }

          ctx.restore();

          // gold ring around the hub image
          ctx.save();
          ctx.strokeStyle = gold;
          ctx.lineWidth = scale(5);
          ctx.beginPath();
          ctx.arc(center, center, hubRadius, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.restore();

          drawCatRing(ctx, layout, ringImage);
        },
      }}
    />
  );
};

TaiwanSpinningWheel.displayName = 'TaiwanSpinningWheel';

export default TaiwanSpinningWheel;
