import { useEffect, useRef } from 'react';

import { traceGear } from './drawGear';

const FRAME_INTERVAL = 1000 / 18;
const WISP_COUNT = 3;
const GRID_STEP = 48;
const INK = (alpha: number): string => `rgba(52, 32, 12, ${alpha})`;
const LABEL_FONT = 'italic 13px Georgia, "Times New Roman", serif';
const TWO_PI = Math.PI * 2;

interface Wisp {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  vx: number;
  vy: number;
  alpha: number;
  phase: number;
}

const createWisp = (width: number, height: number): Wisp => ({
  x: Math.random() * width,
  y: Math.random() * height,
  radiusX: 240 + Math.random() * 220,
  radiusY: 70 + Math.random() * 70,
  vx: (5 + Math.random() * 8) * (Math.random() < 0.5 ? -1 : 1),
  vy: -(2 + Math.random() * 3),
  alpha: 0.045 + Math.random() * 0.035,
  phase: Math.random() * TWO_PI,
});

/** Aged, tobacco-stained paper: warm sepia gradient, stains, grain and a few fibres */
const drawPaper = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  const focusX = width * 0.42;
  const focusY = height * 0.5;
  const base = ctx.createRadialGradient(focusX, focusY, 0, focusX, focusY, Math.max(width, height) * 0.75);
  base.addColorStop(0, '#8f7452');
  base.addColorStop(0.55, '#6c5236');
  base.addColorStop(1, '#3e2b16');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 8; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = 90 + Math.random() * 240;
    const stain = ctx.createRadialGradient(x, y, 0, x, y, radius);
    stain.addColorStop(0, 'rgba(48, 26, 8, 0.2)');
    stain.addColorStop(0.7, 'rgba(48, 26, 8, 0.08)');
    stain.addColorStop(1, 'rgba(48, 26, 8, 0)');
    ctx.fillStyle = stain;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TWO_PI);
    ctx.fill();
  }

  const grainCount = Math.floor((width * height) / 700);
  for (let i = 0; i < grainCount; i++) {
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 230, 190, 0.06)' : 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
  }

  ctx.strokeStyle = 'rgba(52, 32, 12, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const angle = Math.random() * TWO_PI;
    const length = 6 + Math.random() * 18;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }
};

const drawDimensionLine = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
): void => {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const arrow = 7;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  [
    [x1, y1, angle],
    [x2, y2, angle + Math.PI],
  ].forEach(([x, y, direction]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(direction + 0.35) * arrow, y + Math.sin(direction + 0.35) * arrow);
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(direction - 0.35) * arrow, y + Math.sin(direction - 0.35) * arrow);
    ctx.stroke();
  });

  ctx.save();
  ctx.translate((x1 + x2) / 2, (y1 + y2) / 2);
  ctx.rotate(Math.abs(angle) > Math.PI / 2 ? angle + Math.PI : angle);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, 0, -4);
  ctx.restore();
};

const drawBlueprintGear = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tipRadius: number,
  teeth: number,
): void => {
  const rootRadius = tipRadius * 0.9;

  ctx.setLineDash([]);
  traceGear(ctx, x, y, tipRadius, rootRadius, teeth);
  ctx.stroke();

  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.arc(x, y, rootRadius * 0.94, 0, TWO_PI);
  ctx.stroke();

  ctx.setLineDash([]);
  [0.2, 0.08].forEach((factor) => {
    ctx.beginPath();
    ctx.arc(x, y, tipRadius * factor, 0, TWO_PI);
    ctx.stroke();
  });

  for (let i = 0; i < 6; i++) {
    const angle = (i * TWO_PI) / 6;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * tipRadius * 0.22, y + Math.sin(angle) * tipRadius * 0.22);
    ctx.lineTo(x + Math.cos(angle) * tipRadius * 0.86, y + Math.sin(angle) * tipRadius * 0.86);
    ctx.stroke();
  }

  // centre lines
  ctx.setLineDash([18, 6, 4, 6]);
  const reach = tipRadius * 1.1;
  ctx.beginPath();
  ctx.moveTo(x - reach, y);
  ctx.lineTo(x + reach, y);
  ctx.moveTo(x, y - reach);
  ctx.lineTo(x, y + reach);
  ctx.stroke();
  ctx.setLineDash([]);
};

