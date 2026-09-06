/* ============================================================
   Mathly math-core: algebraic simplification
   Turns raw symbolic output (derivatives) into something a
   human would actually write:

     -(0·x + 4·1) + 0  →  -4
     2·x^1 - 0·x + 4   →  2x - 4

   Handles constant folding, identity removal (x+0, x·1, x^1),
   double negation, distributing minus over sums, and collecting
   like terms (2x + 3x → 5x).
   ============================================================ */

import { MathNode } from './types';

interface Term {
  coeff: number;
  factors: MathNode[]; // non-numeric factors of the term's product
}

const num = (value: number): MathNode => ({ type: 'number', value });

const isZero = (n: MathNode): boolean => n.type === 'number' && n.value === 0;
const isOne = (n: MathNode): boolean => n.type === 'number' && n.value === 1;

/* ------------------------------------------------------------
   Public entry point
   ------------------------------------------------------------ */

export function simplify(node: MathNode): MathNode {
  switch (node.type) {
    case 'number':
    case 'variable':
    case 'constant':
      return node;

    case 'unary': {
      if (node.op === '+') return simplify(node.operand);
      return negate(simplify(node.operand));
    }

    case 'factorial': {
      const s = simplify(node.operand);
      if (s.type === 'number' && Number.isInteger(s.value) && s.value >= 0 && s.value <= 170) {
        let f = 1;
        for (let i = 2; i <= s.value; i++) f *= i;
        return num(f);
      }
      return { type: 'factorial', operand: s };
    }

    case 'call':
      return { type: 'call', name: node.name, args: node.args.map(simplify) };

    case 'binary': {
      const op = node.op;
      const l = simplify(node.left);
      const r = simplify(node.right);
      switch (op) {
        case '+':
          return sumToNode([...collect(l), ...collect(r)]);
        case '-':
          return sumToNode([...collect(l), ...negateTerms(collect(r))]);
        case '*': {
          if (isZero(l) || isZero(r)) return num(0);
          const el = extract(l);
          const er = extract(r);
          return productToNode(el.coeff * er.coeff, [...el.factors, ...er.factors]);
        }
        case '/': {
          if (isOne(r)) return l;
          if (isZero(l) && !isZero(r)) return num(0);
          if (l.type === 'number' && r.type === 'number' && r.value !== 0) {
            return num(l.value / r.value);
          }
          // -1/x² reads better than \frac{-1}{x²}
          if (l.type === 'number' && l.value < 0) {
            return { type: 'unary', op: '-', operand: { type: 'binary', op: '/', left: num(-l.value), right: r } };
          }
          return { type: 'binary', op: '/', left: l, right: r };
        }
        case '^': {
          if (isZero(r)) return num(1);
          if (isOne(r)) return l;
          if (l.type === 'number' && r.type === 'number') {
            const p = Math.pow(l.value, r.value);
            if (Number.isFinite(p)) return num(p);
          }
          return { type: 'binary', op: '^', left: l, right: r };
        }
      }
      return { type: 'binary', op, left: l, right: r };
    }
  }
}

/* ------------------------------------------------------------
   Negation
   ------------------------------------------------------------ */

function negate(n: MathNode): MathNode {
  if (n.type === 'number') return n.value === 0 ? n : num(-n.value);
  if (n.type === 'unary') return n.op === '-' ? n.operand : n;
  if (n.type === 'binary') {
    if (n.op === '+' || n.op === '-') return sumToNode(negateTerms(collect(n)));
    if (n.op === '*') {
      const e = extract(n);
      return productToNode(-e.coeff, e.factors);
    }
  }
  return { type: 'unary', op: '-', operand: n };
}

/* ------------------------------------------------------------
   Term collection: flatten a sum into signed terms
   ------------------------------------------------------------ */

function collect(node: MathNode): Term[] {
  switch (node.type) {
    case 'number':
      return [{ coeff: node.value, factors: [] }];
    case 'unary':
      return node.op === '-' ? negateTerms(collect(node.operand)) : collect(node.operand);
    case 'binary':
      if (node.op === '+' || node.op === '-') {
        const l = collect(node.left);
        const r = node.op === '-' ? negateTerms(collect(node.right)) : collect(node.right);
        return [...l, ...r];
      }
      if (node.op === '*') return [extractToTerm(extract(node))];
      return [{ coeff: 1, factors: [node] }];
    default:
      return [{ coeff: 1, factors: [node] }];
  }
}

function negateTerms(terms: Term[]): Term[] {
  return terms.map((t) => ({ coeff: -t.coeff, factors: t.factors }));
}

/* ------------------------------------------------------------
   Product extraction: pull the numeric coefficient out of a
   product (or any node), leaving non-numeric factors
   ------------------------------------------------------------ */

