import { useMemo } from 'react';

import { fitText } from '@utils/common.utils';
import { WheelItem, WheelItemWithAngle } from '@models/wheel.model';
import CanvasSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/CanvasSpinningWheel';
import { fitSectorText } from '@domains/wheel/BaseWheel/parts/sectorText';

import { drawRim, goldMetal } from './rim';
import { createSectorPalette, TextStyle } from './taiwanPalette';
import { HUB_RING, INLAY_INNER, LABEL_INNER, LABEL_OUTER, RIM_INNER, TW_CREAM, TW_INK, TW_SERIF } from './taiwanTokens';

import type { FC } from 'react';
import type { SpinningWheelProps } from '@domains/wheel/BaseWheel/parts/types';

const maxTextLength = 21;
/** Sectors reach this many px under the rim so no background shows between them */
const UNDER_RIM = 3;

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
 * Temple lacquer wheel: red, cream and gold sectors repeat by order and reach almost to the
 * edge, the participant hue survives as a thin inlay under a thin gold rim with studs, gold
 * dividers and a gold hub ring.
 */
const TaiwanSpinningWheel: FC<SpinningWheelProps> = (props) => {
  // families follow sector order, so they are fixed per draw pass in beforeDraw and
  // looked up per sector in drawSlice / drawText
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
          ctx.font = `bold ${scale(22)}px ${TW_SERIF}`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';

          // names end just inside the rim and shrink when a long one does not fit next to the hub
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
          const radius = wheelRadius * RIM_INNER + scale(UNDER_RIM);

          ctx.save();

          // lacquer: darker at the hub, a glossy band two thirds out, darker again at the rim
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
          const radius = wheelRadius * RIM_INNER + scale(UNDER_RIM);
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

          drawRim(ctx, layout);
        },
      }}
    />
  );
};

TaiwanSpinningWheel.displayName = 'TaiwanSpinningWheel';

export default TaiwanSpinningWheel;
