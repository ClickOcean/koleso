import { useEffect, useRef } from 'react';

import { BAND_INNER, TICK_OUTER } from './highSocietyTokens';

import type { EffectsProps } from '@domains/wheel/BaseWheel/parts/types';

const FRAME_INTERVAL = 50; // 20 fps
const MAX_BUBBLES = 180;
const MAX_SPARKLES = 48;
const IDLE_BUBBLES_PER_SECOND = 7;
const SPIN_BUBBLE_MULTIPLIER = 3;
const IDLE_SPARKLES_PER_SECOND = 1.6;
const SPIN_SPARKLES_PER_SECOND = 6;
/** Shimmer sweep around the rim while spinning, radians per second */
const SHIMMER_SPEED = 1.6;
const SHIMMER_HALF_WIDTH = Math.PI / 4;
const SHIMMER_SEGMENTS = 28;

interface Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  age: number;
  life: number;
  wobblePhase: number;
  wobbleSpeed: number;
}

interface Sparkle {
  x: number;
  y: number;
  size: number;
  age: number;
  life: number;
  rotation: number;
}

interface EffectState {
  bubbles: Bubble[];
  sparkles: Sparkle[];
  /** Fractional spawn budgets so low rates still emit evenly */
  bubbleBudget: number;
  sparkleBudget: number;
  /** 0..1, eases towards 1 while spinning */
  shimmer: number;
  shimmerAngle: number;
}

const createState = (): EffectState => ({
  bubbles: [],
  sparkles: [],
  bubbleBudget: 0,
  sparkleBudget: 0,
  shimmer: 0,
  shimmerAngle: -Math.PI / 2,
});

/** Angle around the wheel biased towards the top so bubbles rise along the rim, not across the sectors */
const rimAngle = (): number => {
  const t = Math.random() * 2 - 1;

  return -Math.PI / 2 + t * Math.abs(t) * Math.PI * 0.95;
};

const createBubble = (center: number, wheelRadius: number, scale: number): Bubble => {
  const angle = rimAngle();
  const radius = wheelRadius + (Math.random() * (TICK_OUTER + BAND_INNER) - BAND_INNER) * scale;

  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
    vx: Math.cos(angle) * (6 + Math.random() * 10) * scale,
    vy: (-(18 + Math.random() * 28) + Math.sin(angle) * 6) * scale,
    radius: (1.4 + Math.random() * 2.4) * scale,
    age: 0,
    life: 1.8 + Math.random() * 1.6,
    wobblePhase: Math.random() * 2 * Math.PI,
    wobbleSpeed: 2 + Math.random() * 2,
  };
};

const createSparkle = (
  center: number,
  wheelRadius: number,
  scale: number,
  angle = Math.random() * 2 * Math.PI,
): Sparkle => {
  const radius = wheelRadius + (Math.random() * (TICK_OUTER + BAND_INNER) - BAND_INNER) * scale;

  return {
    x: center + Math.cos(angle) * radius,
    y: center + Math.sin(angle) * radius,
    size: (3 + Math.random() * 4) * scale,
    age: 0,
    life: 0.5 + Math.random() * 0.5,
    rotation: Math.random() * Math.PI,
  };
};

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
 * Champagne bubbles rising around the rim with the odd sparkle on the gold; while
 * spinning the bubbles get three times denser and a soft golden shimmer sweeps
 * around the rim.
 */
