/* ============================================================
   Mathly math-core: graph sampler
   Adaptive sampling that:
   - splits curves at discontinuities / asymptotes (1/x, tan(x))
   - refines where the curve bends (sin(100x), x^10)
   - never draws a line across a gap
   ============================================================ */

import { EvalContext, MathNode } from './types';
import { evaluate } from './evaluator';

export interface Viewport {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

export interface CurveSegment {
  points: { x: number; y: number }[];
}

export interface SampleOptions {
  /** Vertical jump (in data units) that signals a discontinuity. */
  jumpFactor?: number;
  /** Max refinement depth. */
  maxDepth?: number;
  /** Cap on total sampled points. */
  maxPoints?: number;
}

const MAX_Y = 1e7; // clamp to avoid canvas overflow at asymptotes

/** Build a fast evaluator closure for an expression. */
export function makeEvaluator(ast: MathNode, params: Record<string, number> = {}): (x: number) => number {
  const ctx: EvalContext = { x: 0, params };
  return (x: number) => {
    ctx.x = x;
    return evaluate(ast, ctx);
  };
}

const clampY = (y: number): number => {
  if (Number.isNaN(y)) return y;
  if (y > MAX_Y) return MAX_Y;
  if (y < -MAX_Y) return -MAX_Y;
  return y;
};

/**
 * Sample f over the x-range of the viewport, returning one or more
 * polyline segments. Segments are split at discontinuities.
 */
export function sampleCurve(
  f: (x: number) => number,
  viewport: Viewport,
  opts: SampleOptions = {}
): CurveSegment[] {
  const { xmin, xmax } = viewport;
  const width = xmax - xmin;
  const height = Math.max(1e-12, viewport.ymax - viewport.ymin);
  if (!(width > 0) || !Number.isFinite(width)) return [];

  const jumpFactor = opts.jumpFactor ?? 8;
  // Point budgets are chosen for screen resolution: a 1200px-wide canvas
  // needs well under ~25k points; anything more is pure CPU/GC burn.
  const maxDepth = opts.maxDepth ?? 12;
  const maxPoints = opts.maxPoints ?? 25_000;

  const baseN = Math.min(1200, Math.max(300, Math.round(width / 0.02)));
  const step = width / baseN;

  const tol = height * 0.002;
  const jumpThreshold = jumpFactor * height;

  const segments: CurveSegment[] = [];
  let budget = maxPoints;

  // Evaluate base samples
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= baseN; i++) {
    const x = xmin + i * step;
    xs.push(x);
    ys.push(clampY(f(x)));
  }

  const emit = (pts: { x: number; y: number }[]): void => {
    if (pts.length >= 2) segments.push({ points: pts });
  };

  const refine = (x0: number, y0: number, x1: number, y1: number, depth: number): void => {
    if (budget <= 0) {
      emit([{ x: x0, y: y0 }, { x: x1, y: y1 }]);
      return;
    }
    const xm = (x0 + x1) / 2;
    const ym = clampY(f(xm));
    budget--;

    const midpointInvalid = !Number.isFinite(ym);
    const jump = Math.abs(y1 - y0);

    if (midpointInvalid) {
      // Gap — emit the two sides as separate segments
      emit([{ x: x0, y: y0 }]);
      emit([{ x: x1, y: y1 }]);
      return;
    }

    const err = Math.abs(ym - (y0 + y1) / 2);
    const isBad = !Number.isFinite(y0) || !Number.isFinite(y1);

    if (!isBad && err > tol && depth < maxDepth) {
      refine(x0, y0, xm, ym, depth + 1);
      refine(xm, ym, x1, y1, depth + 1);
      return;
    }
    if (jump > jumpThreshold || isBad) {
      emit([{ x: x0, y: y0 }]);
      emit([{ x: x1, y: y1 }]);
      return;
    }
    emit([{ x: x0, y: y0 }, { x: x1, y: y1 }]);
  };

  // Walk base samples, treating non-finite values as segment breaks
  let i = 0;
  while (i < baseN) {
    if (!Number.isFinite(ys[i])) {
      i++;
      continue;
    }
    // Start a run from i; find the end
    let j = i;
    while (j < baseN && Number.isFinite(ys[j + 1])) j++;
    // Refine the run [i, j]
    for (let k = i; k < j; k++) {
      refine(xs[k], ys[k], xs[k + 1], ys[k + 1], 0);
    }
    i = j + 1;
  }

  return segments;
}

/**
 * Sample with a guaranteed minimum x-resolution — used for tiny
 * preview thumbnails where adaptive detail isn't needed.
 */
export function sampleCurveFixed(
  f: (x: number) => number,
  xmin: number,
  xmax: number,
  count: number
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const step = (xmax - xmin) / (count - 1);
  for (let i = 0; i < count; i++) {
    const x = xmin + i * step;
    const y = clampY(f(x));
    if (Number.isFinite(y)) pts.push({ x, y });
  }
  return pts;
}