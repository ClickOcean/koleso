import { useEffect, useRef } from 'react';

import { SYNTH_CYAN_RGB, SYNTH_PINK_RGB, SYNTH_PURPLE_RGB, SYNTH_WHITE_RGB } from './palette';

import type { EffectsProps } from '@domains/wheel/BaseWheel/parts/types';

const FRAME_INTERVAL = 1000 / 24;
const SPARKLE_COUNT = 44;
const STREAK_COUNT = 10;
const IDLE_STREAKS = 3;
const STREAK_SEGMENTS = 6;
const MAX_RAYS = 40;
const RAY_LIFE = 380; // ms
const TWO_PI = Math.PI * 2;

const RAY_COLORS = [SYNTH_PINK_RGB, SYNTH_CYAN_RGB, SYNTH_WHITE_RGB, SYNTH_PURPLE_RGB];
const SPARKLE_COLORS = [SYNTH_PINK_RGB, SYNTH_CYAN_RGB, SYNTH_WHITE_RGB];

/** Distances below are in 800px-wheel units and multiplied by `layout.scale` when drawn. */
interface Sparkle {
  angle: number;
  distance: number;
  size: number;
  phase: number;
  twinkle: number;
  rgb: string;
}

interface Streak {
  angle: number;
  speed: number;
  length: number;
  offset: number;
  rgb: string;
}

interface Ray {
  angle: number;
  born: number;
  length: number;
  rgb: string;
}

const rgba = (rgb: string, alpha: number): string => `rgba(${rgb}, ${alpha.toFixed(3)})`;
const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min);
const randomItem = (items: string[]): string => items[Math.floor(Math.random() * items.length)];

const createSparkles = (): Sparkle[] =>
  Array.from({ length: SPARKLE_COUNT }, () => ({
    angle: Math.random() * TWO_PI,
    distance: randomBetween(8, 52),
    size: randomBetween(1.5, 4),
    phase: Math.random() * TWO_PI,
    twinkle: randomBetween(1.5, 4),
    rgb: randomItem(SPARKLE_COLORS),
  }));

const createStreaks = (): Streak[] =>
  Array.from({ length: STREAK_COUNT }, (_, index) => ({
    angle: (index / STREAK_COUNT) * TWO_PI + Math.random(),
    speed: randomBetween(0.5, 0.9),
    length: randomBetween(0.18, 0.32),
    offset: randomBetween(4, 20),
    rgb: index % 2 === 0 ? SYNTH_PINK_RGB : SYNTH_CYAN_RGB,
  }));

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
 * Laser streaks racing around the rim and twinkling sparkles just outside it.
 * An eased intensity value follows `isSpinning`: while spinning the streaks
 * multiply and speed up, sparkles drift with the wheel, radial speed lines
 * shoot outward and the rim gets a charged pink halo.
 */