/** Faint engineering drawing: grid, a large drive gear where the wheel sits, meshing gears, dimensions, title block */
const drawBlueprint = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';

  for (let x = 0; x <= width; x += GRID_STEP) {
    ctx.strokeStyle = INK(x % (GRID_STEP * 5) === 0 ? 0.11 : 0.06);
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += GRID_STEP) {
    ctx.strokeStyle = INK(y % (GRID_STEP * 5) === 0 ? 0.11 : 0.06);
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }

  ctx.strokeStyle = INK(0.24);
  ctx.fillStyle = INK(0.42);
  ctx.font = LABEL_FONT;

  // main drive gear, roughly where the wheel sits
  const mainX = width * 0.42;
  const mainY = height * 0.5;
  const mainRadius = height * 0.47;
  drawBlueprintGear(ctx, mainX, mainY, mainRadius, 44);
  drawDimensionLine(
    ctx,
    mainX - mainRadius,
    mainY + mainRadius + 40,
    mainX + mainRadius,
    mainY + mainRadius + 40,
    `⌀ ${Math.round(mainRadius * 2)}`,
  );
  drawDimensionLine(
    ctx,
    mainX + mainRadius + 52,
    mainY - mainRadius,
    mainX + mainRadius + 52,
    mainY + mainRadius,
    `${Math.round(mainRadius * 2)}`,
  );
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('FIG. 1', mainX - mainRadius, mainY - mainRadius - 14);

  // meshing pair, top right
  const pairX = width * 0.83;
  const pairY = height * 0.2;
  const pairRadius = height * 0.13;
  const smallRadius = height * 0.07;
  drawBlueprintGear(ctx, pairX, pairY, pairRadius, 18);
  const meshAngle = -0.6;
  const meshDistance = pairRadius + smallRadius - height * 0.018;
  drawBlueprintGear(
    ctx,
    pairX + Math.cos(meshAngle) * meshDistance,
    pairY + Math.sin(meshAngle) * meshDistance,
    smallRadius,
    10,
  );
  ctx.fillText('FIG. 2', pairX - pairRadius, pairY + pairRadius + 30);

  // idler, bottom left
  const idlerX = width * 0.13;
  const idlerY = height * 0.84;
  drawBlueprintGear(ctx, idlerX, idlerY, height * 0.1, 14);
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  ctx.arc(idlerX, idlerY, height * 0.13, 0, TWO_PI);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillText('FIG. 3', idlerX - height * 0.1, idlerY - height * 0.13 - 8);

  // title block, bottom right
  const blockWidth = 280;
  const blockHeight = 74;
  const blockX = width - blockWidth - 28;
  const blockY = height - blockHeight - 24;
  ctx.strokeStyle = INK(0.28);
  ctx.strokeRect(blockX + 0.5, blockY + 0.5, blockWidth, blockHeight);
  ctx.beginPath();
  ctx.moveTo(blockX, blockY + blockHeight / 2 + 0.5);
  ctx.lineTo(blockX + blockWidth, blockY + blockHeight / 2 + 0.5);
  ctx.moveTo(blockX + blockWidth * 0.62 + 0.5, blockY + blockHeight / 2);
  ctx.lineTo(blockX + blockWidth * 0.62 + 0.5, blockY + blockHeight);
  ctx.stroke();
  ctx.fillStyle = INK(0.46);
  ctx.fillText('DRIVE WHEEL — ASSEMBLY', blockX + 12, blockY + 26);
  ctx.fillText('PLATE No. 7', blockX + 12, blockY + 58);
  ctx.fillText('SCALE 1:4', blockX + blockWidth * 0.62 + 12, blockY + 58);

  ctx.restore();
};

