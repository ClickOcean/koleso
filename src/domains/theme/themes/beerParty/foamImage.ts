import { useEffect, useState } from 'react';

/**
 * Generated seamless top-down photo of beer foam (1024 × 1024, tileable, no alpha). The
 * effects layer fills the foam head with it as a repeating pattern (see `foamRing.ts`).
 * Loaded once per page; `get()` returns null until it is ready or when the file is
 * missing, and the drawn foam on the wheel canvas stays visible instead.
 */
export const FOAM_TEXTURE = '/themes/beerParty/foam.jpg';

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
  picture.src = FOAM_TEXTURE;
};

export const foamTexture = {
  get(): HTMLImageElement | null {
    load();
    return ready;
  },
  /**
   * Calls `listener` once the texture loads. Если картинка успела загрузиться между рендером и
   * подпиской (кеш браузера), слушатель вызывается сразу, иначе компонент навсегда остался бы без текстуры.
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
 * The foam texture once it is loaded, re-rendering the component when it arrives. The wheel
 * canvas is cached, so `BeerPartyWheel` uses this to drop its drawn foam only after the
 * photo head is really there; a missing file keeps the drawn foam forever.
 */
export const useFoamTexture = (): HTMLImageElement | null => {
  const [texture, setTexture] = useState<HTMLImageElement | null>(() => foamTexture.get());

  useEffect(() => {
    if (texture) {
      return;
    }

    return foamTexture.subscribe(setTexture);
  }, [texture]);

  return texture;
};
