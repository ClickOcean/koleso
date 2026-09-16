import { useEffect, useRef } from 'react';

import { traceGear } from './drawGear';

import type { EffectsProps } from '@domains/wheel/BaseWheel/parts/types';

const FRAME_INTERVAL = 1000 / 24;
const IDLE_SPEED = 0.4; // rad/s for the largest gear
const SPIN_SPEED = 5;
const MAX_PUFFS = 80;
const TWO_PI = Math.PI * 2;

interface GearSpec {
  /** Position around the rim in radians, 0 = 3 o'clock, clockwise */
  angle: number;
  /** Tip radius, tuned for an 800px wheel */
  radius: number;
  teeth: number;
  direction: 1 | -1;
  /** Whether steam vents next to this gear */
  vents: boolean;
}

const GEARS: GearSpec[] = [
  { angle: 0.62, radius: 38, teeth: 12, direction: 1, vents: true },
  { angle: 2.5, radius: 30, teeth: 10, direction: -1, vents: true },
  { angle: 3.85, radius: 24, teeth: 9, direction: 1, vents: false },
];

interface Puff {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  vx: number;
  vy: number;
  growth: number;
  fade: number;
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

/** Small brass gear with four windows and a hub, drawn at the origin */
const drawSmallGear = (ctx: CanvasRenderingContext2D, radius: number, teeth: number, scale: number): void => {
  ctx.save();

  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = scale * 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = scale * 2;
  traceGear(ctx, 0, 0, radius, radius * 0.76, teeth);
  const body = ctx.createRadialGradient(-radius * 0.35, -radius * 0.35, radius * 0.05, 0, 0, radius);
  body.addColorStop(0, '#f0d58c');
  body.addColorStop(0.5, '#c0913a');
  body.addColorStop(1, '#6e4a14');
  ctx.fillStyle = body;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(40, 24, 8, 0.9)';
  ctx.lineWidth = Math.max(1, scale * 1.2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(30, 18, 7, 0.85)';
  ctx.lineWidth = Math.max(0.8, scale * 0.8);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * radius * 0.44, Math.sin(angle) * radius * 0.44, radius * 0.14, 0, TWO_PI);
    ctx.fill();
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.2, 0, TWO_PI);
  ctx.fill();
  ctx.strokeStyle = '#7a5518';
  ctx.stroke();
  ctx.fillStyle = '#e6c97a';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.09, 0, TWO_PI);
  ctx.fill();

  ctx.restore();
};

const drawPuff = (ctx: CanvasRenderingContext2D, puff: Puff): void => {
  const gradient = ctx.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, puff.radius);
  gradient.addColorStop(0, `rgba(238, 228, 212, ${puff.alpha})`);
  gradient.addColorStop(0.55, `rgba(238, 228, 212, ${puff.alpha * 0.45})`);
  gradient.addColorStop(1, 'rgba(238, 228, 212, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(puff.x, puff.y, puff.radius, 0, TWO_PI);
  ctx.fill();
};

/**
 * Three small gears mounted around the rim that turn continuously and wind up
 * while the wheel spins, plus steam puffs venting from two of them. A static
 * top-left sheen over the plates keeps the metal looking lit.
 */
const SteampunkEffects = ({ layout, isSpinning }: EffectsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSpinningRef = useRef(isSpinning);
  const rotationsRef = useRef<number[]>(GEARS.map(() => 0));
  const speedRef = useRef(IDLE_SPEED);
  const puffsRef = useRef<Puff[]>([]);
  const ventAccumulatorRef = useRef<number[]>(GEARS.map(() => 0));

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

      const spinning = isSpinningRef.current;
      const dt = delta / 1000;
      const targetSpeed = spinning ? SPIN_SPEED : IDLE_SPEED;
      speedRef.current += (targetSpeed - speedRef.current) * (spinning ? 0.12 : 0.05);

      const { canvasSize, center, wheelRadius, scale } = layout;
      ctx.clearRect(0, 0, canvasSize, canvasSize);

      // static lighting over the plates: highlight top-left, shade bottom-right
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, wheelRadius - scale * 7, 0, TWO_PI);
      ctx.clip();
      const lightX = center - wheelRadius * 0.45;
      const lightY = center - wheelRadius * 0.45;
      const light = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, wheelRadius * 1.1);
      light.addColorStop(0, 'rgba(255, 244, 220, 0.13)');
      light.addColorStop(0.6, 'rgba(255, 244, 220, 0)');
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, canvasSize, canvasSize);
      const shadeX = center + wheelRadius * 0.5;
      const shadeY = center + wheelRadius * 0.5;
      const shade = ctx.createRadialGradient(shadeX, shadeY, 0, shadeX, shadeY, wheelRadius * 1.1);
      shade.addColorStop(0, 'rgba(0, 0, 0, 0.16)');
      shade.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, canvasSize, canvasSize);
      ctx.restore();

      const puffs = puffsRef.current;

      GEARS.forEach((gear, index) => {
        rotationsRef.current[index] += gear.direction * speedRef.current * (38 / gear.radius) * dt;

        const gearRadius = scale * gear.radius;
        const distance = wheelRadius + gearRadius + scale * 9;
        const x = center + Math.cos(gear.angle) * distance;
        const y = center + Math.sin(gear.angle) * distance;

        // dark bearing plate grounds the gear
        ctx.fillStyle = 'rgba(28, 17, 7, 0.75)';
        ctx.beginPath();
        ctx.arc(x, y, gearRadius * 0.82, 0, TWO_PI);
        ctx.fill();

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotationsRef.current[index]);
        drawSmallGear(ctx, gearRadius, gear.teeth, scale);
        ctx.restore();

        if (!gear.vents) {
          return;
        }

        const rate = spinning ? 14 : 0.4; // puffs per second
        ventAccumulatorRef.current[index] += rate * dt;
        while (ventAccumulatorRef.current[index] >= 1) {
          ventAccumulatorRef.current[index] -= 1;
          if (puffs.length >= MAX_PUFFS) {
            continue;
          }

          const outward = gear.angle + (Math.random() - 0.5) * 0.6;
          const ventDistance = gearRadius * 0.9;
          const alpha = spinning ? 0.3 + Math.random() * 0.15 : 0.16 + Math.random() * 0.08;
          puffs.push({
            x: x + Math.cos(outward) * ventDistance,
            y: y + Math.sin(outward) * ventDistance,
            radius: scale * (6 + Math.random() * 6),
            alpha,
            vx: (Math.cos(gear.angle) * 14 + (Math.random() - 0.5) * 18) * scale,
            vy: -(38 + Math.random() * 30) * scale,
            growth: (14 + Math.random() * 12) * scale,
            fade: alpha / (1.5 + Math.random() * 0.9),
          });
        }
      });

      for (let i = puffs.length - 1; i >= 0; i--) {
        const puff = puffs[i];
        puff.x += puff.vx * dt;
        puff.y += puff.vy * dt;
        puff.radius += puff.growth * dt;
        puff.alpha -= puff.fade * dt;
        if (puff.alpha <= 0.01) {
          puffs.splice(i, 1);
          continue;
        }
        drawPuff(ctx, puff);
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

export default SteampunkEffects;
