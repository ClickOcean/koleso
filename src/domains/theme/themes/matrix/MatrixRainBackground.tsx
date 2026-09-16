import { useEffect, useRef } from 'react';

const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789Z:・"=*+-<>¦|';
const FONT_FAMILY = '"Courier New", Courier, monospace';
const FRAME_INTERVAL = 40; // ~25 к/с
const MAX_DPR = 1.5; // выше — только лишние пиксели, глифы и так резкие
const MIN_SPEED = 0.35; // строк за кадр
const MAX_SPEED = 1.1;
const MUTATION_RATE = 0.015; // доля видимых ячеек, перерисуемых за кадр
const TAIL_FADE = 'rgba(0, 0, 0, 0.35)'; // дополнительное гашение у конца хвоста
const WARMUP_FRAMES = 45; // сколько кадров прогнать при старте, чтобы завеса была полной сразу
const RESIZE_DEBOUNCE = 120;

/** Уровни яркости глифа = строки атласа. */
const HEAD = 0;
const BRIGHT = 1;
const MID = 2;
const DIM = 3;

interface LevelStyle {
  color: string;
  alpha: number;
}

const LEVEL_STYLES: LevelStyle[] = [
  { color: '#eaffea', alpha: 1 }, // голова: почти белая, со свечением
  { color: '#b4ffb4', alpha: 1 }, // яркий зелёно-белый
  { color: '#00ff41', alpha: 0.85 }, // основной фосфорный зелёный
  { color: '#00ff41', alpha: 0.42 }, // тусклый
];

interface LayerConfig {
  /** Кегль глифа в CSS-пикселях (до умножения на devicePixelRatio). */
  fontSize: number;
  /** Шаг колонок в долях кегля. */
  pitch: number;
  /** Доля непрозрачности, которую хвосты теряют за кадр. */
  fade: number;
  /** Множитель яркости атласа: дальний слой тусклее. */
  brightness: number;
  /** Диапазон длины хвоста в долях видимых строк. */
  trail: [number, number];
}

const NEAR_CONFIG: LayerConfig = { fontSize: 17, pitch: 0.8, fade: 0.055, brightness: 1, trail: [0.18, 0.62] };
const FAR_CONFIG: LayerConfig = { fontSize: 11, pitch: 0.75, fade: 0.07, brightness: 0.55, trail: [0.18, 0.62] };

interface Drop {
  /** Индекс глифа в GLYPHS, который сейчас показывает голова. */
  glyph: number;
  /** Строка головы (дробная). */
  y: number;
  /** Строк за кадр. */
  speed: number;
  /** Длина хвоста в строках. */
  trail: number;
  /** Кадров до перезапуска сверху; 0 — капля летит. */
  delay: number;
}

interface Layer {
  config: LayerConfig;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  atlas: HTMLCanvasElement;
  /** Ячейка сетки (ширина — шаг колонки, высота — кегль) в пикселях холста. */
  boxW: number;
  boxH: number;
  /** Поле вокруг ячейки в атласе под свечение головы. */
  pad: number;
  cellW: number;
  cellH: number;
  rows: number;
  /** X каждой колонки. */
  xs: number[];
  columns: Drop[][];
  mutations: number;
  fadeStyle: string;
}

const randInt = (n: number): number => Math.floor(Math.random() * n);
const randRange = (min: number, max: number): number => min + Math.random() * (max - min);

const pickTrailLevel = (): number => {
  const r = Math.random();
  if (r < 0.12) return BRIGHT;
  if (r < 0.8) return MID;
  return DIM;
};

const spawnDrop = (drop: Drop, rows: number, config: LayerConfig, initial: boolean): void => {
  drop.glyph = randInt(GLYPHS.length);
  drop.speed = randRange(MIN_SPEED, MAX_SPEED);
  drop.trail = Math.max(4, Math.round(rows * randRange(config.trail[0], config.trail[1])));
  // при старте капли раскиданы по всей высоте и над экраном, при перезапуске — чуть выше верхнего края
  drop.y = initial ? randRange(-rows * 0.6, rows) : -randRange(0, 6);
  drop.delay = 0;
};

const createDrop = (rows: number, config: LayerConfig): Drop => {
  const drop: Drop = { glyph: 0, y: 0, speed: 1, trail: 1, delay: 0 };
  spawnDrop(drop, rows, config, true);
  return drop;
};

/**
 * Атлас: все глифы × все уровни яркости на одном offscreen canvas. Свечение головы рисуется shadowBlur
 * здесь один раз, в кадре остаётся только drawImage.
 */
