/* ============================================================
   Mathly math-core: analysis
   Deterministically computes mathematical properties:
   polynomials → degree, roots, vertex, intercepts, extrema
   trig → amplitude, period, phase shift
   exponential → base, growth/decay, asymptote
   rational → asymptotes, intercepts
   Only properties that are mathematically valid are shown.
   ============================================================ */

import { MathNode } from './types';
import {
  hasVariableDivision,
  polyConstant,
  polyDegree,
  polynomialCoefficients,
  PolyCoeffs,
} from './polynomial';
import { numericRoots, polyRoots } from './roots';
import { evaluate } from './evaluator';
import { nodeToLatex } from './latex';
import { formatNumber, formatSigned } from './format';
import { simplify } from './simplify';

export type ExpressionKind =
  | 'constant'
  | 'linear'
  | 'quadratic'
  | 'cubic'
  | 'quartic'
  | 'polynomial'
  | 'rational'
  | 'trig'
  | 'exponential'
  | 'logarithmic'
  | 'radical'
  | 'abs'
  | 'other';

export interface AnalysisItem {
  key: string;
  value: string;
  latex?: string;
}

export type MarkerKind = 'root' | 'vertex' | 'critical' | 'inflection' | 'intersection' | 'hole';

export interface GraphMarker {
  type: MarkerKind;
  x: number;
  y: number;
  label?: string;
}

export interface AnalysisResult {
  kind: ExpressionKind;
  kindLabel: string;
  items: AnalysisItem[];
  keyFacts: string[];
  derivativeLatex?: string;
  derivativeAst?: MathNode;
  markers: GraphMarker[];
}

interface Fn { (x: number): number }

export function analyzeExpression(
  ast: MathNode,
  params: Record<string, number> = {},
  variable = 'x'
): AnalysisResult {
  const f: Fn = (x) => evaluate(ast, { x, params });
  const fAt = (x: number): number => f(x);

  const coeffs = polynomialCoefficients(ast, params, variable);

  if (coeffs) {
    return analyzePolynomial(ast, coeffs, fAt);
  }

  // Non-polynomial structure
  const trig = matchTrig(ast, params);
  if (trig) return analyzeTrig(trig, fAt, ast);

  const exp = matchExponential(ast, params);
  if (exp) return analyzeExponential(exp, fAt, ast);

  const log = matchLog(ast, params);
  if (log) return analyzeLog(log, fAt, ast);

  const radical = matchRadical(ast, params);
  if (radical) return analyzeRadical(radical, fAt, ast);

  if (containsAbs(ast)) return analyzeAbs(ast, fAt);

  if (hasVariableDivision(ast, variable)) {
    const rat = analyzeRational(ast, fAt, params);
    if (rat) return rat;
  }

  return analyzeOther(ast);
}

/* ------------------------------------------------------------
   Polynomials
   ------------------------------------------------------------ */

