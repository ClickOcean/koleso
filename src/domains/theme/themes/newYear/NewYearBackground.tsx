import { useEffect, useRef } from 'react';

const FRAME_INTERVAL = 34; // ~30 fps
const MAX_FLAKES_PER_LAYER = 400;

interface SnowLayer {
  /** flakes per 10 000 px² of screen */
  density: number;
  minSize: number;
  maxSize: number;
  /** px per second */
  minSpeed: number;
  maxSpeed: number;
  alpha: number;
  sway: number;
  soft: boolean;
}

interface Flake {
  x: number;
  y: number;
  size: number;
  speed: number;
  sway: number;
  phase: number;
  alpha: number;
  soft: boolean;
  /** index into LAYERS, used to respawn the flake in the same layer */
  layer: number;
}

interface Bokeh {
  x: number;
  y: number;
  radius: number;
  color: string;
  phase: number;
  drift: number;
}

/** far → near: small slow dim flakes at the back, large soft ones in front */
const LAYERS: SnowLayer[] = [
  { density: 0.9, minSize: 0.7, maxSize: 1.4, minSpeed: 14, maxSpeed: 26, alpha: 0.4, sway: 6, soft: false },
  { density: 0.45, minSize: 1.5, maxSize: 2.6, minSpeed: 30, maxSpeed: 50, alpha: 0.65, sway: 12, soft: false },
  { density: 0.16, minSize: 3, maxSize: 5.2, minSpeed: 55, maxSpeed: 85, alpha: 0.45, sway: 20, soft: true },
];

/** rgb triplets for the bokeh lights: warm gold, red, green, blue, warm white */
const BOKEH_COLORS = ['255, 196, 84', '255, 90, 110', '80, 220, 140', '90, 160, 255', '255, 240, 220', '212, 175, 55'];

