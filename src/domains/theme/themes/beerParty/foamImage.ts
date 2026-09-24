import { createImageAsset, useImageAsset } from './imageAsset';

/**
 * Generated seamless top-down photo of beer foam (1024 × 1024, tileable, no alpha). The
 * effects layer fills the foam head with it as a repeating pattern (see `foamRing.ts`).
 * While it is missing the drawn foam on the wheel canvas stays visible instead.
 */
export const FOAM_TEXTURE = '/themes/beerParty/foam.jpg';

export const foamTexture = createImageAsset(FOAM_TEXTURE);

/**
 * The foam texture once it is loaded, re-rendering the component when it arrives. The wheel
 * canvas is cached, so `BeerPartyWheel` uses this to drop its drawn foam only after the
 * photo head is really there; a missing file keeps the drawn foam forever.
 */
export const useFoamTexture = (): HTMLImageElement | null => useImageAsset(foamTexture);
