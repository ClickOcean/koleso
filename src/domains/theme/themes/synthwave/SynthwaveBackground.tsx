import { useEffect, useRef } from 'react';

import { SYNTH_CYAN_RGB, SYNTH_PINK_RGB } from './palette';

const FRAME_INTERVAL = 1000 / 24;
const HORIZON = 0.63; // fraction of the viewport height
const GRID_ROWS = 12;
const SCROLL_SPEED = 0.42; // rows per second toward the viewer
const SUN_STRIPES = 9;
const TWO_PI = Math.PI * 2;

interface Star {
  x: number;
  y: number;
  size: number;
  phase: number;
}

interface Scene {
  width: number;
  height: number;
  horizon: number;
  stars: Star[];
}

const rgba = (rgb: string, alpha: number): string => `rgba(${rgb}, ${alpha.toFixed(3)})`;

const createStars = (width: number, horizon: number): Star[] => {
  const count = Math.round((width * horizon) / 9000);

  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * horizon * 0.92,
    size: Math.random() < 0.8 ? 1 : 2,
    phase: Math.random() * TWO_PI,
  }));
};

/** Cheap glow: a wide translucent stroke under a thin bright one. */
const strokeGlowLine = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rgb: string,
  alpha: number,
  width = 1,
): void => {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);

  ctx.lineWidth = width + 2.5;
  ctx.strokeStyle = rgba(rgb, alpha * 0.28);
  ctx.stroke();

  ctx.lineWidth = width;
  ctx.strokeStyle = rgba(rgb, alpha);
  ctx.stroke();
};

const drawSky = (ctx: CanvasRenderingContext2D, { width, height, horizon }: Scene): void => {
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#04010f');
  sky.addColorStop(0.45, '#170634');
  sky.addColorStop(0.82, '#3a0a5e');
  sky.addColorStop(1, '#7b1a70');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizon);

  const floor = ctx.createLinearGradient(0, horizon, 0, height);
  floor.addColorStop(0, '#2a0745');
  floor.addColorStop(0.35, '#0c0320');
  floor.addColorStop(1, '#03010a');
  ctx.fillStyle = floor;
  ctx.fillRect(0, horizon, width, height - horizon);
};

const drawStars = (ctx: CanvasRenderingContext2D, { stars }: Scene, seconds: number): void => {
  stars.forEach((star) => {
    const twinkle = 0.55 + 0.45 * Math.sin(seconds * 1.6 + star.phase);
    ctx.fillStyle = `rgba(255, 240, 250, ${(0.3 + 0.5 * twinkle).toFixed(3)})`;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  });
};

const drawSun = (ctx: CanvasRenderingContext2D, { width, height, horizon }: Scene, seconds: number): void => {
  const radius = Math.min(width, height) * 0.24;
  const cx = width * 0.78;
  const cy = horizon - radius * 0.22;

  const halo = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius * 2.4);
  halo.addColorStop(0, rgba(SYNTH_PINK_RGB, 0.38));
  halo.addColorStop(0.5, rgba(SYNTH_PINK_RGB, 0.1));
  halo.addColorStop(1, rgba(SYNTH_PINK_RGB, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(cx - radius * 2.4, cy - radius * 2.4, radius * 4.8, radius * 4.8);

  ctx.save();
  // the disc sinks behind the horizon
  ctx.beginPath();
  ctx.rect(0, 0, width, horizon);
  ctx.clip();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TWO_PI);
  ctx.clip();

  const body = ctx.createLinearGradient(0, cy - radius, 0, cy + radius);
  body.addColorStop(0, '#ffe66d');
  body.addColorStop(0.45, '#ff7a3d');
  body.addColorStop(1, '#ff2d95');
  ctx.fillStyle = body;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  // stripes drift downward and thicken toward the bottom of the disc
  ctx.fillStyle = 'rgba(38, 6, 66, 0.92)';
  const drift = (seconds * 0.05) % 1;
  for (let i = 0; i < SUN_STRIPES; i++) {
    const position = (i + drift) / SUN_STRIPES;
    const y = cy - radius * 0.05 + position * radius * 1.05;
    const thickness = radius * (0.015 + position * 0.075);
    ctx.fillRect(cx - radius, y, radius * 2, thickness);
  }

  ctx.restore();
};

