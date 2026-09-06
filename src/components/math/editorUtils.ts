import { MathParseError, ParseIssue } from '../../lib/math/types';
import { tokenize } from '../../lib/math/tokenizer';
import type { Token } from '../../lib/math/tokenizer';

/* ============================================================
   Pure helpers for the equation editor overlay.
   Kept free of React/CSS so they can be unit-tested directly.
   ============================================================ */

export interface TokenSpan {
  text: string;
  className: string;
  start: number;
}

const FN_CLASSES = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'sqrt', 'cbrt',
  'abs', 'exp', 'ln', 'log', 'floor', 'ceil', 'round', 'sign', 'min', 'max',
]);
const CONST_CLASSES = new Set(['pi', 'e', 'tau', 'inf', 'infinity']);

function clampIndex(n: number, len: number): number {
  if (!Number.isFinite(n)) return len;
  return Math.max(0, Math.min(len, Math.round(n)));
}

function tokenClass(t: Token): string {
  switch (t.type) {
    case 'number':
      return 'tk-num';
    case 'ident': {
      const lower = t.text.toLowerCase();
      if (FN_CLASSES.has(lower)) return 'tk-fn';
      if (CONST_CLASSES.has(lower)) return 'tk-const';
      return 'tk-var';
    }
    case 'lparen':
    case 'rparen':
    case 'comma':
      return 'tk-paren';
    case 'equals':
      return 'tk-eq';
    default:
      return 'tk-op';
  }
}

/**
 * Convert raw text into colored spans for the background overlay.
 *
 * The overlay must reproduce the *exact* glyphs of the textarea (no font-size
 * or font-weight tricks that change advance widths) so the highlight never
 * drifts from the caret/selection. Characters are classified per code unit so
 * tokens that straddle an error range are split cleanly instead of duplicating
 * text or leaving holes.
 */
export function highlight(text: string, error?: ParseIssue | null): TokenSpan[] {
  if (!text) return [];

  let tokens: Token[] | null = null;
  let errStart: number | null = null;
  let errEnd: number | null = null;

  try {
    tokens = tokenize(text);
  } catch (e) {
    tokens = [];
    if (e instanceof MathParseError) {
      errStart = clampIndex(e.issue.start, text.length);
      errEnd = clampIndex(Math.max(e.issue.end, e.issue.start + 1), text.length);
    }
  }

  if (error) {
    errStart = clampIndex(error.start, text.length);
    errEnd = clampIndex(Math.max(error.end, error.start + 1), text.length);
  }

  const cls: Array<string | undefined> = new Array(text.length);
  if (errStart !== null && errEnd !== null && errStart < errEnd) {
    for (let i = errStart; i < errEnd && i < text.length; i++) cls[i] = 'tk-err';
  }
  if (tokens) {
    for (const t of tokens) {
      if (t.type === 'eof') continue;
      const c = tokenClass(t);
      for (let i = t.start; i < t.end && i < text.length; i++) {
        if (cls[i] === undefined) cls[i] = c;
      }
    }
  }

  const spans: TokenSpan[] = [];
  let i = 0;
  while (i < text.length) {
    const c = cls[i] ?? 'tk-ws';
    let j = i + 1;
    while (j < text.length && (cls[j] ?? 'tk-ws') === c) j++;
    spans.push({ text: text.slice(i, j), className: c, start: i });
    i = j;
  }
  return spans;
}

/** Map a caret index in a raw value (that may contain stripped \n) to the caret index in the stripped value. */
export function adjustCaretForStrippedNewlines(raw: string, rawCaret: number): number {
  const before = raw.slice(0, rawCaret);
  const newlines = before.match(/\n/g);
  return rawCaret - (newlines ? newlines.length : 0);
}