const SynthwaveEffects = ({ layout, isSpinning }: EffectsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparklesRef = useRef<Sparkle[]>(createSparkles());
  const streaksRef = useRef<Streak[]>(createStreaks());
  const raysRef = useRef<Ray[]>([]);
  const intensityRef = useRef(0);
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
      const delta = lastFrame ? Math.min(timestamp - lastFrame, 120) : FRAME_INTERVAL;
      lastFrame = timestamp;

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) {
        return;
      }

      // ramp up quickly when the spin starts, settle slowly when it ends
      const target = isSpinningRef.current ? 1 : 0;
      const rate = target > intensityRef.current ? 3 : 1.2;
      intensityRef.current += (target - intensityRef.current) * Math.min(1, (rate * delta) / 1000);
      const intensity = intensityRef.current;

      const { canvasSize, center, wheelRadius, scale } = layout;
      const seconds = timestamp / 1000;
      const dt = delta / 1000;

      ctx.clearRect(0, 0, canvasSize, canvasSize);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // charged halo hugging the rim while spinning
      if (intensity > 0.02) {
        ctx.shadowBlur = scale * 30;
        ctx.shadowColor = rgba(SYNTH_PINK_RGB, 0.8 * intensity);
        ctx.strokeStyle = rgba(SYNTH_PINK_RGB, 0.22 * intensity);
        ctx.lineWidth = scale * 12;
        ctx.beginPath();
        ctx.arc(center, center, wheelRadius + scale * 4, 0, TWO_PI);
        ctx.stroke();
      }

      // laser streaks: trails of fading arc segments with a hot white head
      const activeStreaks = IDLE_STREAKS + Math.round((STREAK_COUNT - IDLE_STREAKS) * intensity);
      const speedMultiplier = 1 + intensity * 5;
      streaksRef.current.forEach((streak, index) => {
        streak.angle = (streak.angle + streak.speed * speedMultiplier * dt) % TWO_PI;
        if (index >= activeStreaks) {
          return;
        }

        const radius = wheelRadius + scale * streak.offset;
        const length = streak.length * (1 + intensity * 1.6);
        const baseAlpha = 0.45 + 0.5 * intensity;

        ctx.shadowBlur = scale * 10;
        ctx.shadowColor = rgba(streak.rgb, 0.9);
        ctx.lineWidth = scale * (1.8 + intensity * 1.2);
        for (let segment = 0; segment < STREAK_SEGMENTS; segment++) {
          const from = streak.angle - (length * (segment + 1)) / STREAK_SEGMENTS;
          const to = streak.angle - (length * segment) / STREAK_SEGMENTS;
          ctx.strokeStyle = rgba(streak.rgb, baseAlpha * (1 - segment / STREAK_SEGMENTS));
          ctx.beginPath();
          ctx.arc(center, center, radius, from, to);
          ctx.stroke();
        }

        ctx.fillStyle = rgba(SYNTH_WHITE_RGB, 0.6 + 0.4 * intensity);
        ctx.beginPath();
        ctx.arc(
          center + Math.cos(streak.angle) * radius,
          center + Math.sin(streak.angle) * radius,
          scale * 2,
          0,
          TWO_PI,
        );
        ctx.fill();
      });

      // sparkles: four-point stars that twinkle and drift with the wheel
      const drift = (0.06 + intensity * 1.4) * dt;
      ctx.lineWidth = Math.max(1, scale * 0.9);
      sparklesRef.current.forEach((sparkle) => {
        sparkle.angle += drift * (0.6 + sparkle.size / 4);

        const pulse = 0.5 + 0.5 * Math.sin(seconds * sparkle.twinkle + sparkle.phase);
        const alpha = (0.15 + 0.85 * pulse) * (0.55 + 0.45 * intensity);
        if (alpha < 0.08) {
          return;
        }

        const radius = wheelRadius + scale * sparkle.distance;
        const x = center + Math.cos(sparkle.angle) * radius;
        const y = center + Math.sin(sparkle.angle) * radius;
        const size = scale * sparkle.size * (0.7 + 0.6 * pulse) * (1 + intensity * 0.5);

        ctx.shadowBlur = scale * 6;
        ctx.shadowColor = rgba(sparkle.rgb, alpha);
        ctx.strokeStyle = rgba(sparkle.rgb, alpha);
        ctx.beginPath();
        ctx.moveTo(x - size * 2, y);
        ctx.lineTo(x + size * 2, y);
        ctx.moveTo(x, y - size * 2);
        ctx.lineTo(x, y + size * 2);
        ctx.stroke();

        ctx.fillStyle = rgba(SYNTH_WHITE_RGB, alpha);
        ctx.beginPath();
        ctx.arc(x, y, size * 0.6, 0, TWO_PI);
        ctx.fill();
      });

      // radial speed lines shooting out of the rim while spinning
      const rays = raysRef.current;
      if (intensity > 0.15 && rays.length < MAX_RAYS && Math.random() < intensity * 0.9) {
        const spawnCount = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < spawnCount; i++) {
          rays.push({
            angle: Math.random() * TWO_PI,
            born: timestamp,
            length: randomBetween(14, 48),
            rgb: randomItem(RAY_COLORS),
          });
        }
      }

      ctx.lineWidth = scale * 1.6;
      for (let i = rays.length - 1; i >= 0; i--) {
        const ray = rays[i];
        const life = 1 - (timestamp - ray.born) / RAY_LIFE;
        if (life <= 0) {
          rays.splice(i, 1);
          continue;
        }

        const inner = wheelRadius + scale * 6 + scale * ray.length * (1 - life) * 0.8;
        const outer = inner + scale * ray.length * life;
        const cos = Math.cos(ray.angle);
        const sin = Math.sin(ray.angle);

        ctx.shadowBlur = scale * 8;
        ctx.shadowColor = rgba(ray.rgb, life);
        ctx.strokeStyle = rgba(ray.rgb, 0.9 * life);
        ctx.beginPath();
        ctx.moveTo(center + cos * inner, center + sin * inner);
        ctx.lineTo(center + cos * outer, center + sin * outer);
        ctx.stroke();
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

export default SynthwaveEffects;
