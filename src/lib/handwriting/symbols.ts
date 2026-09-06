/* ============================================================
   Handwriting symbol templates + elastic (DTW) matcher.
   Deterministic, dependency-free. Each supported symbol has one
   or more idealized polyline drawings; a written stroke is
   normalized and elastically matched against every template.
   ============================================================ */

export interface Pt {
  x: number;
  y: number;
}

export interface SymbolTemplate {
  id: string;
  points: Pt[];
}

/** Resample a polyline to exactly n equidistant points. */
export function resamplePolyline(points: Pt[], n = 26): Pt[] {
  if (points.length < 2) return points.slice();
  let total = 0;
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i]);
  if (total < 1e-6) return points.slice();
  const out: Pt[] = [points[0]];
  const step = total / (n - 1);
  let acc = 0;
  let i = 0;
  for (let t = step; t < total - step / 2 && i < points.length - 1; t += step) {
    while (i < points.length - 2 && acc + dist(points[i], points[i + 1]) < t) {
      acc += dist(points[i], points[i + 1]);
      i++;
    }
    const a = points[i];
    const b = points[i + 1];
    const seg = dist(a, b);
    const f = seg > 0 ? (t - acc) / seg : 0;
    out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
  }
  out.push(points[points.length - 1]);
  return out;
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function bbox(points: Pt[]): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Affine-normalize a polyline: translate so its bbox starts at origin,
 * then scale so the LARGER dimension becomes 1 (aspect ratio preserved).
 */
export function normalizePolyline(points: Pt[]): Pt[] {
  if (points.length === 0) return points;
  const bb = bbox(points);
  const w = Math.max(1e-6, bb.maxX - bb.minX);
  const h = Math.max(1e-6, bb.maxY - bb.minY);
  const s = Math.max(w, h);
  return points.map((p) => ({
    x: (p.x - bb.minX) / s,
    y: (p.y - bb.minY) / s,
  }));
}

/** Total absolute turning of a polyline (radians) after normalization. */
export function totalTurning(points: Pt[]): number {
  let turn = 0;
  for (let i = 2; i < points.length; i++) {
    const a = Math.atan2(points[i - 1].y - points[i - 2].y, points[i - 1].x - points[i - 2].x);
    const b = Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x);
    let d = b - a;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    turn += Math.abs(d);
  }
  return turn;
}

/** Dynamic Time Warping distance between two equal-length normalized sequences. */
export function dtw(a: Pt[], b: Pt[]): number {
  const n = a.length;
  const m = b.length;
  let prevRow = new Array<number>(m + 1).fill(Infinity);
  let curRow = new Array<number>(m + 1).fill(Infinity);
  prevRow[0] = 0;
  for (let i = 0; i < n; i++) {
    curRow[0] = Infinity;
    for (let j = 0; j < m; j++) {
      curRow[j + 1] = dist(a[i], b[j]) + Math.min(prevRow[j], prevRow[j + 1], curRow[j]);
    }
    const tmp = prevRow;
    prevRow = curRow;
    curRow = tmp;
  }
  return prevRow[m] / Math.max(1, n);
}

/* ------------------------------------------------------------------ */
/* Idealized drawings (single continuous strokes, natural aspect kept).*/
/* Coordinate space: y down, height ≈ 1, width implied by the glyph.   */
/* ------------------------------------------------------------------ */

function seg(pts: [number, number][]): Pt[] {
  return pts.map(([x, y]) => ({ x, y }));
}

/** Closed ellipse path. */
function ellipse(cx: number, cy: number, rx: number, ry: number, steps = 22): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    out.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(-a) });
  }
  return out;
}

const T = (label: string, points: Pt[]): SymbolTemplate => ({ id: label, points });

export const SINGLE_STROKE_TEMPLATES: SymbolTemplate[] = [
  // ---- digits ----
  T('0', ellipse(0.5, 0.5, 0.32, 0.46)),
  T('1', seg([[0.62, 0], [0.5, 0.12], [0.45, 0.4], [0.43, 0.98]])),
  T('2', seg([[0.5, 0], [0.7, 0.02], [0.82, 0.14], [0.78, 0.28], [0.62, 0.5], [0.32, 0.82], [0.24, 0.98], [0.88, 0.98]])),
  T('3', seg([[0.25, 0], [0.58, 0.02], [0.8, 0.18], [0.62, 0.44], [0.3, 0.5], [0.72, 0.62], [0.82, 0.82], [0.6, 0.98], [0.28, 0.96]])),
  T('4', seg([[0.55, 0.12], [0.62, 0], [0.18, 0.58], [0.5, 0.98]])),
  T('5', seg([[0.78, 0.02], [0.3, 0.02], [0.18, 0.38], [0.24, 0.6], [0.48, 0.52], [0.68, 0.62], [0.64, 0.88], [0.4, 0.98], [0.2, 0.84]])),
  T('6', seg([[0.82, 0.3], [0.7, 0.08], [0.42, 0.02], [0.22, 0.22], [0.24, 0.55], [0.34, 0.82], [0.6, 0.98], [0.8, 0.78], [0.7, 0.5], [0.3, 0.56]])),
  T('7', seg([[0.2, 0.05], [0.8, 0.05], [0.5, 0.6], [0.46, 0.98]])),
  T('8', seg([[0.5, 0], [0.78, 0.1], [0.78, 0.4], [0.5, 0.5], [0.22, 0.6], [0.22, 0.9], [0.5, 1], [0.78, 0.86], [0.68, 0.55]])),
  T('9', seg([[0.3, 0.55], [0.28, 0.25], [0.45, 0.05], [0.72, 0.18], [0.78, 0.48], [0.6, 0.78], [0.33, 0.62], [0.35, 0.98], [0.5, 1]])),
  // ---- letters useful in equations ----
  T('y', seg([[0.15, 0.02], [0.45, 0.55], [0.85, 0.02], [0.86, 0.15], [0.5, 0.7], [0.42, 0.98], [0.22, 0.9]])),
  T('z', seg([[0.2, 0.05], [0.8, 0.05], [0.3, 0.95], [0.82, 0.95]])),
  // ---- operators & brackets (drawn as a single fluent stroke) ----
  T('-', seg([[0.1, 0.5], [0.9, 0.5]])),
  T('(', seg([[0.3, 0], [0.14, 0.25], [0.14, 0.75], [0.3, 1]])),
  T(')', seg([[0.7, 0], [0.86, 0.25], [0.86, 0.75], [0.7, 1]])),
  T('√', seg([[0.06, 0.62], [0.32, 0.16], [0.46, 0.52], [0.98, 0.2]])),
];

/** Normalized, resampled template polyline (cached). */
const templateCache = new Map<string, Pt[]>();
export function normalizedTemplate(t: SymbolTemplate): Pt[] {
  let hit = templateCache.get(t.id);
  if (!hit) {
    hit = resamplePolyline(normalizePolyline(t.points), 26);
    templateCache.set(t.id, hit);
  }
  return hit;
}