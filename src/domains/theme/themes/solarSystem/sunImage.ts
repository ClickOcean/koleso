import { useEffect, useState } from 'react';

/**
 * Фото Солнца для колеса «Солнечной системы»: `public/themes/solarSystem/sun.jpg`, 1200×1200,
 * полный диск с грануляцией, группами пятен, факелами и потемнением к лимбу; вокруг диска чистый
 * чёрный. Диск на фото стоит не по центру, поэтому его круг измерен отдельно (`SUN_DISC`), и колесо
 * накладывает именно его: центр диска → центр колеса, радиус диска → радиус диска колеса.
 * Грузится один раз на страницу; `get()` возвращает null, пока картинки нет или файл отсутствует,
 * и колесо тогда рисует прежнее процедурное Солнце.
 */
export const SUN_TEXTURE = '/themes/solarSystem/sun.jpg';

/** Круг солнечного диска на фото, px исходника (измерено по sun.jpg) */
export const SUN_DISC = { x: 588, y: 583, radius: 548 } as const;

type Listener = (texture: HTMLImageElement) => void;

let image: HTMLImageElement | null = null;
let ready: HTMLImageElement | null = null;
let failed = false;
const listeners = new Set<Listener>();

const load = (): void => {
  if (image || failed || typeof Image === 'undefined') {
    return;
  }

  const picture = new Image();
  image = picture;
  picture.onload = () => {
    ready = picture;
    listeners.forEach((listener) => listener(picture));
    listeners.clear();
  };
  picture.onerror = () => {
    failed = true;
    image = null;
    listeners.clear();
  };
  picture.src = SUN_TEXTURE;
};

export const sunTexture = {
  get(): HTMLImageElement | null {
    load();
    return ready;
  },
  /**
   * Calls `listener` once the photo loads. Если картинка успела загрузиться между рендером и
   * подпиской (кеш браузера), слушатель вызывается сразу, иначе компонент навсегда остался бы без фото.
   * При ошибке загрузки слушатель не вызывается никогда.
   */
  subscribe(listener: Listener): () => void {
    load();
    if (ready) {
      listener(ready);
      return () => undefined;
    }
    if (failed) {
      return () => undefined;
    }
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
};

/**
 * The Sun photo once it is loaded, re-rendering the component when it arrives. The wheel canvas
 * is cached and redrawn only when the renderer changes, so `SolarSystemWheel` reads this hook and
 * references the result inside its renderer: the photo replaces the procedural plasma exactly
 * when it is really there, and a missing file keeps the procedural Sun forever.
 */
export const useSunTexture = (): HTMLImageElement | null => {
  const [texture, setTexture] = useState<HTMLImageElement | null>(() => sunTexture.get());

  useEffect(() => {
    if (texture) {
      return;
    }

    return sunTexture.subscribe(setTexture);
  }, [texture]);

  return texture;
};
