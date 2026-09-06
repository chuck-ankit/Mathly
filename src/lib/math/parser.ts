/* ============================================================
   Mathly math-core: parser
   Turns "2x² + 3x - 4" (and "y = ...", "f(x) = ...") into an AST.
   Supports implicit multiplication: 2x, 2(x+1), x(x+1), 2sin(x).
   Parsing only — never evaluates. Safe.
   ============================================================ */

import {
  CONSTANTS,
  FUNCTIONS,
  LhsKind,
  MathNode,
  MathParseError,
  ParsedEquation,
  Parsed3d,
  PLOT_VARIABLES,
} from './types';
import { Token, tokenize } from './tokenizer';
import { nodeToLatex } from './latex';

/** Safety caps so pathological input can never spin. */
const MAX_IMPLICIT_GROUPING = 64;
const MAX_TOKENS = 4096;

export function parse(input: string): ParsedEquation {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new MathParseError({
      message: 'Type an equation to see its graph.',
      start: 0,
      end: 0,
      hint: 'Try y = x² or sin(x)',
    });
  }

  const tokens = tokenize(trimmed);
  const p = new Parser(tokens);

  if (tokens.length > MAX_TOKENS) {
    throw new MathParseError({
      message: 'This equation is too long for me to read.',
      start: 0,
      end: trimmed.length,
      hint: 'Try breaking it into a shorter expression.',
    });
  }

  // Split on top-level '='
  const eqIndices: number[] = [];
  let depth = 0;
  tokens.forEach((t, idx) => {
    if (t.type === 'lparen') depth++;
    else if (t.type === 'rparen') depth--;
    else if (t.type === 'equals' && depth === 0) eqIndices.push(idx);
  });

  let lhs: LhsKind | null = null;
  let rhsTokens: Token[];
  let explicit = false;

  if (eqIndices.length > 1) {
    const t = tokens[eqIndices[1]];
    throw new MathParseError({
      message: "There's more than one = in this equation.",
      start: t.start,
      end: t.end,
    });
  }
  if (eqIndices.length === 1) {
    explicit = true;
    const eqIdx = eqIndices[0];
    const lhsTokens = tokens.slice(0, eqIdx);
    if (lhsTokens.length === 0) {
      throw new MathParseError({
        message: 'Nothing appears before the =.',
        start: tokens[eqIdx].start,
        end: tokens[eqIdx].end,
      });
    }
    lhs = parseLhs(lhsTokens);
    rhsTokens = tokens.slice(eqIdx + 1);
  } else {
    rhsTokens = tokens;
  }

  if (rhsTokens.length === 0 || (rhsTokens.length === 1 && rhsTokens[0].type === 'eof')) {
    throw new MathParseError({
      message: "There's nothing after the =.",
      start: tokens[tokens.length - 1].start,
      end: tokens[tokens.length - 1].end,
    });
  }

  p.tokens = rhsTokens;
  const expression = p.parseExpression();

  // Trailing garbage check
  const next = p.peek();
  if (next.type !== 'eof') {
    throw new MathParseError({
      message: `I wasn't expecting "${next.text}" here.`,
      start: next.start,
      end: next.end,
      hint: 'Try adding a +, −, × or ÷ between the parts.',
    });
  }

  const variables = collectVariables(expression);
  if (variables.includes('y')) {
    throw new MathParseError({
      message: "An equation can't use y on both sides at once.",
      start: 0,
      end: trimmed.length,
      hint: 'Try y = … with x on the other side.',
    });
  }
  const params = variables.filter((v) => !PLOT_VARIABLES.includes(v));

  const latex = makeLatex(expression, lhs, explicit);
  return { input: trimmed, lhs, expression, variables, params, explicit, latex };
}

function parseLhs(tokens: Token[]): LhsKind {
  const texts = tokens
    .map((t) => (t.type === 'eof' ? '' : t.text))
    .filter((t) => t && !/[₀-₉]/.test(t));

  if (texts.length === 1) {
    const t = texts[0].toLowerCase();
    if (t === 'y') return { kind: 'y' };
    if (t === 'x') {
      throw new MathParseError({
        message: 'Vertical lines (x = c) are coming soon — try y = … instead.',
        start: tokens[0].start,
        end: tokens[tokens.length - 1].end,
      });
    }
    if (['f', 'g', 'h'].includes(t)) {
      return { kind: 'function', name: texts[0] };
    }
  }

  // f(x) / g(t) pattern
  const meaningful = texts.filter((t) => t !== '(' && t !== ')');
  if (meaningful.length === 2 && /^[a-zA-Z]$/.test(meaningful[0]) && /^[a-zA-Z]$/.test(meaningful[1])) {
    return { kind: 'function', name: meaningful[0] };
  }

  const startTok = tokens.find((t) => t.type !== 'eof');
  throw new MathParseError({
    message:
      'I can graph equations like y = … or f(x) = … for now. Try solving this one for y.',
    start: startTok?.start ?? 0,
    end: tokens[tokens.length - 1].end,
  });
}

