import { useEffect, useRef } from 'react';

const FRAME_INTERVAL = 55; // ~18 fps
const MEASURE_INTERVAL = 200;
/** The wheel is laid out a moment after mount; one early re-measure fixes the left strip without waiting a second */
const FIRST_MEASURE_DELAY = 250;
const PUFF_COUNT = 16;
const FLY_COUNT = 2;
const IMAGE_WIDTH = 1344;
const IMAGE_HEIGHT = 752;
/** Where the smoke leaves the barbecue, as a fraction of the picture */
const GRILL = { x: 0.878, y: 0.22 };
/** The man in the recliner, as a fraction of the picture width */
const MAN_ANCHOR = 0.77;
/** Where the man should land on screen: in the gap between the wheel and the sidebar, or further right without it */
const MAN_SCREEN_X_WITH_SIDEBAR = 0.685;
const MAN_SCREEN_X_FULL = 0.8;
const BACKGROUND_IMAGE = '/themes/beerParty/background.jpg';
/** Portrait picture of the coffee table (956 × 1440) for the strip left of the wheel */
const TABLE_IMAGE = '/themes/beerParty/left.jpg';
const TABLE_WIDTH = 956;
const TABLE_HEIGHT = 1440;
/** The strip fades out over this many px on its right edge, so there is no seam next to the wheel */
const TABLE_FADE = 120;
/** Below this strip width (tiny window) the picture is skipped */
const TABLE_MIN_WIDTH = 140;
/** Share of the viewport left of the wheel when the wheel cannot be measured */
const TABLE_FALLBACK_SHARE = 0.22;
/** The foam head sticks out past the wheel box by about this share of the wheel size */
const WHEEL_OVERHANG = 0.045;
const WALL = '#211a10';
const TWO_PI = 2 * Math.PI;

interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  growth: number;
  age: number;
  life: number;
  sway: number;
}

interface Fly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  retargetIn: number;
  wing: number;
}

interface Scene {
  width: number;
  height: number;
  /** How much the picture is scaled to fill the viewport height */
  factor: number;
  /** Where the picture is drawn */
  offsetX: number;
  offsetY: number;
  drawnWidth: number;
  drawnHeight: number;
  grillX: number;
  grillY: number;
  /** Screen x of the man, the brightest spot of the picture */
  manX: number;
  /** Width of the strip between the viewport's left edge and the wheel, where the coffee table goes */
  tableWidth: number;
}

interface Pictures {
  room: HTMLImageElement | null;
  table: HTMLImageElement | null;
}

const checkHasSidebar = (): boolean => document.querySelector('.theme-panel') != null;

/**
 * Screen x of the wheel's left edge (minus the foam overhang), measured from the wheel
 * box like `SolarSystemBackground.measureWheel`. Before the wheel has a layout the box
 * is an empty full-width div, so only a square box counts; otherwise a fixed share of
 * the viewport stands in.
 */
const measureTableWidth = (width: number): number => {
  const rect = document.querySelector('[class*="wheelContent"]')?.getBoundingClientRect();
  const isWheelLaidOut = rect != null && rect.width > 40 && Math.abs(rect.width - rect.height) < 2;
  const edge = isWheelLaidOut ? rect.left - rect.width * WHEEL_OVERHANG : width * TABLE_FALLBACK_SHARE;

  return Math.round(Math.min(width, Math.max(0, edge)));
};

/**
 * The picture is scaled to the viewport height and slid so that the man in the
 * recliner sits in the gap to the right of the wheel (or further right when the
 * sidebar is hidden). Whatever is left uncovered on the right is filled with a
 * mirrored strip, so the wall continues.
 */
const measureScene = (width: number, height: number): Scene => {
  const factor = height / IMAGE_HEIGHT;
  const drawnWidth = IMAGE_WIDTH * factor;
  const drawnHeight = height;
  const manX = width * (checkHasSidebar() ? MAN_SCREEN_X_WITH_SIDEBAR : MAN_SCREEN_X_FULL);
  // never leave the left edge uncovered: the dark wall must reach the viewport edge
  const offsetX = Math.min(0, manX - MAN_ANCHOR * drawnWidth);
  const offsetY = 0;

  return {
    width,
    height,
    factor,
    offsetX,
    offsetY,
    drawnWidth,
    drawnHeight,
    grillX: offsetX + GRILL.x * drawnWidth,
    grillY: offsetY + GRILL.y * drawnHeight,
    manX: offsetX + MAN_ANCHOR * drawnWidth,
    tableWidth: measureTableWidth(width),
  };
};

