import { useEffect, useState } from 'react';

/**
 * A photo from `public/themes/beerParty/` loaded once per page. Every picture in this theme
 * is optional by contract (see `docs/theme-authoring.md`): until it loads, and forever if the
 * file is missing, `get()` returns null and the caller keeps drawing its procedural version.
 * That is what lets an asset be dropped into `public/` later without touching the code.
 */
export interface ImageAsset {
  /** The picture once it is decoded, otherwise null. Starts the load on first call. */
  get(): HTMLImageElement | null;
  /** Calls `listener` once the picture is ready; returns an unsubscribe. */
  subscribe(listener: (image: HTMLImageElement) => void): () => void;
}

export const createImageAsset = (src: string): ImageAsset => {
  type Listener = (image: HTMLImageElement) => void;

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
    picture.src = src;
  };

  return {
    get() {
      load();

      return ready;
    },
    subscribe(listener) {
      load();
      // the picture can finish between render and subscribe (browser cache); without this the
      // component would wait for an onload that already fired and never get the texture
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
};

/**
 * The asset's picture, re-rendering the component when it arrives. The wheel canvas is cached
 * and only rebuilt on re-render, so a component that draws with a photo must subscribe through
 * this hook rather than read `get()` during a draw that may never run again.
 */
export const useImageAsset = (asset: ImageAsset): HTMLImageElement | null => {
  const [image, setImage] = useState<HTMLImageElement | null>(() => asset.get());

  useEffect(() => {
    if (image) {
      return;
    }

    return asset.subscribe(setImage);
  }, [asset, image]);

  return image;
};
