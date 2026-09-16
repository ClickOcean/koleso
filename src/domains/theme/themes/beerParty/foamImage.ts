/**
 * Generated top-down photo of a beer-foam ring (transparent background), drawn over
 * the rim by the effects layer. Loaded once per page; `get()` returns null until it
 * is ready or when the file is missing, and the drawn foam stays visible instead.
 *
 * Expected geometry: the ring's outer edge at 95% of the image width, its inner
 * edge at about 88%, both centered.
 */
export const FOAM_IMAGE = '/themes/beerParty/foam.png';

let image: HTMLImageElement | null = null;
let ready: HTMLImageElement | null = null;
let failed = false;

const load = (): void => {
  if (image || failed || typeof Image === 'undefined') {
    return;
  }

  image = new Image();
  image.onload = () => {
    ready = image;
  };
  image.onerror = () => {
    failed = true;
    image = null;
  };
  image.src = FOAM_IMAGE;
};

export const foamImage = {
  get(): HTMLImageElement | null {
    load();
    return ready;
  },
};
