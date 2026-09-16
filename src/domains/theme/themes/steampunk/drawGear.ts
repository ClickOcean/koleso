/**
 * Traces a spur gear outline (teeth included) as the current path, centred on
 * (cx, cy). The caller fills or strokes it. Radii are in canvas pixels.
 */
export const traceGear = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  tipRadius: number,
  rootRadius: number,
  teeth: number,
  rotation = 0,
): void => {
  const step = (2 * Math.PI) / teeth;
  const flank = step * 0.27;
  const crest = step * 0.14;

  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const angle = rotation + i * step;
    const corners: [number, number][] = [
      [rootRadius, angle - flank],
      [tipRadius, angle - crest],
      [tipRadius, angle + crest],
      [rootRadius, angle + flank],
    ];

    corners.forEach(([radius, cornerAngle], index) => {
      const x = cx + Math.cos(cornerAngle) * radius;
      const y = cy + Math.sin(cornerAngle) * radius;
      if (i === 0 && index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.arc(cx, cy, rootRadius, angle + flank, angle + step - flank);
  }
  ctx.closePath();
};
