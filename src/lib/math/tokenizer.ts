/* ============================================================
   Mathly math-core: tokenizer
   Understands common mathematical notation:
   - superscripts: x², x³, ⁴
   - unicode: √ π θ × ÷ − ∞
   - implicit forms handled by the parser (2x, 2(x+1))
   ============================================================ */

import { MathParseError } from './types';

export type TokenType =
  | 'number'
  | 'ident'
  | 'op'
  | 'lparen'
  | 'rparen'
  | 'comma'
  | 'equals'
  | 'bang'
  | 'eof';

export interface Token {
  type: TokenType;
  text: string;
  start: number;
  end: number;
}

const SUPERSCRIPT_DIGITS: Record<string, number> = {
  '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9,
};

const SUBSCRIPT_DIGITS: Record<string, number> = {
  '₀': 0, '₁': 1, '₂': 2, '₃': 3, '₄': 4, '₅': 5, '₆': 6, '₇': 7, '₈': 8, '₉': 9,
};

/** Symbols we can't graph yet but should give a friendly error for. */
const UNSUPPORTED: Record<string, string> = {
  '∫': 'Integrals are coming soon. For now, try graphing a function like sin(x).',
  '∑': 'Sums are coming soon. Try graphing a function like x² first.',
  '∂': 'Partial derivatives are coming soon.',
  '≤': 'Inequalities like this are coming soon.',
  '≥': 'Inequalities like this are coming soon.',
  '≠': 'Inequalities like this are coming soon.',
  '≈': 'Try an equals sign (=) instead.',
  '∮': 'Integrals are coming soon.',
  '∏': 'Products are coming soon.',
  '∆': 'Try describing a function instead.',
};

export class Tokenizer {
  private s: string;
  private i = 0;
  private pipeDepth = 0;
  private lastPipeStart = -1;

  constructor(input: string) {
    this.s = input;
  }

  private error(message: string, start: number, end = start + 1): never {
    throw new MathParseError({ message, start, end });
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    const s = this.s;
    while (this.i < s.length) {
      const ch = s[this.i];
      const start = this.i;

      // Whitespace
      if (/\s/.test(ch)) {
        this.i++;
        continue;
      }

      // Numbers
      if (isDigit(ch) || (ch === '.' && isDigit(s[this.i + 1] ?? ''))) {
        tokens.push(this.readNumber());
        continue;
      }

      // Superscript minus → negative exponent: x⁻¹ (or x⁻1) → x^(-1)
      if (ch === '⁻') {
        this.i++;
        let num = '-';
        // Accept superscript digits and plain digits: users often type ⁻ then a normal number.
        while (this.i < s.length) {
          const c = s[this.i];
          if (SUPERSCRIPT_DIGITS[c] !== undefined) {
            num += SUPERSCRIPT_DIGITS[c];
            this.i++;
          } else if (isDigit(c)) {
            num += c;
            this.i++;
          } else {
            break;
          }
        }
        if (num === '-') {
          this.error("I wasn't expecting ⁻ here.", start, this.i);
        }
        tokens.push({ type: 'op', text: '^', start, end: this.i });
        tokens.push({ type: 'number', text: num, start, end: this.i });
        continue;
      }

      // Superscript digits → power
      if (SUPERSCRIPT_DIGITS[ch] !== undefined) {
        let num = '';
        while (this.i < s.length && SUPERSCRIPT_DIGITS[s[this.i]] !== undefined) {
          num += SUPERSCRIPT_DIGITS[s[this.i]];
          this.i++;
        }
        tokens.push({ type: 'op', text: '^', start, end: this.i });
        tokens.push({ type: 'number', text: num, start, end: this.i });
        continue;
      }

      // Identifiers & constants & functions (unicode aware)
      if (isIdentStart(ch)) {
        tokens.push(...this.readIdent());
        continue;
      }

      // Greek/unicode single chars
      const next = this.i + 1;
      switch (ch) {
        case 'π':
          tokens.push({ type: 'ident', text: 'pi', start, end: next });
          this.i = next;
          continue;
        case 'θ':
          tokens.push({ type: 'ident', text: 'theta', start, end: next });
          this.i = next;
          continue;
        case 'τ':
          tokens.push({ type: 'ident', text: 'tau', start, end: next });
          this.i = next;
          continue;
        case 'α':
          tokens.push({ type: 'ident', text: 'alpha', start, end: next });
          this.i = next;
          continue;
        case 'β':
          tokens.push({ type: 'ident', text: 'beta', start, end: next });
          this.i = next;
          continue;
        case 'γ':
          tokens.push({ type: 'ident', text: 'gamma', start, end: next });
          this.i = next;
          continue;
        case '√':
          tokens.push({ type: 'ident', text: 'sqrt', start, end: next });
          this.i = next;
          continue;
        case '∞':
          tokens.push({ type: 'ident', text: 'inf', start, end: next });
          this.i = next;
          continue;
        case '×':
        case '·':
          tokens.push({ type: 'op', text: '*', start, end: next });
          this.i = next;
          continue;
        case '÷':
          tokens.push({ type: 'op', text: '/', start, end: next });
          this.i = next;
          continue;
        case '−':
          tokens.push({ type: 'op', text: '-', start, end: next });
          this.i = next;
          continue;
        case '＋':
          tokens.push({ type: 'op', text: '+', start, end: next });
          this.i = next;
          continue;
        case '(':
          tokens.push({ type: 'lparen', text: ch, start, end: next });
          this.i = next;
          continue;
        case ')':
          tokens.push({ type: 'rparen', text: ch, start, end: next });
          this.i = next;
          continue;
        case '|':
          // Pair pipes into abs(...): |x| → abs(x), |x| + |y| → abs(x) + abs(y)
          if (this.pipeDepth % 2 === 0) {
            tokens.push({ type: 'ident', text: 'abs', start, end: next });
            tokens.push({ type: 'lparen', text: '(', start: next, end: next });
          } else {
            tokens.push({ type: 'rparen', text: ')', start, end: next });
          }
          this.pipeDepth++;
          this.lastPipeStart = start;
          this.i = next;
          continue;
        case ',':
          tokens.push({ type: 'comma', text: ch, start, end: next });
          this.i = next;
          continue;
        case '=':
          tokens.push({ type: 'equals', text: ch, start, end: next });
          this.i = next;
          continue;
        case '!':
          tokens.push({ type: 'bang', text: ch, start, end: next });
          this.i = next;
          continue;
        case '+':
        case '-':
        case '*':
        case '/':
        case '^':
          tokens.push({ type: 'op', text: ch, start, end: next });
          this.i = next;
          continue;
      }

      if (UNSUPPORTED[ch]) {
        this.error(UNSUPPORTED[ch], start, next);
      }

      // Subscript digits attached to variables: x₁ (treat as part of name, dropped)
      if (SUBSCRIPT_DIGITS[ch] !== undefined) {
        this.i++;
        continue;
      }

      this.error(`I don't recognize "${ch}".`, start, next);
    }
    if (this.pipeDepth % 2 === 1) {
      throw new MathParseError({
        message: "You're missing a closing |.",
        start: Math.max(0, this.lastPipeStart),
        end: Math.max(0, this.lastPipeStart) + 1,
      });
    }
    tokens.push({ type: 'eof', text: '', start: s.length, end: s.length });
    return tokens;
  }

