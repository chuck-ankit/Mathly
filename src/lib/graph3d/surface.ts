/* ============================================================
   Mathly 3D: z = f(x, y) surface building
   Bridges the math core (parse3d + evaluate) to the mesh builder.
   ============================================================ */

import { MathNode } from '../math/types';
import { evaluate } from '../math/evaluator';
import { generateSurfaceMesh, TriMesh } from './mesh';

/** Fast closure evaluating the parsed surface at (x, y). */
export function makeSurfaceEvaluator(
  ast: MathNode,
  params: Record<string, number> = {}
): (x: number, y: number) => number {
  const ctx = { x: 0, y: 0, params };
  return (x: number, y: number) => {
    ctx.x = x;
    ctx.y = y;
    return evaluate(ast, ctx);
  };
}

export interface SurfaceBuild {
  mesh: TriMesh | null;
  zLo: number;
  zHi: number;
}

/**
 * Build the drawable mesh for a surface over the square domain
 * [-r, r]², with blow-ups clipped at ±60 (2D-style asymptote clipping).
 */
export function buildSurface(
  f: (x: number, y: number) => number,
  xyRange: number,
  resolution: number
): SurfaceBuild {
  const domain = {
    xmin: -xyRange,
    xmax: xyRange,
    ymin: -xyRange,
    ymax: xyRange,
    zmin: -60,
    zmax: 60,
  };
  const mesh = generateSurfaceMesh(f, domain, { resolution });
  let zLo = Infinity;
  let zHi = -Infinity;
  for (const t of mesh.tris) {
    for (const p of [t.a, t.b, t.c]) {
      if (p.z < zLo) zLo = p.z;
      if (p.z > zHi) zHi = p.z;
    }
  }
  if (!Number.isFinite(zLo) || !Number.isFinite(zHi) || zHi - zLo < 1e-9) {
    zLo = -1;
    zHi = 1;
  }
  return { mesh: mesh.tris.length >= 4 ? mesh : null, zLo, zHi };
}