/**
 * The coffee table in the strip left of the wheel: scaled to cover the strip (cropped
 * around the picture's centre), dimmed to about 70 % and faded out on its right edge.
 * Composed on its own canvas so the fade erases the picture only, not the wall below.
 */
const paintTable = (ctx: CanvasRenderingContext2D, image: HTMLImageElement, scene: Scene): void => {
  const { tableWidth, height } = scene;
  if (tableWidth < TABLE_MIN_WIDTH) {
    return;
  }

  const strip = document.createElement('canvas');
  strip.width = tableWidth;
  strip.height = height;
  const stripCtx = strip.getContext('2d');
  if (!stripCtx) {
    return;
  }

  const factor = Math.max(height / TABLE_HEIGHT, tableWidth / TABLE_WIDTH);
  const sourceWidth = tableWidth / factor;
  const sourceHeight = height / factor;
  stripCtx.drawImage(
    image,
    (TABLE_WIDTH - sourceWidth) / 2,
    (TABLE_HEIGHT - sourceHeight) / 2,
    sourceWidth,
    sourceHeight,
    0,
    0,
    tableWidth,
    height,
  );

  stripCtx.fillStyle = 'rgba(18, 12, 6, 0.3)';
  stripCtx.fillRect(0, 0, tableWidth, height);

  const fade = Math.min(TABLE_FADE, tableWidth * 0.5);
  const mask = stripCtx.createLinearGradient(tableWidth - fade, 0, tableWidth, 0);
  mask.addColorStop(0, 'rgba(0, 0, 0, 0)');
  mask.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
  mask.addColorStop(1, 'rgba(0, 0, 0, 1)');
  stripCtx.globalCompositeOperation = 'destination-out';
  stripCtx.fillStyle = mask;
  stripCtx.fillRect(tableWidth - fade, 0, fade, height);

  ctx.drawImage(strip, 0, 0);
};

