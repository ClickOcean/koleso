import { useEffect, useRef } from 'react';

const FRAME_INTERVAL = 40; // 25 fps
const RESOLUTION = 0.5; // fog is soft: render at half size and let CSS upscale it
const BLOB_COUNT = 7;
const FLASH_CHANCE = 0.004;
const NOISE_SIZE = 128;

const BLOB_COLORS = ['118, 8, 32', '84, 16, 74', '132, 20, 40', '58, 10, 66', '96, 6, 26'];

interface FogBlob {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  driftX: number;
  driftY: number;
  speedX: number;
  speedY: number;
  phaseX: number;
  phaseY: number;
}

interface Flash {
  x: number;
  y: number;
  intensity: number;
}

const createBlob = (index: number): FogBlob => ({
  x: 0.1 + Math.random() * 0.8,
  y: 0.1 + Math.random() * 0.8,
  radius: 0.28 + Math.random() * 0.22,
  color: BLOB_COLORS[index % BLOB_COLORS.length],
  alpha: 0.2 + Math.random() * 0.16,
  driftX: 0.06 + Math.random() * 0.1,
  driftY: 0.05 + Math.random() * 0.08,
  speedX: 0.05 + Math.random() * 0.07,
  speedY: 0.04 + Math.random() * 0.06,
  phaseX: Math.random() * Math.PI * 2,
  phaseY: Math.random() * Math.PI * 2,
});

const createNoisePattern = (ctx: CanvasRenderingContext2D): CanvasPattern | null => {
  const noise = document.createElement('canvas');
  noise.width = NOISE_SIZE;
  noise.height = NOISE_SIZE;
  const noiseCtx = noise.getContext('2d');
  if (!noiseCtx) {
    return null;
  }

  const image = noiseCtx.createImageData(NOISE_SIZE, NOISE_SIZE);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = Math.random() * 255;
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  noiseCtx.putImageData(image, 0, 0);

  return ctx.createPattern(noise, 'repeat');
};

/**
 * Cosmic-horror backdrop: large blood-red and violet fog blobs drifting over
 * near-black, a dim flash now and then, film grain and a heavy vignette that
 * keeps the wheel area readable.
 */
const HorrorBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }

    const blobs = Array.from({ length: BLOB_COUNT }, (_, index) => createBlob(index));
    const flash: Flash = { x: 0.5, y: 0.2, intensity: 0 };
    const noise = createNoisePattern(ctx);
    let frameId: number | null = null;
    let lastFrame = 0;

    const resize = () => {
      canvas.width = Math.max(1, Math.floor(window.innerWidth * RESOLUTION));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * RESOLUTION));
      ctx.fillStyle = '#050206';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);
      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      lastFrame = timestamp;

      const { width, height } = canvas;
      const seconds = timestamp / 1000;
      const extent = Math.max(width, height);

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#050206';
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'lighter';
      blobs.forEach((blob) => {
        const cx = (blob.x + Math.sin(seconds * blob.speedX + blob.phaseX) * blob.driftX) * width;
        const cy = (blob.y + Math.cos(seconds * blob.speedY + blob.phaseY) * blob.driftY) * height;
        const radius = blob.radius * extent;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, `rgba(${blob.color}, ${blob.alpha})`);
        gradient.addColorStop(0.5, `rgba(${blob.color}, ${blob.alpha * 0.35})`);
        gradient.addColorStop(1, `rgba(${blob.color}, 0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      });
      ctx.globalCompositeOperation = 'source-over';

      // sporadic dim flash somewhere above
      if (flash.intensity < 0.005 && Math.random() < FLASH_CHANCE) {
        flash.intensity = 0.12 + Math.random() * 0.14;
        flash.x = Math.random();
        flash.y = Math.random() * 0.5;
      }
      if (flash.intensity >= 0.005) {
        const fx = flash.x * width;
        const fy = flash.y * height;
        const gradient = ctx.createRadialGradient(fx, fy, 0, fx, fy, extent * 0.7);
        gradient.addColorStop(0, `rgba(255, 70, 90, ${flash.intensity})`);
        gradient.addColorStop(1, 'rgba(255, 70, 90, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        flash.intensity *= 0.72;
      }

      // film grain
      if (noise) {
        ctx.save();
        ctx.globalAlpha = 0.045;
        ctx.translate(Math.floor(Math.random() * NOISE_SIZE), Math.floor(Math.random() * NOISE_SIZE));
        ctx.fillStyle = noise;
        ctx.fillRect(-NOISE_SIZE, -NOISE_SIZE, width + NOISE_SIZE, height + NOISE_SIZE);
        ctx.restore();
      }
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
    <div className='absolute inset-0 z-0 h-full w-full overflow-hidden' style={{ backgroundColor: '#050206' }}>
      <canvas ref={canvasRef} aria-hidden='true' className='absolute inset-0 h-full w-full' style={{ opacity: 0.9 }} />
      <div
        className='absolute inset-0'
        style={{
          background:
            'radial-gradient(ellipse at 42% 50%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.28) 42%, rgba(0, 0, 0, 0.8) 100%)',
        }}
      />
    </div>
  );
};

export default HorrorBackground;
