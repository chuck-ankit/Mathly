import { describe, expect, it } from 'vitest';
import {
  adjustCaretForStrippedNewlines,
  highlight,
  TokenSpan,
} from '../editorUtils';

const joined = (spans: TokenSpan[]): string => spans.map((s) => s.text).join('');

const cls = (spans: TokenSpan[]): string[] => spans.map((s) => s.className);

describe('highlight', () => {
  it('renders plain text unchanged, spans cover every code unit', () => {
    const spans = highlight('y = x² + 3x - 4');
    expect(joined(spans)).toBe('y = x² + 3x - 4');
  });

  it('covers the entire source text (no trailing chars swallowed)', () => {
    const spans = highlight('sin(x)');
    expect(joined(spans)).toBe('sin(x)');
  });

  it('classifies numbers, functions, variables, parens and equals', () => {
    const spans = highlight('y = sin(x) + 12.5');
    expect(cls(spans)).toContain('tk-var');
    expect(cls(spans)).toContain('tk-eq');
    expect(cls(spans)).toContain('tk-fn');
    expect(cls(spans)).toContain('tk-paren');
    expect(cls(spans)).toContain('tk-num');
  });

  it('renders superscript chars as literal so overlay width matches textarea', () => {
    const spans = highlight('x²');
    // Single visual span keeps the exact glyph — no sub/superscript smashing.
    expect(joined(spans)).toBe('x²');
  });

  it('does not duplicate text when an error straddles a number token', () => {
    // Token "12.5" is a single number; the error [1,3) covers "2." inside it.
    const spans = highlight('12.5', { message: 'bad', start: 1, end: 3 });
    // Overlay must reproduce the exact source text exactly once.
    expect(joined(spans)).toBe('12.5');
    // The straddling token is split: "1" (num) | "2." (err) | "5" (num).
    expect(cls(spans)).toEqual(['tk-num', 'tk-err', 'tk-num']);
  });

  it('splits tokens straddling the START of an error range', () => {
    const spans = highlight('2e3 + x', { message: 'bad', start: 0, end: 2 });
    expect(joined(spans)).toBe('2e3 + x');
    expect(spans.some((s) => s.className === 'tk-err' && s.text === '2e')).toBe(true);
    expect(spans.some((s) => s.className === 'tk-num' && s.text === '3')).toBe(true);
  });

  it('splits tokens straddling the END of an error range', () => {
    const spans = highlight('x + 12.5', { message: 'bad', start: 4, end: 6 });
    expect(joined(spans)).toBe('x + 12.5');
    expect(spans.some((s) => s.className === 'tk-err' && s.text === '12')).toBe(true);
    expect(spans.some((s) => s.className === 'tk-num' && s.text === '.5')).toBe(true);
  });

  it('marks an error spanning adjacent tokens without duplication', () => {
    const spans = highlight('sin(x)', { message: 'bad', start: 0, end: 3 });
    expect(joined(spans)).toBe('sin(x)');
    expect(spans.some((s) => s.className === 'tk-err' && s.text === 'sin')).toBe(true);
    expect(spans.some((s) => s.className === 'tk-fn')).toBe(false);
  });

  it('falls back to the tokenizer error range when tokenize throws', () => {
    const spans = highlight('y = x #');
    expect(joined(spans)).toBe('y = x #');
    expect(spans.some((s) => s.className === 'tk-err')).toBe(true);
  });

  it('merges consecutive characters with the same class into one span', () => {
    const spans = highlight('===');
    expect(spans).toHaveLength(1);
    expect(spans[0].className).toBe('tk-eq');
  });

  it('handles an empty string and stray out-of-range error without throwing', () => {
    expect(highlight('')).toEqual([]);
    const spans = highlight('x', { message: 'bad', start: 5, end: 9 });
    expect(joined(spans)).toBe('x');
    expect(spans.every((s) => s.className !== 'tk-err')).toBe(true);
  });

  it('keeps whitespace between tokens as part of the overlay', () => {
    const spans = highlight('a + b');
    expect(joined(spans)).toBe('a + b');
    expect(spans.some((s) => s.className === 'tk-ws' && /\s/.test(s.text))).toBe(true);
  });
});

describe('adjustCaretForStrippedNewlines', () => {
  it('leaves a caret in newline-free input untouched', () => {
    expect(adjustCaretForStrippedNewlines('y = x^2', 7)).toBe(7);
  });

  it('subtracts newlines before the caret', () => {
    expect(adjustCaretForStrippedNewlines('y = x\n+ 3', 6)).toBe(6 - 1);
  });

  it('caret after all newlines maps to the end of the stripped value', () => {
    const raw = 'y = x\n+ 3'; // "y = x+ 3" is 8 chars after stripping the \n
    expect(adjustCaretForStrippedNewlines(raw, raw.length)).toBe(8);
  });

  it('counts only newlines that precede the caret', () => {
    const raw = 'a\nb\nc'; // stripped → "abc" (3 chars)
    expect(adjustCaretForStrippedNewlines(raw, 2)).toBe(1); // after "a", before "b"
    expect(adjustCaretForStrippedNewlines(raw, 3)).toBe(2); // just before 2nd \n
    expect(adjustCaretForStrippedNewlines(raw, 4)).toBe(2); // just after 2nd \n → before "c"
    expect(adjustCaretForStrippedNewlines(raw, 5)).toBe(3);
  });
});