const drawGrid = (ctx: CanvasRenderingContext2D, { width, height, horizon }: Scene, scroll: number): void => {
  const floorHeight = height - horizon;
  const vanishX = width * 0.56;
  const railStartY = horizon + floorHeight * 0.015;

  // rails converging on the vanishing point, fanned wider than the screen
  const spacing = width * 0.085;
  const rails = Math.ceil(Math.max(vanishX, width - vanishX) / spacing) + 1;
  for (let j = -rails; j <= rails; j++) {
    const xBottom = vanishX + j * spacing * 1.35;
    const xStart = vanishX + (xBottom - vanishX) * ((railStartY - horizon) / floorHeight);
    strokeGlowLine(ctx, xStart, railStartY, xBottom, height, SYNTH_PINK_RGB, 0.5);
  }

  // rows accelerate toward the viewer as they leave the horizon
  for (let i = 0; i < GRID_ROWS; i++) {
    const z = (i + scroll) / GRID_ROWS;
    const y = horizon + floorHeight * z * z * z;
    strokeGlowLine(ctx, 0, y, width, y, SYNTH_PINK_RGB, 0.15 + 0.65 * z, 1 + z);
  }
};

const drawHorizon = (ctx: CanvasRenderingContext2D, { width, height, horizon }: Scene): void => {
  const top = horizon - height * 0.14;
  const bottom = horizon + height * 0.05;

  const haze = ctx.createLinearGradient(0, top, 0, bottom);
  haze.addColorStop(0, rgba(SYNTH_PINK_RGB, 0));
  haze.addColorStop(0.72, rgba(SYNTH_PINK_RGB, 0.28));
  haze.addColorStop(0.74, rgba(SYNTH_CYAN_RGB, 0.3));
  haze.addColorStop(1, rgba(SYNTH_CYAN_RGB, 0));
  ctx.fillStyle = haze;
  ctx.fillRect(0, top, width, bottom - top);

  strokeGlowLine(ctx, 0, horizon, width, horizon, SYNTH_CYAN_RGB, 0.9, 1.5);
};

/**
 * Outrun poster on one full-screen canvas: purple-to-black sky with stars, a
 * big striped sun sinking behind the horizon on the right and a pink
 * perspective grid scrolling toward the viewer. Redrawn at 24 fps; an overlay
 * darkens the centre-left where the wheel sits.
 */
const SynthwaveBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }

    let scene: Scene = { width: 0, height: 0, horizon: 0, stars: [] };
    let frameId: number | null = null;
    let lastFrame = 0;
    let scroll = 0;

    const resize = () => {
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth;
      canvas.height = innerHeight;
      const horizon = Math.round(innerHeight * HORIZON);
      scene = { width: innerWidth, height: innerHeight, horizon, stars: createStars(innerWidth, horizon) };
    };

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);
      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const delta = lastFrame ? Math.min(timestamp - lastFrame, 120) : FRAME_INTERVAL;
      lastFrame = timestamp;

      scroll = (scroll + (SCROLL_SPEED * delta) / 1000) % 1;
      const seconds = timestamp / 1000;

      drawSky(ctx, scene);
      drawStars(ctx, scene, seconds);
      drawSun(ctx, scene, seconds);
      drawGrid(ctx, scene, scroll);
      drawHorizon(ctx, scene);
    };

    resize();
    window.addEventListener('resize', resize);
    frameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      if (frameId != null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <div className='absolute inset-0 z-0 h-full w-full overflow-hidden bg-[#07031a]'>
      <canvas ref={canvasRef} aria-hidden='true' className='absolute inset-0 h-full w-full' style={{ opacity: 0.82 }} />
      <div
        className='absolute inset-0'
        style={{
          background:
            'radial-gradient(ellipse 46% 62% at 38% 50%, rgba(5, 2, 16, 0.62) 0%, rgba(5, 2, 16, 0.4) 45%, rgba(5, 2, 16, 0) 100%)',
        }}
      />
    </div>
  );
};

export default SynthwaveBackground;
