/* ============================================================
   Mathly math-core: root finding
   Deterministic real-root finding:
   - polynomials: Newton's method with deflation, quadratic formula
   - general functions: sign-change scanning + bisection
   ============================================================ */

import { PolyCoeffs } from './polynomial';

/** Coeff array in standard order: arr[0] = coefficient of x^(n-1) highest degree first. */

function toArray(coeffs: PolyCoeffs): number[] {
  const deg = Math.max(...coeffs.keys());
  const arr = new Array<number>(deg + 1).fill(0);
  for (const [d, v] of coeffs) {
    if (v !== 0) arr[deg - d] = v;
  }
  return arr;
}

function evalPoly(arr: number[], x: number): number {
  let acc = 0;
  for (let i = 0; i < arr.length; i++) {
    acc = acc * x + arr[i];
  }
  return acc;
}

function deriv(arr: number[]): number[] {
  const d = arr.length - 1;
  if (d <= 0) return [0];
  const out = new Array<number>(d);
  for (let i = 0; i < d; i++) {
    out[i] = arr[i] * (d - i);
  }
  return out;
}

function deflate(arr: number[], root: number): number[] {
  const n = arr.length - 1;
  const out = new Array<number>(n).fill(0);
  out[0] = arr[0];
  for (let i = 1; i < n; i++) {
    out[i] = arr[i] + root * out[i - 1];
  }
  return out;
}

function trim(arr: number[]): number[] {
  let i = 0;
  while (i < arr.length - 1 && Math.abs(arr[i]) < 1e-14) i++;
  return arr.slice(i);
}

function newton(arr: number[], seed: number): number | null {
  const darr = deriv(arr);
  let x = seed;
  for (let i = 0; i < 200; i++) {
    const f = evalPoly(arr, x);
    if (Math.abs(f) < 1e-12 * Math.max(1, Math.abs(x))) return x;
    const fp = evalPoly(darr, x);
    if (Math.abs(fp) < 1e-300) return null;
    const nx = x - f / fp;
    if (!Number.isFinite(nx)) return null;
    if (Math.abs(nx - x) < 1e-13 * Math.max(1, Math.abs(x))) return nx;
    x = nx;
  }
  return null;
}

const NEWTON_SEEDS = [0, 1, -1, 2, -2, 0.5, -0.5, 1.5, -1.5, 3, -3, 5, -5, 10, -10, 0.25, -0.25];

/** Real roots of a polynomial, sorted ascending. Approximations validated. */
export function polyRoots(coeffs: PolyCoeffs): number[] {
  let arr = trim(toArray(coeffs));
  if (arr.length === 0) return [];
  const original = arr;
  const roots: number[] = [];

  while (arr.length >= 2) {
    const d = arr.length - 1;
    if (d === 1) {
      const r = -arr[1] / arr[0];
      if (Number.isFinite(r)) addRoot(roots, r);
      break;
    }
    if (d === 2) {
      const [a, b, c] = arr;
      const disc = b * b - 4 * a * c;
      if (disc < -1e-9) break;
      if (Math.abs(disc) < 1e-9) {
        addRoot(roots, -b / (2 * a));
      } else {
        const s = Math.sqrt(disc);
        addRoot(roots, (-b + s) / (2 * a));
        addRoot(roots, (-b - s) / (2 * a));
      }
      break;
    }
    // d >= 3 — find one real root, deflate, repeat
    const bound = 1 + Math.max(...arr.map(Math.abs)) / Math.max(Math.abs(arr[0]), 1e-300);
    const seeds = [...NEWTON_SEEDS, bound, -bound, bound / 2, -bound / 2];
    let found: number | null = null;
    for (const s of seeds) {
      found = newton(arr, s);
      if (found !== null && Number.isFinite(found)) break;
    }
    if (found === null) {
      // Fallback: scan for sign changes across a wide range
      found = scanPoly(arr, -bound, bound);
    }
    if (found === null) break;
    addRoot(roots, found);
    arr = trim(deflate(arr, found));
  }

  // Validate against the original polynomial
  const valid = roots.filter((r) => Math.abs(evalPoly(original, r)) < 1e-6 * Math.max(1, Math.abs(r)));
  const deduped: number[] = [];
  for (const r of valid) {
    if (deduped.every((x) => Math.abs(x - r) > 1e-7 * Math.max(1, Math.abs(r)))) {
      // Snap to a clean value when the numeric noise is tiny
      let snapped = Math.round(r * 1e9) / 1e9;
      if (Math.abs(snapped - Math.round(snapped)) < 1e-9) snapped = Math.round(snapped);
      deduped.push(snapped);
    }
  }
  return deduped.sort((a, b) => a - b);
}

function scanPoly(arr: number[], lo: number, hi: number): number | null {
  const steps = 400;
  let prevX = lo;
  let prevY = evalPoly(arr, lo);
  for (let i = 1; i <= steps; i++) {
    const x = lo + ((hi - lo) * i) / steps;
    const y = evalPoly(arr, x);
    if (y === 0) return x;
    if (prevY * y < 0) {
      // bisect
      let a = prevX;
      let b = x;
      for (let k = 0; k < 80; k++) {
        const m = (a + b) / 2;
        const fm = evalPoly(arr, m);
        if (Math.abs(fm) < 1e-13) return m;
        if (prevY * fm < 0) b = m;
        else {
          a = m;
          prevY = fm;
        }
      }
      return (a + b) / 2;
    }
    prevX = x;
    prevY = y;
  }
  return null;
}

function addRoot(roots: number[], r: number): void {
  if (!Number.isFinite(r)) return;
  roots.push(r);
}

/* ------------------------------------------------------------
   General (non-polynomial) root finding over an interval
   ------------------------------------------------------------ */

/**
 * Find real roots of an arbitrary continuous function on [xmin, xmax]
 * by sign-change scanning + bisection. Deterministic.
 */
export function numericRoots(
  f: (x: number) => number,
  xmin: number,
  xmax: number,
  steps = 320
): number[] {
  const roots: number[] = [];
  if (xmax <= xmin || !Number.isFinite(xmin) || !Number.isFinite(xmax)) return roots;
  let prevX = xmin;
  let prevY = f(xmin);
  for (let i = 1; i <= steps; i++) {
    const x = xmin + ((xmax - xmin) * i) / steps;
    const y = f(x);
    if (y === 0 && Number.isFinite(y)) {
      roots.push(x);
    } else if (Number.isFinite(prevY) && Number.isFinite(y) && prevY * y < 0) {
      let a = prevX;
      let b = x;
      let fa = prevY;
      for (let k = 0; k < 90; k++) {
        const m = (a + b) / 2;
        const fm = f(m);
        if (!Number.isFinite(fm)) break;
        if (Math.abs(fm) < 1e-10) {
          roots.push(m);
          break;
        }
        if (fa * fm < 0) b = m;
        else {
          a = m;
          fa = fm;
        }
      }
      if (roots.length === 0 || Math.abs(roots[roots.length - 1] - (a + b) / 2) > 1e-9) {
        const mid = (a + b) / 2;
        const fmid = f(mid);
        if (Number.isFinite(fmid) && Math.abs(fmid) < 1e-6) roots.push(mid);
      }
    }
    prevX = x;
    prevY = y;
  }
  const deduped: number[] = [];
  for (const r of roots) {
    if (deduped.every((x) => Math.abs(x - r) > 1e-8)) deduped.push(r);
  }
  return deduped.sort((a, b) => a - b);
}