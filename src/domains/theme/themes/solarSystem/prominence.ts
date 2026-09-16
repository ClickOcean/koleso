/** A flame tongue arching out of the rim. Sizes are canvas px, `angle` is where on the rim it sits. */
export interface ProminenceShape {
  angle: number;
  /** Radius the tongue emerges from */
  base: number;
  height: number;
  /** Half of the footprint on the rim, tangential */
  halfWidth: number;
  /** Tangential shift of the tip, makes the arch lean sideways */
  lean: number;
}

export interface ProminenceStyle {
  /** Opacity of the orange body */
  alpha: number;
  /** Opacity of the yellow-white core, 0 to skip it */
  hot: number;
}

const traceTongue = (
  ctx: CanvasRenderingContext2D,
  base: number,
  height: number,
  halfWidth: number,
  lean: number,
): void => {
  ctx.beginPath();
  ctx.moveTo(base, -halfWidth);
  ctx.bezierCurveTo(
    base + height * 0.55,
    -halfWidth * 0.95 + lean * 0.35,
    base + height,
    lean - halfWidth * 0.3,
    base + height,
    lean,
  );
  ctx.bezierCurveTo(
    base + height,
    lean + halfWidth * 0.3,
    base + height * 0.55,
    halfWidth * 0.95 + lean * 0.35,
    base,
    halfWidth,
  );
  ctx.closePath();
};

/**
 * Draws one prominence in local coordinates (x radial, y tangential): a translucent
 * orange tongue fading towards its tip with a brighter core inside. Shared by the
 * static corona on the wheel canvas and the animated ones on the effects layer.
 */
export const drawProminence = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  { angle, base, height, halfWidth, lean }: ProminenceShape,
  { alpha, hot }: ProminenceStyle,
): void => {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const body = ctx.createLinearGradient(base, 0, base + height, 0);
  body.addColorStop(0, `rgba(255, 150, 40, ${alpha})`);
  body.addColorStop(0.55, `rgba(255, 90, 15, ${alpha * 0.6})`);
  body.addColorStop(1, 'rgba(255, 60, 0, 0)');
  ctx.fillStyle = body;
  traceTongue(ctx, base, height, halfWidth, lean);
  ctx.fill();

  if (hot > 0) {
    const core = ctx.createLinearGradient(base, 0, base + height * 0.8, 0);
    core.addColorStop(0, `rgba(255, 240, 180, ${hot})`);
    core.addColorStop(0.5, `rgba(255, 190, 80, ${hot * 0.5})`);
    core.addColorStop(1, 'rgba(255, 150, 40, 0)');
    ctx.fillStyle = core;
    traceTongue(ctx, base, height * 0.8, halfWidth * 0.5, lean * 0.8);
    ctx.fill();
  }

  ctx.restore();
};
