import { describe, expect, it } from 'vitest';
import { DemoHandwritingRecognizer } from '../recognizer';
import { Stroke } from '../types';

const rec = new DemoHandwritingRecognizer();

function stroke(points: [number, number][]): Stroke {
  return {
    id: Math.random(),
    points: points.map(([x, y]) => ({ x, y, t: 0 })),
  };
}

function line(x1: number, y1: number, x2: number, y2: number, n = 20): Stroke {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    pts.push([x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n]);
  }
  return stroke(pts);
}

async function expression(strokes: Stroke[]): Promise<string> {
  const r = await rec.recognize(strokes);
  return r.expression;
}

describe('demo recognizer — structural symbols', () => {
  it('recognizes a horizontal line as minus', async () => {
    expect(await expression([line(0, 10, 60, 10)])).toBe('−');
  });

  it('recognizes a vertical line as 1', async () => {
    expect(await expression([line(30, 0, 30, 60)])).toBe('1');
  });

  it('recognizes two stacked horizontals as =', async () => {
    expect(await expression([line(0, 10, 60, 10), line(0, 40, 60, 40)])).toBe('=');
  });

  it('recognizes two crossing diagonals as x', async () => {
    expect(await expression([line(0, 0, 60, 60), line(60, 0, 0, 60)])).toBe('x');
  });

  it('recognizes a vertical + horizontal as +', async () => {
    expect(await expression([line(30, 0, 30, 60), line(0, 30, 60, 30)])).toBe('+');
  });

  it('recognizes 4 as vertical + diagonal', async () => {
    expect(await expression([line(20, 10, 20, 70), line(20, 45, 55, 75)])).toBe('4');
  });

  it('recognizes y as a V plus a descender', async () => {
    expect(await expression([stroke([[15, 10], [45, 55], [80, 12]]), stroke([[50, 55], [45, 95], [30, 88]])])).toBe('y');
  });

  it('recognizes square root as a check plus an overbar', async () => {
    expect(await expression([stroke([[8, 55], [35, 18], [56, 48]]), line(50, 20, 95, 20)])).toBe('√');
  });

  it('recognizes pi as a bar with two legs', async () => {
    expect(
      await expression([line(20, 15, 60, 15), line(25, 20, 25, 60), line(50, 20, 50, 60)]),
    ).toBe('π');
  });

  it('recognizes division as a line with dots', async () => {
    expect(
      await expression([
        line(15, 45, 45, 45),
        stroke([[30, 18], [33, 21]]),
        stroke([[30, 70], [33, 73]]),
      ]),
    ).toBe('÷');
  });
});

describe('demo recognizer — template digits and letters', () => {
  it('recognizes 2', async () => {
    expect(
      await expression([
        stroke([[30, 6], [45, 4], [58, 10], [60, 26], [52, 42], [38, 55], [24, 70], [20, 82], [22, 92], [48, 94], [60, 86]]),
      ]),
    ).toBe('2');
  });

  it('recognizes 3', async () => {
    expect(
      await expression([
        stroke([[22, 8], [46, 6], [60, 18], [58, 32], [44, 42], [26, 46], [38, 54], [56, 62], [58, 78], [46, 92], [22, 90]]),
      ]),
    ).toBe('3');
  });

  it('recognizes 5', async () => {
    expect(
      await expression([
        stroke([[55, 8], [20, 10], [14, 34], [30, 44], [52, 48], [58, 62], [52, 86], [34, 94], [16, 84]]),
      ]),
    ).toBe('5');
  });

  it('recognizes 6', async () => {
    expect(
      await expression([
        stroke([[58, 28], [48, 12], [30, 8], [16, 22], [18, 48], [28, 74], [44, 90], [62, 84], [62, 60], [50, 52], [24, 54]]),
      ]),
    ).toBe('6');
  });

  it('recognizes 7', async () => {
    expect(await expression([stroke([[18, 10], [62, 6], [40, 58], [38, 94]])])).toBe('7');
  });

  it('recognizes 8', async () => {
    expect(
      await expression([
        stroke([[48, 6], [72, 20], [72, 42], [52, 50], [30, 56], [28, 80], [48, 94], [70, 80], [64, 52]]),
      ]),
    ).toBe('8');
  });

  it('recognizes 9', async () => {
    expect(
      await expression([
        stroke([[26, 58], [26, 28], [42, 6], [64, 20], [68, 48], [52, 74], [32, 62], [34, 92], [48, 96]]),
      ]),
    ).toBe('9');
  });

  it('recognizes a single-stroke z', async () => {
    expect(await expression([stroke([[20, 8], [60, 6], [22, 92], [58, 95]])])).toBe('z');
  });

  it('recognizes a single-stroke y', async () => {
    expect(
      await expression([stroke([[10, 5], [30, 45], [55, 5], [56, 16], [30, 58], [26, 92], [14, 86]])]),
    ).toBe('y');
  });
});

describe('demo recognizer — layout and assembly', () => {
  it('returns empty for no strokes', async () => {
    expect(await expression([])).toBe('');
  });

  it('is honest about low confidence for unknown shapes', async () => {
    const pts: [number, number][] = [];
    for (let i = 0; i < 40; i++) {
      pts.push([Math.sin(i * 1.3) * 30 + 30 + i, Math.cos(i * 0.7) * 30 + 30]);
    }
    const r = await rec.recognize([stroke(pts)]);
    expect(r.confidence).toBeLessThanOrEqual(0.2);
    expect(r.expression).toContain('?');
  });

  it('separates two distant symbols', async () => {
    const s1 = line(0, 10, 60, 10); // minus
    const s2 = line(140, 10, 140, 60); // 1
    const r = await rec.recognize([s1, s2]);
    expect(r.expression).toContain('−');
    expect(r.expression).toContain('1');
  });

  it('turns a small high 2 into a superscript x²', async () => {
    // The small 2 is a scaled-down copy of the "recognizes 2" shape, drawn up high.
    const r = await rec.recognize([
      line(0, 12, 50, 62),
      line(50, 12, 0, 62),
      stroke([
        [51, 2.6], [55.5, 2], [59.4, 3.8], [60, 8.6], [57.6, 13.4],
        [53.4, 17.3], [49.2, 21.8], [48, 25.4], [48.6, 28.4], [56.4, 29], [60, 26.6],
      ]),
    ]);
    expect(r.expression).toBe('x²');
  });

  it('assembles a spaced expression left to right', async () => {
    const r = await rec.recognize([
      line(5, 5, 5, 55), // 1
      line(35, 10, 35, 50), // +
      line(15, 30, 55, 30),
      stroke([[78, 6], [92, 4], [104, 12], [102, 26], [88, 40], [76, 52], [80, 62], [96, 66], [108, 60]]), // 2
    ]);
    expect(r.expression).toBe('1+2');
  });
});