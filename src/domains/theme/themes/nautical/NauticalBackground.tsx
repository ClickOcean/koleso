import { useEffect, useRef } from 'react';

const FRAME_INTERVAL = 80; // ~12 fps: the sea only drifts
const INK_RGB = '58, 38, 16';
const NORTH_RED = 'rgba(138, 46, 34, 0.7)';
const PAPER = '#e6d6ae';
const LAND = '#dcc79a';
const SERIF = 'Georgia, "Times New Roman", Times, serif';
const WAVE_ROW = 46;
const WAVE_STEP = 66;

interface Point {
  x: number;
  y: number;
}

interface IslandSpec {
  /** centre as a fraction of the viewport */
  cx: number;
  cy: number;
  /** radius as a fraction of the shorter viewport side */
  size: number;
  stretch: number;
  rotation: number;
  seed: number;
}

interface Island {
  center: Point;
  /** where the relief contours converge */
  peak: Point;
  points: Point[];
}

/** Islands sit away from the wheel (centre-left) so the chart stays calm behind it. */
const ISLAND_SPECS: IslandSpec[] = [
  { cx: 0.7, cy: 0.2, size: 0.13, stretch: 1.35, rotation: -0.5, seed: 11 },
  { cx: 0.82, cy: 0.8, size: 0.11, stretch: 1.2, rotation: 0.7, seed: 23 },
  { cx: 0.1, cy: 0.86, size: 0.07, stretch: 1.5, rotation: 0.2, seed: 37 },
];

/** Dashed route from the small island to the large southern one, as viewport fractions. */
const ROUTE: Point[] = [
  { x: 0.16, y: 0.8 },
  { x: 0.33, y: 0.68 },
  { x: 0.47, y: 0.84 },
  { x: 0.63, y: 0.7 },
  { x: 0.77, y: 0.76 },
];

const ROSE = { x: 0.9, y: 0.15, size: 0.075 };

/** Small deterministic PRNG (mulberry32) so the chart looks the same after every resize. */
const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const createIsland = (spec: IslandSpec, width: number, height: number): Island => {
  const random = createRandom(spec.seed);
  const radius = Math.min(width, height) * spec.size;
  const amplitudes = [0.2, 0.15, 0.09, 0.05];
  const harmonics = [2, 3, 5, 7].map((frequency, index) => ({
    frequency,
    amplitude: amplitudes[index] * (0.7 + random() * 0.6),
    phase: random() * 2 * Math.PI,
  }));
  const center = { x: width * spec.cx, y: height * spec.cy };
  const peak = { x: center.x + (random() - 0.5) * radius * 0.6, y: center.y + (random() - 0.5) * radius * 0.6 };
  const steps = 56;
  const points: Point[] = [];

  for (let i = 0; i < steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    const wobble = harmonics.reduce(
      (sum, harmonic) => sum + harmonic.amplitude * Math.sin(harmonic.frequency * theta + harmonic.phase),
      0,
    );
    const r = radius * (1 + wobble);
    const x = Math.cos(theta) * r * spec.stretch;
    const y = Math.sin(theta) * r;

    points.push({
      x: center.x + x * Math.cos(spec.rotation) - y * Math.sin(spec.rotation),
      y: center.y + x * Math.sin(spec.rotation) + y * Math.cos(spec.rotation),
    });
  }

  return { center, peak, points };
};

/** Closed smooth loop through the island points, scaled about the centre (shrinking towards the peak). */
const traceLoop = (ctx: CanvasRenderingContext2D, island: Island, factor: number): void => {
  const { center, peak, points } = island;
  const origin = { x: center.x + (peak.x - center.x) * (1 - factor), y: center.y + (peak.y - center.y) * (1 - factor) };
  const scaled = points.map((point) => ({
    x: origin.x + (point.x - center.x) * factor,
    y: origin.y + (point.y - center.y) * factor,
  }));
  const count = scaled.length;
  const last = scaled[count - 1];
  const first = scaled[0];

  ctx.beginPath();
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
  for (let i = 0; i < count; i++) {
    const current = scaled[i];
    const next = scaled[(i + 1) % count];
    ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
  }
  ctx.closePath();
};