/* ------------------------------------------------------------
   Pratt parser
   ------------------------------------------------------------ */

class Parser {
  tokens: Token[];
  pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }

  next(): Token {
    const t = this.tokens[this.pos];
    if (t.type !== 'eof') this.pos++;
    return t;
  }

  private err(message: string, token: Token, hint?: string): never {
    throw new MathParseError({ message, start: token.start, end: token.end, hint });
  }

  parseExpression(): MathNode {
    let left = this.parseAdditive();
    // Implicit multiplication between a parenthesized group and what follows
    let groups = 0;
    while (isPrimaryStart(this.peek())) {
      if (groups++ > MAX_IMPLICIT_GROUPING) {
        return this.err('This expression has too many groups next to each other.', this.peek(), 'Try adding × or ÷ between them.');
      }
      const right = this.parseAdditive();
      left = { type: 'binary', op: '*', left, right };
    }
    return left;
  }

  parseAdditive(): MathNode {
    let left = this.parseTerm();
    for (;;) {
      const t = this.peek();
      if (t.type === 'op' && (t.text === '+' || t.text === '-')) {
        this.next();
        const right = this.parseTerm();
        left = { type: 'binary', op: t.text as '+' | '-', left, right };
      } else {
        return left;
      }
    }
  }

  parseTerm(): MathNode {
    let left = this.parseUnary();
    for (;;) {
      const t = this.peek();
      if (t.type === 'op' && (t.text === '*' || t.text === '/')) {
        this.next();
        const right = this.parseUnary();
        left = { type: 'binary', op: t.text as '*' | '/', left, right };
      } else if (isPrimaryStart(t)) {
        // implicit multiplication: 2x, 2(x+1), x(x+1), 3sin(x)
        const right = this.parseUnary();
        left = { type: 'binary', op: '*', left, right };
      } else {
        return left;
      }
    }
  }

  parseUnary(): MathNode {
    const t = this.peek();
    if (t.type === 'op' && (t.text === '+' || t.text === '-')) {
      this.next();
      const operand = this.parseUnary();
      return { type: 'unary', op: t.text as '+' | '-', operand };
    }
    return this.parsePower();
  }

  parsePower(): MathNode {
    const base = this.parsePostfix();
    const t = this.peek();
    if (t.type === 'op' && t.text === '^') {
      this.next();
      const next = this.peek();
      if (next.type === 'op' && next.text === '^') {
        return this.err("There are two ^ in a row. Try something like x² or x^3.", next);
      }
      const exponent = this.parseUnary(); // right-associative: x^2^3 = x^(2^3)
      return { type: 'binary', op: '^', left: base, right: exponent };
    }
    return base;
  }

  parsePostfix(): MathNode {
    let node = this.parsePrimary();
    while (this.peek().type === 'bang') {
      this.next();
      node = { type: 'factorial', operand: node };
    }
    return node;
  }

  parsePrimary(): MathNode {
    const t = this.next();
    switch (t.type) {
      case 'number': {
        const v = parseFloat(t.text);
        if (!Number.isFinite(v)) {
          return this.err(`I can't read "${t.text}" as a number.`, t);
        }
        return { type: 'number', value: v };
      }
      case 'lparen': {
        const inner = this.parseExpression();
        const close = this.next();
        if (close.type !== 'rparen') {
          if (close.type === 'eof') {
            return this.err("You're missing a closing ).", close);
          }
          return this.err("I wasn't expecting this inside parentheses.", close);
        }
        return inner;
      }
      case 'ident': {
        const name = t.text;
        const isKnownFn = FUNCTIONS[name.toLowerCase()] !== undefined;
        const nextTok = this.peek();

        if (isKnownFn && nextTok.type === 'lparen') {
          return this.parseCall(name.toLowerCase());
        }
        if (name === 'inf' || name === 'infinity') {
          return { type: 'number', value: Infinity };
        }
        if (CONSTANTS[name] !== undefined) {
          const constNode: MathNode = {
            type: 'constant',
            name: name as 'pi' | 'e' | 'tau',
            value: CONSTANTS[name],
          };
          if (isPrimaryStart(nextTok)) {
            const arg = this.parsePrimary();
            return { type: 'binary', op: '*', left: constNode, right: arg };
          }
          return constNode;
        }
        // Known function applied without parens: sin x, sqrt 2, log 100
        if (isKnownFn && isPrimaryStart(nextTok)) {
          const arg = this.parsePrimary();
          return { type: 'call', name: name.toLowerCase(), args: [arg] };
        }
        // Unknown ident followed by '(' — implicit multiplication: x(x+1)
        if (nextTok.type === 'lparen') {
          const inner = this.parsePrimary();
          return { type: 'binary', op: '*', left: { type: 'variable', name }, right: inner };
        }
        return { type: 'variable', name };
      }
      case 'op':
        return this.err(
          `I wasn't expecting "${t.text}". Try writing the number or function first.`,
          t,
          'For example: 2x + 3'
        );
      case 'bang':
        return this.err("There's a stray ! here.", t);
      case 'comma':
        return this.err('A comma should separate arguments inside a function like min(2, x).', t);
      case 'rparen':
        return this.err("There's an extra ) here.", t);
      case 'equals':
        return this.err("There's an extra = here.", t);
      case 'eof':
        return this.err('It looks like the equation ends early.', t, 'Try y = x²');
      default:
        return this.err('Hmm, I could not read that part.', t);
    }
  }

  parseCall(name: string): MathNode {
    const open = this.next(); // consume lparen
    const args: MathNode[] = [];
    if (this.peek().type === 'rparen') {
      this.next();
      return this.err(`"${name}()" needs an argument inside the parentheses.`, open);
    }
    for (;;) {
      const arg = this.parseExpression();
      args.push(arg);
      const t = this.next();
      if (t.type === 'rparen') break;
      if (t.type !== 'comma') {
        if (t.type === 'eof') {
          return this.err(`You're missing a closing ) after ${name}(.`, t);
        }
        return this.err('Functions like this need a comma between arguments.', t);
      }
    }
    const fn = FUNCTIONS[name];
    if (args.length < fn.minArgs || args.length > fn.maxArgs) {
      const hint =
        fn.minArgs === fn.maxArgs
          ? `${name} takes ${fn.minArgs} argument${fn.minArgs === 1 ? '' : 's'}.`
          : `${name} takes between ${fn.minArgs} and ${fn.maxArgs} arguments.`;
      return this.err(hint, open);
    }
    return { type: 'call', name, args };
  }
}

