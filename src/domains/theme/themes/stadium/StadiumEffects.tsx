import { useEffect, useRef } from 'react';

import type { EffectsProps, WheelPartLayout } from '@domains/wheel/BaseWheel/parts/types';

const FRAME_INTERVAL = 1000 / 24;
const IDLE_FLASH_RATE = 1.1; // camera flashes per second while the wheel rests
const SPIN_FLASH_RATE = 14; // ...and while it spins
const FLASH_LIFETIME = 340; // ms
const CONFETTI_COUNT = 170;
const CONFETTI_LIFETIME = 2800; // ms
const CONFETTI_FADE = 600; // ms of fade at the end of a piece's life
const CONFETTI_GRAVITY = 900; // px/s^2 at 800px wheel
const CONFETTI_DRAG = 2.4; // per second
const CONFETTI_COLORS = ['#ffffff', '#22c55e', '#facc15', '#f97316', '#38bdf8', '#ef4444', '#a3e635'];

interface Flash {
  x: number;
  y: number;
  size: number;
  age: number;
}

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  angle: number;
  spin: number;
  wobble: number;
  wobbleSpeed: number;
  color: string;
  age: number;
}

const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min);

const resizeCanvas = (canvas: HTMLCanvasElement | null, size: number): void => {
  if (!canvas) {
    return;
  }

  canvas.width = size;
  canvas.height = size;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
};

/** A camera flash somewhere around the rim, a few landing on the scoreboard ring itself */
const createFlash = ({ center, wheelRadius, scale }: WheelPartLayout): Flash => {
  const angle = Math.random() * Math.PI * 2;
  const distance = wheelRadius + scale * randomBetween(-12, 72);

  return {
    x: center + Math.cos(angle) * distance,
    y: center + Math.sin(angle) * distance,
    size: scale * randomBetween(5, 11),
    age: 0,
  };
};

const createConfettiPiece = (x: number, y: number, direction: number, spread: number, scale: number): Confetti => {
  const angle = direction + randomBetween(-spread, spread);
  const speed = scale * randomBetween(260, 720);

  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    width: scale * randomBetween(6, 11),
    height: scale * randomBetween(3, 5.5),
    angle: Math.random() * Math.PI * 2,
    spin: randomBetween(-7, 7),
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: randomBetween(5, 11),
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    age: 0,
  };
};

/** Confetti cannons: one at the pointer, one on each side of the rim, all firing upwards */
const createBurst = ({ center, wheelRadius, scale }: WheelPartLayout): Confetti[] => {
  const emitters = [
    { x: center, y: center - wheelRadius + scale * 20, direction: -Math.PI / 2, spread: Math.PI * 0.5, share: 0.5 },
    { x: center - wheelRadius, y: center, direction: -Math.PI * 0.35, spread: Math.PI * 0.2, share: 0.25 },
    { x: center + wheelRadius, y: center, direction: -Math.PI * 0.65, spread: Math.PI * 0.2, share: 0.25 },
  ];

  return emitters.flatMap(({ x, y, direction, spread, share }) =>
    Array.from({ length: Math.round(CONFETTI_COUNT * share) }, () =>
      createConfettiPiece(x, y, direction, spread, scale),
    ),
  );
};

/** Poisson-ish spawning: `rate` events per second on average, never a metronome */
const spawnCount = (rate: number, dt: number): number => {
  let expected = rate * dt;
  let count = 0;

  while (expected > 0) {
    if (Math.random() < expected) {
      count += 1;
    }
    expected -= 1;
  }

  return count;
};

