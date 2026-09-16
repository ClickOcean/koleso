import { useEffect, useRef } from 'react';

import type { EffectsProps } from '@domains/wheel/BaseWheel/parts/types';

const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789Z:・"=*+-<>¦|';
const GLYPH_COUNT = 56;
const FRAME_INTERVAL = 80; // ~12 fps is enough for flicker

interface RingGlyph {
  char: string;
  brightness: number;
}

const randomGlyph = (): string => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

const resizeCanvas = (canvas: HTMLCanvasElement | null, size: number): void => {
  if (!canvas) {
    return;
  }

  canvas.width = size;
  canvas.height = size;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
};

/**
 * Ring of flickering code glyphs just outside the rim. Rotates slowly, faster
 * while spinning; a few glyphs change every frame so the ring looks alive.
 */
const MatrixEffects = ({ layout, isSpinning }: EffectsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glyphsRef = useRef<RingGlyph[]>(
    Array.from({ length: GLYPH_COUNT }, () => ({ char: randomGlyph(), brightness: Math.random() })),
  );
  const rotationRef = useRef(0);
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

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);

      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const delta = lastFrame ? timestamp - lastFrame : FRAME_INTERVAL;
      lastFrame = timestamp;

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) {
        return;
      }

      const spinning = isSpinningRef.current;
      const speed = spinning ? 0.9 : 0.12; // radians per second
      rotationRef.current += (speed * delta) / 1000;

      const glyphs = glyphsRef.current;
      const changes = spinning ? 6 : 2;
      for (let i = 0; i < changes; i++) {
        const index = Math.floor(Math.random() * glyphs.length);
        glyphs[index] = { char: randomGlyph(), brightness: 1 };
      }
      glyphs.forEach((glyph) => {
        glyph.brightness = Math.max(0.25, glyph.brightness - 0.05);
      });

      const { canvasSize, center, wheelRadius, scale } = layout;
      const ringRadius = wheelRadius + scale * 26;
      const fontSize = Math.max(10, scale * 14);

      ctx.clearRect(0, 0, canvasSize, canvasSize);
      ctx.save();
      ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = scale * 6;
      ctx.shadowColor = 'rgba(0, 255, 65, 0.8)';

      glyphs.forEach((glyph, index) => {
        const angle = rotationRef.current + (index * 2 * Math.PI) / glyphs.length;
        const x = center + Math.cos(angle) * ringRadius;
        const y = center + Math.sin(angle) * ringRadius;
        const alpha = 0.25 + glyph.brightness * 0.75;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillStyle = glyph.brightness > 0.9 ? `rgba(220, 255, 220, ${alpha})` : `rgba(0, 255, 65, ${alpha})`;
        ctx.fillText(glyph.char, 0, 0);
        ctx.restore();
      });

      // occasional glitch bars while spinning
      if (spinning && Math.random() < 0.18) {
        const bars = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < bars; i++) {
          const barY = center - wheelRadius + Math.random() * wheelRadius * 2;
          const barHeight = 2 + Math.random() * scale * 6;
          ctx.fillStyle = `rgba(0, 255, 65, ${0.08 + Math.random() * 0.12})`;
          ctx.fillRect(center - wheelRadius, barY, wheelRadius * 2, barHeight);
        }
      }

      ctx.restore();
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

export default MatrixEffects;