const buildAtlas = (font: number, cellW: number, cellH: number, brightness: number): HTMLCanvasElement => {
  const atlas = document.createElement('canvas');
  atlas.width = cellW * GLYPHS.length;
  atlas.height = cellH * LEVEL_STYLES.length;
  const ctx = atlas.getContext('2d');
  if (!ctx) {
    return atlas;
  }

  ctx.font = `${font}px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const drawRow = (level: number, glow: boolean) => {
    const style = LEVEL_STYLES[level];
    const cy = level * cellH + cellH / 2;
    ctx.globalAlpha = style.alpha * brightness;
    ctx.fillStyle = style.color;
    ctx.shadowColor = glow ? 'rgba(140, 255, 160, 0.95)' : 'transparent';
    ctx.shadowBlur = glow ? font * 0.55 : 0;
    for (let i = 0; i < GLYPHS.length; i++) {
      ctx.fillText(GLYPHS[i], i * cellW + cellW / 2, cy);
    }
  };

  drawRow(HEAD, true); // ореол
  drawRow(HEAD, false); // резкое ядро поверх ореола
  drawRow(BRIGHT, false);
  drawRow(MID, false);
  drawRow(DIM, false);

  return atlas;
};

const createLayer = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  config: LayerConfig,
  width: number,
  height: number,
  dpr: number,
): Layer => {
  const font = Math.round(config.fontSize * dpr);
  const pitch = font * config.pitch;
  const boxW = Math.ceil(pitch);
  const boxH = font;
  const pad = Math.ceil(font * 0.6);
  const cellW = boxW + pad * 2;
  const cellH = boxH + pad * 2;

  canvas.width = width;
  canvas.height = height;

  const cols = Math.ceil(width / pitch);
  const rows = Math.ceil(height / boxH) + 1;
  const xs = Array.from({ length: cols }, (_, c) => Math.round(c * pitch));
  const columns = xs.map(() => Array.from({ length: 2 + randInt(2) }, () => createDrop(rows, config)));

  return {
    config,
    canvas,
    ctx,
    atlas: buildAtlas(font, cellW, cellH, config.brightness),
    boxW,
    boxH,
    pad,
    cellW,
    cellH,
    rows,
    xs,
    columns,
    mutations: Math.round(MUTATION_RATE * cols * rows),
    fadeStyle: `rgba(0, 0, 0, ${config.fade})`,
  };
};

/** Стирает ячейку и кладёт в неё глиф из атласа (с полем под свечение). */
const drawGlyph = (layer: Layer, x: number, row: number, glyph: number, level: number): void => {
  const { ctx, atlas, boxW, boxH, pad, cellW, cellH } = layer;
  const y = row * boxH;
  ctx.clearRect(x, y, boxW, boxH);
  ctx.drawImage(atlas, glyph * cellW, level * cellH, cellW, cellH, x - pad, y - pad, cellW, cellH);
};

const stepLayer = (layer: Layer): void => {
  const { ctx, canvas, columns, xs, rows, boxW, boxH, config } = layer;

  // 1. Хвосты тускнеют: destination-out полупрозрачным чёрным, чтобы холст оставался прозрачным
  //    и дальний слой просвечивал сквозь ближний. Конец каждого хвоста гасится дополнительно.
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = layer.fadeStyle;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = TAIL_FADE;
  for (let c = 0; c < columns.length; c++) {
    const drops = columns[c];
    for (let d = 0; d < drops.length; d++) {
      const tail = Math.floor(drops[d].y) - drops[d].trail;
      if (tail > -3 && tail < rows) {
        ctx.fillRect(xs[c], (tail - 2) * boxH, boxW, boxH * 3);
      }
    }
  }
  ctx.globalCompositeOperation = 'source-over';

  // 2. Капли движутся: прежняя голова оседает в хвост зелёным глифом, новая рисуется яркой
  for (let c = 0; c < columns.length; c++) {
    const x = xs[c];
    const drops = columns[c];
    for (let d = 0; d < drops.length; d++) {
      const drop = drops[d];
      if (drop.delay > 0) {
        drop.delay -= 1;
        if (drop.delay === 0) {
          spawnDrop(drop, rows, config, false);
        }
        continue;
      }

      const prevRow = Math.floor(drop.y);
      drop.y += drop.speed;
      const row = Math.floor(drop.y);

      for (let r = Math.max(prevRow, 0); r < row && r < rows; r++) {
        drawGlyph(layer, x, r, drop.glyph, pickTrailLevel());
        drop.glyph = randInt(GLYPHS.length);
      }

      if (row >= rows) {
        drop.delay = 8 + randInt(50);
        continue;
      }
      if (row >= 0) {
        if (Math.random() < 0.4) {
          drop.glyph = randInt(GLYPHS.length); // голова мерцает
        }
        drawGlyph(layer, x, row, drop.glyph, HEAD);
      }
    }
  }

  // 3. Мутации: случайные ячейки внутри хвостов перерисовываются другим глифом. Яркость подгоняется
  //    под уже выцветших соседей через globalAlpha, чтобы глиф не вспыхивал.
  const keep = 1 - config.fade;
  for (let i = 0; i < layer.mutations; i++) {
    const c = randInt(columns.length);
    const drops = columns[c];
    const drop = drops[randInt(drops.length)];
    const k = 1 + randInt(drop.trail);
    const row = Math.floor(drop.y) - k;
    if (row < 0 || row >= rows) {
      continue;
    }
    const alpha = Math.pow(keep, k / drop.speed);
    if (alpha < 0.06) {
      continue;
    }
    ctx.globalAlpha = alpha;
    drawGlyph(layer, xs[c], row, randInt(GLYPHS.length), MID);
  }
  ctx.globalAlpha = 1;
};

/**
 * Цифровой дождь «Матрицы» в два слоя глубины: дальний (мелкие тусклые глифы, CSS `blur(0.6px)`) и ближний
 * (крупные резкие). Оба слоя — свои canvas в одной обёртке, но один цикл `requestAnimationFrame` (~25 к/с).
 * В каждой колонке 2–3 независимые капли со своей скоростью и длиной хвоста; голова бело-зелёная со свечением,
 * хвост оседает глифами трёх случайных яркостей и гаснет полупрозрачным чёрным через `destination-out`
 * (холст остаётся прозрачным, поэтому дальний слой виден сквозь ближний). Улетевшая за низ капля возвращается
 * наверх после короткой случайной паузы, так что завеса не редеет.
 *
 * Производительность: при инициализации и resize строится атлас (offscreen canvas) со всеми глифами в четырёх
 * уровнях яркости, свечение головы рисуется `shadowBlur` один раз в атлас, а в кадре только `drawImage` из
 * атласа — ни `fillText`, ни `shadowBlur`. Backing-размер холстов — devicePixelRatio, ограниченный 1.5.
 * Часть уже нарисованных ячеек хвоста каждый кадр «мутирует» (перерисовывается случайным глифом).
 * В скрытой вкладке кадры пропускаются.
 */
const MatrixRainBackground = () => {
  const farRef = useRef<HTMLCanvasElement>(null);
  const nearRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const farCanvas = farRef.current;
    const nearCanvas = nearRef.current;
    const farCtx = farCanvas?.getContext('2d');
    const nearCtx = nearCanvas?.getContext('2d');
    if (!farCanvas || !nearCanvas || !farCtx || !nearCtx) {
      return;
    }

    let layers: Layer[] = [];
    let frameId: number | null = null;
    let resizeTimer: number | null = null;
    let lastFrame = 0;

    const rebuild = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const width = Math.round(window.innerWidth * dpr);
      const height = Math.round(window.innerHeight * dpr);
      layers = [
        createLayer(farCanvas, farCtx, FAR_CONFIG, width, height, dpr),
        createLayer(nearCanvas, nearCtx, NEAR_CONFIG, width, height, dpr),
      ];
      for (let i = 0; i < WARMUP_FRAMES; i++) {
        layers.forEach(stepLayer);
      }
    };

    const onResize = () => {
      if (resizeTimer != null) {
        window.clearTimeout(resizeTimer);
      }
      resizeTimer = window.setTimeout(() => {
        resizeTimer = null;
        rebuild();
      }, RESIZE_DEBOUNCE);
    };

    const draw = (timestamp: number) => {
      frameId = requestAnimationFrame(draw);
      if (document.hidden) {
        return;
      }
      const elapsed = timestamp - lastFrame;
      if (elapsed < FRAME_INTERVAL) {
        return;
      }
      // не накапливаем остаток, иначе на 60 Гц получится 20 к/с вместо 25
      lastFrame = timestamp - (elapsed % FRAME_INTERVAL);
      layers.forEach(stepLayer);
    };

    rebuild();
    window.addEventListener('resize', onResize);
    frameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', onResize);
      if (resizeTimer != null) {
        window.clearTimeout(resizeTimer);
      }
      if (frameId != null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <div className='absolute inset-0 z-0 h-full w-full overflow-hidden bg-black'>
      <canvas
        ref={farRef}
        aria-hidden='true'
        className='absolute inset-0 h-full w-full'
        style={{ opacity: 0.7, filter: 'blur(0.6px)' }}
      />
      <canvas ref={nearRef} aria-hidden='true' className='absolute inset-0 h-full w-full' style={{ opacity: 0.85 }} />
      <div
        className='absolute inset-0'
        style={{
          background:
            'radial-gradient(circle at 42% 50%, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.35) 50%, rgba(0, 0, 0, 0.6) 100%)',
        }}
      />
      <div
        className='absolute inset-0'
        style={{
          background: 'radial-gradient(circle at 42% 50%, rgba(0, 255, 65, 0.05) 0%, rgba(0, 255, 65, 0) 60%)',
        }}
      />
    </div>
  );
};

export default MatrixRainBackground;
