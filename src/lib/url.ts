/* ============================================================
   URL-addressable graph state: /graph?eq=...&v=...
   Lets people share and bookmark experiments.
   ============================================================ */

import { Viewport } from './math/sample';
import { DEFAULT_VIEWPORT } from './graph/viewport';

export interface UrlGraphState {
  equations: string[];
  viewport: Viewport | null;
  presentation: boolean;
}

export function encodeGraphState(state: UrlGraphState): string {
  const params = new URLSearchParams();
  if (state.equations.length > 0) {
    params.set('eq', state.equations.join('|'));
  }
  if (state.viewport) {
    const { xmin, xmax, ymin, ymax } = state.viewport;
    params.set('v', [xmin, ymin, xmax, ymax].map((n) => round4(n)).join(','));
  }
  if (state.presentation) params.set('present', '1');
  return params.toString();
}

export function decodeGraphState(search: string): UrlGraphState {
  const params = new URLSearchParams(search);
  const eqRaw = params.get('eq');
  const equations = eqRaw ? eqRaw.split('|').map((s) => s.trim()).filter(Boolean) : [];
  let viewport: Viewport | null = null;
  const vRaw = params.get('v');
  if (vRaw) {
    const parts = vRaw.split(',').map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > parts[0]) {
      viewport = { xmin: parts[0], ymin: parts[1], xmax: parts[2], ymax: parts[3] };
    }
  }
  return { equations, viewport, presentation: params.get('present') === '1' };
}

export function graphUrl(state: UrlGraphState): string {
  const q = encodeGraphState(state);
  return q ? `/?${q}` : '/';
}

export function experimentUrl(exampleId: string): string {
  return `/explore/${exampleId}`;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export { DEFAULT_VIEWPORT };