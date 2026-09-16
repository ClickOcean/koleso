import { useEffect, useRef } from 'react';

const FRAME_INTERVAL = 50; // 20 fps
const BASE_COLOR = '#05061a';

interface StarLayer {
  /** Square size in px */
  size: number;
  /** Downward scroll speed in px per second */
  speed: number;
  /** Stars per square pixel of viewport */
  density: number;
  alpha: number;
  colors: string[];
}

interface Star {
  x: number;
  y: number;
  color: string;
  /** Frames until the star skips a frame, which reads as a twinkle */
  blink: number;
}

/** Far, middle and near layers; the near one is brightest, fastest and sparsest */
const LAYERS: StarLayer[] = [
  { size: 2, speed: 14, density: 1 / 12000, alpha: 0.55, colors: ['#5c6cff', '#8a94ff', '#6fd3ff'] },
  { size: 3, speed: 32, density: 1 / 20000, alpha: 0.8, colors: ['#cfd6ff', '#ffffff', '#9ee7ff'] },
  { size: 4, speed: 64, density: 1 / 36000, alpha: 0.95, colors: ['#ffffff', '#fde047', '#ffffff'] },
];

const randomBlink = (): number => 30 + Math.floor(Math.random() * 150);

const createStars = (layer: StarLayer, width: number, height: number): Star[] => {
  const count = Math.max(12, Math.round(width * height * layer.density));

  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    color: layer.colors[Math.floor(Math.random() * layer.colors.length)],
    blink: randomBlink(),
  }));
};

/**
 * Vertical-shooter starfield: three parallax layers of square stars scrolling
 * down over very dark blue, under faint CRT scanlines. Darkened towards the
 * centre-left where the wheel sits.
 */
const ArcadeBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }

    let layers: Star[][] = [];
    let frameId: number | null = null;
    let lastFrame = 0;

    const resize = () => {
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth;
      canvas.height = innerHeight;
      layers = LAYERS.map((layer) => createStars(layer, innerWidth, innerHeight));
    };

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);
      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const delta = lastFrame ? Math.min(timestamp - lastFrame, 120) : FRAME_INTERVAL;
      lastFrame = timestamp;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      layers.forEach((stars, layerIndex) => {
        const layer = LAYERS[layerIndex];
        const travel = (layer.speed * delta) / 1000;
        ctx.globalAlpha = layer.alpha;

        stars.forEach((star) => {
          star.y += travel;
          if (star.y > height) {
            star.y -= height + layer.size;
            star.x = Math.random() * width;
          }

          star.blink -= 1;
          if (star.blink <= 0) {
            star.blink = randomBlink();

            return;
          }

          ctx.fillStyle = star.color;
          ctx.fillRect(Math.floor(star.x), Math.floor(star.y), layer.size, layer.size);
        });
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
    <div className='absolute inset-0 z-0 h-full w-full overflow-hidden' style={{ backgroundColor: BASE_COLOR }}>
      <canvas ref={canvasRef} aria-hidden='true' className='absolute inset-0 h-full w-full' style={{ opacity: 0.7 }} />
      <div
        className='absolute inset-0'
        style={{
          background:
            'radial-gradient(circle at 40% 50%, rgba(2, 3, 16, 0.55) 0%, rgba(2, 3, 16, 0.25) 30%, rgba(2, 3, 16, 0) 60%), ' +
            'radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 62%, rgba(0, 0, 0, 0.5) 100%)',
        }}
      />
      <div
        className='absolute inset-0'
        style={{
          background:
            'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.22) 0px, rgba(0, 0, 0, 0.22) 1px, transparent 1px, transparent 3px)',
        }}
      />
    </div>
  );
};

export default ArcadeBackground;
