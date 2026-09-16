import { useEffect, useRef } from 'react';

const FRAME_INTERVAL = 1000 / 20;
const SKY_COLOR = '#05070f';
const CROWD_HEIGHT_RATIO = 0.3;
const CROWD_ROW_GAP = 9;
const CROWD_COLORS = ['#aab4c8', '#8b93a7', '#c4b5a0', '#7f8ea3', '#b08a8a', '#8aa0b0', '#a08ab0', '#9fb59a'];
const CROWD_FLASH_RATE = 2.4; // camera flashes per second in the stands
const CROWD_FLASH_LIFETIME = 280; // ms
const FLOODLIGHT_TINT = '205, 222, 255';

interface CrowdFlash {
  x: number;
  y: number;
  age: number;
}

interface Scene {
  /** Sky, floodlights and crowd, pre-rendered once per resize */
  base: HTMLCanvasElement;
  crowdTop: number;
}

const paintSky = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, SKY_COLOR);
  sky.addColorStop(0.55, '#0a1020');
  sky.addColorStop(1, '#0c1412');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
};

const paintCrowd = (ctx: CanvasRenderingContext2D, width: number, height: number, crowdTop: number): void => {
  const rows = Math.ceil((height - crowdTop) / CROWD_ROW_GAP);

  ctx.save();
  for (let row = 0; row < rows; row++) {
    const depth = row / rows; // 0 at the back of the stands, 1 at the front
    const y = crowdTop + row * CROWD_ROW_GAP + depth * 10;

    // a walkway between tiers every few rows
    if (row % 7 === 6) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, y - 2, width, 5);
      continue;
    }

    const gap = 6 + depth * 3;
    for (let x = Math.random() * gap; x < width; x += gap) {
      ctx.globalAlpha = (0.12 + Math.random() * 0.3) * (0.55 + depth * 0.45);
      ctx.fillStyle = CROWD_COLORS[Math.floor(Math.random() * CROWD_COLORS.length)];
      ctx.beginPath();
      ctx.arc(
        x + (Math.random() - 0.5) * 2,
        y + (Math.random() - 0.5) * 2,
        1.4 + depth * 1.2 + Math.random() * 0.6,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  ctx.restore();

  // the back rows dissolve into haze
  const fade = ctx.createLinearGradient(0, crowdTop, 0, crowdTop + 120);
  fade.addColorStop(0, 'rgba(5, 7, 15, 0.9)');
  fade.addColorStop(1, 'rgba(5, 7, 15, 0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, crowdTop, width, 120);
};

const paintFloodlights = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  const reach = Math.hypot(width, height) * 0.85;
  const lampRadius = Math.min(width, height) * 0.18;
  const pylons = [
    { x: width * 0.03, y: -height * 0.03, angles: [0.62, 1.02] },
    { x: width * 0.97, y: -height * 0.03, angles: [Math.PI - 0.62, Math.PI - 1.02] },
  ];

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  pylons.forEach(({ x, y, angles }) => {
    angles.forEach((angle) => {
      // three nested wedges give the cone a soft edge
      [0.16, 0.11, 0.06].forEach((halfWidth) => {
        const beam = ctx.createRadialGradient(x, y, 0, x, y, reach);
        beam.addColorStop(0, `rgba(${FLOODLIGHT_TINT}, 0.1)`);
        beam.addColorStop(0.35, `rgba(${FLOODLIGHT_TINT}, 0.035)`);
        beam.addColorStop(1, `rgba(${FLOODLIGHT_TINT}, 0)`);
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle - halfWidth) * reach, y + Math.sin(angle - halfWidth) * reach);
        ctx.lineTo(x + Math.cos(angle + halfWidth) * reach, y + Math.sin(angle + halfWidth) * reach);
        ctx.closePath();
        ctx.fill();
      });
    });

    // the lamp bank itself: a glow and a small grid of bulbs
    const glow = ctx.createRadialGradient(x, y, 0, x, y, lampRadius);
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    glow.addColorStop(0.3, `rgba(${FLOODLIGHT_TINT}, 0.16)`);
    glow.addColorStop(1, `rgba(${FLOODLIGHT_TINT}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(x - lampRadius, y - lampRadius, lampRadius * 2, lampRadius * 2);

    const direction = x < width / 2 ? 1 : -1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (let column = 0; column < 4; column++) {
      for (let line = 0; line < 2; line++) {
        ctx.beginPath();
        ctx.arc(x + direction * (10 + column * 12), y + 26 + line * 12, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

  ctx.restore();
};

const buildScene = (width: number, height: number): Scene | null => {
  const base = document.createElement('canvas');
  base.width = width;
  base.height = height;
  const ctx = base.getContext('2d');
  if (!ctx) {
    return null;
  }

  const crowdTop = Math.round(height * (1 - CROWD_HEIGHT_RATIO));
  paintSky(ctx, width, height);
  paintCrowd(ctx, width, height, crowdTop);
  paintFloodlights(ctx, width, height);

  return { base, crowdTop };
};

const drawHaze = (ctx: CanvasRenderingContext2D, width: number, height: number, timestamp: number): void => {
  const radius = Math.max(width, height) * 0.28;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const x = width * (0.25 + i * 0.25) + Math.sin(timestamp * 0.00007 * (i + 1) + i) * width * 0.08;
    const y = height * 0.55 + Math.cos(timestamp * 0.00005 * (i + 1) + i * 2) * height * 0.06;
    const haze = ctx.createRadialGradient(x, y, 0, x, y, radius);
    haze.addColorStop(0, 'rgba(120, 150, 210, 0.05)');
    haze.addColorStop(1, 'rgba(120, 150, 210, 0)');
    ctx.fillStyle = haze;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const drawCrowdFlash = (ctx: CanvasRenderingContext2D, flash: CrowdFlash): void => {
  const alpha = (1 - flash.age / CROWD_FLASH_LIFETIME) ** 2;
  const glow = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, 14);
  glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
  glow.addColorStop(0.3, `rgba(255, 255, 255, ${alpha * 0.35})`);
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(flash.x, flash.y, 14, 0, Math.PI * 2);
  ctx.fill();
};

/**
 * Evening stadium: dark sky, four floodlight cones from the top corners, a
 * crowd of dim dots in the stands at the bottom, drifting haze and the odd
 * camera flash. Static layers are pre-rendered; the frame loop only adds the
 * haze and the flashes at 20 fps.
 */
const StadiumBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }

    let scene: Scene | null = null;
    let needsRebuild = true;
    let flashes: CrowdFlash[] = [];
    let frameId: number | null = null;
    let lastFrame = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      needsRebuild = true;
    };

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);
      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const deltaMs = lastFrame ? Math.min(timestamp - lastFrame, 100) : FRAME_INTERVAL;
      lastFrame = timestamp;

      const { width, height } = canvas;
      if (needsRebuild) {
        scene = buildScene(width, height);
        needsRebuild = false;
      }
      if (!scene) {
        return;
      }

      if (Math.random() < (CROWD_FLASH_RATE * deltaMs) / 1000) {
        flashes.push({
          x: Math.random() * width,
          y: scene.crowdTop + 30 + Math.random() * (height - scene.crowdTop - 30),
          age: 0,
        });
      }
      flashes.forEach((flash) => {
        flash.age += deltaMs;
      });
      flashes = flashes.filter((flash) => flash.age < CROWD_FLASH_LIFETIME);

      ctx.drawImage(scene.base, 0, 0);
      drawHaze(ctx, width, height, timestamp);
      flashes.forEach((flash) => drawCrowdFlash(ctx, flash));
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
    <div className='absolute inset-0 z-0 h-full w-full overflow-hidden bg-[#05070f]'>
      <canvas ref={canvasRef} aria-hidden='true' className='absolute inset-0 h-full w-full' />
      <div
        className='absolute inset-0'
        style={{
          background:
            'radial-gradient(circle at 42% 50%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.18) 55%, rgba(0, 0, 0, 0.45) 100%)',
        }}
      />
    </div>
  );
};

export default StadiumBackground;
