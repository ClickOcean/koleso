import { useEffect, useRef } from 'react';

import type { EffectsProps } from '@domains/wheel/BaseWheel/parts/types';

const FRAME_INTERVAL = 66; // ~15 fps: enough for slow glints and a drifting dash
const INK_RGB = '58, 38, 16';
const BRASS_RGB = '214, 168, 78';

interface Sparkle {
  x: number;
  y: number;
  size: number;
  age: number;
  ttl: number;
  rotation: number;
}

const resizeCanvas = (canvas: HTMLCanvasElement | null, size: number): void => {
  if (!canvas) {
    return;
  }

  canvas.width = size;
  canvas.height = size;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
};

/** Four-pointed brass glint, like light catching a sextant. */
const drawSparkle = (ctx: CanvasRenderingContext2D, sparkle: Sparkle, alpha: number): void => {
  const { x, y, size, rotation } = sparkle;
  const diagonal = size * 0.45;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.lineCap = 'round';

  ctx.strokeStyle = `rgba(${BRASS_RGB}, ${alpha})`;
  ctx.lineWidth = Math.max(1, size * 0.16);
  ctx.beginPath();
  ctx.moveTo(-size, 0);
  ctx.lineTo(size, 0);
  ctx.moveTo(0, -size);
  ctx.lineTo(0, size);
  ctx.stroke();

  ctx.lineWidth = Math.max(0.6, size * 0.08);
  ctx.beginPath();
  ctx.moveTo(-diagonal, -diagonal);
  ctx.lineTo(diagonal, diagonal);
  ctx.moveTo(-diagonal, diagonal);
  ctx.lineTo(diagonal, -diagonal);
  ctx.stroke();

  ctx.fillStyle = `rgba(255, 250, 235, ${alpha})`;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.18, 0, 2 * Math.PI);
  ctx.fill();

  ctx.restore();
};

/**
 * Light sextant glints around the rim at rest. While spinning a dashed ink
 * ring (plus a faint brass one) drifts around the wheel; both fade in and out.
 */
const NauticalEffects = ({ layout, isSpinning }: EffectsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparklesRef = useRef<Sparkle[]>([]);
  const ringAlphaRef = useRef(0);
  const dashOffsetRef = useRef(0);
  const isSpinningRef = useRef(isSpinning);

  useEffect(() => {
    isSpinningRef.current = isSpinning;
  }, [isSpinning]);

  useEffect(() => {
    resizeCanvas(canvasRef.current, layout.canvasSize);
  }, [layout.canvasSize]);

  useEffect(() => {
    let frameId: number | null = null;
    let lastFrame = 0;
    sparklesRef.current = [];

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);

      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const delta = lastFrame ? Math.min(timestamp - lastFrame, 200) : FRAME_INTERVAL;
      lastFrame = timestamp;

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) {
        return;
      }

      const { canvasSize, center, wheelRadius, scale } = layout;
      const spinning = isSpinningRef.current;
      const sparkles = sparklesRef.current;

      // spawn glints: a rare one at rest, a handful while spinning
      const maxCount = spinning ? 7 : 3;
      const spawnChance = spinning ? 0.35 : 0.05;
      if (sparkles.length < maxCount && Math.random() < spawnChance) {
        const angle = Math.random() * 2 * Math.PI;
        const distance = wheelRadius + scale * (Math.random() * 34 - 8);
        sparkles.push({
          x: center + Math.cos(angle) * distance,
          y: center + Math.sin(angle) * distance,
          size: scale * (4 + Math.random() * 5),
          age: 0,
          ttl: 550 + Math.random() * 600,
          rotation: Math.random() * Math.PI,
        });
      }

      // the dashed ring fades in and out instead of popping
      const targetAlpha = spinning ? 1 : 0;
      ringAlphaRef.current += (targetAlpha - ringAlphaRef.current) * Math.min(1, delta / 320);
      dashOffsetRef.current += ((spinning ? 70 : 25) * scale * delta) / 1000;

      ctx.clearRect(0, 0, canvasSize, canvasSize);

      const ringAlpha = ringAlphaRef.current;
      if (ringAlpha > 0.01) {
        ctx.save();
        ctx.strokeStyle = `rgba(${INK_RGB}, ${0.5 * ringAlpha})`;
        ctx.lineWidth = scale * 1.6;
        ctx.setLineDash([scale * 10, scale * 8]);
        ctx.lineDashOffset = -dashOffsetRef.current;
        ctx.beginPath();
        ctx.arc(center, center, wheelRadius + scale * 13, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.strokeStyle = `rgba(${BRASS_RGB}, ${0.45 * ringAlpha})`;
        ctx.lineWidth = scale;
        ctx.setLineDash([scale * 2, scale * 7]);
        ctx.lineDashOffset = dashOffsetRef.current * 0.6;
        ctx.beginPath();
        ctx.arc(center, center, wheelRadius + scale * 20, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
      }

      for (let i = sparkles.length - 1; i >= 0; i--) {
        const sparkle = sparkles[i];
        sparkle.age += delta;
        if (sparkle.age >= sparkle.ttl) {
          sparkles.splice(i, 1);
          continue;
        }

        const progress = sparkle.age / sparkle.ttl;
        drawSparkle(ctx, sparkle, Math.sin(progress * Math.PI) * 0.85);
      }
    };

    frameId = requestAnimationFrame(draw);

    return () => {
      if (frameId != null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [layout]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden='true'
      style={{
        position: 'absolute',
        inset: 0,
        left: `${-layout.overflowPadding}px`,
        top: `${-layout.overflowPadding}px`,
        zIndex: 2,
        pointerEvents: 'none',
      }}
    />
  );
};

export default NauticalEffects;
