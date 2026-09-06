/* ============================================================
   Graph viewport helpers: data ↔ screen transforms, zoom/pan,
   nice grid steps.
   ============================================================ */

import { Viewport } from '../math/sample';

export interface ScreenBox {
  width: number;
  height: number;
}

export function viewportFromCenter(
  cx: number,
  cy: number,
  unitsPerPixelX: number,
  width: number,
  height: number
): Viewport {
  const halfW = (unitsPerPixelX * width) / 2;
  const halfH = (unitsPerPixelX * height) / 2;
  return { xmin: cx - halfW, xmax: cx + halfW, ymin: cy - halfH, ymax: cy + halfH };
}

export const DEFAULT_VIEWPORT: Viewport = { xmin: -10, xmax: 10, ymin: -7, ymax: 7 };

export function dataToScreen(vp: Viewport, box: ScreenBox, x: number, y: number): { sx: number; sy: number } {
  const sx = ((x - vp.xmin) / (vp.xmax - vp.xmin)) * box.width;
  const sy = box.height - ((y - vp.ymin) / (vp.ymax - vp.ymin)) * box.height;
  return { sx, sy };
}

export function screenToData(vp: Viewport, box: ScreenBox, sx: number, sy: number): { x: number; y: number } {
  const x = vp.xmin + (sx / box.width) * (vp.xmax - vp.xmin);
  const y = vp.ymin + ((box.height - sy) / box.height) * (vp.ymax - vp.ymin);
  return { x, y };
}

/** Zoom the viewport by `factor` keeping the point (fx, fy) in data coords fixed. */
export function zoomViewport(vp: Viewport, factor: number, fx: number, fy: number): Viewport {
  const cx = (vp.xmin + vp.xmax) / 2;
  const cy = (vp.ymin + vp.ymax) / 2;
  const newCx = fx - (fx - cx) * factor;
  const newCy = fy - (fy - cy) * factor;
  const halfW = ((vp.xmax - vp.xmin) * factor) / 2;
  const halfH = ((vp.ymax - vp.ymin) * factor) / 2;
  return {
    xmin: newCx - halfW,
    xmax: newCx + halfW,
    ymin: newCy - halfH,
    ymax: newCy + halfH,
  };
}

export function panViewport(vp: Viewport, dxPx: number, dyPx: number, box: ScreenBox): Viewport {
  const dx = (-dxPx / box.width) * (vp.xmax - vp.xmin);
  const dy = (dyPx / box.height) * (vp.ymax - vp.ymin);
  return { xmin: vp.xmin + dx, xmax: vp.xmax + dx, ymin: vp.ymin + dy, ymax: vp.ymax + dy };
}

/** A nice step for grid lines: 1, 2, 2.5, 5 × 10^k. */
export function niceStep(raw: number): number {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = raw / Math.pow(10, exp);
  let nice: number;
  if (base <= 1) nice = 1;
  else if (base <= 2) nice = 2;
  else if (base <= 2.5) nice = 2.5;
  else if (base <= 5) nice = 5;
  else nice = 10;
  return nice * Math.pow(10, exp);
}

/** Choose grid step so lines are roughly `targetPx` apart. */
export function gridStep(vp: Viewport, box: ScreenBox, targetPx = 76): number {
  const unitsPerPx = (vp.xmax - vp.xmin) / box.width;
  return niceStep(unitsPerPx * targetPx);
}