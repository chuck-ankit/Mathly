import { describe, expect, it } from 'vitest';
import { sampleCurve, makeEvaluator, Viewport } from '../sample';
import { parse } from '../parser';

const vp: Viewport = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };

const sample = (input: string, viewport: Viewport = vp) => {
  const f = makeEvaluator(parse(input).expression);
  return sampleCurve(f, viewport);
};

const allPoints = (segs: ReturnType<typeof sampleCurve>) => segs.flatMap((s) => s.points);

describe('sampler: discontinuity handling', () => {
  it('does not connect the two branches of 1/x across x=0', () => {
    const segs = sample('y = 1/x');
    expect(segs.length).toBeGreaterThanOrEqual(2);
    for (const seg of segs) {
      const xs = seg.points.map((p) => p.x);
      const allNeg = xs.every((x) => x < 0);
      const allPos = xs.every((x) => x > 0);
      expect(allNeg || allPos).toBe(true);
    }
  });

  it('does not draw a line through the asymptote of tan(x) at π/2', () => {
    const segs = sample('y = tan(x)');
    expect(segs.length).toBeGreaterThanOrEqual(2);
    for (const seg of segs) {
      const xs = seg.points.map((p) => p.x);
      const lo = Math.min(...xs);
      const hi = Math.max(...xs);
      expect(lo < Math.PI / 2 && hi > Math.PI / 2).toBe(false);
    }
  });

  it('handles y = 1/(x-2) with a gap at x=2', () => {
    const segs = sample('y = 1/(x-2)');
    for (const seg of segs) {
      const xs = seg.points.map((p) => p.x);
      const lo = Math.min(...xs);
      const hi = Math.max(...xs);
      expect(lo < 2 && hi > 2).toBe(false);
    }
  });
});

describe('sampler: accuracy', () => {
  it('samples y = x² closely', () => {
    const segs = sample('y = x²', { xmin: -2, xmax: 2, ymin: -1, ymax: 5 });
    const pts = allPoints(segs);
    expect(pts.length).toBeGreaterThan(50);
    for (const p of pts) {
      expect(Math.abs(p.y - p.x * p.x)).toBeLessThan(0.05);
    }
  });

  it('resolves sin(100x) without aliasing', () => {
    const f = makeEvaluator(parse('y = sin(100x)').expression);
    const segs = sampleCurve(f, { xmin: -3, xmax: 3, ymin: -2, ymax: 2 });
    const pts = allPoints(segs);
    // Must have far more points than naive sampling to capture oscillation
    expect(pts.length).toBeGreaterThan(2000);
    for (const p of pts) {
      expect(Math.abs(p.y - Math.sin(100 * p.x))).toBeLessThan(0.05);
    }
  });

  it('captures the steep rise of x^10', () => {
    const segs = sample('y = x^10', { xmin: -1.2, xmax: 1.2, ymin: -1, ymax: 2 });
    const pts = allPoints(segs);
    expect(pts.length).toBeGreaterThan(100);
    const nearEdge = pts.filter((p) => Math.abs(p.x) > 1);
    expect(nearEdge.length).toBeGreaterThan(20);
  });
});

describe('sampler: domain boundaries', () => {
  it('produces no points for sqrt(x) left of 0', () => {
    const segs = sample('y = sqrt(x)', { xmin: -10, xmax: -1, ymin: -10, ymax: 10 });
    expect(segs).toHaveLength(0);
  });
  it('produces points only for x ≥ 0 for sqrt(x)', () => {
    const segs = sample('y = sqrt(x)');
    for (const p of allPoints(segs)) {
      expect(p.x).toBeGreaterThanOrEqual(0);
    }
  });
});