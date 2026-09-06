import { describe, expect, it } from 'vitest';
import { parse } from '../parser';
import { analyzeExpression } from '../analyze';
import { evaluate } from '../evaluator';

const analyze = (input: string) => analyzeExpression(parse(input).expression);
const item = (res: ReturnType<typeof analyze>, key: string) =>
  res.items.find((i) => i.key === key)?.value;

describe('analysis: quadratic (acceptance test 2)', () => {
  const res = analyze('y = x² - 4x + 3');
  it('identifies it as quadratic', () => {
    expect(res.kind).toBe('quadratic');
  });
  it('finds real roots 1 and 3', () => {
    const roots = item(res, 'Roots')!.split(', ').map(Number).sort((a, b) => a - b);
    expect(roots).toEqual([1, 3]);
  });
  it('finds the vertex (2, -1)', () => {
    expect(item(res, 'Vertex')).toBe('(2, -1)');
  });
  it('finds the y-intercept 3', () => {
    expect(item(res, 'Y-intercept')).toContain('3');
  });
  it('finds the axis of symmetry x = 2', () => {
    expect(item(res, 'Axis of symmetry')).toBe('x = 2');
  });
  it('knows the parabola opens upward', () => {
    expect(item(res, 'Opens')).toBe('upward');
  });
});

describe('analysis: linear (acceptance test 3)', () => {
  const res = analyze('y = 2x + 3');
  it('identifies slope 2', () => {
    expect(item(res, 'Slope')).toBe('2');
  });
  it('identifies y-intercept 3', () => {
    expect(item(res, 'Y-intercept')).toContain('3');
  });
  it('identifies x-intercept -1.5', () => {
    expect(item(res, 'X-intercept')).toContain('-1.5');
  });
});

describe('analysis: cubic (acceptance test 4)', () => {
  const res = analyze('y = x³ - x');
  it('identifies it as cubic', () => {
    expect(res.kind).toBe('cubic');
  });
  it('finds roots -1, 0, 1', () => {
    const roots = item(res, 'Real roots')!.split(', ').map(Number).sort((a, b) => a - b);
    expect(roots).toEqual([-1, 0, 1]);
  });
  it('finds critical points', () => {
    const crit = item(res, 'Critical points');
    expect(crit).toBeTruthy();
    expect(crit).toContain('max');
    expect(crit).toContain('min');
  });
  it('provides a derivative', () => {
    expect(res.derivativeLatex).toBeTruthy();
  });
});

describe('analysis: simplified derivatives', () => {
  it('cleans up x² - 4x + 3 → 2x - 4', () => {
    const res = analyze('y = x² - 4x + 3');
    expect(res.derivativeLatex).toBe('2x - 4');
  });
  it('cleans up -4x → -4 (no lost sign, no zero terms)', () => {
    const res = analyze('y = -4x');
    expect(res.derivativeLatex).toBe('-4');
  });
  it('cleans up x³ - 3x → 3x² - 3', () => {
    const res = analyze('y = x³ - 3x');
    expect(res.derivativeLatex).toBe('3x^{2} - 3');
  });
  it('cleans up 1/x → -1/x²', () => {
    const res = analyze('y = 1/x');
    expect(res.derivativeLatex).toBe('-\\frac{1}{x^{2}}');
  });
  it('cleans up sin(x) → cos(x)', () => {
    const res = analyze('y = sin(x)');
    expect(res.derivativeLatex).toBe('\\cos\\left(x\\right)');
  });
  it('cleans up (x+1)² → 2(x+1)', () => {
    const res = analyze('y = (x+1)^2');
    expect(res.derivativeLatex).toBe('2\\left(x + 1\\right)');
  });
  it('derivative AST round-trips through nodeToInput', () => {
    const res = analyze('y = x² - 4x + 3');
    expect(res.derivativeAst).toBeTruthy();
  });
});

