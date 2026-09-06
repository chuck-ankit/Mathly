/* ============================================================
   Pipeline: equation input → parse → analysis → samples
   The math engine is the source of truth; UI just renders.
   ============================================================ */

import { useMemo } from 'react';
import { parse } from '../math/parser';
import { MathNode, MathParseError, ParseIssue } from '../math/types';
import { analyzeExpression, AnalysisResult, intersections } from '../math/analyze';
import { makeEvaluator, sampleCurve, Viewport } from '../math/sample';
import { defaultParamValue } from '../math/evaluator';
import { CurveSegment } from '../math/sample';

export const CURVE_COLORS = [
  'var(--curve-0)',
  'var(--curve-1)',
  'var(--curve-2)',
  'var(--curve-3)',
  'var(--curve-4)',
  'var(--curve-5)',
  'var(--curve-6)',
  'var(--curve-7)',
];

export const CURVE_DASHES: number[][] = [[], [7, 5], [2, 4], [10, 3, 3, 3]];

export interface RenderCurve {
  id: string;
  input: string;
  latex: string;
  label: string;
  color: string;
  dash: number[];
  ast: MathNode;
  params: Record<string, number>;
  evaluate: (x: number) => number;
  segments: CurveSegment[];
  analysis: AnalysisResult;
}

export type CurveDerivation =
  | { ok: true; curve: RenderCurve; error: null }
  | { ok: false; curve: null; error: ParseIssue; input: string };

export interface PipelineResult {
  curves: CurveDerivation[];
  validCurves: RenderCurve[];
  intersections: { x: number; y: number }[];
}

/** Full derivation for one equation (parse + analysis + sampling). */
export function deriveEquation(
  id: string,
  input: string,
  viewport: Viewport,
  paramOverrides: Record<string, number> = {}
): CurveDerivation {
  try {
    const parsed = parse(input);
    const params: Record<string, number> = {};
    for (const p of parsed.params) {
      params[p] = paramOverrides[p] ?? defaultParamValue(p);
    }
    const evaluate = makeEvaluator(parsed.expression, params);
    const segments = sampleCurve(evaluate, viewport);
    const analysis = analyzeExpression(parsed.expression, params);
    return {
      ok: true,
      curve: {
        id,
        input,
        latex: parsed.latex,
        label: parsed.lhs?.kind === 'function' ? parsed.lhs.name : 'y',
        color: CURVE_COLORS[0],
        dash: [],
        ast: parsed.expression,
        params,
        evaluate,
        segments,
        analysis,
      },
      error: null,
    };
  } catch (e) {
    if (e instanceof MathParseError) {
      return { ok: false, curve: null, error: e.issue, input };
    }
    return {
      ok: false,
      curve: null,
      error: { message: 'Something went wrong while reading this equation.', start: 0, end: input.length },
      input,
    };
  }
}

export interface PipelineOptions {
  equations: { id: string; input: string; visible: boolean; colorIndex: number }[];
  viewport: Viewport;
  params: Record<string, Record<string, number>>;
}

export function usePipeline({ equations, viewport, params }: PipelineOptions): PipelineResult {
  return useMemo(() => {
    const derivations: CurveDerivation[] = equations.map((eq) =>
      deriveEquation(eq.id, eq.input, viewport, params[eq.id])
    );
    const validCurves: RenderCurve[] = [];
    const colors = new Map<string, number>();
    for (const eq of equations) colors.set(eq.id, eq.colorIndex);

    derivations.forEach((d, i) => {
      if (d.ok && equations[i].visible) {
        const colorIndex = equations[i].colorIndex % CURVE_COLORS.length;
        d.curve.color = CURVE_COLORS[colorIndex];
        d.curve.dash = CURVE_DASHES[Math.floor(colorIndex / 2) % CURVE_DASHES.length];
        validCurves.push(d.curve);
      }
    });

    // Pairwise intersections among visible curves, within the viewport
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < validCurves.length; i++) {
      for (let j = i + 1; j < validCurves.length; j++) {
        const a = validCurves[i];
        const b = validCurves[j];
        const found = intersections(a.evaluate, b.evaluate, viewport.xmin, viewport.xmax);
        for (const p of found) {
          if (p.y >= viewport.ymin && p.y <= viewport.ymax) pts.push(p);
        }
      }
    }

    return { curves: derivations, validCurves, intersections: pts };
  }, [equations, viewport, params]);
}