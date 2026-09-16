import { useEffect, useRef } from 'react';

const FRAME_INTERVAL = 50; // 20 fps
const LIGHT_COUNT = 22;
const WARM_TINTS: [number, number, number][] = [
  [255, 200, 96],
  [255, 160, 64],
  [255, 110, 120],
  [255, 226, 160],
];

interface BokehLight {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  tint: [number, number, number];
  twinkleSpeed: number;
  phase: number;
  /** Near lights get a small bright core, like a distant bulb */
  core: boolean;
}

const createLight = (width: number, height: number): BokehLight => {
  const depth = Math.random();

  return {
    x: Math.random() * width,
    y: Math.random() * height,
    radius: 18 + depth * 110,
    vx: (Math.random() - 0.5) * 8,
    vy: -2 - Math.random() * 7,
    alpha: 0.05 + (1 - depth) * 0.12,
    tint: WARM_TINTS[Math.floor(Math.random() * WARM_TINTS.length)],
    twinkleSpeed: 0.3 + Math.random() * 0.6,
    phase: Math.random() * 2 * Math.PI,
    core: depth < 0.5,
  };
};

const rgba = ([r, g, b]: [number, number, number], alpha: number): string => `rgba(${r}, ${g}, ${b}, ${alpha})`;

/**
 * Dark burgundy velvet with warm bokeh lights drifting slowly upwards, as if
 * the hall's chandeliers were out of focus behind the wheel. A vignette keeps
 * the area behind the wheel calm.
 */
const CasinoBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }

    let lights: BokehLight[] = [];
    let frameId: number | null = null;
    let lastFrame = 0;

    const resize = () => {
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth;
      canvas.height = innerHeight;
      lights = Array.from({ length: LIGHT_COUNT }, () => createLight(innerWidth, innerHeight));
    };

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);
      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const delta = lastFrame ? Math.min(timestamp - lastFrame, 250) / 1000 : FRAME_INTERVAL / 1000;
      lastFrame = timestamp;

      const { width, height } = canvas;
      const seconds = timestamp / 1000;

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      lights.forEach((light) => {
        const alpha = light.alpha * (0.7 + 0.3 * Math.sin(seconds * light.twinkleSpeed + light.phase));

        const glow = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
        glow.addColorStop(0, rgba(light.tint, alpha));
        glow.addColorStop(0.55, rgba(light.tint, alpha * 0.55));
        glow.addColorStop(1, rgba(light.tint, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(light.x, light.y, light.radius, 0, 2 * Math.PI);
        ctx.fill();

        if (light.core) {
          ctx.fillStyle = rgba(light.tint, Math.min(0.55, alpha * 3.5));
          ctx.beginPath();
          ctx.arc(light.x, light.y, 2.2, 0, 2 * Math.PI);
          ctx.fill();
        }

        light.x += light.vx * delta;
        light.y += light.vy * delta;

        const margin = light.radius;
        if (light.y < -margin) {
          light.y = height + margin;
          light.x = Math.random() * width;
        }
        if (light.x < -margin) {
          light.x = width + margin;
        } else if (light.x > width + margin) {
          light.x = -margin;
        }
      });

      ctx.globalCompositeOperation = 'source-over';
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
    <div
      className='absolute inset-0 z-0 h-full w-full overflow-hidden'
      style={{ background: 'radial-gradient(ellipse at 50% 38%, #4a0f1f 0%, #2b0912 45%, #120409 100%)' }}
    >
      {/* velvet nap and a soft chandelier highlight up top */}
      <div
        className='absolute inset-0'
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 70% 12%, rgba(255, 190, 120, 0.09), transparent 55%), repeating-linear-gradient(112deg, rgba(255, 255, 255, 0.02) 0px, rgba(255, 255, 255, 0.02) 2px, transparent 2px, transparent 7px)',
        }}
      />
      <canvas ref={canvasRef} aria-hidden='true' className='absolute inset-0 h-full w-full' style={{ opacity: 0.9 }} />
      {/* calm the area behind the wheel and darken the edges */}
      <div
        className='absolute inset-0'
        style={{
          background:
            'radial-gradient(circle at 40% 50%, rgba(0, 0, 0, 0.32) 0%, rgba(0, 0, 0, 0.14) 32%, rgba(0, 0, 0, 0) 58%), radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.6) 100%)',
        }}
      />
    </div>
  );
};

export default CasinoBackground;
