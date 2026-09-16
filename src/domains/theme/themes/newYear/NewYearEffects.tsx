import { useEffect, useRef } from 'react';
import tinycolor from 'tinycolor2';

import { BULB_COLORS, BULB_COUNT, RIM_WIDTH } from './palette';

import type { EffectsProps } from '@domains/wheel/BaseWheel/parts/types';

const FRAME_INTERVAL = 42; // ~24 fps
const FLAKE_COUNT = 64;
const MAX_SPARKLES = 40;
const SPIN_BLEND_MS = 400;
const CHASE_STEPS_PER_SECOND = 10;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface Bulb {
  angle: number;
  group: number;
  color: Rgb;
  phase: number;
}

interface Flake {
  x: number;
  y: number;
  size: number;
  speed: number;
  sway: number;
  phase: number;
  alpha: number;
}

interface Sparkle {
  x: number;
  y: number;
  size: number;
  born: number;
  life: number;
  color: string;
}

/** rgb triplets: white, warm gold, ice */
const SPARKLE_COLORS = ['255, 255, 255', '255, 228, 150', '190, 225, 255'];

const resizeCanvas = (canvas: HTMLCanvasElement | null, size: number): void => {
  if (!canvas) {
    return;
  }

  canvas.width = size;
  canvas.height = size;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
};

const createBulbs = (): Bulb[] =>
  Array.from({ length: BULB_COUNT }, (_, index) => ({
    angle: (index * 2 * Math.PI) / BULB_COUNT - Math.PI / 2,
    group: index % BULB_COLORS.length,
    color: tinycolor(BULB_COLORS[index % BULB_COLORS.length]).toRgb(),
    phase: Math.random() * Math.PI * 2,
  }));

/** Flake in canvas pixels relative to the wheel center; `atTop` respawns it above the area */
const createFlake = (areaRadius: number, scale: number, atTop: boolean): Flake => {
  const weight = Math.random();
  const size = (1.2 + weight * weight * 2.6) * scale;

  return {
    x: (Math.random() * 2 - 1) * areaRadius,
    y: atTop ? -areaRadius - Math.random() * 20 * scale : (Math.random() * 2 - 1) * areaRadius,
    size,
    speed: (14 + size * 6) * scale,
    sway: (6 + Math.random() * 14) * scale,
    phase: Math.random() * Math.PI * 2,
    alpha: 0.35 + Math.random() * 0.5,
  };
};

/** Soft round sprite so flakes look like snow instead of crisp dots */
const createFlakeSprite = (): HTMLCanvasElement | null => {
  const sprite = document.createElement('canvas');
  const size = 64;
  sprite.width = size;
  sprite.height = size;

  const ctx = sprite.getContext('2d');
  if (!ctx) {
    return null;
  }

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.85)');
  gradient.addColorStop(0.6, 'rgba(235, 245, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(235, 245, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return sprite;
};

const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, lineWidth: number): void => {
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();

  ctx.lineWidth = lineWidth * 0.6;
  const diagonal = size * 0.45;
  ctx.beginPath();
  ctx.moveTo(x - diagonal, y - diagonal);
  ctx.lineTo(x + diagonal, y + diagonal);
  ctx.moveTo(x + diagonal, y - diagonal);
  ctx.lineTo(x - diagonal, y + diagonal);
  ctx.stroke();
};

/**
 * Garland bulbs on the rim (slow color-group twinkle, fast chase while
 * spinning), snow drifting over the wheel, and sparkles around the rim while
 * it spins. The bulbs stay fixed on screen like lights on the wheel's frame.
 */
