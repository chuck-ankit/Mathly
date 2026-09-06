/* ============================================================
   Mathly math-core: number formatting
   ============================================================ */

/**
 * Format a number compactly: integers stay integers, decimals are
 * trimmed to at most `maxDigits` significant digits.
 */
export function formatNumber(n: number, maxDigits = 6): string {
  if (!Number.isFinite(n)) {
    if (Number.isNaN(n)) return 'undefined';
    return n > 0 ? '∞' : '−∞';
  }
  if (n === 0) return '0';
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toString();

  const abs = Math.abs(n);
  if (abs >= 1e9 || abs < 1e-6) {
    return n.toExponential(Math.min(maxDigits - 1, 4)).replace('e+', '×10^');
  }
  const rounded = Number(n.toPrecision(maxDigits));
  let s = rounded.toString();
  return s;
}

/** Format with a fixed small number of decimals (for grid labels). */
export function formatGridLabel(n: number): string {
  if (!Number.isFinite(n)) return '';
  const abs = Math.abs(n);
  if (abs >= 1e6 || (abs < 1e-4 && abs > 0)) return n.toExponential(1);
  const rounded = Math.abs(n - Math.round(n)) < 1e-9 ? Math.round(n) : n;
  return String(Number(rounded.toPrecision(4)));
}

/** Turn a possibly-negative number into "−3.5" using the math minus sign. */
export function formatSigned(n: number, maxDigits = 6): string {
  const s = formatNumber(n, maxDigits);
  return s.startsWith('-') ? '−' + s.slice(1) : s;
}

/** A human-friendly label for an x-coordinate: x = 2.5 or x = −0.25 */
export function formatPointX(x: number): string {
  return `x = ${formatNumber(x)}`;
}

/** Smart rounding for coordinate pairs shown in tooltips. */
export function formatCoord(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const r = Number(n.toPrecision(5));
  return String(r);
}

export function approxEqual(a: number, b: number, tol = 1e-9): boolean {
  if (a === b) return true;
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= tol * scale;
}