const paintSea = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  const random = createRandom(101);
  const shorterSide = Math.min(width, height);

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);

  // uneven ageing: soft sepia stains
  for (let i = 0; i < 7; i++) {
    const x = random() * width;
    const y = random() * height;
    const r = shorterSide * (0.12 + random() * 0.22);
    const stain = ctx.createRadialGradient(x, y, 0, x, y, r);
    stain.addColorStop(0, `rgba(150, 105, 45, ${0.05 + random() * 0.06})`);
    stain.addColorStop(1, 'rgba(150, 105, 45, 0)');
    ctx.fillStyle = stain;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // paper grain
  const grains = Math.round((width * height) / 650);
  for (let i = 0; i < grains; i++) {
    const light = random() < 0.28;
    ctx.fillStyle = light
      ? `rgba(255, 250, 236, ${0.15 + random() * 0.2})`
      : `rgba(${INK_RGB}, ${0.03 + random() * 0.07})`;
    const size = 0.6 + random() * 1.2;
    ctx.fillRect(random() * width, random() * height, size, size);
  }

  // chart graticule
  const step = Math.max(110, Math.round(shorterSide / 7));
  ctx.strokeStyle = `rgba(${INK_RGB}, 0.07)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = step / 2; x < width; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = step / 2; y < height; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // rhumb lines radiating from the compass rose
  const rose = { x: width * ROSE.x, y: height * ROSE.y };
  const reach = Math.hypot(width, height);
  for (let i = 0; i < 32; i++) {
    const angle = (i * 2 * Math.PI) / 32;
    const cardinal = i % 8 === 0;
    const secondary = i % 4 === 0;
    ctx.strokeStyle = `rgba(${INK_RGB}, ${cardinal ? 0.12 : secondary ? 0.08 : 0.045})`;
    ctx.lineWidth = cardinal ? 1.1 : 0.8;
    ctx.beginPath();
    ctx.moveTo(rose.x, rose.y);
    ctx.lineTo(rose.x + Math.cos(angle) * reach, rose.y + Math.sin(angle) * reach);
    ctx.stroke();
  }
};

const paintIsland = (ctx: CanvasRenderingContext2D, island: Island): void => {
  // water lines hugging the coast
  [1.08, 1.17, 1.27].forEach((factor, index) => {
    traceLoop(ctx, island, factor);
    ctx.strokeStyle = `rgba(${INK_RGB}, ${0.3 - index * 0.09})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // land
  traceLoop(ctx, island, 1);
  ctx.fillStyle = LAND;
  ctx.fill();
  ctx.strokeStyle = `rgba(${INK_RGB}, 0.8)`;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // relief contours
  ctx.save();
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 0.9;
  [0.76, 0.54, 0.34].forEach((factor, index) => {
    traceLoop(ctx, island, factor);
    ctx.strokeStyle = `rgba(${INK_RGB}, ${0.42 - index * 0.08})`;
    ctx.stroke();
  });
  ctx.restore();
};

