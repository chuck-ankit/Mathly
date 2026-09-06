import { describe, expect, it } from 'vitest';
import { polyRoots, numericRoots } from '../roots';
import { polynomialCoefficients } from '../polynomial';
import { parse } from '../parser';

const rootsOf = (input: string): number[] => {
  const coeffs = polynomialCoefficients(parse(input).expression)!;
  return polyRoots(coeffs);
};

const close = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) < tol;

describe('polyRoots', () => {
  it('finds linear root', () => {
    expect(rootsOf('2x + 3')).toHaveLength(1);
    expect(close(rootsOf('2x + 3')[0], -1.5)).toBe(true);
  });
  it('finds quadratic roots with irrational values', () => {
    const roots = rootsOf('x² - 2');
    expect(close(roots[0], -Math.SQRT2)).toBe(true);
    expect(close(roots[1], Math.SQRT2)).toBe(true);
  });
  it('finds cubic roots: x³ - 6x² + 11x - 6 = (x-1)(x-2)(x-3)', () => {
    const roots = rootsOf('x³ - 6x² + 11x - 6');
    expect(roots).toEqual([1, 2, 3]);
  });
  it('finds x³ - x roots -1, 0, 1', () => {
    expect(rootsOf('x³ - x')).toEqual([-1, 0, 1]);
  });
  it('finds irrational cubic root: x³ - 2', () => {
    const roots = rootsOf('x³ - 2');
    expect(roots).toHaveLength(1);
    expect(close(roots[0], Math.cbrt(2))).toBe(true);
  });
  it('returns no real roots for x² + 1', () => {
    expect(rootsOf('x² + 1')).toEqual([]);
  });
  it('handles repeated roots: (x-2)²', () => {
    const roots = rootsOf('(x-2)²');
    expect(roots).toHaveLength(1);
    expect(close(roots[0], 2)).toBe(true);
  });
  it('finds quartic roots: x⁴ - 5x² + 4 = (x-1)(x+1)(x-2)(x+2)', () => {
    const roots = rootsOf('x⁴ - 5x² + 4');
    expect(roots).toEqual([-2, -1, 1, 2]);
  });
});

describe('numericRoots', () => {
  it('finds zeros of sin(x) in [-4, 4]', () => {
    const roots = numericRoots(Math.sin, -4, 4);
    expect(roots.some((r) => close(r, 0))).toBe(true);
    expect(roots.some((r) => close(r, Math.PI))).toBe(true);
    expect(roots.some((r) => close(r, -Math.PI))).toBe(true);
  });
  it('finds no roots of x² + 1 numerically', () => {
    expect(numericRoots((x) => x * x + 1, -10, 10)).toEqual([]);
  });
});