const drawFlash = (ctx: CanvasRenderingContext2D, flash: Flash): void => {
  const progress = flash.age / FLASH_LIFETIME;
  const alpha = (1 - progress) ** 2;
  const radius = flash.size * (0.7 + progress * 0.9);

  const glow = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, radius);
  glow.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
  glow.addColorStop(0.35, `rgba(255, 255, 255, ${alpha * 0.45})`);
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(flash.x, flash.y, radius, 0, Math.PI * 2);
  ctx.fill();

  // lens star
  const ray = radius * 2.2 * (1 - progress * 0.5);
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
  ctx.lineWidth = Math.max(1, flash.size * 0.12);
  ctx.beginPath();
  ctx.moveTo(flash.x - ray, flash.y);
  ctx.lineTo(flash.x + ray, flash.y);
  ctx.moveTo(flash.x, flash.y - ray);
  ctx.lineTo(flash.x, flash.y + ray);
  ctx.stroke();
};

const drawConfetti = (ctx: CanvasRenderingContext2D, piece: Confetti): void => {
  const remaining = CONFETTI_LIFETIME - piece.age;

  ctx.save();
  ctx.globalAlpha = Math.min(1, remaining / CONFETTI_FADE);
  ctx.translate(piece.x, piece.y);
  ctx.rotate(piece.angle);
  // tumbling: squash the strip as it turns edge-on
  ctx.scale(1, Math.max(0.15, Math.abs(Math.cos(piece.wobble))));
  ctx.fillStyle = piece.color;
  ctx.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
  ctx.restore();
};

/**
 * Crowd camera flashes popping around the rim (a storm of them while spinning)
 * and a confetti burst the moment the spin ends.
 */
const StadiumEffects = ({ layout, isSpinning }: EffectsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layoutRef = useRef(layout);
  const isSpinningRef = useRef(isSpinning);
  const flashesRef = useRef<Flash[]>([]);
  const confettiRef = useRef<Confetti[]>([]);

  useEffect(() => {
    layoutRef.current = layout;
    resizeCanvas(canvasRef.current, layout.canvasSize);
  }, [layout]);

  useEffect(() => {
    const wasSpinning = isSpinningRef.current;
    isSpinningRef.current = isSpinning;

    if (wasSpinning && !isSpinning) {
      confettiRef.current.push(...createBurst(layoutRef.current));
    }
  }, [isSpinning]);

  useEffect(() => {
    let frameId: number | null = null;
    let lastFrame = 0;

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);

      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const deltaMs = lastFrame ? Math.min(timestamp - lastFrame, 100) : FRAME_INTERVAL;
      lastFrame = timestamp;

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) {
        return;
      }

      const currentLayout = layoutRef.current;
      const { canvasSize, scale } = currentLayout;
      const dt = deltaMs / 1000;
      const spinning = isSpinningRef.current;

      const flashes = flashesRef.current;
      const newFlashes = spawnCount(spinning ? SPIN_FLASH_RATE : IDLE_FLASH_RATE, dt);
      for (let i = 0; i < newFlashes; i++) {
        flashes.push(createFlash(currentLayout));
      }
      flashes.forEach((flash) => {
        flash.age += deltaMs;
      });
      flashesRef.current = flashes.filter((flash) => flash.age < FLASH_LIFETIME);

      const drag = Math.exp(-CONFETTI_DRAG * dt);
      confettiRef.current.forEach((piece) => {
        piece.age += deltaMs;
        piece.vy += CONFETTI_GRAVITY * scale * dt;
        piece.vx *= drag;
        piece.vy *= drag;
        piece.x += piece.vx * dt;
        piece.y += piece.vy * dt;
        piece.angle += piece.spin * dt;
        piece.wobble += piece.wobbleSpeed * dt;
      });
      confettiRef.current = confettiRef.current.filter(
        (piece) => piece.age < CONFETTI_LIFETIME && piece.y < canvasSize + piece.width,
      );

      ctx.clearRect(0, 0, canvasSize, canvasSize);
      flashesRef.current.forEach((flash) => drawFlash(ctx, flash));
      confettiRef.current.forEach((piece) => drawConfetti(ctx, piece));
    };

    frameId = requestAnimationFrame(draw);

    return () => {
      if (frameId != null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

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

export default StadiumEffects;
