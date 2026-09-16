import tinycolor from 'tinycolor2';

import { fitText } from '@utils/common.utils';
import { WheelItem, WheelItemWithAngle } from '@models/wheel.model';
import CanvasSpinningWheel from '@domains/wheel/BaseWheel/parts/spinning-wheel/CanvasSpinningWheel';
import { fitSectorText } from '@domains/wheel/BaseWheel/parts/sectorText';
import { useFontReady } from '@domains/theme/lib/useFontReady';

import type { FC } from 'react';
import type { SpinningWheelProps } from '@domains/wheel/BaseWheel/parts/types';

const borderWidth = 5;
const innerBorderWidth = 2;
const maxTextLength = 21;

export const MATRIX_GREEN = '#00ff41';
const MATRIX_TEXT = '#c6ffc6';
/** Запасной моноширинный стек: им рисуем подписи, пока титульный шрифт не загрузился. */
const MATRIX_FONT = '"Courier New", Courier, "Lucida Console", monospace';
/**
 * Титульный шрифт фильма (`public/fonts/matrix/matrix.ttf`, `@font-face` в `matrix.css`).
 * Только капитель, без цифр и кириллицы: строчные буквы сами рисуются заглавными глифами,
 * а кириллица и цифры уходят в запасные шрифты стека. В коде регистр не меняем.
 */
export const MATRIX_TITLE_FONT = '"Matrix Title", "Courier New", Courier, monospace';
/** Спецификация для `document.fonts`: размер не важен, важно семейство. */
const MATRIX_TITLE_FONT_SPEC = '20px "Matrix Title"';

/**
 * Maps any participant color onto the phosphor-green palette while keeping
 * sectors distinguishable: hue stays within green, lightness varies per color.
 * Greyscale input (highlight mode) stays grey.
 */
const toMatrixColor = (color: string): { fill: string; edge: string } => {
  const hsl = tinycolor(color).toHsl();
  const isGrey = hsl.s < 0.05;
  const hue = isGrey ? 130 : 100 + (Math.round(hsl.h) % 60);
  const lightness = 0.07 + ((Math.round(hsl.l * 100) * 7) % 17) / 100;
  const saturation = isGrey ? 0.05 : 0.8;

  return {
    fill: tinycolor({ h: hue, s: saturation, l: lightness }).toHexString(),
    edge: tinycolor({ h: hue, s: saturation, l: lightness + 0.12 }).toHexString(),
  };
};

