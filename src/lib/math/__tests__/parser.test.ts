import { describe, expect, it } from 'vitest';
import { parse } from '../parser';
import { MathParseError } from '../types';
import { evaluate } from '../evaluator';

const evalAt = (input: string, x: number): number => {
  const p = parse(input);
  return evaluate(p.expression, { x });
};

describe('parse: basic forms', () => {
  it('parses x² as x^2', () => {
    expect(evalAt('x²', 3)).toBeCloseTo(9);
  });
  it('parses x^2', () => {
    expect(evalAt('x^2', 3)).toBeCloseTo(9);
  });
  it('parses x^3', () => {
    expect(evalAt('x^3', 3)).toBeCloseTo(27);
  });
  it('parses 2x as 2*x', () => {
    expect(evalAt('2x', 5)).toBeCloseTo(10);
  });
  it('parses 2*x', () => {
    expect(evalAt('2*x', 5)).toBeCloseTo(10);
  });
  it('parses implicit multiplication with parens: 2(x+1)', () => {
    expect(evalAt('2(x+1)', 5)).toBeCloseTo(12);
  });
  it('parses x(x+1)', () => {
    expect(evalAt('x(x+1)', 5)).toBeCloseTo(30);
  });
  it('parses (x+1)(x-1)', () => {
    expect(evalAt('(x+1)(x-1)', 5)).toBeCloseTo(24);
  });
  it('parses unicode minus and times', () => {
    expect(evalAt('2×x − 1', 5)).toBeCloseTo(9);
  });
  it('parses y = x² - 4x + 3', () => {
    const p = parse('y = x² - 4x + 3');
    expect(p.lhs).toEqual({ kind: 'y' });
    expect(evaluate(p.expression, { x: 1 })).toBeCloseTo(0);
    expect(evaluate(p.expression, { x: 3 })).toBeCloseTo(0);
    expect(evaluate(p.expression, { x: 2 })).toBeCloseTo(-1);
  });
  it('parses f(x) = ...', () => {
    const p = parse('f(x) = 2x+1');
    expect(p.lhs).toEqual({ kind: 'function', name: 'f' });
  });
  it('parses bare expression as y= form', () => {
    const p = parse('x^2');
    expect(p.explicit).toBe(false);
  });
  it('parses sqrt and √', () => {
    expect(evalAt('sqrt(4)', 0)).toBeCloseTo(2);
    expect(evalAt('√x', 9)).toBeCloseTo(3);
  });
  it('parses sin(x)', () => {
    expect(evalAt('sin(x)', Math.PI / 2)).toBeCloseTo(1);
  });
  it('parses sin x without parens', () => {
    expect(evalAt('sin x', Math.PI / 2)).toBeCloseTo(1);
  });
  it('parses 3sin(x)', () => {
    expect(evalAt('3sin(x)', Math.PI / 2)).toBeCloseTo(3);
  });
  it('parses (x+1)/(x-2)', () => {
    expect(evalAt('(x+1)/(x-2)', 4)).toBeCloseTo(2.5);
  });
  it('parses e^x', () => {
    expect(evalAt('e^x', 0)).toBeCloseTo(1);
    expect(evalAt('e^x', 1)).toBeCloseTo(Math.E);
  });
  it('parses π', () => {
    expect(evalAt('π', 0)).toBeCloseTo(Math.PI);
  });
  it('parses 2πr', () => {
    expect(evalAt('2πx', 1)).toBeCloseTo(2 * Math.PI);
  });
  it('parses superscript chains like x⁴', () => {
    expect(evalAt('x⁴', 2)).toBeCloseTo(16);
  });
  it('parses power right-associative: 2^3^2 = 2^9', () => {
    expect(evalAt('2^3^2', 0)).toBeCloseTo(512);
  });
  it('parses factorial: 4!', () => {
    expect(evalAt('4!', 0)).toBeCloseTo(24);
  });
  it('parses log and ln', () => {
    expect(evalAt('log(100)', 0)).toBeCloseTo(2);
    expect(evalAt('ln(e)', 0)).toBeCloseTo(1);
  });
  it('parses abs(x)', () => {
    expect(evalAt('abs(-3)', 0)).toBeCloseTo(3);
  });
  it('detects parameters a, b, c', () => {
    const p = parse('y = ax² + bx + c');
    expect(p.params).toEqual(expect.arrayContaining(['a', 'b', 'c']));
  });
  it('detects x as plot variable, not a param', () => {
    const p = parse('y = x²');
    expect(p.params).toEqual([]);
  });
  it('scientific notation: 2e3 = 2000', () => {
    expect(evalAt('2e3', 0)).toBeCloseTo(2000);
  });
});

describe('parse: errors are friendly', () => {
  const expectError = (input: string, fragment?: string) => {
    try {
      parse(input);
      expect.fail(`Expected parse error for "${input}"`);
    } catch (e) {
      expect(e).toBeInstanceOf(MathParseError);
      if (fragment) {
        expect((e as MathParseError).message.toLowerCase()).toContain(fragment.toLowerCase());
      }
    }
  };

  it('rejects x^^^', () => {
    expectError('y = x^^^', '^');
  });
  it('rejects empty input', () => {
    expectError('');
  });
  it('rejects unbalanced parens', () => {
    expectError('y = (x+1', 'closing');
  });
  it('rejects y inside the equation', () => {
    expectError('y = x + y', 'both sides');
  });
  it('rejects multiple equals signs', () => {
    expectError('y = x = 2', 'more than one');
  });
  it('rejects implicit equations for now', () => {
    expectError('x² + y² = 25', 'y');
  });
  it('rejects ∫ with a friendly message', () => {
    expectError('y = ∫x dx', 'coming soon');
  });
  it('rejects trailing operator', () => {
    expectError('y = 2x +', 'ends early');
  });
});