  private readNumber(): Token {
    const s = this.s;
    const start = this.i;
    let text = '';
    while (this.i < s.length && isDigit(s[this.i])) {
      text += s[this.i];
      this.i++;
    }
    if (s[this.i] === '.' && isDigit(s[this.i + 1] ?? '')) {
      text += '.';
      this.i++;
      while (this.i < s.length && isDigit(s[this.i])) {
        text += s[this.i];
        this.i++;
      }
    }
    // Scientific notation: 2e3, 1.5e-4 — but not "2ex" (that is 2·e·x)
    if ((s[this.i] === 'e' || s[this.i] === 'E')) {
      const j = this.i + 1;
      let k = j;
      if (s[k] === '+' || s[k] === '-') k++;
      if (isDigit(s[k] ?? '')) {
        while (k < s.length && isDigit(s[k])) k++;
        text += s.slice(this.i, k);
        this.i = k;
      }
    }
    return { type: 'number', text, start, end: this.i };
  }

  private readIdent(): Token[] {
    const s = this.s;
    const start = this.i;
    let text = '';
    while (this.i < s.length && isIdentChar(s[this.i])) {
      text += s[this.i];
      this.i++;
    }
    return splitIdentWord(text, start, this.i);
  }
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

/** Words like "ax" are written as implicit products: ax → a·x, bx → b·x. */
const PROTECTED_WORDS = new Set([
  'pi', 'e', 'tau', 'inf', 'infinity', 'theta', 'alpha', 'beta', 'gamma',
  'delta', 'lambda', 'mu', 'sigma', 'omega', 'phi',
]);

const FUNCTION_NAMES = [
  'sqrt', 'cbrt', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh',
  'sin', 'cos', 'tan', 'abs', 'exp', 'ln', 'log', 'floor', 'ceil',
  'round', 'sign', 'min', 'max',
].sort((a, b) => b.length - a.length);

const FUNCTION_SET = new Set(FUNCTION_NAMES);

function splitIdentWord(text: string, start: number, end: number): Token[] {
  const lower = text.toLowerCase();
  if (
    text.length === 1 ||
    PROTECTED_WORDS.has(lower) ||
    FUNCTION_SET.has(lower) ||
    !/^[A-Za-z]+$/.test(text)
  ) {
    return [{ type: 'ident', text, start, end }];
  }
  // Prefix function: sinx → sin · x, log100 → log · 100
  for (const fn of FUNCTION_NAMES) {
    if (fn.length < text.length && lower.startsWith(fn)) {
      return [
        { type: 'ident', text: text.slice(0, fn.length), start, end: start + fn.length },
        ...splitIdentWord(text.slice(fn.length), start + fn.length, end),
      ];
    }
    // Suffix function: xsin → x · sin
    if (fn.length < text.length && lower.endsWith(fn)) {
      return [
        ...splitIdentWord(text.slice(0, text.length - fn.length), start, start + text.length - fn.length),
        { type: 'ident', text: text.slice(text.length - fn.length), start: start + text.length - fn.length, end },
      ];
    }
  }
  // All plain letters: split into single-letter tokens so x² binds correctly
  const out: Token[] = [];
  for (let i = 0; i < text.length; i++) {
    out.push({ type: 'ident', text: text[i], start: start + i, end: start + i + 1 });
  }
  return out;
}

function isIdentStart(ch: string): boolean {
  return /[A-Za-z_]/.test(ch);
}

function isIdentChar(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

export function tokenize(input: string): Token[] {
  return new Tokenizer(input).tokenize();
}