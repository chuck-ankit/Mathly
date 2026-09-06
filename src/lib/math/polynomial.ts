/* ============================================================
   Mathly math-core: polynomial coefficient extraction
   Walks the AST and collects coefficients per degree, treating
   non-plot variables as constants (substituted from params).
   Returns null when the expression is not a polynomial.
   ============================================================ */

import { MathNode } from './types';
import { defaultParamValue } from './evaluator';

export type PolyCoeffs = Map<number, number>;

export function polynomialCoefficients(
  node: MathNode,
  params: Record<string, number> = {},
  varName = 'x'
): PolyCoeffs | null {
  return collect(node, params, varName);
}

function collect(node: MathNode, params: Record<string, number>, varName: string): PolyCoeffs | null {
  switch (node.type) {
    case 'number':
      return new Map([[0, node.value]]);
    case 'constant':
      return new Map([[0, node.value]]);
    case 'variable': {
      if (node.name === varName) return new Map([[1, 1]]);
      const v = params[node.name] ?? defaultParamValue(node.name);
      return new Map([[0, v]]);
    }
    case 'unary': {
      const m = collect(node.operand, params, varName);
      if (!m) return null;
      if (node.op === '-') negate(m);
      return m;
    }
    case 'binary': {
      const op = node.op;
      if (op === '+' || op === '-') {
        const l = collect(node.left, params, varName);
        const r = collect(node.right, params, varName);
        if (!l || !r) return null;
        if (op === '-') negate(r);
        return addPoly(l, r);
      }
      if (op === '*') {
        const l = collect(node.left, params, varName);
        const r = collect(node.right, params, varName);
        if (!l || !r) return null;
        return mulPoly(l, r);
      }
      if (op === '/') {
        const l = collect(node.left, params, varName);
        const r = collect(node.right, params, varName);
        if (!l || !r) return null;
        if (r.size === 1 && r.has(0) && r.get(0) !== 0) {
          const c = r.get(0) as number;
          const out = new Map<number, number>();
          for (const [d, v] of l) out.set(d, v / c);
          return out;
        }
        return null; // rational expression
      }
      if (op === '^') {
        const expHasVar = containsVar(node.right, varName);
        if (expHasVar) return null; // exponential form — handled elsewhere
        const exp = constValue(node.right, params);
        if (exp === null || !Number.isFinite(exp)) return null;
        if (!Number.isInteger(exp)) {
          const baseVal = constValue(node.left, params);
          if (baseVal !== null && Number.isFinite(baseVal)) {
            return new Map([[0, Math.pow(baseVal, exp)]]);
          }
          return null; // radical form
        }
        if (node.left.type === 'variable' && node.left.name === varName) {
          return exp >= 0 && exp <= 64 ? new Map([[exp, 1]]) : null;
        }
        // Polynomial base raised to an integer power: (x-2)²
        const basePoly = collect(node.left, params, varName);
        if (basePoly && exp >= 0 && exp <= 8) {
          let out: PolyCoeffs = new Map([[0, 1]]);
          for (let i = 0; i < exp; i++) out = mulPoly(out, basePoly);
          return out;
        }
        const baseVal = constValue(node.left, params);
        if (baseVal !== null && Number.isFinite(baseVal)) {
          return new Map([[0, Math.pow(baseVal, exp)]]);
        }
        return null;
      }
      return null;
    }
    default:
      return null;
  }
}

/** If the node is a numeric constant (possibly via params), return it. */
export function constValue(node: MathNode, params: Record<string, number> = {}): number | null {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'constant':
      return node.value;
    case 'variable':
      return params[node.name] ?? defaultParamValue(node.name);
    case 'unary':
      if (node.op === '+') return constValue(node.operand, params);
      {
        const v = constValue(node.operand, params);
        return v === null ? null : -v;
      }
    case 'binary':
      if (node.op === '+' || node.op === '-' || node.op === '*') {
        const l = constValue(node.left, params);
        const r = constValue(node.right, params);
        if (l === null || r === null) return null;
        return node.op === '+' ? l + r : node.op === '-' ? l - r : l * r;
      }
      if (node.op === '^') {
        const l = constValue(node.left, params);
        const r = constValue(node.right, params);
        if (l === null || r === null) return null;
        return Math.pow(l, r);
      }
      return null;
    default:
      return null;
  }
}

function negate(m: PolyCoeffs): void {
  for (const [d, v] of m) m.set(d, -v);
}

function addPoly(a: PolyCoeffs, b: PolyCoeffs): PolyCoeffs {
  const out = new Map<number, number>();
  for (const [d, v] of a) out.set(d, v);
  for (const [d, v] of b) out.set(d, (out.get(d) ?? 0) + v);
  return out;
}

function mulPoly(a: PolyCoeffs, b: PolyCoeffs): PolyCoeffs {
  const out = new Map<number, number>();
  for (const [da, va] of a) {
    for (const [db, vb] of b) {
      const d = da + db;
      out.set(d, (out.get(d) ?? 0) + va * vb);
    }
  }
  return out;
}

/** Highest degree present with a non-zero coefficient. */
export function polyDegree(coeffs: PolyCoeffs): number {
  let max = -1;
  for (const [d, v] of coeffs) {
    if (v !== 0 && d > max) max = d;
  }
  return max;
}

export function polyConstant(coeffs: PolyCoeffs): number {
  return coeffs.get(0) ?? 0;
}

/** True if the AST contains any division where the denominator involves x. */
export function hasVariableDivision(node: MathNode, varName = 'x'): boolean {
  switch (node.type) {
    case 'number':
    case 'constant':
      return false;
    case 'variable':
      return false;
    case 'unary':
    case 'factorial':
      return hasVariableDivision((node as { operand: MathNode }).operand, varName);
    case 'binary':
      if (node.op === '/') {
        const denomHasVar = containsVar(node.right, varName);
        if (denomHasVar) return true;
      }
      return hasVariableDivision(node.left, varName) || hasVariableDivision(node.right, varName);
    case 'call':
      return node.args.some((a) => hasVariableDivision(a, varName));
  }
}

function containsVar(node: MathNode, varName: string): boolean {
  switch (node.type) {
    case 'variable':
      return node.name === varName;
    case 'number':
    case 'constant':
      return false;
    case 'unary':
    case 'factorial':
      return containsVar((node as { operand: MathNode }).operand, varName);
    case 'binary':
      return containsVar(node.left, varName) || containsVar(node.right, varName);
    case 'call':
      return node.args.some((a) => containsVar(a, varName));
  }
}