interface Extract {
  coeff: number;
  factors: MathNode[];
}

function extract(node: MathNode): Extract {
  switch (node.type) {
    case 'number':
      return { coeff: node.value, factors: [] };
    case 'unary':
      if (node.op === '-') {
        const e = extract(node.operand);
        return { coeff: -e.coeff, factors: e.factors };
      }
      return extract(node.operand);
    case 'binary':
      if (node.op === '*') {
        const l = extract(node.left);
        const r = extract(node.right);
        return { coeff: l.coeff * r.coeff, factors: [...l.factors, ...r.factors] };
      }
      return { coeff: 1, factors: [node] };
    default:
      return { coeff: 1, factors: [node] };
  }
}

const extractToTerm = (e: Extract): Term => ({ coeff: e.coeff, factors: e.factors });

/* ------------------------------------------------------------
   Rebuilding products and sums
   ------------------------------------------------------------ */

function productToNode(coeff: number, factors: MathNode[]): MathNode {
  const merged = mergeFactors(factors);
  if (coeff === 0) return num(0);
  if (merged.length === 0) return num(coeff);
  if (coeff === 1) return merged.length === 1 ? merged[0] : productChain(merged);
  if (coeff === -1) return { type: 'unary', op: '-', operand: merged.length === 1 ? merged[0] : productChain(merged) };
  if (coeff < 0) return negate(productToNode(-coeff, merged));
  return { type: 'binary', op: '*', left: num(coeff), right: merged.length === 1 ? merged[0] : productChain(merged) };
}

function productChain(factors: MathNode[]): MathNode {
  return factors.slice(1).reduce(
    (acc, f) => ({ type: 'binary' as const, op: '*' as const, left: acc, right: f }),
    factors[0]
  );
}

function sumToNode(terms: Term[]): MathNode {
  const buckets = new Map<string, Term>();
  for (const t of terms) {
    if (t.coeff === 0) continue;
    const key = t.factors.map(keyOf).join('\u0001');
    const b = buckets.get(key) ?? { coeff: 0, factors: t.factors };
    b.coeff += t.coeff;
    buckets.set(key, b);
  }
  const entries = [...buckets.values()].filter((b) => b.coeff !== 0);
  if (entries.length === 0) return num(0);

  let acc: MathNode | null = null;
  for (const e of entries) {
    const part = productToNode(e.coeff, e.factors);
    if (acc === null) {
      acc = part;
      continue;
    }
    if (part.type === 'number' && part.value < 0) {
      acc = { type: 'binary', op: '-', left: acc, right: num(-part.value) };
    } else if (part.type === 'unary' && part.op === '-') {
      acc = { type: 'binary', op: '-', left: acc, right: part.operand };
    } else {
      acc = { type: 'binary', op: '+', left: acc, right: part };
    }
  }
  return acc as MathNode;
}

/* ------------------------------------------------------------
   Factor merging: x·x → x², x²·x² → x⁴
   ------------------------------------------------------------ */

function mergeFactors(factors: MathNode[]): MathNode[] {
  const groups = new Map<string, MathNode[]>();
  for (const f of factors) {
    const k = keyOf(f);
    const g = groups.get(k) ?? [];
    g.push(f);
    groups.set(k, g);
  }
  const out: MathNode[] = [];
  for (const g of groups.values()) {
    if (g.length === 1) {
      out.push(g[0]);
      continue;
    }
    const first = g[0];
    if (first.type === 'binary' && first.op === '^' && first.right.type === 'number' && first.left.type !== 'number') {
      let exp = first.right.value;
      for (let i = 1; i < g.length; i++) {
        const gi = g[i];
        exp += gi.type === 'binary' && gi.op === '^' && gi.right.type === 'number' ? gi.right.value : 1;
      }
      out.push(exp === 1 ? first.left : { type: 'binary', op: '^', left: first.left, right: num(exp) });
    } else {
      out.push({ type: 'binary', op: '^', left: first, right: num(g.length) });
    }
  }
  return out;
}

/* ------------------------------------------------------------
   Structural key used to match like factors/terms
   ------------------------------------------------------------ */

function keyOf(n: MathNode): string {
  switch (n.type) {
    case 'number':
      return `n:${n.value}`;
    case 'variable':
      return `v:${n.name}`;
    case 'constant':
      return `c:${n.name}`;
    case 'unary':
      return `u${n.op}(${keyOf(n.operand)})`;
    case 'factorial':
      return `f(${keyOf(n.operand)})`;
    case 'binary':
      return `(${keyOf(n.left)}${n.op}${keyOf(n.right)})`;
    case 'call':
      return `${n.name}(${n.args.map(keyOf).join(',')})`;
  }
}