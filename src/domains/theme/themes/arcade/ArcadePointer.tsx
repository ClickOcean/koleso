import classes from '@domains/wheel/BaseWheel/BaseWheel.module.css';

import { ARCADE_OUTLINE, ARCADE_YELLOW } from './palette';

import type { PointerProps } from '@domains/wheel/BaseWheel/parts/types';

/**
 * 13x14 sprite of a downward arrow. `#` outline, `y` body, `w` lit left edge,
 * `o` shaded right edge, `.` transparent.
 */
const SPRITE = [
  '....#####....',
  '....#wyo#....',
  '....#wyo#....',
  '....#wyo#....',
  '....#wyo#....',
  '....#wyo#....',
  '#############',
  '#wwyyyyyyyoo#',
  '.#wyyyyyyyo#.',
  '..#wyyyyyo#..',
  '...#wyyyo#...',
  '....#wyo#....',
  '.....#y#.....',
  '......#......',
];

const SPRITE_WIDTH = SPRITE[0].length;
const SPRITE_HEIGHT = SPRITE.length;

const COLORS: Record<string, string> = {
  '#': ARCADE_OUTLINE,
  y: ARCADE_YELLOW,
  w: '#fff6c2',
  o: '#e39b00',
};

interface SpriteRun {
  x: number;
  y: number;
  width: number;
  color: string;
}

/** Horizontal runs of the same color, so the SVG stays small */
const RUNS: SpriteRun[] = SPRITE.flatMap((row, y) => {
  const runs: SpriteRun[] = [];
  let x = 0;

  while (x < row.length) {
    const glyph = row[x];
    let width = 1;
    while (x + width < row.length && row[x + width] === glyph) {
      width++;
    }
    if (glyph !== '.') {
      runs.push({ x, y, width, color: COLORS[glyph] });
    }
    x += width;
  }

  return runs;
});

/** Pixel-art arrow pointing down at the rim, bobbing in whole-pixel steps like a cursor sprite. */
const ArcadePointer = ({ layout }: PointerProps) => {
  // whole screen pixels per sprite pixel, so crispEdges renders every block the same size
  const unit = Math.max(3, Math.round((layout.targetWheelSize * 0.1) / SPRITE_HEIGHT));

  return (
    <svg
      className={classes.wheelPointer}
      style={{ transform: 'translate(-50%, -55%)' }}
      width={SPRITE_WIDTH * unit}
      height={SPRITE_HEIGHT * unit}
      viewBox={`0 0 ${SPRITE_WIDTH} ${SPRITE_HEIGHT}`}
      shapeRendering='crispEdges'
      aria-hidden='true'
    >
      <g>
        {RUNS.map((run) => (
          <rect key={`${run.x}-${run.y}`} x={run.x} y={run.y} width={run.width} height={1} fill={run.color} />
        ))}
        <animateTransform
          attributeName='transform'
          type='translate'
          values='0 0; 0 1; 0 0'
          keyTimes='0; 0.5; 1'
          calcMode='discrete'
          dur='0.9s'
          repeatCount='indefinite'
        />
      </g>
    </svg>
  );
};

export default ArcadePointer;
