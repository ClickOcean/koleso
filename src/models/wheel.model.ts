export interface WheelItem {
  name: string;
  displayName?: string;
  id: string | number;
  color: string;
  amount: number;
}

/** Ids of visual themes. Each one has a definition in `src/domains/theme/themes/<id>/theme.ts`. */
export type WheelStyle =
  | 'default'
  | 'genshinImpact'
  | 'matrix'
  | 'casino'
  | 'synthwave'
  | 'arcade'
  | 'horror'
  | 'newYear'
  | 'terminal'
  | 'steampunk'
  | 'nautical'
  | 'stadium'
  | 'minimalLight'
  | 'highSociety'
  | 'beerParty'
  | 'solarSystem';

export interface WheelItemWithAngle extends WheelItem {
  startAngle: number;
  endAngle: number;
}