/**
 * Aged-paper blueprint: paper texture and engineering drawing rendered once
 * per resize on a static canvas, with a few slow steam wisps drifting over it
 * on a second canvas at a low frame rate. A vignette keeps the wheel in focus.
 */
const SteampunkBackground = () => {
  const staticRef = useRef<HTMLCanvasElement>(null);
  const wispRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const staticCanvas = staticRef.current;
    const wispCanvas = wispRef.current;
    const staticCtx = staticCanvas?.getContext('2d');
    const wispCtx = wispCanvas?.getContext('2d');
    if (!staticCanvas || !wispCanvas || !staticCtx || !wispCtx) {
      return;
    }

    let wisps: Wisp[] = [];
    let frameId: number | null = null;
    let lastFrame = 0;

    const resize = () => {
      const { innerWidth, innerHeight } = window;
      staticCanvas.width = innerWidth;
      staticCanvas.height = innerHeight;
      wispCanvas.width = innerWidth;
      wispCanvas.height = innerHeight;
      wisps = Array.from({ length: WISP_COUNT }, () => createWisp(innerWidth, innerHeight));
      drawPaper(staticCtx, innerWidth, innerHeight);
      drawBlueprint(staticCtx, innerWidth, innerHeight);
    };

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);
      if (timestamp - lastFrame < FRAME_INTERVAL) {
        return;
      }
      const delta = lastFrame ? Math.min(timestamp - lastFrame, 200) : FRAME_INTERVAL;
      lastFrame = timestamp;

      const { width, height } = wispCanvas;
      const dt = delta / 1000;
      const time = timestamp / 1000;

      wispCtx.clearRect(0, 0, width, height);

      wisps.forEach((wisp) => {
        wisp.x += wisp.vx * dt;
        wisp.y += (wisp.vy + Math.sin(time * 0.3 + wisp.phase) * 2) * dt;

        if (wisp.x > width + wisp.radiusX) wisp.x = -wisp.radiusX;
        if (wisp.x < -wisp.radiusX) wisp.x = width + wisp.radiusX;
        if (wisp.y < -wisp.radiusY) wisp.y = height + wisp.radiusY;

        const squash = wisp.radiusY / wisp.radiusX;
        const breathing = 1 + Math.sin(time * 0.2 + wisp.phase) * 0.08;

        wispCtx.save();
        wispCtx.translate(wisp.x, wisp.y);
        wispCtx.scale(breathing, squash * breathing);
        const gradient = wispCtx.createRadialGradient(0, 0, 0, 0, 0, wisp.radiusX);
        gradient.addColorStop(0, `rgba(236, 226, 208, ${wisp.alpha})`);
        gradient.addColorStop(0.5, `rgba(236, 226, 208, ${wisp.alpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(236, 226, 208, 0)');
        wispCtx.fillStyle = gradient;
        wispCtx.beginPath();
        wispCtx.arc(0, 0, wisp.radiusX, 0, TWO_PI);
        wispCtx.fill();
        wispCtx.restore();
      });
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
    <div className='absolute inset-0 z-0 h-full w-full overflow-hidden' style={{ backgroundColor: '#5a452a' }}>
      <canvas ref={staticRef} aria-hidden='true' className='absolute inset-0 h-full w-full' />
      <canvas ref={wispRef} aria-hidden='true' className='absolute inset-0 h-full w-full' />
      <div
        className='absolute inset-0'
        style={{
          background:
            'radial-gradient(circle at 42% 50%, rgba(0, 0, 0, 0.06) 0%, rgba(0, 0, 0, 0.12) 45%, rgba(0, 0, 0, 0.5) 100%)',
        }}
      />
    </div>
  );
};

export default SteampunkBackground;