function analyzePolynomial(ast: MathNode, coeffs: PolyCoeffs, fAt: Fn): AnalysisResult {
  const degree = polyDegree(coeffs);
  const yInt = polyConstant(coeffs);
  const kind: ExpressionKind =
    degree <= 0
      ? 'constant'
      : degree === 1
        ? 'linear'
        : degree === 2
          ? 'quadratic'
          : degree === 3
            ? 'cubic'
            : degree === 4
              ? 'quartic'
              : 'polynomial';

  const kindLabel =
    degree <= 0
      ? 'Constant function'
      : degree === 1
        ? 'Linear function'
        : degree === 2
          ? 'Quadratic function'
          : degree === 3
            ? 'Cubic function'
            : degree === 4
              ? 'Quartic function'
              : `Polynomial of degree ${degree}`;

  const items: AnalysisItem[] = [];
  const keyFacts: string[] = [];
  const markers: GraphMarker[] = [];

  if (degree === 0) {
    items.push({ key: 'Value', value: formatNumber(yInt) });
    keyFacts.push(
      `y stays at ${formatNumber(yInt)} for every value of x — the graph is a horizontal line.`
    );
    return finish({ kind, kindLabel, items, keyFacts, markers }, ast, degree);
  }

  items.push({ key: 'Degree', value: String(degree) });
  items.push({ key: 'Y-intercept', value: `(${formatNumber(0)}, ${formatNumber(yInt)})` });

  if (degree === 1) {
    const m = coeffs.get(1) ?? 0;
    items.push({ key: 'Slope', value: formatNumber(m) });
    if (Math.abs(m) > 1e-12) {
      const xInt = -yInt / m;
      items.push({ key: 'X-intercept', value: `(${formatNumber(xInt)}, 0)` });
      markers.push({ type: 'root', x: xInt, y: 0 });
      keyFacts.push(
        `The graph is a straight line with slope ${formatNumber(m)}. It crosses the y-axis at ${formatNumber(yInt)}.`
      );
      keyFacts.push(
        `It crosses the x-axis at x = ${formatNumber(xInt)}.`
      );
    } else {
      keyFacts.push(`The graph is a horizontal line at y = ${formatNumber(yInt)} (slope 0).`);
    }
    return finish({ kind, kindLabel, items, keyFacts, markers }, ast, degree);
  }

  if (degree === 2) {
    const a = coeffs.get(2) ?? 0;
    const b = coeffs.get(1) ?? 0;
    const c = coeffs.get(0) ?? 0;
    const disc = b * b - 4 * a * c;
    const vertexX = -b / (2 * a);
    const vertexY = fAt(vertexX);
    const opens = a > 0 ? 'upward' : 'downward';

    items.push({ key: 'Opens', value: opens });
    items.push({ key: 'Vertex', value: `(${formatNumber(vertexX)}, ${formatNumber(vertexY)})` });
    items.push({ key: 'Axis of symmetry', value: `x = ${formatNumber(vertexX)}` });

    const roots = polyRoots(coeffs);
    if (roots.length === 2) {
      items.push({ key: 'Roots', value: roots.map((r) => formatNumber(r)).join(', ') });
      for (const r of roots) markers.push({ type: 'root', x: r, y: fAt(r) });
    } else if (roots.length === 1) {
      items.push({ key: 'Root', value: formatNumber(roots[0]) });
      markers.push({ type: 'root', x: roots[0], y: fAt(roots[0]) });
    } else {
      items.push({ key: 'Roots', value: 'None (real)' });
    }

    markers.push({ type: 'vertex', x: vertexX, y: vertexY });

    keyFacts.push(`This is a quadratic function — its graph is a parabola opening ${opens}.`);
    if (roots.length === 2) {
      keyFacts.push(
        `It crosses the x-axis at x = ${formatNumber(roots[0])} and x = ${formatNumber(roots[1])}.`
      );
    } else if (roots.length === 1) {
      keyFacts.push(`It just touches the x-axis at x = ${formatNumber(roots[0])}.`);
    } else {
      keyFacts.push(`It never touches the x-axis — the parabola stays ${a > 0 ? 'above' : 'below'} it.`);
    }
    keyFacts.push(
      `Its turning point (vertex) is at (${formatNumber(vertexX)}, ${formatNumber(vertexY)}), the ${a > 0 ? 'lowest' : 'highest'} point of the graph.`
    );
    if (Math.abs(a) > 0 && disc >= 0) {
      const r1 = roots[0];
      const r2 = roots.length === 2 ? roots[1] : vertexX;
      const mid = (r1 + r2) / 2;
      const sign = fAt(mid) > 0 ? 'positive' : 'negative';
      keyFacts.push(`The parabola is ${sign} between its roots.`);
    }
    return finish({ kind, kindLabel, items, keyFacts, markers }, ast, degree);
  }

  // degree >= 3
  const roots = polyRoots(coeffs);
  if (roots.length > 0) {
    items.push({ key: 'Real roots', value: roots.map((r) => formatNumber(r)).join(', ') });
    for (const r of roots) markers.push({ type: 'root', x: r, y: fAt(r) });
  } else {
    items.push({ key: 'Real roots', value: 'None' });
  }

  if (degree === 3) {
    const a = coeffs.get(3) ?? 0;

    // Critical points from f'(x) = 0
    const derivCoeffs = derivativeCoeffs(coeffs);
    const critRoots = polyRoots(derivCoeffs);
    const critical: { x: number; y: number; kind: 'max' | 'min' }[] = [];
    for (const x of critRoots) {
      const y = fAt(x);
      if (!Number.isFinite(y)) continue;
      const second = secondDerivativeAt(coeffs, x);
      critical.push({ x, y, kind: second > 0 ? 'min' : 'max' });
      markers.push({ type: 'critical', x, y, label: second > 0 ? 'min' : 'max' });
    }
    if (critical.length > 0) {
      items.push({
        key: critical.length === 1 ? 'Critical point' : 'Critical points',
        value: critical
          .map((c) => `${c.kind === 'max' ? 'max' : 'min'} (${formatNumber(c.x)}, ${formatNumber(c.y)})`)
          .join('; '),
      });
    }

    // Inflection point from f''(x) = 0
    const secondCoeffs = derivativeCoeffs(derivCoeffs);
    const infl = polyRoots(secondCoeffs);
    if (infl.length > 0 && Math.abs(6 * a) > 1e-12) {
      const x = infl[0];
      const y = fAt(x);
      items.push({ key: 'Inflection point', value: `(${formatNumber(x)}, ${formatNumber(y)})` });
      markers.push({ type: 'inflection', x, y });
    }

    if (roots.length === 3) {
      keyFacts.push(
        `This cubic crosses the x-axis at x = ${roots.map((r) => formatNumber(r)).join(', ')}.`
      );
    }
    keyFacts.push(`It has ${critical.length} turning point${critical.length === 1 ? '' : 's'}.`);
    if (Math.abs(a) > 0) {
      keyFacts.push(
        `As x grows large, the graph ${a > 0 ? 'rises' : 'falls'} without limit (leading coefficient ${formatNumber(a)}).`
      );
    }
  } else {
    keyFacts.push(`This polynomial of degree ${degree} has ${roots.length} real root${roots.length === 1 ? '' : 's'}.`);
    keyFacts.push(`As x grows large, the graph behaves like its leading term.`);
  }

  return finish({ kind, kindLabel, items, keyFacts, markers }, ast, degree);
}

