/* ============================================================
   Mathly math-core: evaluator
   A safe, deterministic interpreter over our AST.
   No eval, no user code execution.
   ============================================================ */

import { EvalContext, MathNode } from './types';

const DEFAULT_PARAM = (name: string): number => {
  // Sensible defaults so y = ax² + bx + c opens as y = x².
  if (name === 'a' || name === 'm' || name === 'k' || name === 'A') return 1;
  return 0;
};

export function defaultParamValue(name: string): number {
  return DEFAULT_PARAM(name);
}

export function evaluate(node: MathNode, ctx: EvalContext): number {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'constant':
      return node.value;
    case 'variable':
      if (node.name === 'x') return ctx.x;
      if (node.name === 'y') return ctx.y ?? 0;
      return ctx.params?.[node.name] ?? DEFAULT_PARAM(node.name);
    case 'unary':
      return node.op === '-' ? -evaluate(node.operand, ctx) : evaluate(node.operand, ctx);
    case 'factorial': {
      const v = evaluate(node.operand, ctx);
      if (Number.isNaN(v)) return v;
      return gamma(v + 1);
    }
    case 'binary': {
      const { op } = node;
      const l = evaluate(node.left, ctx);
      const r = evaluate(node.right, ctx);
      switch (op) {
        case '+':
          return l + r;
        case '-':
          return l - r;
        case '*':
          return l * r;
        case '/': {
          if (r === 0) {
            if (l === 0) return Number.NaN;
            return Math.sign(l) * Infinity;
          }
          return l / r;
        }
        case '^': {
          if (l < 0 && !Number.isInteger(r)) return Number.NaN;
          const p = Math.pow(l, r);
          // 0^0 → NaN per convention; 0^-k → Infinity
          if (Number.isNaN(p)) return Number.NaN;
          return p;
        }
      }
      return Number.NaN;
    }
    case 'call':
      return callFunction(node.name, node.args.map((a) => evaluate(a, ctx)));
  }
}

function callFunction(name: string, args: number[]): number {
  const [a, b] = args;
  switch (name) {
    case 'sin':
      return Math.sin(a);
    case 'cos':
      return Math.cos(a);
    case 'tan':
      return Math.tan(a);
    case 'asin':
      return a < -1 || a > 1 ? Number.NaN : Math.asin(a);
    case 'acos':
      return a < -1 || a > 1 ? Number.NaN : Math.acos(a);
    case 'atan':
      return Math.atan(a);
    case 'sinh':
      return Math.sinh(a);
    case 'cosh':
      return Math.cosh(a);
    case 'tanh':
      return Math.tanh(a);
    case 'sqrt':
      return a < 0 ? Number.NaN : Math.sqrt(a);
    case 'cbrt':
      return Math.cbrt(a);
    case 'abs':
      return Math.abs(a);
    case 'exp':
      return Math.exp(a);
    case 'ln':
      return a <= 0 ? Number.NaN : Math.log(a);
    case 'log':
      if (b === undefined) return a <= 0 ? Number.NaN : Math.log10(a);
      if (a <= 0 || b <= 0 || b === 1) return Number.NaN;
      return Math.log(a) / Math.log(b);
    case 'floor':
      return Math.floor(a);
    case 'ceil':
      return Math.ceil(a);
    case 'round':
      return Math.round(a);
    case 'sign':
      return Math.sign(a);
    case 'min':
      return Math.min(...args);
    case 'max':
      return Math.max(...args);
    default:
      return Number.NaN;
  }
}

/** Numeric derivative of a function at a point (central difference). */
export function numericDerivative(f: (x: number) => number, x: number): number {
  const h = Math.cbrt(Number.EPSILON) * Math.max(1, Math.abs(x)) * 10;
  const fp = f(x + h);
  const fm = f(x - h);
  if (!Number.isFinite(fp) || !Number.isFinite(fm)) return Number.NaN;
  return (fp - fm) / (2 * h);
}

/* Lanczos approximation of the Gamma function — gives x! for non-integers. */
const GAMMA_COEFFS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

export function gamma(z: number): number {
  if (z < 0.5) {
    const s = Math.sin(Math.PI * z);
    if (s === 0) return z === Math.round(z) ? Infinity : Number.NaN;
    return Math.PI / (s * gamma(1 - z));
  }
  z -= 1;
  let x = GAMMA_COEFFS[0];
  for (let i = 1; i < GAMMA_COEFFS.length; i++) {
    x += GAMMA_COEFFS[i] / (z + i);
  }
  const t = z + GAMMA_COEFFS.length - 1.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}