const createSprite = (soft: boolean): HTMLCanvasElement | null => {
  const sprite = document.createElement('canvas');
  const size = 48;
  sprite.width = size;
  sprite.height = size;

  const ctx = sprite.getContext('2d');
  if (!ctx) {
    return null;
  }

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(soft ? 0.2 : 0.4, `rgba(255, 255, 255, ${soft ? 0.7 : 0.9})`);
  gradient.addColorStop(soft ? 0.55 : 0.7, `rgba(235, 245, 255, ${soft ? 0.25 : 0.2})`);
  gradient.addColorStop(1, 'rgba(235, 245, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return sprite;
};

const createFlake = (layerIndex: number, width: number, height: number, atTop: boolean): Flake => {
  const layer = LAYERS[layerIndex];

  return {
    x: Math.random() * width,
    y: atTop ? -10 - Math.random() * 40 : Math.random() * height,
    size: layer.minSize + Math.random() * (layer.maxSize - layer.minSize),
    speed: layer.minSpeed + Math.random() * (layer.maxSpeed - layer.minSpeed),
    sway: layer.sway * (0.6 + Math.random() * 0.8),
    phase: Math.random() * Math.PI * 2,
    alpha: layer.alpha * (0.7 + Math.random() * 0.3),
    soft: layer.soft,
    layer: layerIndex,
  };
};

const createFlakes = (width: number, height: number): Flake[] =>
  LAYERS.flatMap((layer, layerIndex) => {
    const count = Math.min(MAX_FLAKES_PER_LAYER, Math.round(((width * height) / 10000) * layer.density));
    return Array.from({ length: count }, () => createFlake(layerIndex, width, height, false));
  });

const createBokeh = (): Bokeh[] =>
  Array.from({ length: 9 }, (_, index) => ({
    x: (index + 0.5 + (Math.random() - 0.5) * 0.6) / 9,
    y: 0.04 + Math.random() * 0.2,
    radius: 46 + Math.random() * 50,
    color: BOKEH_COLORS[index % BOKEH_COLORS.length],
    phase: Math.random() * Math.PI * 2,
    drift: 6 + Math.random() * 10,
  }));

/** Static star field pre-rendered once per resize */
const createStars = (width: number, height: number): HTMLCanvasElement | null => {
  const stars = document.createElement('canvas');
  stars.width = width;
  stars.height = height;

  const ctx = stars.getContext('2d');
  if (!ctx) {
    return null;
  }

  const count = Math.min(600, Math.round((width * height) / 8000));
  for (let i = 0; i < count; i++) {
    const y = Math.random() * height;
    const radius = 0.4 + Math.random() * 0.9;
    const alpha = (0.25 + Math.random() * 0.6) * (1 - (y / height) * 0.6);

    ctx.fillStyle = `rgba(230, 240, 255, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(Math.random() * width, y, radius, 0, 2 * Math.PI);
    ctx.fill();
  }

  return stars;
};

/**
 * Deep blue winter night: stars, blurred colored bokeh lights along the top
 * and three layers of soft snowfall on one full-screen canvas at ~30 fps.
 * A vignette keeps the area around the wheel darker than the edges.
 */
const NewYearBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }

    const sharpSprite = createSprite(false);
    const softSprite = createSprite(true);
    const bokeh = createBokeh();

    let flakes: Flake[] = [];
    let stars: HTMLCanvasElement | null = null;
    let frameId: number | null = null;
    let lastFrame = 0;

    const resize = () => {
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth;
      canvas.height = innerHeight;
      flakes = createFlakes(innerWidth, innerHeight);
      stars = createStars(innerWidth, innerHeight);
    };

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);
      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const delta = lastFrame ? Math.min(timestamp - lastFrame, 100) : FRAME_INTERVAL;
      lastFrame = timestamp;

      const { width, height } = canvas;
      const seconds = timestamp / 1000;
      const dt = delta / 1000;

      ctx.clearRect(0, 0, width, height);
      if (stars) {
        ctx.drawImage(stars, 0, 0);
      }

      // blurred colored lights along the top edge
      bokeh.forEach((light) => {
        const x = light.x * width + Math.sin(seconds * 0.15 + light.phase) * light.drift;
        const y = light.y * height + Math.cos(seconds * 0.12 + light.phase) * light.drift * 0.5;
        const pulse = 0.7 + 0.3 * Math.sin(seconds * 0.5 + light.phase);
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, light.radius);
        gradient.addColorStop(0, `rgba(${light.color}, ${(0.26 * pulse).toFixed(3)})`);
        gradient.addColorStop(0.45, `rgba(${light.color}, ${(0.1 * pulse).toFixed(3)})`);
        gradient.addColorStop(1, `rgba(${light.color}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, light.radius, 0, 2 * Math.PI);
        ctx.fill();
      });

      // snowfall
      flakes.forEach((flake, index) => {
        flake.y += flake.speed * dt;
        flake.x += Math.sin(seconds * 0.6 + flake.phase) * flake.sway * dt;

        if (flake.y > height + 10) {
          flakes[index] = createFlake(flake.layer, width, height, true);
          return;
        }
        if (flake.x < -10) {
          flake.x = width + 10;
        } else if (flake.x > width + 10) {
          flake.x = -10;
        }

        const sprite = flake.soft ? softSprite : sharpSprite;
        const drawSize = flake.size * 3;
        ctx.globalAlpha = flake.alpha;
        if (sprite) {
          ctx.drawImage(sprite, flake.x - drawSize / 2, flake.y - drawSize / 2, drawSize, drawSize);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.size, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
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
      style={{ background: 'linear-gradient(180deg, #030814 0%, #071331 35%, #0b1d3a 65%, #12285a 100%)' }}
    >
      <canvas ref={canvasRef} aria-hidden='true' className='absolute inset-0 h-full w-full' style={{ opacity: 0.9 }} />
      <div
        className='absolute inset-0'
        style={{
          background:
            'linear-gradient(180deg, rgba(200, 220, 255, 0) 84%, rgba(200, 220, 255, 0.07) 100%), radial-gradient(circle at 42% 50%, rgba(3, 8, 24, 0) 0%, rgba(3, 8, 24, 0.3) 55%, rgba(3, 8, 24, 0.66) 100%)',
        }}
      />
    </div>
  );
};

export default NewYearBackground;