function finish(
  base: Omit<AnalysisResult, 'derivativeLatex' | 'derivativeAst'>,
  ast: MathNode,
  _degree: number
): AnalysisResult {
  const result: AnalysisResult = {
    ...base,
    derivativeLatex: undefined,
    derivativeAst: undefined,
    items: [...base.items, { key: 'Type', value: base.kindLabel }],
  };
  const deriv = differentiate(ast);
  if (deriv) {
    const cleaned = simplify(deriv);
    result.derivativeAst = cleaned;
    try {
      result.derivativeLatex = nodeToLatex(cleaned);
    } catch {
      // leave undefined
    }
  }
  return result;
}

function derivativeCoeffs(coeffs: PolyCoeffs): PolyCoeffs {
  const out = new Map<number, number>();
  for (const [d, v] of coeffs) {
    if (d > 0) out.set(d - 1, v * d);
  }
  return out;
}

function secondDerivativeAt(coeffs: PolyCoeffs, x: number): number {
  const d = derivativeCoeffs(coeffs);
  const d2 = derivativeCoeffs(d);
  let acc = 0;
  for (const [deg, v] of d2) acc += v * Math.pow(x, deg);
  return acc;
}

/* ------------------------------------------------------------
   Trigonometric pattern:  A · trig(b·x + c) + d
   ------------------------------------------------------------ */

interface TrigMatch {
  fn: 'sin' | 'cos' | 'tan';
  A: number;
  b: number;
  c: number;
  d: number;
}

function matchTrig(node: MathNode, params: Record<string, number>): TrigMatch | null {
  const terms = splitSum(node);
  let d = 0;
  let trigTerm: { coeff: number; rest: MathNode } | null = null;
  for (const term of terms) {
    if (term.rest.type === 'number') {
      d += term.coeff * term.rest.value;
    } else if (
      !trigTerm &&
      term.rest.type === 'call' &&
      ['sin', 'cos', 'tan'].includes(term.rest.name) &&
      term.rest.args.length === 1
    ) {
      trigTerm = term;
    } else {
      return null;
    }
  }
  if (!trigTerm) return null;
  const call = trigTerm.rest;
  if (call.type !== 'call') return null;
  const A = trigTerm.coeff;
  const lin = linearForm(call.args[0], params);
  if (!lin || Math.abs(lin.m) < 1e-12) return null;
  return { fn: call.name as 'sin' | 'cos' | 'tan', A, b: lin.m, c: lin.b, d };
}

/**
 * Split an expression into additive terms. Each term is a numeric
 * coefficient times a "rest" expression. Pure constants come back as
 * { coeff, rest: number(1) } so consumers accumulate d += coeff.
 */
function splitSum(node: MathNode): { coeff: number; rest: MathNode }[] {
  const out: { coeff: number; rest: MathNode }[] = [];
  const walk = (n: MathNode, sign: number): void => {
    if (n.type === 'binary' && (n.op === '+' || n.op === '-')) {
      walk(n.left, sign);
      walk(n.right, n.op === '-' ? -sign : sign);
      return;
    }
    if (n.type === 'unary' && n.op === '-') {
      walk(n.operand, -sign);
      return;
    }
    if (n.type === 'unary' && n.op === '+') {
      walk(n.operand, sign);
      return;
    }

    let coeff = sign;
    let rest = n;

    if (n.type === 'binary' && n.op === '*') {
      const parts: MathNode[] = [];
      const stack: MathNode[] = [n];
      while (stack.length) {
        const cur = stack.pop()!;
        if (cur.type === 'binary' && cur.op === '*') {
          stack.push(cur.left);
          stack.push(cur.right);
        } else {
          parts.push(cur);
        }
      }
      let factor = 1;
      const restParts: MathNode[] = [];
      for (const p of parts) {
        const v = constValueOf(p, {});
        if (v !== null) factor *= v;
        else restParts.push(p);
      }
      coeff *= factor;
      rest =
        restParts.length === 1
          ? restParts[0]
          : restParts.length > 1
            ? restParts.reduce(
                (a, b): MathNode => ({ type: 'binary', op: '*', left: a, right: b })
              )
            : { type: 'number', value: 1 };
    } else {
      const v = constValueOf(n, {});
      if (v !== null) {
        // Pure constant term
        out.push({ coeff: sign * v, rest: { type: 'number', value: 1 } });
        return;
      }
    }
    out.push({ coeff, rest });
  };
  walk(node, 1);
  return out;
}

