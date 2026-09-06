/* ============================================================
   Mathly math-core: AST → LaTeX
   Used to render equations beautifully with KaTeX.
   ============================================================ */

import { MathNode } from './types';
import { formatNumber } from './format';

const GREEK: Record<string, string> = {
  theta: '\\theta',
  alpha: '\\alpha',
  beta: '\\beta',
  gamma: '\\gamma',
  delta: '\\delta',
  lambda: '\\lambda',
  mu: '\\mu',
  sigma: '\\sigma',
  omega: '\\omega',
  phi: '\\phi',
};

const FN_LATEX: Record<string, string> = {
  sin: '\\sin',
  cos: '\\cos',
  tan: '\\tan',
  asin: '\\arcsin',
  acos: '\\arccos',
  atan: '\\arctan',
  sinh: '\\sinh',
  cosh: '\\cosh',
  tanh: '\\tanh',
  ln: '\\ln',
  log: '\\log',
  exp: '\\exp',
};

const PREC: Record<string, number> = {
  add: 1,
  mul: 2,
  pow: 3,
  postfix: 4,
  primary: 5,
};

export function nodeToLatex(node: MathNode): string {
  // Top-level expressions never need wrapping parens
  return latexInner(node);
}

function latex(node: MathNode, parentPrec: number, side: 'left' | 'right'): string {
  const s = latexInner(node);
  return wrapIfNeeded(node, s, parentPrec, side);
}

function latexInner(node: MathNode): string {
  switch (node.type) {
    case 'number': {
      const v = node.value;
      if (v === Infinity) return '\\infty';
      if (v === -Infinity) return '-\\infty';
      if (Number.isNaN(v)) return '\\text{undefined}';
      return formatNumber(v);
    }
    case 'variable':
      return GREEK[node.name] ?? escapeVar(node.name);
    case 'constant':
      if (node.name === 'pi') return '\\pi';
      if (node.name === 'tau') return '\\tau';
      return 'e';
    case 'unary':
      return node.op === '-' ? `-${latex(node.operand, PREC.add, 'right')}` : latex(node.operand, PREC.primary, 'left');
    case 'factorial':
      return `${latex(node.operand, PREC.postfix, 'left')}!`;
    case 'binary': {
      const { op, left, right } = node;
      if (op === '+') {
        return `${latex(left, PREC.add, 'left')} + ${latex(right, PREC.add, 'right')}`;
      }
      if (op === '-') {
        return `${latex(left, PREC.add, 'left')} - ${latex(right, PREC.add, 'right')}`;
      }
      if (op === '*') {
        // (-2)·x reads better as -2x
        if (left.type === 'unary' && left.op === '-' && left.operand.type === 'number') {
          return `-${formatNumber(left.operand.value)}${sep({ type: 'number', value: left.operand.value }, right)}${latex(right, PREC.mul, 'right')}`;
        }
        return `${latex(left, PREC.mul, 'left')}${sep(left, right)}${latex(right, PREC.mul, 'right')}`;
      }
      if (op === '/') {
        // Mul-level precedence: sums keep parens, powers like x² do not.
        return `\\frac{${latex(left, PREC.mul, 'left')}}{${latex(right, PREC.mul, 'right')}}`;
      }
      // power — exponent is grouped by braces, so no parens needed inside
      const base = latex(left, PREC.pow, 'left');
      const exp = latexInner(right);
      if (left.type === 'call' && isSimpleExponent(right)) {
        return `${callLatex(left)}^{${exp}}`;
      }
      return `${base}^{${exp}}`;
    }
    case 'call': {
      if (node.name === 'sqrt') {
        return `\\sqrt{${latex(node.args[0], PREC.primary, 'left')}}`;
      }
      if (node.name === 'abs') {
        return `\\left|${latex(node.args[0], PREC.primary, 'left')}\\right|`;
      }
      return callLatex(node);
    }
  }
}

function callLatex(node: Extract<MathNode, { type: 'call' }>): string {
  const name = FN_LATEX[node.name] ?? (node.name === 'min' ? '\\min' : node.name === 'max' ? '\\max' : '\\mathrm{' + node.name + '}');
  const args = node.args.map((a) => latex(a, PREC.primary, 'left')).join(', ');
  if (node.name === 'abs') return `\\left|${args}\\right|`;
  if (node.name === 'sqrt') return `\\sqrt{${args}}`;
  return `${name}\\left(${args}\\right)`;
}