const paintRose = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void => {
  const drawPoint = (angle: number, length: number, halfWidth: number) => {
    ctx.save();
    ctx.rotate(angle);

    ctx.fillStyle = `rgba(${INK_RGB}, 0.8)`;
    ctx.beginPath();
    ctx.moveTo(0, -length);
    ctx.lineTo(halfWidth, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f2e8cf';
    ctx.beginPath();
    ctx.moveTo(0, -length);
    ctx.lineTo(-halfWidth, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = `rgba(${INK_RGB}, 0.8)`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -length);
    ctx.lineTo(halfWidth, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(-halfWidth, 0);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  };

  ctx.save();
  ctx.translate(x, y);

  ctx.strokeStyle = `rgba(${INK_RGB}, 0.7)`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.9, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.3, 0, 2 * Math.PI);
  ctx.stroke();

  for (let i = 0; i < 32; i++) {
    const angle = (i * 2 * Math.PI) / 32;
    const inner = radius * (i % 4 === 0 ? 0.82 : 0.86);
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * radius * 0.9, Math.sin(angle) * radius * 0.9);
    ctx.stroke();
  }

  // eight-point star: short intercardinal points beneath, long cardinal points on top
  for (let i = 0; i < 4; i++) {
    drawPoint(Math.PI / 4 + (i * Math.PI) / 2, radius * 0.55, radius * 0.1);
  }
  for (let i = 0; i < 4; i++) {
    drawPoint((i * Math.PI) / 2, radius * 0.85, radius * 0.13);
  }

  ctx.fillStyle = NORTH_RED;
  ctx.font = `bold ${Math.round(radius * 0.32)}px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('N', 0, -radius - 4);

  ctx.restore();
};

const drawWaves = (ctx: CanvasRenderingContext2D, width: number, height: number, elapsed: number): void => {
  const t = elapsed / 1000;
  const rows = Math.ceil(height / WAVE_ROW) + 1;
  const cols = Math.ceil(width / WAVE_STEP) + 2;

  ctx.save();
  ctx.strokeStyle = `rgba(${INK_RGB}, 0.16)`;
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let row = 0; row < rows; row++) {
    const y = row * WAVE_ROW + WAVE_ROW / 2 + Math.sin(t * 0.5 + row * 0.9) * 2;
    const drift = Math.sin(t * 0.35 + row * 0.6) * 6 + (row % 2) * (WAVE_STEP / 2);
    for (let col = -1; col < cols; col++) {
      if ((row * 3 + col) % 4 === 0) {
        continue; // leave gaps so the sea does not read as a grid
      }
      const x = col * WAVE_STEP + drift;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 7, y - 4, x + 14, y);
      ctx.quadraticCurveTo(x + 21, y + 4, x + 28, y);
    }
  }
  ctx.stroke();
  ctx.restore();
};

/** Catmull-Rom spline through the waypoints so the route passes exactly over the marks. */
const drawRoute = (ctx: CanvasRenderingContext2D, points: Point[], dashOffset: number): void => {
  if (points.length < 2) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = `rgba(${INK_RGB}, 0.5)`;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([9, 7]);
  ctx.lineDashOffset = -dashOffset;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) / 6,
      p1.y + (p2.y - p0.y) / 6,
      p2.x - (p3.x - p1.x) / 6,
      p2.y - (p3.y - p1.y) / 6,
      p2.x,
      p2.y,
    );
  }
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.strokeStyle = NORTH_RED;
  ctx.lineWidth = 1.4;
  points.forEach((point, index) => {
    if (index === 0 || index === points.length - 1) {
      return;
    }
    const arm = 5;
    ctx.beginPath();
    ctx.moveTo(point.x - arm, point.y - arm);
    ctx.lineTo(point.x + arm, point.y + arm);
    ctx.moveTo(point.x - arm, point.y + arm);
    ctx.lineTo(point.x + arm, point.y - arm);
    ctx.stroke();
  });
  ctx.restore();
};

/**
 * Full-screen parchment chart: grainy paper with a graticule and rhumb lines,
 * gently drifting wave marks, procedurally drawn islands with coast lines and
 * relief contours, a compass rose and a dashed route. Static parts are painted
 * once per resize into two layers; only the waves and route dashes animate.
 */
const NauticalBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }

    const seaLayer = document.createElement('canvas');
    const landLayer = document.createElement('canvas');
    let width = 0;
    let height = 0;
    let route: Point[] = [];
    let frameId: number | null = null;
    let lastFrame = 0;
    let elapsed = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      seaLayer.width = width;
      seaLayer.height = height;
      landLayer.width = width;
      landLayer.height = height;

      const seaCtx = seaLayer.getContext('2d');
      const landCtx = landLayer.getContext('2d');
      if (!seaCtx || !landCtx) {
        return;
      }

      paintSea(seaCtx, width, height);
      ISLAND_SPECS.forEach((spec) => paintIsland(landCtx, createIsland(spec, width, height)));
      paintRose(landCtx, width * ROSE.x, height * ROSE.y, Math.min(width, height) * ROSE.size);
      route = ROUTE.map((point) => ({ x: point.x * width, y: point.y * height }));

      ctx.drawImage(seaLayer, 0, 0);
      ctx.drawImage(landLayer, 0, 0);
    };

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);
      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const delta = lastFrame ? Math.min(timestamp - lastFrame, 250) : FRAME_INTERVAL;
      lastFrame = timestamp;
      elapsed += delta;

      ctx.drawImage(seaLayer, 0, 0);
      drawWaves(ctx, width, height, elapsed);
      ctx.drawImage(landLayer, 0, 0);
      drawRoute(ctx, route, (elapsed / 1000) * 10);
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
    <div className='absolute inset-0 z-0 h-full w-full overflow-hidden' style={{ backgroundColor: PAPER }}>
      <canvas ref={canvasRef} aria-hidden='true' className='absolute inset-0 h-full w-full' />
      <div
        className='absolute inset-0'
        style={{
          background:
            'radial-gradient(circle at 42% 50%, rgba(252, 246, 228, 0.42) 0%, rgba(252, 246, 228, 0) 34%), radial-gradient(ellipse at 50% 50%, rgba(110, 72, 26, 0) 58%, rgba(110, 72, 26, 0.24) 100%)',
        }}
      />
    </div>
  );
};

export default NauticalBackground;
