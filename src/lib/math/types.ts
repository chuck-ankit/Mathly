/* ============================================================
   Mathly math-core: shared types
   A deterministic, dependency-free math engine.
   ============================================================ */

export type BinaryOp = '+' | '-' | '*' | '/' | '^';

export type MathNode =
  | { type: 'number'; value: number }
  | { type: 'variable'; name: string }
  | { type: 'constant'; name: 'pi' | 'e' | 'tau'; value: number }
  | { type: 'unary'; op: '+' | '-'; operand: MathNode }
  | { type: 'binary'; op: BinaryOp; left: MathNode; right: MathNode }
  | { type: 'call'; name: string; args: MathNode[] }
  | { type: 'factorial'; operand: MathNode };

/** Variables that are treated as graph parameters (slider-able) vs the plot variable. */
export const PLOT_VARIABLES = ['x', 'theta'];

/** Named constants with their exact values. */
export const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
};

/** Supported unary functions (name → implementation). */
export const FUNCTIONS: Record<string, { minArgs: number; maxArgs: number }> = {
  sin: { minArgs: 1, maxArgs: 1 },
  cos: { minArgs: 1, maxArgs: 1 },
  tan: { minArgs: 1, maxArgs: 1 },
  asin: { minArgs: 1, maxArgs: 1 },
  acos: { minArgs: 1, maxArgs: 1 },
  atan: { minArgs: 1, maxArgs: 1 },
  sinh: { minArgs: 1, maxArgs: 1 },
  cosh: { minArgs: 1, maxArgs: 1 },
  tanh: { minArgs: 1, maxArgs: 1 },
  sqrt: { minArgs: 1, maxArgs: 1 },
  cbrt: { minArgs: 1, maxArgs: 1 },
  abs: { minArgs: 1, maxArgs: 1 },
  exp: { minArgs: 1, maxArgs: 1 },
  ln: { minArgs: 1, maxArgs: 1 },
  log: { minArgs: 1, maxArgs: 2 },
  floor: { minArgs: 1, maxArgs: 1 },
  ceil: { minArgs: 1, maxArgs: 1 },
  round: { minArgs: 1, maxArgs: 1 },
  sign: { minArgs: 1, maxArgs: 1 },
  min: { minArgs: 2, maxArgs: 8 },
  max: { minArgs: 2, maxArgs: 8 },
};

export interface ParseIssue {
  message: string;
  start: number;
  end: number;
  hint?: string;
}

export class MathParseError extends Error {
  issue: ParseIssue;
  constructor(issue: ParseIssue) {
    super(issue.message);
    this.name = 'MathParseError';
    this.issue = issue;
  }
}

export type LhsKind =
  | { kind: 'y' }
  | { kind: 'function'; name: string }
  | { kind: 'other'; text: string };

export interface ParsedEquation {
  /** Original raw input string. */
  input: string;
  lhs: LhsKind | null;
  /** The right-hand side expression. */
  expression: MathNode;
  /** All free variables found in the expression (e.g. a, b, c, k, t). */
  variables: string[];
  /** Variables that are not the plot variable — these become sliders. */
  params: string[];
  /** Whether the input had an explicit "= ..." left side. */
  explicit: boolean;
  /** LaTeX rendering of the whole equation (lhs = rhs or just rhs). */
  latex: string;
}

/** Result of parsing a 3D surface equation: z = f(x, y). */
export interface Parsed3d {
  input: string;
  expression: MathNode;
  variables: string[];
  params: string[];
  latex: string;
}

export interface EvalContext {
  x: number;
  /** Second plot variable for 3D surfaces z = f(x, y). */
  y?: number;
  params?: Record<string, number>;
}

export const NAN = Number.NaN;
export const isFiniteNum = (n: number): boolean => Number.isFinite(n);

export function isNumber(n: MathNode): n is Extract<MathNode, { type: 'number' }> {
  return n.type === 'number';
}
export function isVariable(n: MathNode): n is Extract<MathNode, { type: 'variable' }> {
  return n.type === 'variable';
}
export function isConstant(n: MathNode): n is Extract<MathNode, { type: 'constant' }> {
  return n.type === 'constant';
}
export function isBinary(n: MathNode): n is Extract<MathNode, { type: 'binary' }> {
  return n.type === 'binary';
}
export function isCall(n: MathNode): n is Extract<MathNode, { type: 'call' }> {
  return n.type === 'call';
}