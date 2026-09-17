/**
 * Загрузчик картинок «Солнечной системы»: фото короны, спрайты планет и летающих объектов и две общие
 * фотографии из `public/themes/shared/`. Каждый файл грузится через `new Image()` один раз на страницу и
 * помнится между монтированиями темы; `get(key)` отдаёт `null`, пока картинка не приехала или если файла
 * нет (`failed(key)`), и тогда вызывающий код рисует прежний процедурный вариант — пустого или битого
 * кадра не бывает.
 */
export const SPRITE_URLS = {
  /** Shared deep-space photo: empty on the left, Andromeda upper right, the Pillars of Creation lower right */
  deepSpace: '/themes/shared/deep-space.jpg',
  /** The team's own astrophotos, 960×1296 portrait: the Pleiades on top, the Lagoon and Trifid nebulae below */
  astrophoto: '/themes/shared/team-astrophoto.jpg',
  /** Solar corona on pure black with a black occulting disc (radius 0.19 of the side), streamers out to 0.353 */
  corona: '/themes/solarSystem/corona.jpg',
  mercury: '/themes/solarSystem/planets/mercury.png',
  venus: '/themes/solarSystem/planets/venus.png',
  earth: '/themes/solarSystem/planets/earth.png',
  mars: '/themes/solarSystem/planets/mars.png',
  jupiter: '/themes/solarSystem/planets/jupiter.png',
  saturn: '/themes/solarSystem/planets/saturn.png',
  uranus: '/themes/solarSystem/planets/uranus.png',
  neptune: '/themes/solarSystem/planets/neptune.png',
  comet: '/themes/solarSystem/flyers/comet.png',
  asteroid: '/themes/solarSystem/flyers/asteroid.png',
  iss: '/themes/solarSystem/flyers/iss.png',
  probe: '/themes/solarSystem/flyers/probe.png',
  /** Чёрная дыра в духе «Интерстеллара»: аккреционный диск и линзированное кольцо, тень в центре */
  blackhole: '/themes/solarSystem/flyers/blackhole.png',
} as const;

export type SpriteKey = keyof typeof SPRITE_URLS;

type Listener = (image: HTMLImageElement) => void;

interface Entry {
  /** The element while it loads */
  loading: HTMLImageElement | null;
  ready: HTMLImageElement | null;
  failed: boolean;
  listeners: Set<Listener>;
}

const entries = new Map<SpriteKey, Entry>();

const entryFor = (key: SpriteKey): Entry => {
  let entry = entries.get(key);
  if (!entry) {
    entry = { loading: null, ready: null, failed: false, listeners: new Set() };
    entries.set(key, entry);
  }

  return entry;
};

const load = (key: SpriteKey): Entry => {
  const entry = entryFor(key);
  if (entry.loading || entry.ready || entry.failed || typeof Image === 'undefined') {
    return entry;
  }

  const picture = new Image();
  entry.loading = picture;
  picture.onload = () => {
    entry.ready = picture;
    entry.loading = null;
    entry.listeners.forEach((listener) => listener(picture));
    entry.listeners.clear();
  };
  picture.onerror = () => {
    entry.failed = true;
    entry.loading = null;
    entry.listeners.clear();
  };
  picture.src = SPRITE_URLS[key];

  return entry;
};

export const sprites = {
  /** Starts the download on the first call; null until the image is ready or forever when the file is missing */
  get(key: SpriteKey): HTMLImageElement | null {
    return load(key).ready;
  },
  failed(key: SpriteKey): boolean {
    return entryFor(key).failed;
  },
  /** Kicks off the downloads early, so a sprite is usually ready before it is first needed */
  preload(keys: readonly SpriteKey[]): void {
    keys.forEach(load);
  },
  /**
   * Calls `listener` once the image loads: cached layers repaint on it. Если картинка успела загрузиться
   * между рендером и подпиской (кеш браузера), слушатель вызывается сразу, иначе слой навсегда остался
   * бы без фото. При ошибке загрузки слушатель не вызывается никогда.
   */
  subscribe(key: SpriteKey, listener: Listener): () => void {
    const entry = load(key);
    if (entry.ready) {
      listener(entry.ready);
      return () => undefined;
    }
    if (entry.failed) {
      return () => undefined;
    }
    entry.listeners.add(listener);

    return () => {
      entry.listeners.delete(listener);
    };
  },
};

/**
 * Уменьшенная (или увеличенная) копия картинки на offscreen-canvas под точный размер, в котором её
 * рисуют. Прямой `drawImage` в 5–8 раз меньше оригинала берёт по одному сэмплу на пиксель, и вращающийся
 * спрайт «кипит»; здесь картинка уменьшается ступенями не больше чем вдвое, а кадры потом только копируют
 * готовый битмап (масштабирование картинок — не покадровая работа).
 */
export const scaleSprite = (image: HTMLImageElement, width: number, height: number): HTMLCanvasElement => {
  const targetWidth = Math.max(1, Math.round(width));
  const targetHeight = Math.max(1, Math.round(height));
  let source: CanvasImageSource = image;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;

  while (sourceWidth > targetWidth * 2 && sourceHeight > targetHeight * 2) {
    const step = document.createElement('canvas');
    step.width = Math.ceil(sourceWidth / 2);
    step.height = Math.ceil(sourceHeight / 2);
    step.getContext('2d')?.drawImage(source, 0, 0, step.width, step.height);
    source = step;
    sourceWidth = step.width;
    sourceHeight = step.height;
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  canvas.getContext('2d')?.drawImage(source, 0, 0, targetWidth, targetHeight);

  return canvas;
};