const NewYearEffects = ({ layout, isSpinning }: EffectsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSpinningRef = useRef(isSpinning);

  useEffect(() => {
    isSpinningRef.current = isSpinning;
  }, [isSpinning]);

  useEffect(() => {
    resizeCanvas(canvasRef.current, layout.canvasSize);
  }, [layout.canvasSize]);

  useEffect(() => {
    const { canvasSize, center, wheelRadius, scale } = layout;
    const areaRadius = wheelRadius * 1.22;
    const bulbRadius = wheelRadius - scale * (RIM_WIDTH / 2 + 1);
    const sprite = createFlakeSprite();

    const bulbs = createBulbs();
    const flakes = Array.from({ length: FLAKE_COUNT }, () => createFlake(areaRadius, scale, false));
    const sparkles: Sparkle[] = [];

    let frameId: number | null = null;
    let lastFrame = 0;
    let spinBlend = 0;

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);

      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const delta = lastFrame ? Math.min(timestamp - lastFrame, 100) : FRAME_INTERVAL;
      lastFrame = timestamp;

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) {
        return;
      }

      const spinning = isSpinningRef.current;
      const seconds = timestamp / 1000;
      const dt = delta / 1000;
      spinBlend = Math.min(1, Math.max(0, spinBlend + (spinning ? delta : -delta) / SPIN_BLEND_MS));

      ctx.clearRect(0, 0, canvasSize, canvasSize);

      // --- snow drifting over the wheel area ---
      const drift = 1 + spinBlend * 0.5;
      flakes.forEach((flake, index) => {
        flake.y += flake.speed * drift * dt;
        flake.x += Math.sin(seconds * 0.7 + flake.phase) * flake.sway * dt;

        if (flake.y > areaRadius) {
          flakes[index] = createFlake(areaRadius, scale, true);
          return;
        }

        const distance = Math.hypot(flake.x, flake.y);
        const edgeFade = Math.min(1, Math.max(0, (areaRadius - distance) / (areaRadius * 0.18)));
        if (edgeFade <= 0) {
          return;
        }

        const drawSize = flake.size * 3;
        ctx.globalAlpha = flake.alpha * edgeFade;
        if (sprite) {
          ctx.drawImage(sprite, center + flake.x - drawSize / 2, center + flake.y - drawSize / 2, drawSize, drawSize);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(center + flake.x, center + flake.y, flake.size, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // --- garland bulbs on the rim ---
      const chaseStep = Math.floor(seconds * CHASE_STEPS_PER_SECOND) % BULB_COLORS.length;
      const socketRadius = scale * 3.2;
      const bulbSize = scale * 4.6;

      bulbs.forEach((bulb) => {
        const idle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(seconds * 1.1 + bulb.group * (Math.PI / 2) + bulb.phase * 0.3));
        const trailing = (chaseStep + BULB_COLORS.length - 1) % BULB_COLORS.length;
        const chase = bulb.group === chaseStep ? 1 : bulb.group === trailing ? 0.45 : 0.12;
        const brightness = idle + (chase - idle) * spinBlend;

        const socketX = center + Math.cos(bulb.angle) * bulbRadius;
        const socketY = center + Math.sin(bulb.angle) * bulbRadius;
        const x = center + Math.cos(bulb.angle) * (bulbRadius - scale * 2.5);
        const y = center + Math.sin(bulb.angle) * (bulbRadius - scale * 2.5);
        const { r, g, b } = bulb.color;

        // socket on the wire
        ctx.fillStyle = 'rgba(26, 34, 32, 0.95)';
        ctx.beginPath();
        ctx.arc(socketX, socketY, socketRadius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = 'rgba(160, 172, 168, 0.5)';
        ctx.lineWidth = scale * 0.8;
        ctx.stroke();

        // glow
        const glowRadius = bulbSize * (1.4 + brightness * 2.2);
        const glow = ctx.createRadialGradient(x, y, bulbSize * 0.4, x, y, glowRadius);
        glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.55 * brightness})`);
        glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, 2 * Math.PI);
        ctx.fill();

        // bulb body, whitened when bright
        const lift = 0.35 * brightness;
        ctx.fillStyle = `rgba(${Math.round(r + (255 - r) * lift)}, ${Math.round(g + (255 - g) * lift)}, ${Math.round(
          b + (255 - b) * lift,
        )}, ${0.55 + 0.45 * brightness})`;
        ctx.beginPath();
        ctx.arc(x, y, bulbSize, 0, 2 * Math.PI);
        ctx.fill();

        // highlight
        ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + 0.55 * brightness})`;
        ctx.beginPath();
        ctx.arc(x - bulbSize * 0.35, y - bulbSize * 0.35, bulbSize * 0.3, 0, 2 * Math.PI);
        ctx.fill();
      });

      // --- sparkles around the rim while spinning ---
      if (spinning) {
        const spawn = 3;
        for (let i = 0; i < spawn && sparkles.length < MAX_SPARKLES; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = wheelRadius + scale * (-24 + Math.random() * 56);
          sparkles.push({
            x: center + Math.cos(angle) * distance,
            y: center + Math.sin(angle) * distance,
            size: scale * (3 + Math.random() * 6),
            born: timestamp,
            life: 350 + Math.random() * 350,
            color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
          });
        }
      }

      ctx.lineCap = 'round';
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const sparkle = sparkles[i];
        const progress = (timestamp - sparkle.born) / sparkle.life;
        if (progress >= 1) {
          sparkles.splice(i, 1);
          continue;
        }

        const pulse = Math.sin(progress * Math.PI);
        ctx.strokeStyle = `rgba(${sparkle.color}, ${(0.9 * pulse).toFixed(3)})`;
        drawStar(ctx, sparkle.x, sparkle.y, sparkle.size * pulse, scale * 1.2);
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

export default NewYearEffects;