const HighSocietyEffects = ({ layout, isSpinning }: EffectsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSpinningRef = useRef(isSpinning);
  const stateRef = useRef<EffectState>(createState());

  useEffect(() => {
    isSpinningRef.current = isSpinning;
  }, [isSpinning]);

  useEffect(() => {
    resizeCanvas(canvasRef.current, layout.canvasSize);
  }, [layout.canvasSize]);

  useEffect(() => {
    // particle positions are canvas coordinates, so a new layout starts from scratch
    stateRef.current = createState();

    let frameId: number | null = null;
    let lastFrame = 0;

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);

      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const delta = lastFrame ? Math.min(timestamp - lastFrame, 250) / 1000 : FRAME_INTERVAL / 1000;
      lastFrame = timestamp;

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) {
        return;
      }

      const state = stateRef.current;
      const spinning = isSpinningRef.current;
      const { canvasSize, center, wheelRadius, scale } = layout;

      // spawn
      const bubbleRate = IDLE_BUBBLES_PER_SECOND * (spinning ? SPIN_BUBBLE_MULTIPLIER : 1);
      state.bubbleBudget += bubbleRate * delta;
      while (state.bubbleBudget >= 1) {
        state.bubbleBudget -= 1;
        if (state.bubbles.length < MAX_BUBBLES) {
          state.bubbles.push(createBubble(center, wheelRadius, scale));
        }
      }

      state.sparkleBudget += (spinning ? SPIN_SPARKLES_PER_SECOND : IDLE_SPARKLES_PER_SECOND) * delta;
      while (state.sparkleBudget >= 1) {
        state.sparkleBudget -= 1;
        if (state.sparkles.length < MAX_SPARKLES) {
          // while the shimmer sweeps, most sparkles are struck at its head
          const angle =
            state.shimmer > 0.5 && Math.random() < 0.7
              ? state.shimmerAngle + (Math.random() - 0.5) * SHIMMER_HALF_WIDTH
              : undefined;
          state.sparkles.push(createSparkle(center, wheelRadius, scale, angle));
        }
      }

      // advance
      state.shimmer += ((spinning ? 1 : 0) - state.shimmer) * Math.min(1, delta * 3);
      state.shimmerAngle += SHIMMER_SPEED * delta;

      state.bubbles = state.bubbles.filter((bubble) => {
        bubble.age += delta;
        const wobble = Math.sin(bubble.wobblePhase + bubble.age * bubble.wobbleSpeed) * 4 * scale;
        bubble.x += (bubble.vx + wobble) * delta;
        bubble.y += bubble.vy * delta;

        return bubble.age < bubble.life && bubble.y > -bubble.radius && bubble.x > 0 && bubble.x < canvasSize;
      });

      state.sparkles = state.sparkles.filter((sparkle) => {
        sparkle.age += delta;

        return sparkle.age < sparkle.life;
      });

      // render
      ctx.clearRect(0, 0, canvasSize, canvasSize);
      ctx.save();

      if (state.shimmer > 0.02) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineWidth = (TICK_OUTER + BAND_INNER + 2) * scale;
        const bandRadius = wheelRadius + ((TICK_OUTER - BAND_INNER) / 2) * scale;
        const step = (2 * SHIMMER_HALF_WIDTH) / SHIMMER_SEGMENTS;

        for (let i = 0; i < SHIMMER_SEGMENTS; i++) {
          const from = state.shimmerAngle - SHIMMER_HALF_WIDTH + i * step;
          const distance = Math.abs(from + step / 2 - state.shimmerAngle) / SHIMMER_HALF_WIDTH;
          const alpha = state.shimmer * 0.42 * (1 - distance) ** 2;

          ctx.strokeStyle = `rgba(255, 226, 140, ${alpha})`;
          ctx.beginPath();
          ctx.arc(center, center, bandRadius, from - 0.005, from + step + 0.005);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      const bubbleAlpha = spinning ? 0.75 : 0.6;
      state.bubbles.forEach((bubble) => {
        const envelope =
          Math.min(1, bubble.age / (bubble.life * 0.15)) *
          Math.min(1, (bubble.life - bubble.age) / (bubble.life * 0.4));
        const alpha = bubbleAlpha * envelope;
        if (alpha <= 0.01) {
          return;
        }

        ctx.fillStyle = `rgba(255, 220, 130, ${alpha * 0.22})`;
        ctx.strokeStyle = `rgba(255, 232, 160, ${alpha})`;
        ctx.lineWidth = Math.max(0.6, 0.9 * scale);
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 255, 240, ${alpha})`;
        ctx.beginPath();
        ctx.arc(bubble.x - bubble.radius * 0.35, bubble.y - bubble.radius * 0.35, bubble.radius * 0.28, 0, 2 * Math.PI);
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      state.sparkles.forEach((sparkle) => {
        const alpha = Math.sin((sparkle.age / sparkle.life) * Math.PI);
        const reach = sparkle.size * (0.6 + alpha * 0.4);

        ctx.save();
        ctx.translate(sparkle.x, sparkle.y);
        ctx.rotate(sparkle.rotation);
        ctx.strokeStyle = `rgba(255, 244, 210, ${alpha * 0.95})`;
        ctx.lineWidth = Math.max(0.7, 1 * scale);
        ctx.beginPath();
        ctx.moveTo(-reach, 0);
        ctx.lineTo(reach, 0);
        ctx.moveTo(0, -reach);
        ctx.lineTo(0, reach);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 226, 140, ${alpha * 0.5})`;
        ctx.lineWidth = Math.max(0.5, 0.7 * scale);
        ctx.beginPath();
        ctx.moveTo(-reach * 0.5, -reach * 0.5);
        ctx.lineTo(reach * 0.5, reach * 0.5);
        ctx.moveTo(reach * 0.5, -reach * 0.5);
        ctx.lineTo(-reach * 0.5, reach * 0.5);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 252, 235, ${alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, sparkle.size * 0.22, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      });

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

export default HighSocietyEffects;