const paintScene = (ctx: CanvasRenderingContext2D, pictures: Pictures, scene: Scene): void => {
  const { width, height, offsetX, offsetY, drawnWidth, drawnHeight } = scene;

  ctx.fillStyle = WALL;
  ctx.fillRect(0, 0, width, height);

  // warm lamp glow so a missing picture still looks like a lit room
  const lamp = ctx.createRadialGradient(width * 0.7, height * 0.25, 0, width * 0.7, height * 0.25, width * 0.5);
  lamp.addColorStop(0, 'rgba(255, 180, 90, 0.18)');
  lamp.addColorStop(0.4, 'rgba(255, 150, 60, 0.05)');
  lamp.addColorStop(1, 'rgba(255, 150, 60, 0)');
  ctx.fillStyle = lamp;
  ctx.fillRect(0, 0, width, height);

  if (pictures.room) {
    ctx.drawImage(pictures.room, offsetX, offsetY, drawnWidth, drawnHeight);

    // continue the wall to the right with a mirrored, dimmed copy
    const rightEdge = offsetX + drawnWidth;
    if (rightEdge < width) {
      ctx.save();
      ctx.translate(rightEdge + drawnWidth, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(pictures.room, 0, offsetY, drawnWidth, drawnHeight);
      ctx.restore();
      ctx.fillStyle = 'rgba(18, 12, 6, 0.55)';
      ctx.fillRect(rightEdge, 0, width - rightEdge, height);
    }
  }

  // darken the left where the wheel sits; keep the man's spot bright
  const manStop = Math.min(0.95, Math.max(0.5, scene.manX / width));
  const shade = ctx.createLinearGradient(0, 0, width, 0);
  shade.addColorStop(0, 'rgba(18, 12, 6, 0.94)');
  shade.addColorStop(Math.max(0.2, manStop - 0.42), 'rgba(18, 12, 6, 0.88)');
  shade.addColorStop(Math.max(0.3, manStop - 0.24), 'rgba(18, 12, 6, 0.55)');
  shade.addColorStop(Math.max(0.4, manStop - 0.1), 'rgba(18, 12, 6, 0.12)');
  shade.addColorStop(manStop, 'rgba(18, 12, 6, 0.04)');
  shade.addColorStop(Math.min(1, manStop + 0.12), 'rgba(18, 12, 6, 0.1)');
  shade.addColorStop(1, 'rgba(18, 12, 6, 0.35)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);

  // the coffee table on the left goes over the shaded wall, so the shade never swallows it
  if (pictures.table) {
    paintTable(ctx, pictures.table, scene);
  }

  const vignette = ctx.createLinearGradient(0, 0, 0, height);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
  vignette.addColorStop(0.22, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.75, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
};

const createPuff = (scene: Scene, seedAge: boolean): Puff => {
  const life = 4500 + Math.random() * 3500;
  const puff: Puff = {
    x: scene.grillX + (Math.random() - 0.5) * 16 * scene.factor,
    y: scene.grillY + Math.random() * 14 * scene.factor,
    vx: (4 + Math.random() * 10) * scene.factor,
    vy: -(16 + Math.random() * 18) * scene.factor,
    radius: (6 + Math.random() * 6) * scene.factor,
    growth: (9 + Math.random() * 7) * scene.factor,
    age: seedAge ? Math.random() * life : 0,
    life,
    sway: Math.random() * TWO_PI,
  };

  // a puff that starts mid-life is moved to where it would have drifted by now
  const elapsed = puff.age / 1000;
  puff.x += puff.vx * elapsed;
  puff.y += puff.vy * elapsed;
  puff.radius += puff.growth * elapsed;

  return puff;
};

const createFly = (scene: Scene): Fly => {
  const x = scene.manX + (Math.random() - 0.5) * scene.width * 0.3;
  const y = scene.height * (0.1 + Math.random() * 0.8);

  return { x, y, vx: 0, vy: 0, targetX: x, targetY: y, retargetIn: 0, wing: 0 };
};

/** Flies hang around the man and the bottles; the wheel on the left is left alone */
const pickFlyTarget = (fly: Fly, scene: Scene): void => {
  fly.targetX = scene.manX + (Math.random() - 0.5) * scene.width * 0.34;
  fly.targetY = scene.height * (0.08 + Math.random() * 0.84);
  fly.retargetIn = 400 + Math.random() * 900;
};

/**
 * The living room after the party. The picture is painted onto a static canvas
 * positioned around the man in the recliner, the coffee table fills the strip left of
 * the wheel; smoke from the balcony barbecue and a couple of flies animate on a second
 * canvas above it.
 */
const BeerPartyBackground = () => {
  const sceneCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const sceneCanvas = sceneCanvasRef.current;
    const canvas = canvasRef.current;
    const sceneCtx = sceneCanvas?.getContext('2d');
    const ctx = canvas?.getContext('2d');
    if (!sceneCanvas || !canvas || !sceneCtx || !ctx) {
      return;
    }

    const pictures: Pictures = { room: null, table: null };
    let scene = measureScene(window.innerWidth, window.innerHeight);
    let puffs: Puff[] = [];
    let flies: Fly[] = [];
    let frameId: number | null = null;
    let lastFrame = 0;
    let clock = 0;
    let hasSidebar = checkHasSidebar();

    const repaint = () => {
      sceneCanvas.width = scene.width;
      sceneCanvas.height = scene.height;
      paintScene(sceneCtx, pictures, scene);
    };

    const resize = () => {
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth;
      canvas.height = innerHeight;
      scene = measureScene(innerWidth, innerHeight);
      repaint();
      puffs = Array.from({ length: PUFF_COUNT }, () => createPuff(scene, true));
      flies = Array.from({ length: FLY_COUNT }, () => createFly(scene));
    };

    // the sidebar can be hidden in presentation mode: slide the man accordingly;
    // the wheel moves and resizes with it, so the table strip is re-measured too
    const measure = () => {
      const nextHasSidebar = checkHasSidebar();
      if (nextHasSidebar !== hasSidebar) {
        hasSidebar = nextHasSidebar;
        resize();
        return;
      }

      const nextTableWidth = measureTableWidth(scene.width);
      if (Math.abs(nextTableWidth - scene.tableWidth) > 2) {
        scene = { ...scene, tableWidth: nextTableWidth };
        repaint();
      }
    };

    const room = new Image();
    room.onload = () => {
      pictures.room = room;
      repaint();
    };
    room.src = BACKGROUND_IMAGE;

    const table = new Image();
    table.onload = () => {
      pictures.table = table;
      repaint();
    };
    table.src = TABLE_IMAGE;

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);
      if (document.hidden || timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const delta = lastFrame ? Math.min(timestamp - lastFrame, 250) : FRAME_INTERVAL;
      lastFrame = timestamp;
      const dt = delta / 1000;
      clock += dt;

      ctx.clearRect(0, 0, scene.width, scene.height);

      // smoke: soft grey puffs that swell and thin out as they rise
      puffs.forEach((puff, index) => {
        puff.age += delta;
        if (puff.age >= puff.life) {
          puffs[index] = createPuff(scene, false);
          return;
        }

        const t = puff.age / puff.life;
        puff.x += (puff.vx + Math.sin(clock * 0.8 + puff.sway) * 6 * scene.factor) * dt;
        puff.y += puff.vy * dt;
        puff.radius += puff.growth * dt;

        const alpha = 0.16 * Math.sin(Math.PI * t);
        const glow = ctx.createRadialGradient(puff.x, puff.y, 0, puff.x, puff.y, puff.radius);
        glow.addColorStop(0, `rgba(215, 205, 195, ${alpha.toFixed(3)})`);
        glow.addColorStop(0.6, `rgba(205, 195, 185, ${(alpha * 0.5).toFixed(3)})`);
        glow.addColorStop(1, 'rgba(200, 190, 180, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(puff.x, puff.y, puff.radius, 0, TWO_PI);
        ctx.fill();
      });

      // flies wandering around the man
      flies.forEach((fly) => {
        fly.retargetIn -= delta;
        if (fly.retargetIn <= 0) {
          pickFlyTarget(fly, scene);
        }

        fly.vx += ((fly.targetX - fly.x) * 3 + (Math.random() - 0.5) * 900) * dt;
        fly.vy += ((fly.targetY - fly.y) * 3 + (Math.random() - 0.5) * 900) * dt;
        const speed = Math.hypot(fly.vx, fly.vy);
        const maxSpeed = 110;
        if (speed > maxSpeed) {
          fly.vx *= maxSpeed / speed;
          fly.vy *= maxSpeed / speed;
        }
        fly.x += fly.vx * dt;
        fly.y += fly.vy * dt;
        fly.wing = fly.wing === 0 ? 1 : 0;

        const flap = fly.wing === 0 ? 0.5 : 1;
        ctx.save();
        ctx.translate(fly.x, fly.y);
        ctx.rotate(Math.atan2(fly.vy, fly.vx));
        ctx.fillStyle = 'rgba(220, 226, 240, 0.45)';
        [-1, 1].forEach((side) => {
          ctx.beginPath();
          ctx.ellipse(-0.5, side * 1.8, 2.6, 1.2, side * flap, 0, TWO_PI);
          ctx.fill();
        });
        ctx.fillStyle = '#17110a';
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.4, 1.5, 0, 0, TWO_PI);
        ctx.fill();
        ctx.restore();
      });
    };

    resize();
    window.addEventListener('resize', resize);
    const firstMeasureTimer = window.setTimeout(measure, FIRST_MEASURE_DELAY);
    const measureTimer = window.setInterval(measure, MEASURE_INTERVAL);
    frameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      window.clearTimeout(firstMeasureTimer);
      window.clearInterval(measureTimer);
      room.onload = null;
      table.onload = null;
      if (frameId != null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <div className='absolute inset-0 z-0 h-full w-full overflow-hidden' style={{ backgroundColor: WALL }}>
      <canvas ref={sceneCanvasRef} aria-hidden='true' className='absolute inset-0 h-full w-full' />
      <canvas ref={canvasRef} aria-hidden='true' className='absolute inset-0 h-full w-full' />
    </div>
  );
};

export default BeerPartyBackground;
