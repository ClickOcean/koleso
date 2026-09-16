import { useEffect, useRef } from 'react';

import type { EffectsProps, WheelPartLayout } from '@domains/wheel/BaseWheel/parts/types';

const FRAME_INTERVAL = 50; // 20 fps
const WISP_COUNT = 10;
const FLASH_CHANCE = 0.06;
const FLASH_FRAMES = 3;

interface Point {
  x: number;
  y: number;
}

interface Wisp {
  angle: number;
  /** radians per second around the wheel */
  orbit: number;
  /** distance beyond the rim, in 800px-wheel units */
  reach: number;
  sway: number;
  swaySpeed: number;
  size: number;
  alpha: number;
  phase: number;
}

interface Flash {
  framesLeft: number;
  intensity: number;
  bolts: Point[][];
}

const createWisp = (): Wisp => ({
  angle: Math.random() * Math.PI * 2,
  orbit: (0.05 + Math.random() * 0.08) * (Math.random() < 0.5 ? -1 : 1),
  reach: 10 + Math.random() * 60,
  sway: 12 + Math.random() * 22,
  swaySpeed: 0.3 + Math.random() * 0.5,
  size: 55 + Math.random() * 60,
  alpha: 0.08 + Math.random() * 0.1,
  phase: Math.random() * Math.PI * 2,
});

/** Two thumps per beat, 0..1 */
const heartbeat = (seconds: number, bpm: number): number => {
  const phase = ((seconds * bpm) / 60) % 1;
  const thump = (at: number, width: number) => Math.exp(-((phase - at) ** 2) / (2 * width * width));

  return Math.min(1, thump(0.12, 0.045) + 0.6 * thump(0.34, 0.06));
};

/** Jagged bolt from outside the canvas down to the rim */
const createBolt = ({ center, wheelRadius, canvasSize, scale }: WheelPartLayout): Point[] => {
  const angle = Math.random() * Math.PI * 2;
  const startRadius = canvasSize / 2 + scale * 20;
  const endRadius = wheelRadius + scale * 4;
  const segments = 7;

  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments;
    const radius = startRadius + (endRadius - startRadius) * t;
    const jitter = i === 0 || i === segments ? 0 : (Math.random() - 0.5) * scale * 40;

    return {
      x: center + Math.cos(angle) * radius - Math.sin(angle) * jitter,
      y: center + Math.sin(angle) * radius + Math.cos(angle) * jitter,
    };
  });
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
 * Dark aura throbbing like a heartbeat around the rim, fog wisps drifting
 * around the wheel, and red lightning while it spins.
 */
const HorrorEffects = ({ layout, isSpinning }: EffectsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wispsRef = useRef<Wisp[]>(Array.from({ length: WISP_COUNT }, createWisp));
  const flashRef = useRef<Flash>({ framesLeft: 0, intensity: 0, bolts: [] });
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
      const seconds = timestamp / 1000;
      const { canvasSize, center, wheelRadius, scale } = layout;

      ctx.clearRect(0, 0, canvasSize, canvasSize);

      // throbbing aura hugging the rim
      const beat = heartbeat(seconds, spinning ? 120 : 42);
      const auraAlpha = spinning ? 0.3 + beat * 0.45 : 0.12 + beat * 0.18;
      const auraReach = wheelRadius + scale * (spinning ? 120 : 85) * (0.85 + beat * 0.15);
      const aura = ctx.createRadialGradient(center, center, wheelRadius - scale * 8, center, center, auraReach);
      aura.addColorStop(0, 'rgba(120, 8, 30, 0)');
      aura.addColorStop(0.1, `rgba(159, 18, 57, ${auraAlpha})`);
      aura.addColorStop(0.45, `rgba(90, 8, 40, ${auraAlpha * 0.45})`);
      aura.addColorStop(1, 'rgba(40, 0, 20, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, canvasSize, canvasSize);

      // fog wisps, kept off the names
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, canvasSize, canvasSize);
      ctx.arc(center, center, wheelRadius * 0.92, 0, Math.PI * 2, true);
      ctx.clip('evenodd');

      const orbitFactor = spinning ? 5 : 1;
      wispsRef.current.forEach((wisp) => {
        wisp.angle += (wisp.orbit * orbitFactor * delta) / 1000;
        const distance =
          wheelRadius + scale * (wisp.reach + wisp.sway * Math.sin(seconds * wisp.swaySpeed + wisp.phase));
        const x = center + Math.cos(wisp.angle) * distance;
        const y = center + Math.sin(wisp.angle) * distance;
        const size = scale * wisp.size;
        const breathe = 0.7 + 0.3 * Math.sin(seconds * 0.7 + wisp.phase);
        const alpha = wisp.alpha * breathe * (spinning ? 1.6 : 1);

        const fog = ctx.createRadialGradient(x, y, 0, x, y, size);
        fog.addColorStop(0, `rgba(150, 90, 130, ${alpha})`);
        fog.addColorStop(0.5, `rgba(120, 50, 100, ${alpha * 0.45})`);
        fog.addColorStop(1, 'rgba(90, 30, 70, 0)');
        ctx.fillStyle = fog;
        ctx.fillRect(x - size, y - size, size * 2, size * 2);
      });
      ctx.restore();

      // red lightning while spinning
      const flash = flashRef.current;
      if (spinning && flash.framesLeft === 0 && Math.random() < FLASH_CHANCE) {
        flash.framesLeft = FLASH_FRAMES;
        flash.intensity = 0.7 + Math.random() * 0.3;
        flash.bolts = Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => createBolt(layout));
      }

      if (flash.framesLeft > 0) {
        const fade = (flash.framesLeft / FLASH_FRAMES) * flash.intensity;

        ctx.save();
        ctx.fillStyle = `rgba(255, 90, 105, ${0.16 * fade})`;
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.shadowBlur = scale * 14;
        ctx.shadowColor = 'rgba(255, 40, 60, 0.9)';
        ctx.strokeStyle = `rgba(255, 220, 225, ${0.9 * fade})`;
        ctx.lineWidth = scale * 2.2;
        flash.bolts.forEach((bolt) => {
          ctx.beginPath();
          bolt.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.stroke();
        });
        ctx.restore();

        flash.framesLeft -= 1;
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

export default HorrorEffects;