function containsX(n: MathNode): boolean {
  switch (n.type) {
    case 'variable':
      return true;
    case 'number':
    case 'constant':
      return false;
    case 'unary':
    case 'factorial':
      return containsX((n as { operand: MathNode }).operand);
    case 'binary':
      return containsX(n.left) || containsX(n.right);
    case 'call':
      return n.args.some(containsX);
  }
}

function constValueOf(n: MathNode, params: Record<string, number>): number | null {
  // A number, or a constant, or a param lookup — no x allowed
  if (containsX(n)) return null;
  try {
    const v = evaluate(n, { x: 0, params });
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** Match m·x + b. */
function linearForm(node: MathNode, params: Record<string, number>): { m: number; b: number } | null {
  const coeffs = polynomialCoefficients(node, params);
  if (!coeffs) return null;
  const deg = polyDegree(coeffs);
  if (deg > 1) return null;
  return { m: coeffs.get(1) ?? 0, b: coeffs.get(0) ?? 0 };
}

function analyzeTrig(m: TrigMatch, fAt: Fn, ast: MathNode): AnalysisResult {
  const { fn, A, b, c, d } = m;
  const absA = Math.abs(A);
  const period = fn === 'tan' ? Math.PI / Math.abs(b) : (2 * Math.PI) / Math.abs(b);
  const phaseShift = -c / b;
  const items: AnalysisItem[] = [];
  const keyFacts: string[] = [];
  const markers: GraphMarker[] = [];

  items.push({ key: 'Function', value: fn });
  if (fn !== 'tan') {
    items.push({ key: 'Amplitude', value: formatNumber(absA) });
  }
  items.push({ key: 'Period', value: formatNumber(period) });
  items.push({ key: 'Phase shift', value: formatNumber(phaseShift) });
  if (d !== 0) items.push({ key: 'Vertical shift', value: formatNumber(d) });
  if (fn !== 'tan') {
    items.push({ key: 'Range', value: `[${formatNumber(d - absA)}, ${formatNumber(d + absA)}]` });
  } else {
    items.push({ key: 'Asymptotes', value: `x = ${formatNumber((Math.PI / 2 - c) / b)} + πk` });
  }

  keyFacts.push(
    fn === 'sin'
      ? `This sine wave oscillates between ${formatNumber(d - absA)} and ${formatNumber(d + absA)}.`
      : fn === 'cos'
        ? `This cosine wave oscillates between ${formatNumber(d - absA)} and ${formatNumber(d + absA)}.`
        : `This tangent wave repeats every ${formatNumber(period)} units, with vertical asymptotes where it blows up.`
  );
  keyFacts.push(
    `One full cycle takes ${formatNumber(period)} units of x (its period).`
  );
  if (Math.abs(phaseShift) > 1e-12) {
    keyFacts.push(`The wave is shifted ${formatSigned(phaseShift)} units along the x-axis.`);
  }

  // Zeros of sin/cos within a sensible window (useful for the graph)
  if (fn === 'sin' || fn === 'cos') {
    const start = fn === 'sin' ? -c : Math.PI / 2 - c;
    const zeros: number[] = [];
    for (let k = -8; k <= 8; k++) {
      const z = (start + k * Math.PI) / b;
      if (Math.abs(z) < 100 && Math.abs(fAt(z)) < 1e-6) zeros.push(z);
    }
    if (zeros.length > 0) {
      items.push({ key: 'Zeros', value: `x = ${zeros.slice(0, 6).map((z) => formatNumber(z)).join(', ')}${zeros.length > 6 ? ', …' : ''}` });
      for (const z of zeros.slice(0, 8)) {
        markers.push({ type: 'root', x: z, y: fAt(z) });
      }
    }
  }

  return finish({ kind: 'trig', kindLabel: 'Trigonometric function', items, keyFacts, markers }, ast, 0);
}

/* ------------------------------------------------------------
   Exponential pattern:  A · base^(k·x) + d   (or e^(k·x))
   ------------------------------------------------------------ */

interface ExpMatch {
  A: number;
  base: number;
  k: number;
  d: number;
}

function matchExponential(node: MathNode, params: Record<string, number>): ExpMatch | null {
  const terms = splitSum(node);
  let d = 0;
  let power: { coeff: number; base: number; k: number } | null = null;
  for (const term of terms) {
    if (term.rest.type === 'number') {
      d += term.coeff * term.rest.value;
    } else if (!power && term.rest.type === 'binary' && term.rest.op === '^') {
      const baseVal = constValueOf(term.rest.left, params);
      const exp = term.rest.right;
      if (baseVal === null || baseVal <= 0 || baseVal === 1) return null;
      const lin = linearForm(exp, params);
      if (!lin || Math.abs(lin.m) < 1e-12) return null;
      // A·base^(m·x + b) = (A·base^b) · (base^m)^x
      power = { coeff: term.coeff * Math.pow(baseVal, lin.b), base: baseVal, k: lin.m };
    } else {
      return null;
    }
  }
  if (!power) return null;
  return { A: power.coeff, base: power.base, k: power.k, d };
}

function analyzeExponential(e: ExpMatch, fAt: Fn, ast: MathNode): AnalysisResult {
  const { base, k, d } = e;
  const growth = base > 1 || (Math.abs(base - Math.E) < 1e-9 && k > 0) || (base < 1 && k < 0);
  const items: AnalysisItem[] = [];
  const keyFacts: string[] = [];
  const markers: GraphMarker[] = [];

  items.push({ key: 'Base', value: formatNumber(base) });
  items.push({ key: 'Behavior', value: growth ? 'Exponential growth' : 'Exponential decay' });
  items.push({ key: 'Horizontal asymptote', value: `y = ${formatNumber(d)}` });
  items.push({ key: 'Y-intercept', value: `(${formatNumber(0)}, ${formatNumber(fAt(0))})` });

  keyFacts.push(
    growth
      ? `This function grows exponentially — each step in x multiplies the value by about ${formatNumber(Math.pow(base, k))}.`
      : `This function decays exponentially — each step in x divides the value by about ${formatNumber(1 / Math.pow(base, k))}.`
  );
  keyFacts.push(
    `It never quite reaches y = ${formatNumber(d)} — that line is a horizontal asymptote.`
  );

  return finish({ kind: 'exponential', kindLabel: 'Exponential function', items, keyFacts, markers }, ast, 0);
}

/* ------------------------------------------------------------
   Logarithmic pattern:  A · ln(b·x + c) + d
   ------------------------------------------------------------ */

interface LogMatch {
  A: number;
  b: number;
  c: number;
  d: number;
}

function matchLog(node: MathNode, params: Record<string, number>): LogMatch | null {
  const terms = splitSum(node);
  let d = 0;
  let logTerm: { coeff: number; rest: MathNode } | null = null;
  for (const term of terms) {
    if (term.rest.type === 'number') {
      d += term.coeff * term.rest.value;
    } else if (
      !logTerm &&
      term.rest.type === 'call' &&
      (term.rest.name === 'ln' || term.rest.name === 'log') &&
      term.rest.args.length === 1
    ) {
      logTerm = term;
    } else {
      return null;
    }
  }
  if (!logTerm) return null;
  if (logTerm.rest.type !== 'call') return null;
  const lin = linearForm(logTerm.rest.args[0], params);
  if (!lin || Math.abs(lin.m) < 1e-12) return null;
  return { A: logTerm.coeff, b: lin.m, c: lin.b, d };
}

function analyzeLog(m: LogMatch, fAt: Fn, ast: MathNode): AnalysisResult {
  const { A, b, c } = m;
  const asymptote = -c / b;
  const domain = b > 0 ? `x > ${formatNumber(asymptote)}` : `x < ${formatNumber(asymptote)}`;
  const items: AnalysisItem[] = [];
  const keyFacts: string[] = [];

  items.push({ key: 'Domain', value: domain });
  items.push({ key: 'Vertical asymptote', value: `x = ${formatNumber(asymptote)}` });
  items.push({ key: 'Behavior', value: A > 0 ? 'Increasing' : 'Decreasing' });
  if (0 > asymptote === (b > 0) || (b < 0 && 0 < asymptote)) {
    items.push({ key: 'Y-intercept', value: `(${formatNumber(0)}, ${formatNumber(fAt(0))})` });
  }

  keyFacts.push(`Logarithms only exist for ${domain} — the graph has a vertical asymptote at x = ${formatNumber(asymptote)}.`);
  keyFacts.push(
    A > 0
      ? 'The graph rises, but more and more slowly — logs grow without bound yet never speed up.'
      : 'The graph falls as x grows — it approaches the asymptote from below.'
  );

  return finish({ kind: 'logarithmic', kindLabel: 'Logarithmic function', items, keyFacts, markers: [] }, ast, 0);
}

/* ------------------------------------------------------------
   Radical pattern:  A · √(b·x + c) + d
   ------------------------------------------------------------ */

interface RadicalMatch {
  A: number;
  b: number;
  c: number;
  d: number;
}

function matchRadical(node: MathNode, params: Record<string, number>): RadicalMatch | null {
  const terms = splitSum(node);
  let d = 0;
  let sqrtTerm: { coeff: number; rest: MathNode } | null = null;
  for (const term of terms) {
    if (term.rest.type === 'number') {
      d += term.coeff * term.rest.value;
    } else if (!sqrtTerm && term.rest.type === 'call' && term.rest.name === 'sqrt' && term.rest.args.length === 1) {
      sqrtTerm = term;
    } else {
      return null;
    }
  }
  if (!sqrtTerm) return null;
  if (sqrtTerm.rest.type !== 'call') return null;
  const lin = linearForm(sqrtTerm.rest.args[0], params);
  if (!lin || Math.abs(lin.m) < 1e-12) return null;
  return { A: sqrtTerm.coeff, b: lin.m, c: lin.b, d };
}

function analyzeRadical(m: RadicalMatch, fAt: Fn, ast: MathNode): AnalysisResult {
  const { A, b, c } = m;
  const start = -c / b;
  const domain = b > 0 ? `x ≥ ${formatNumber(start)}` : `x ≤ ${formatNumber(start)}`;
  const items: AnalysisItem[] = [];
  const keyFacts: string[] = [];
  const markers: GraphMarker[] = [];

  items.push({ key: 'Domain', value: domain });
  items.push({ key: 'Starting point', value: `(${formatNumber(start)}, ${formatNumber(fAt(start))})` });
  items.push({ key: 'Behavior', value: A > 0 ? 'Increasing' : 'Decreasing' });

  markers.push({ type: 'vertex', x: start, y: fAt(start) });
  keyFacts.push(`The square root is only real for ${domain} — the graph starts at (${formatNumber(start)}, ${formatNumber(fAt(start))}).`);
  keyFacts.push(
    A > 0
      ? 'The graph rises quickly at first, then flattens out.'
      : 'The graph falls quickly at first, then flattens out.'
  );

  return finish({ kind: 'radical', kindLabel: 'Radical (square root) function', items, keyFacts, markers }, ast, 0);
}

/* ------------------------------------------------------------
   Absolute value
   ------------------------------------------------------------ */

function containsAbs(node: MathNode): boolean {
  switch (node.type) {
    case 'call':
      if (node.name === 'abs') return true;
      return node.args.some(containsAbs);
    case 'binary':
      return containsAbs(node.left) || containsAbs(node.right);
    case 'unary':
    case 'factorial':
      return containsAbs((node as { operand: MathNode }).operand);
    default:
      return false;
  }
}

function analyzeAbs(ast: MathNode, fAt: Fn): AnalysisResult {
  const items: AnalysisItem[] = [];
  const keyFacts: string[] = [];
  const markers: GraphMarker[] = [];

  // Vertex: where the inside of the abs is zero — find numerically
  const absNodes: { node: MathNode; arg: MathNode }[] = [];
  const walk = (n: MathNode): void => {
    if (n.type === 'call' && n.name === 'abs' && n.args.length === 1) {
      absNodes.push({ node: n, arg: n.args[0] });
    }
    if (n.type === 'binary') {
      walk(n.left);
      walk(n.right);
    }
    if (n.type === 'unary' || n.type === 'factorial') walk((n as { operand: MathNode }).operand);
    if (n.type === 'call') n.args.forEach(walk);
  };
  walk(ast);

  if (absNodes.length > 0) {
    const first = absNodes[0];
    const argCoeffs = polynomialCoefficients(first.arg);
    if (argCoeffs && polyDegree(argCoeffs) === 1) {
      const m = argCoeffs.get(1) ?? 0;
      const c = argCoeffs.get(0) ?? 0;
      const vertexX = -c / m;
      const vertexY = fAt(vertexX);
      items.push({ key: 'Vertex', value: `(${formatNumber(vertexX)}, ${formatNumber(vertexY)})` });
      markers.push({ type: 'vertex', x: vertexX, y: vertexY });
      keyFacts.push(`The absolute value folds the graph at (${formatNumber(vertexX)}, ${formatNumber(vertexY)}), creating a sharp V.`);
    }
  }

  items.push({ key: 'Domain', value: 'All real numbers' });
  items.push({ key: 'Range', value: 'y ≥ 0 (values are never negative)' });

  if (keyFacts.length === 0) {
    keyFacts.push('The absolute value turns negative outputs into positive ones — the graph bounces off the x-axis.');
  }

  return finish({ kind: 'abs', kindLabel: 'Absolute value function', items, keyFacts, markers }, ast, 0);
}

/* ------------------------------------------------------------
   Rational functions: p(x) / q(x)
   ------------------------------------------------------------ */

function analyzeRational(ast: MathNode, _fAt: Fn, params: Record<string, number>): AnalysisResult | null {
  // Try to view the whole expression as p/q (possibly with a constant offset)
  let num: MathNode | null = null;
  let den: MathNode | null = null;

  const trySplit = (node: MathNode): boolean => {
    if (node.type === 'binary' && node.op === '/') {
      num = node.left;
      den = node.right;
      return true;
    }
    return false;
  };

  if (!trySplit(ast)) {
    const terms = splitSum(ast);
    // find one division term; others must be constants
    for (const { rest } of terms) {
      if (rest.type === 'binary' && rest.op === '/') {
        if (num) return null;
        num = rest.left;
        den = rest.right;
      } else if (containsX(rest)) {
        return null;
      }
    }
  }
  if (!num || !den) return null;

  const numNode = num;
  const denNode = den;
  const p = polynomialCoefficients(numNode, params);
  const q = polynomialCoefficients(denNode, params);
  if (!p || !q) return null;

  const pDeg = polyDegree(p);
  const qDeg = polyDegree(q);
  const items: AnalysisItem[] = [];
  const keyFacts: string[] = [];
  const markers: GraphMarker[] = [];

  const vRoots = polyRoots(q);
  const holes = vRoots.filter((r) => Math.abs(evaluate(numNode, { x: r, params })) < 1e-9);
  const asymptotes = vRoots.filter((r) => !holes.includes(r));
  if (asymptotes.length > 0) {
    items.push({ key: asymptotes.length === 1 ? 'Vertical asymptote' : 'Vertical asymptotes', value: asymptotes.map((r) => `x = ${formatNumber(r)}`).join(', ') });
    keyFacts.push(`The function blows up near x = ${asymptotes.map((r) => formatNumber(r)).join(' and ')} — a vertical asymptote.`);
  }
  if (holes.length > 0) {
    items.push({ key: holes.length === 1 ? 'Hole' : 'Holes', value: holes.map((r) => `(${formatNumber(r)}, ${formatNumber(evaluate(numNode, { x: r, params }) / 1)})`).join(', ') });
  }

  const hAsym = horizontalAsymptote(p, q, pDeg, qDeg);
  if (hAsym !== null) {
    items.push({ key: 'Horizontal asymptote', value: `y = ${formatNumber(hAsym)}` });
    keyFacts.push(`As x grows very large, the graph settles toward y = ${formatNumber(hAsym)}.`);
  }

  const q0 = q.get(0) ?? 0;
  if (Math.abs(q0) > 1e-12) {
    const yInt = (p.get(0) ?? 0) / q0;
    items.push({ key: 'Y-intercept', value: `(${formatNumber(0)}, ${formatNumber(yInt)})` });
  }

  const pRoots = polyRoots(p).filter((r) => Math.abs(evaluate(denNode, { x: r, params })) > 1e-9);
  if (pRoots.length > 0) {
    items.push({ key: 'X-intercepts', value: pRoots.map((r) => `(${formatNumber(r)}, 0)`).join(', ') });
    for (const r of pRoots) markers.push({ type: 'root', x: r, y: 0 });
  }

  return finish({ kind: 'rational', kindLabel: 'Rational function', items, keyFacts, markers }, ast, 0);
}

function horizontalAsymptote(p: PolyCoeffs, q: PolyCoeffs, pDeg: number, qDeg: number): number | null {
  if (pDeg < qDeg) return 0;
  if (pDeg === qDeg) {
    const leadP = p.get(pDeg) ?? 0;
    const leadQ = q.get(qDeg) ?? 0;
    return leadQ !== 0 ? leadP / leadQ : null;
  }
  return null;
}

/* ------------------------------------------------------------
   Fallback
   ------------------------------------------------------------ */

function analyzeOther(ast: MathNode): AnalysisResult {
  const keyFacts: string[] = [
    'This expression combines several operations — drag to pan, scroll to zoom, and watch its shape change.',
  ];
  return finish({ kind: 'other', kindLabel: 'Custom expression', items: [], keyFacts, markers: [] }, ast, -1);
}

/* ------------------------------------------------------------
   Symbolic differentiation (used for derivative display + analysis)
   ------------------------------------------------------------ */

export function differentiate(node: MathNode, varName = 'x'): MathNode | null {
  switch (node.type) {
    case 'number':
    case 'constant':
      return { type: 'number', value: 0 };
    case 'variable':
      return node.name === varName ? { type: 'number', value: 1 } : { type: 'number', value: 0 };
    case 'unary': {
      const d = differentiate(node.operand, varName);
      return d ? { type: 'unary', op: node.op, operand: d } : null;
    }
    case 'factorial':
      return null;
    case 'binary': {
      const { op } = node;
      const dl = differentiate(node.left, varName);
      const dr = differentiate(node.right, varName);
      if (!dl || !dr) return null;
      if (op === '+' || op === '-') return { type: 'binary', op, left: dl, right: dr };
      if (op === '*') {
        // d/dx (uv) = u'v + uv'
        return {
          type: 'binary',
          op: '+',
          left: { type: 'binary', op: '*', left: dl, right: node.right },
          right: { type: 'binary', op: '*', left: node.left, right: dr },
        };
      }
      if (op === '/') {
        // (u'v - uv') / v²
        const num: MathNode = {
          type: 'binary',
          op: '-',
          left: { type: 'binary', op: '*', left: dl, right: node.right },
          right: { type: 'binary', op: '*', left: node.left, right: dr },
        };
        return {
          type: 'binary',
          op: '/',
          left: num,
          right: { type: 'binary', op: '^', left: node.right, right: { type: 'number', value: 2 } },
        };
      }
      if (op === '^') {
        // base constant, exponent variable: a^x → ln(a)·a^x
        if ((node.left.type === 'number' || node.left.type === 'constant') && node.right.type !== 'number') {
          const baseVal = node.left.value;
          if (baseVal > 0) {
            return {
              type: 'binary',
              op: '*',
              left: { type: 'number', value: Math.log(baseVal) },
              right: node,
            };
          }
          return null;
        }
        // base variable, exponent constant: x^n → n·x^(n-1)
        if (node.left.type !== 'number' && node.left.type !== 'constant' && node.right.type === 'number') {
          const n = node.right.value;
          return {
            type: 'binary',
            op: '*',
            left: { type: 'number', value: n },
            right: {
              type: 'binary',
              op: '^',
              left: node.left,
              right: { type: 'number', value: n - 1 },
            },
          };
        }
        return null;
      }
      return null;
    }
    case 'call': {
      const name = node.name;
      const arg = node.args[0];
      const dArg = differentiate(arg, varName);
      if (!dArg) return null;
      const dName = derivativeCall(name, arg);
      if (!dName) return null;
      return { type: 'binary', op: '*', left: dName, right: dArg };
    }
  }
}

function derivativeCall(name: string, arg: MathNode): MathNode | null {
  const mk = (expr: MathNode): MathNode => expr;
  switch (name) {
    case 'sin':
      return mk({ type: 'call', name: 'cos', args: [arg] });
    case 'cos':
      return mk({ type: 'unary', op: '-', operand: { type: 'call', name: 'sin', args: [arg] } });
    case 'tan':
      return mk({
        type: 'binary',
        op: '/',
        left: { type: 'number', value: 1 },
        right: { type: 'binary', op: '^', left: { type: 'call', name: 'cos', args: [arg] }, right: { type: 'number', value: 2 } },
      });
    case 'sqrt':
      return mk({
        type: 'binary',
        op: '/',
        left: { type: 'number', value: 1 },
        right: {
          type: 'binary',
          op: '*',
          left: { type: 'number', value: 2 },
          right: { type: 'call', name: 'sqrt', args: [arg] },
        },
      });
    case 'exp':
      return mk({ type: 'call', name: 'exp', args: [arg] });
    case 'ln':
      return mk({ type: 'binary', op: '/', left: { type: 'number', value: 1 }, right: arg });
    case 'log':
      return mk({
        type: 'binary',
        op: '/',
        left: { type: 'number', value: 1 },
        right: {
          type: 'binary',
          op: '*',
          left: arg,
          right: { type: 'call', name: 'ln', args: [{ type: 'number', value: 10 }] },
        },
      });
    case 'abs':
      return mk({ type: 'call', name: 'sign', args: [arg] });
    case 'asin':
      return mk({
        type: 'binary',
        op: '/',
        left: { type: 'number', value: 1 },
        right: { type: 'call', name: 'sqrt', args: [{ type: 'binary', op: '-', left: { type: 'number', value: 1 }, right: { type: 'binary', op: '^', left: arg, right: { type: 'number', value: 2 } } }] },
      });
    case 'acos':
      return mk({
        type: 'unary',
        op: '-',
        operand: {
          type: 'binary',
          op: '/',
          left: { type: 'number', value: 1 },
          right: { type: 'call', name: 'sqrt', args: [{ type: 'binary', op: '-', left: { type: 'number', value: 1 }, right: { type: 'binary', op: '^', left: arg, right: { type: 'number', value: 2 } } }] },
        },
      });
    case 'atan':
      return mk({
        type: 'binary',
        op: '/',
        left: { type: 'number', value: 1 },
        right: { type: 'binary', op: '+', left: { type: 'binary', op: '^', left: arg, right: { type: 'number', value: 2 } }, right: { type: 'number', value: 1 } },
      });
    case 'sinh':
      return mk({ type: 'call', name: 'cosh', args: [arg] });
    case 'cosh':
      return mk({ type: 'call', name: 'sinh', args: [arg] });
    case 'tanh':
      return mk({
        type: 'binary',
        op: '/',
        left: { type: 'number', value: 1 },
        right: { type: 'binary', op: '^', left: { type: 'call', name: 'cosh', args: [arg] }, right: { type: 'number', value: 2 } },
      });
    default:
      return null;
  }
}

/** Number of real roots of a polynomial, cached helper. */
export function realRootCount(coeffs: PolyCoeffs): number {
  return polyRoots(coeffs).length;
}

/** Convenience: analysis for intersection points between two functions over a viewport. */
export function intersections(
  f: Fn,
  g: Fn,
  xmin: number,
  xmax: number
): { x: number; y: number }[] {
  return numericRoots((x) => f(x) - g(x), xmin, xmax).map((x) => ({ x, y: f(x) }));
}