function isSimpleExponent(node: MathNode): boolean {
  return (
    node.type === 'number' ||
    (node.type === 'unary' && node.op === '-' && node.operand.type === 'number')
  );
}

function sep(left: MathNode, right: MathNode): string {
  // Juxtapose when sensible: 2x, 2(x+1), 2π — use \cdot otherwise.
  const lNum = left.type === 'number';
  const lVar = left.type === 'variable' || left.type === 'constant';
  const rVar = right.type === 'variable' || right.type === 'constant';
  const lParen = left.type === 'binary' || left.type === 'call';
  const rParen = right.type === 'binary' || right.type === 'call';
  if ((lNum && (rVar || rParen)) || (lVar && rVar) || (lParen && rParen)) return '';
  return '\\cdot ';
}

function wrapIfNeeded(node: MathNode, s: string, parentPrec: number, side: 'left' | 'right'): string {
  let prec = PREC.primary;
  switch (node.type) {
    case 'binary':
      prec = node.op === '+' || node.op === '-' ? PREC.add : node.op === '^' ? PREC.pow : PREC.mul;
      break;
    case 'unary':
      prec = PREC.add;
      break;
    case 'factorial':
      prec = PREC.postfix;
      break;
    case 'call':
    case 'number':
    case 'variable':
    case 'constant':
      prec = PREC.primary;
      break;
  }
  if (prec >= parentPrec) return s;
  // Equal precedence on the right side of '-' or '/' or '^' needs parens
  if (prec === parentPrec && side === 'right' && node.type === 'binary') return `\\left(${s}\\right)`;
  if (prec < parentPrec) return `\\left(${s}\\right)`;
  return s;
}

function escapeVar(name: string): string {
  // Multi-character names render upright; single letters italic by default.
  if (/^[A-Za-z]$/.test(name)) return name;
  return `\\mathrm{${name}}`;
}

/* ------------------------------------------------------------
   AST → Mathly input string (round-trippable by our parser)
   Used for "try its derivative" and similar actions.
   ------------------------------------------------------------ */

export function nodeToInput(node: MathNode): string {
  switch (node.type) {
    case 'number':
      if (node.value === Infinity) return 'inf';
      if (node.value === -Infinity) return '-inf';
      return String(node.value);
    case 'variable':
      return node.name;
    case 'constant':
      return node.name === 'pi' ? 'pi' : node.name === 'tau' ? 'tau' : 'e';
    case 'unary':
      return node.op === '-' ? `-(${nodeToInput(node.operand)})` : nodeToInput(node.operand);
    case 'factorial':
      return `${nodeToInput(node.operand)}!`;
    case 'binary': {
      const l = nodeToInput(node.left);
      const r = nodeToInput(node.right);
      if (node.op === '^') {
        const baseNeedsParens = node.left.type === 'binary';
        return `${baseNeedsParens ? `(${l})` : l}^${node.right.type === 'number' ? r : `(${r})`}`;
      }
      const lNeeds = node.left.type === 'binary' && (node.left.op === '+' || node.left.op === '-');
      const rNeeds = node.right.type === 'binary' && (node.right.op === '+' || node.right.op === '-');
      if (node.op === '+') return `${lNeeds ? `(${l})` : l} + ${rNeeds ? `(${r})` : r}`;
      if (node.op === '-') return `${lNeeds ? `(${l})` : l} - ${rNeeds ? `(${r})` : r}`;
      if (node.op === '*') return `${parenIf(node.left, l)}${parenIf(node.right, r)}`;
      if (node.op === '/') return `(${l})/(${r})`;
      return '';
    }
    case 'call': {
      const args = node.args.map(nodeToInput).join(', ');
      if (node.name === 'abs') return `|${args}|`;
      return `${node.name}(${args})`;
    }
  }
}

function parenIf(node: MathNode, s: string): string {
  if (node.type === 'binary' || node.type === 'unary') return `(${s})`;
  return s;
}