const MatrixSpinningWheel: FC<SpinningWheelProps> = (props) => {
  // Холст кешируется и рисуется один раз, поэтому после загрузки шрифта нужен новый renderer:
  // смена labelFont меняет объект renderer, и CanvasSpinningWheel пересобирает кеш.
  const fontReady = useFontReady(MATRIX_TITLE_FONT_SPEC);
  const labelFont = fontReady ? MATRIX_TITLE_FONT : MATRIX_FONT;

  return (
    <CanvasSpinningWheel
      {...props}
      renderer={{
        drawText(ctx, { startAngle, endAngle, name, displayName }: WheelItemWithAngle, { layout, scale }) {
          if ((endAngle - startAngle) / Math.PI / 2 < 0.016) {
            return;
          }

          const text = fitText(displayName || name, maxTextLength);

          ctx.save();
          // Без bold: синтетическое жирное размазывает потёртые глифы титульного шрифта.
          ctx.font = `${scale(21)}px ${labelFont}`;
          if (fontReady && 'letterSpacing' in ctx) {
            ctx.letterSpacing = `${scale(1)}px`;
          }
          ctx.textBaseline = 'middle';

          const textRadius = fitSectorText(ctx, text, layout, { outerRatio: 0.88 }).startRadius;
          const centerAngle = endAngle - (endAngle - startAngle) / 2;

          ctx.translate(
            textRadius * Math.cos(centerAngle) + layout.center,
            textRadius * Math.sin(centerAngle) + layout.center,
          );
          ctx.rotate(centerAngle);

          ctx.lineJoin = 'round';
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.lineWidth = scale(4);
          ctx.strokeText(text, 0, 0);

          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(10);
          ctx.shadowColor = 'rgba(0, 255, 65, 0.9)';
          ctx.fillStyle = MATRIX_TEXT;
          ctx.fillText(text, 0, 0);

          ctx.restore();
        },
        drawSlice(ctx, item: WheelItemWithAngle, getColor: (item: WheelItem) => string, { layout, scale }) {
          const { startAngle, endAngle } = item;
          const { fill, edge } = toMatrixColor(getColor(item));
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
          gradient.addColorStop(0.35, fill);
          gradient.addColorStop(1, tinycolor(fill).darken(4).toHexString());

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.moveTo(layout.center, layout.center);
          ctx.arc(layout.center, layout.center, radius, startAngle, endAngle);
          ctx.closePath();
          ctx.fill();

          // faint code grid inside the sector
          ctx.strokeStyle = 'rgba(0, 255, 65, 0.12)';
          ctx.lineWidth = scale(1);
          [0.45, 0.65, 0.85].forEach((factor) => {
            ctx.beginPath();
            ctx.arc(layout.center, layout.center, radius * factor, startAngle, endAngle);
            ctx.stroke();
          });

          // phosphor divider
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(8);
          ctx.shadowColor = 'rgba(0, 255, 65, 0.8)';
          ctx.strokeStyle = 'rgba(0, 255, 65, 0.75)';
          ctx.lineWidth = scale(1.5);
          ctx.beginPath();
          ctx.moveTo(layout.center, layout.center);
          ctx.lineTo(layout.center + Math.cos(startAngle) * radius, layout.center + Math.sin(startAngle) * radius);
          ctx.stroke();

          ctx.restore();
        },
        afterDraw(ctx, _items, { layout, scale }) {
          const outerRadius = layout.wheelRadius - scale(borderWidth) / 2;
          const innerRadius = layout.wheelRadius - scale(borderWidth);

          ctx.save();

          // CRT scanlines, clipped to the wheel
          ctx.beginPath();
          ctx.arc(layout.center, layout.center, innerRadius, 0, 2 * Math.PI);
          ctx.clip();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
          const step = Math.max(3, scale(4));
          for (let y = 0; y < layout.canvasSize; y += step) {
            ctx.fillRect(0, y, layout.canvasSize, Math.max(1, scale(1.2)));
          }

          // darken towards the rim
          const vignette = ctx.createRadialGradient(
            layout.center,
            layout.center,
            innerRadius * 0.7,
            layout.center,
            layout.center,
            innerRadius,
          );
          vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
          vignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, layout.canvasSize, layout.canvasSize);
          ctx.restore();

          ctx.save();
          // outer phosphor ring
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.shadowBlur = scale(16);
          ctx.shadowColor = 'rgba(0, 255, 65, 0.9)';
          ctx.strokeStyle = MATRIX_GREEN;
          ctx.lineWidth = scale(3);
          ctx.beginPath();
          ctx.arc(layout.center, layout.center, outerRadius, 0, 2 * Math.PI);
          ctx.stroke();

          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(0, 255, 65, 0.45)';
          ctx.lineWidth = scale(1);
          ctx.beginPath();
          ctx.arc(layout.center, layout.center, innerRadius - scale(8), 0, 2 * Math.PI);
          ctx.stroke();

          // tick marks like a data ring
          const tickCount = 72;
          for (let i = 0; i < tickCount; i++) {
            const angle = (i * 2 * Math.PI) / tickCount;
            const isMajor = i % 6 === 0;
            const from = innerRadius - scale(isMajor ? 14 : 10);
            const to = innerRadius - scale(4);
            ctx.strokeStyle = isMajor ? 'rgba(0, 255, 65, 0.8)' : 'rgba(0, 255, 65, 0.4)';
            ctx.lineWidth = scale(isMajor ? 1.5 : 1);
            ctx.beginPath();
            ctx.moveTo(layout.center + Math.cos(angle) * from, layout.center + Math.sin(angle) * from);
            ctx.lineTo(layout.center + Math.cos(angle) * to, layout.center + Math.sin(angle) * to);
            ctx.stroke();
          }

          ctx.restore();
        },
      }}
    />
  );
};

MatrixSpinningWheel.displayName = 'MatrixSpinningWheel';

export default MatrixSpinningWheel;