function isPrimaryStart(t: Token): boolean {
  return t.type === 'number' || t.type === 'ident' || t.type === 'lparen';
}



/* ------------------------------------------------------------
   Helpers
   ------------------------------------------------------------ */

function collectVariables(node: MathNode, acc: string[] = []): string[] {
  switch (node.type) {
    case 'number':
    case 'constant':
      break;
    case 'variable':
      if (!acc.includes(node.name)) acc.push(node.name);
      break;
    case 'unary':
      collectVariables(node.operand, acc);
      break;
    case 'factorial':
      collectVariables(node.operand, acc);
      break;
    case 'binary':
      collectVariables(node.left, acc);
      collectVariables(node.right, acc);
      break;
    case 'call':
      for (const a of node.args) collectVariables(a, acc);
      break;
  }
  return acc;
}

function makeLatex(expr: MathNode, lhs: LhsKind | null, explicit: boolean): string {
  const rhsLatex = nodeToLatex(expr);
  if (explicit && lhs) {
    if (lhs.kind === 'y') return `y = ${rhsLatex}`;
    if (lhs.kind === 'function') return `${lhs.name}(x) = ${rhsLatex}`;
    return `${lhs.text} = ${rhsLatex}`;
  }
  return rhsLatex;
}

/* ------------------------------------------------------------
   3D surfaces: z = f(x, y) — shares the same tokenizer/Pratt
   parser as 2D, then validates variables ⊆ {x, y, params}.
   ------------------------------------------------------------ */

export function parse3d(input: string): Parsed3d {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new MathParseError({
      message: 'Type a surface like z = sin(x)·cos(y).',
      start: 0,
      end: 0,
      hint: 'Try z = x² + y² or z = sin(√(x² + y²))',
    });
  }

  const tokens = tokenize(trimmed);
  if (tokens.length > MAX_TOKENS) {
    throw new MathParseError({
      message: 'This equation is too long for me to read.',
      start: 0,
      end: trimmed.length,
    });
  }

  // Optional leading z = — everything else is the expression.
  let rhsTokens = tokens;
  const eqIdx = tokens.findIndex((t) => t.type === 'equals');
  if (eqIdx >= 0) {
    const before = tokens.slice(0, eqIdx).filter((t) => t.type !== 'eof');
    const isZ = before.length === 1 && before[0].type === 'ident' && before[0].text.toLowerCase() === 'z';
    if (!isZ) {
      const t = before[0] ?? tokens[eqIdx];
      throw new MathParseError({
        message: 'In 3D I graph surfaces like z = … . Try starting with z.',
        start: t.start,
        end: t.end,
      });
    }
    rhsTokens = tokens.slice(eqIdx + 1);
  }
  if (rhsTokens.length === 0 || (rhsTokens.length === 1 && rhsTokens[0].type === 'eof')) {
    throw new MathParseError({
      message: "There's nothing after the =.",
      start: trimmed.length - 1,
      end: trimmed.length,
    });
  }

  const p = new Parser(rhsTokens);
  const expression = p.parseExpression();
  const next = p.peek();
  if (next.type !== 'eof') {
    throw new MathParseError({
      message: `I wasn't expecting "${next.text}" here.`,
      start: next.start,
      end: next.end,
      hint: 'Try adding a +, −, × or ÷ between the parts.',
    });
  }

  const variables = collectVariables(expression);
  const params = variables.filter((v) => v !== 'x' && v !== 'y');
  return {
    input: trimmed,
    expression,
    variables,
    params,
    latex: `z = ${nodeToLatex(expression)}`,
  };
}