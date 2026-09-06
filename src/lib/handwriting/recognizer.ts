/* ============================================================
   Deterministic handwriting recognizer.
   Groups strokes into symbols (by horizontal proximity, keeping
   small high-up strokes as separate superscripts), classifies
   each group with structural rules + elastic (DTW) template
   matching, then assembles a left-to-right expression with
   baseline-aware superscripts.

   Honest about its limits: it knows a set of common math
   symbols, and the UI says so. A future ML recognizer can
   replace it by implementing HandwritingRecognizer.
   ============================================================ */

import { HandwritingRecognizer, RecognitionResult, Stroke, StrokePoint } from './types';
import {
  SINGLE_STROKE_TEMPLATES,
  dtw,
  normalizePolyline,
  normalizedTemplate,
  resamplePolyline,
  totalTurning,
} from './symbols';

interface Pt {
  x: number;
  y: number;
}
interface SymbolGroup {
  strokes: Stroke[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function bbox(points: StrokePoint[]): { minX: number; maxX: number; minY: number; maxY: number } {
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

function pathLength(pts: Pt[]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return d;
}

const toPt = (pts: StrokePoint[]): Pt[] => pts.map((p) => ({ x: p.x, y: p.y }));
const distPt = (a: Pt, b: Pt): number => Math.hypot(b.x - a.x, b.y - a.y);

/**
 * Group strokes that belong to the same symbol.
 * Two strokes merge when their horizontal intervals touch; a small
 * stroke sitting high above a larger one is treated as a separate
 * superscript group instead of being merged in.
 */
function groupStrokes(strokes: Stroke[]): SymbolGroup[] {
  const groups: SymbolGroup[] = [];
  const tol = 6;
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
    const bb = bbox(stroke.points);
    let placed = false;
    for (const g of groups) {
      const gh = g.maxY - g.minY;
      const bh = bb.maxY - bb.minY;
      const isSuperscript = gh > 10 && bh > 0 && bh < 0.75 * gh && bb.maxY < g.maxY - 0.3 * gh;
      if (isSuperscript) continue;
      const overlapX = bb.maxX + tol >= g.minX && bb.minX - tol <= g.maxX;
      if (overlapX) {
        g.strokes.push(stroke);
        g.minX = Math.min(g.minX, bb.minX);
        g.maxX = Math.max(g.maxX, bb.maxX);
        g.minY = Math.min(g.minY, bb.minY);
        g.maxY = Math.max(g.maxY, bb.maxY);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push({ strokes: [stroke], ...bb });
    }
  }
  return groups;
}

interface Features {
  width: number;
  height: number;
  aspect: number;
  dx: number;
  dy: number;
  turn: number;
  corners: number;
  len: number;
  straight: boolean;
  horiz: boolean;
  vert: boolean;
  diag: boolean;
  closed: boolean;
}

function features(pts: StrokePoint[]): Features {
  const pts2 = toPt(pts);
  const bb = bbox(pts);
  const width = Math.max(1, bb.maxX - bb.minX);
  const height = Math.max(1, bb.maxY - bb.minY);
  const turn = totalTurning(pts2);
  const len = pathLength(pts2);
  const first = pts[0];
  const last = pts[pts.length - 1];

  let corners = 0;
  for (let i = 2; i < pts.length; i++) {
    const a = Math.atan2(pts[i - 1].y - pts[i - 2].y, pts[i - 1].x - pts[i - 2].x);
    const b = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
    let d = b - a;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    if (Math.abs(d) > 1.2) corners++;
  }

  return {
    width,
    height,
    aspect: width / height,
    dx: last.x - first.x,
    dy: last.y - first.y,
    turn,
    corners,
    len,
    straight: turn < 0.9,
    horiz: turn < 0.9 && width > height * 1.8,
    vert: turn < 0.9 && height > width * 1.8,
    diag: turn < 0.8 && width >= height * 0.55 && width <= height * 1.8,
    closed: distPt({ x: first.x, y: first.y }, { x: last.x, y: last.y }) < 0.35 * Math.max(width, height),
  };
}

/** Ends of a stroke sit near its top (a check or V shape). */
function endsUp(points: StrokePoint[], maxY: number): boolean {
  const f = points[0];
  const l = points[points.length - 1];
  return f.y <= maxY && l.y <= maxY;
}

function featuresOf(stroke: Stroke): Features {
  return features(stroke.points);
}

/** Classic one-stroke classifier: structural fast paths, then DTW. */
function classifySingle(points: StrokePoint[]): { symbol: string; score: number } | null {
  if (points.length < 2) return null;
  const f = features(points);
  if (f.len < 18) return f.len < 12 ? { symbol: '.', score: 0.4 } : null;

  // Scribble gate: wild wiggles can't be any useful template.
  if (f.turn > 20) return null;

  if (f.closed) {
    if (f.turn >= 3) return { symbol: '0', score: 0.75 };
    return { symbol: '0', score: 0.6 };
  }
  if (f.horiz) return { symbol: '−', score: 0.88 };
  if (f.vert) return { symbol: '1', score: 0.8 };
  if (f.diag) return { symbol: '/', score: 0.7 };

  // Sharp two-kink zigzag that ends pointing right → z
  // (5 also has two kinks but its last segment points left)
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const ldx = last.x - prev.x;
  const ldy = last.y - prev.y;
  const endsRight = ldx > 0 && Math.abs(ldy) <= Math.abs(ldx) * 1.2;
  if (endsRight && f.corners >= 2 && f.turn >= 2.5 && f.turn <= 6.5 && f.aspect < 1.3) {
    return { symbol: 'z', score: 0.6 };
  }

  // Elastic template matching.
  const normPoints = resamplePolyline(normalizePolyline(toPt(points)), 26);
  if (normPoints.length < 4) return null;
  let best = '?';
  let bestDist = Infinity;
  for (const t of SINGLE_STROKE_TEMPLATES) {
    const d = dtw(normPoints, normalizedTemplate(t));
    if (d < bestDist) {
      bestDist = d;
      best = t.id;
    }
  }
  if (bestDist < 0.34) {
    return { symbol: best, score: Math.min(0.9, Math.max(0.5, 0.85 - bestDist * 2)) };
  }
  return null;
}

function isCheck(s: Stroke): boolean {
  const f = featuresOf(s);
  const bb = bbox(s.points);
  return f.len >= 18 && f.corners === 1 && f.turn >= 0.8 && f.turn <= 3.6 && f.width >= f.height * 0.7 && endsUp(s.points, bb.maxY);
}

function isV(s: Stroke): boolean {
  const f = featuresOf(s);
  const bb = bbox(s.points);
  return f.len >= 18 && f.corners === 1 && f.turn >= 1.5 && f.turn <= 4.6 && f.width >= f.height * 0.7 && endsUp(s.points, bb.maxY);
}

function isDescender(s: Stroke, above: Stroke): boolean {
  const f = featuresOf(s);
  const g = featuresOf(above);
  const sBottom = bbox(s.points).maxY;
  return !f.horiz && f.len >= 1 && sBottom >= bbox(above.points).maxY - g.height * 0.1;
}

function classifyGroup(group: SymbolGroup): { symbol: string; score: number } | null {
  const n = group.strokes.length;
  if (n === 0) return null;

  if (n === 1) return classifySingle(group.strokes[0].points);

  const fs = group.strokes.map((s) => featuresOf(s));

  // All flat stacked horizontals: = (2+) 
  if (fs.every((f) => f.horiz)) {
    return { symbol: '=', score: 0.85 };
  }

  if (n === 2) {
    const [a, b] = group.strokes;
    const [fa, fb] = fs;
    // Two crossing diagonals → x
    if (fa.diag && fb.diag && Math.sign(fa.dx) !== Math.sign(fb.dx)) {
      return { symbol: 'x', score: 0.8 };
    }
    // Vertical + horizontal → +
    if ((fa.vert && fb.horiz) || (fa.horiz && fb.vert)) {
      return { symbol: '+', score: 0.7 };
    }
    // Vertical + diagonal → 4
    if ((fa.vert && fb.diag) || (fa.diag && fb.vert)) {
      return { symbol: '4', score: 0.5 };
    }
    // Check + overbar → √
    if ((isCheck(a) && fb.horiz) || (isCheck(b) && fa.horiz)) {
      return { symbol: '√', score: 0.6 };
    }
    // Closed loop + horizontal bar → θ
    const loop = fa.closed ? a : fb.closed ? b : null;
    const bar = fa.horiz ? a : fb.horiz ? b : null;
    if (loop && bar) {
      const lb = bbox(loop.points);
      const bb2 = bbox(bar.points);
      if (bb2.minY <= lb.minY + (lb.maxY - lb.minY) * 0.6) {
        return { symbol: 'θ', score: 0.5 };
      }
    }
    // V + descender → y
    if ((isV(a) && isDescender(b, a)) || (isV(b) && isDescender(a, b))) {
      return { symbol: 'y', score: 0.55 };
    }
    return null;
  }

  // Three+ strokes
  const flats = group.strokes.filter((s) => featuresOf(s).horiz);
  const flatCount = flats.length;
  const others = group.strokes.filter((s) => !featuresOf(s).horiz);

  // ÷ : one horizontal with dots above/below
  if (flatCount === 1 && others.length >= 1) {
    const bar = flats[0];
    const barBb = bbox(bar.points);
    const dots = others.filter((s) => {
      const f = featuresOf(s);
      if (f.len >= 18) return false;
      const sb = bbox(s.points);
      return sb.maxY < barBb.minY || sb.minY > barBb.maxY;
    });
    if (dots.length >= 1) {
      return { symbol: '÷', score: 0.55 };
    }
  }

  // π : one horizontal bar with two hanging legs below
  if (flatCount === 1) {
    const bar = flats[0];
    const barBb = bbox(bar.points);
    const legs = others.filter((s) => {
      const f = featuresOf(s);
      const sb = bbox(s.points);
      const legH = Math.max(1, sb.maxY - sb.minY);
      return f.vert && sb.maxY > barBb.maxY && sb.minY < barBb.maxY + Math.max(6, 0.3 * legH);
    });
    if (legs.length >= 2) {
      return { symbol: 'π', score: 0.5 };
    }
  }

  return null;
}

/** Superscript variants the tokenizer accepts as powers. */
const SUPER_MAIN: Record<string, string> = {};
const SUPER_DIGITS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
for (let i = 0; i <= 9; i++) SUPER_MAIN[String(i)] = SUPER_DIGITS[i];
SUPER_MAIN['+'] = '⁺';
SUPER_MAIN['−'] = '⁻';
SUPER_MAIN['-'] = '⁻';
SUPER_MAIN['='] = '⁼';
SUPER_MAIN['('] = '⁽';
SUPER_MAIN[')'] = '⁾';

function superscriptOf(symbol: string): string {
  return SUPER_MAIN[symbol] ?? `^${symbol}`;
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export class DemoHandwritingRecognizer implements HandwritingRecognizer {
  readonly id = 'demo-template-dtw';
  readonly name = 'Built-in symbolic recognizer';
  readonly description =
    'Recognizes digits 0–9, letters x, y, z, and symbols + − = / × √ π θ ÷ ( ) with superscripts like x². ' +
    'Draw each symbol with a little space between them, and draw x as two crossing strokes. ' +
    'Confidence is honest — double-check results before graphing.';

  async recognize(strokes: Stroke[]): Promise<RecognitionResult> {
    if (strokes.length === 0) {
      return {
        expression: '',
        confidence: 0,
        notes: 'Draw an expression first, then press Recognize.',
      };
    }

    const groups = groupStrokes(strokes).sort((a, b) => a.minX - b.minX);
    const classified = groups.map((g) => ({ group: g, result: classifyGroup(g) }));

    const recognized = classified.filter((c) => c.result);
    const baseline = recognized.length
      ? median(recognized.map((c) => c.group.maxY))
      : 0;
    const refHeight = recognized.length
      ? median(recognized.map((c) => c.group.maxY - c.group.minY))
      : 0;

    let expression = '';
    let minScore = 1;
    for (const c of classified) {
      if (!c.result) {
        expression += '?';
        minScore = 0;
        continue;
      }
      const h = c.group.maxY - c.group.minY;
      const isSuper =
        refHeight > 0 && h >= 0.5 * refHeight && baseline - c.group.maxY > 0.28 * refHeight && h < 0.85 * refHeight;
      expression += isSuper ? superscriptOf(c.result.symbol) : c.result.symbol;
      minScore = Math.min(minScore, c.result.score);
    }

    const failed = groups.length - recognized.length;
    const notes =
      failed === 0
        ? 'Recognized symbol-by-symbol. Leave space between symbols for the best results.'
        : `The built-in recognizer couldn't classify ${failed} of ${groups.length} symbol${groups.length === 1 ? '' : 's'} — try redrawing with more space between symbols.`;

    return { expression, confidence: minScore, notes };
  }
}

/** Recognizers available to the app. Swap/register new ML models here. */
export const RECOGNIZERS: HandwritingRecognizer[] = [new DemoHandwritingRecognizer()];