describe('analysis: trigonometric', () => {
  it('finds amplitude and period of 2sin(3x)', () => {
    const res = analyze('y = 2sin(3x)');
    expect(res.kind).toBe('trig');
    expect(item(res, 'Amplitude')).toBe('2');
    expect(item(res, 'Period')).toBeCloseTo(2 * Math.PI / 3);
  });
  it('finds amplitude 1 and period 2π for sin(x)', () => {
    const res = analyze('y = sin(x)');
    expect(item(res, 'Amplitude')).toBe('1');
    expect(item(res, 'Period')).toBeCloseTo(2 * Math.PI);
  });
});

describe('analysis: exponential', () => {
  it('detects growth and asymptote for 2^x', () => {
    const res = analyze('y = 2^x');
    expect(res.kind).toBe('exponential');
    expect(item(res, 'Behavior')).toContain('growth');
    expect(item(res, 'Horizontal asymptote')).toBe('y = 0');
  });
  it('detects decay for (1/2)^x', () => {
    const res = analyze('y = (1/2)^x');
    expect(item(res, 'Behavior')).toContain('decay');
  });
});

describe('analysis: rational (acceptance test 6)', () => {
  it('finds the vertical asymptote of 1/x', () => {
    const res = analyze('y = 1/x');
    expect(res.kind).toBe('rational');
    expect(item(res, 'Vertical asymptote')).toBe('x = 0');
    expect(item(res, 'Horizontal asymptote')).toBe('y = 0');
  });
  it('finds asymptotes of 1/(x-2)', () => {
    const res = analyze('y = 1/(x-2)');
    expect(item(res, 'Vertical asymptote')).toBe('x = 2');
  });
});

describe('analysis: correctness of displayed values', () => {
  it('roots of x² - 5x + 6 are 2 and 3', () => {
    const res = analyze('y = x² - 5x + 6');
    const roots = item(res, 'Roots')!.split(', ').map(Number).sort();
    expect(roots).toEqual([2, 3]);
  });
  it('vertex of y = x² + 6x + 8 is (-3, -1)', () => {
    const res = analyze('y = x² + 6x + 8');
    expect(item(res, 'Vertex')).toBe('(-3, -1)');
  });
  it('does not show roots for x² + 1 (no real roots)', () => {
    const res = analyze('y = x² + 1');
    expect(item(res, 'Roots')).toBe('None (real)');
  });
  it('double root: y = (x-2)² touches once', () => {
    const res = analyze('y = (x-2)²');
    expect(item(res, 'Root')).toBe('2');
  });
  it('evaluates analysis marker points correctly', () => {
    const res = analyze('y = x² - 4x + 3');
    const rootMarkers = res.markers.filter((m) => m.type === 'root');
    expect(rootMarkers).toHaveLength(2);
    for (const m of rootMarkers) {
      expect(Math.abs(m.y)).toBeLessThan(1e-9);
    }
  });
  it('absolute value function', () => {
    const res = analyze('y = |x|');
    expect(res.kind).toBe('abs');
  });
  it('radical: sqrt(x) has domain x ≥ 0', () => {
    const res = analyze('y = sqrt(x)');
    expect(res.kind).toBe('radical');
    expect(item(res, 'Domain')).toContain('≥ 0');
  });
  it('logarithmic: ln(x) has vertical asymptote at 0', () => {
    const res = analyze('y = ln(x)');
    expect(res.kind).toBe('logarithmic');
    expect(item(res, 'Vertical asymptote')).toBe('x = 0');
  });
});

describe('analysis: parameters', () => {
  it('analyzes y = ax² + bx + c with default params as y = x²', () => {
    const res = analyze('y = ax² + bx + c');
    expect(res.kind).toBe('quadratic');
    expect(item(res, 'Vertex')).toBe('(0, 0)');
  });
  it('re-analyzes when params change', () => {
    const ast = parse('y = ax²').expression;
    const up = analyzeExpression(ast, { a: 1 });
    expect(item(up, 'Opens')).toBe('upward');
    const down = analyzeExpression(ast, { a: -1 });
    expect(item(down, 'Opens')).toBe('downward');
    const check = evaluate(ast, { x: 3, params: { a: 2 } });
    expect(check).toBeCloseTo(18);
  });
});