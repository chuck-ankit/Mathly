import { describe, expect, it } from 'vitest';
import { parse3d } from '../../math/parser';
import { MathParseError } from '../../math/types';
import { makeSurfaceEvaluator, buildSurface } from '../surface';
import {
  generateSurfaceMesh, generateParametricMesh, prismMesh, pyramidMesh,
  frustumMesh, regularPolygon, revolutionMesh, normalizeMesh, facesFromNormals,
} from '../mesh';

const finiteTris = (m: { tris: { a: { z: number }; b: { z: number }; c: { z: number } }[] }) =>
  m.tris.every((t) => [t.a.z, t.b.z, t.c.z].every(Number.isFinite));

describe('parse3d', () => {
  it('parses z = f(x, y) with superscripts', () => {
    const p = parse3d('z = x² + y²');
    expect(p.expression).toBeTruthy();
    expect(p.variables.sort()).toEqual(['x', 'y']);
  });
  it('parses bare expressions without z =', () => {
    const p = parse3d('sin(x)·cos(y)');
    expect(p.variables.sort()).toEqual(['x', 'y']);
  });
  it('rejects a non-z lhs', () => {
    expect(() => parse3d('y = x²')).toThrow(MathParseError);
  });
  it('treats other letters as params', () => {
    const p = parse3d('z = a·x + b·y');
    expect(p.params.sort()).toEqual(['a', 'b']);
  });
  it('rejects empty input', () => {
    expect(() => parse3d('   ')).toThrow(MathParseError);
  });
  it('reports nothing after =', () => {
    expect(() => parse3d('z =')).toThrow(MathParseError);
  });
});

describe('surface building', () => {
  it('builds a saddle mesh with no NaN vertices', () => {
    const p = parse3d('z = (x² - y²)/4');
    const f = makeSurfaceEvaluator(p.expression, {});
    const built = buildSurface(f, 6, 24);
    expect(built.mesh).toBeTruthy();
    expect(built.mesh!.tris.length).toBeGreaterThan(100);
    expect(finiteTris(built.mesh!)).toBe(true);
  });
  it('clips blow-ups: 1/(x²+y²) stays finite', () => {
    const p = parse3d('z = 1/(x² + y²)');
    const f = makeSurfaceEvaluator(p.expression, {});
    const built = buildSurface(f, 6, 20);
    expect(built.mesh).toBeTruthy();
    expect(finiteTris(built.mesh!)).toBe(true);
  });
  it('clamps absurd resolutions', () => {
    const mesh = generateSurfaceMesh((x) => x, { xmin: -1, xmax: 1, ymin: -1, ymax: 1, zmin: -60, zmax: 60 }, { resolution: 99999 });
    expect(mesh.tris.length).toBeLessThan(120 * 120 * 2 + 10);
  });
});

describe('solid builders', () => {
  it('prism, pyramid, frustum produce meshes with finite verts', () => {
    const base = regularPolygon(6, 1.5);
    for (const m of [prismMesh(base, 2), pyramidMesh(base, 2.4), frustumMesh(base, 2, 0.5)]) {
      expect(m.tris.length).toBeGreaterThan(6);
      expect(finiteTris(m)).toBe(true);
    }
  });
  it('revolutionMesh builds a cone', () => {
    const m = revolutionMesh((z) => 2 - z, 0, 2);
    expect(m.tris.length).toBeGreaterThan(50);
    expect(finiteTris(m)).toBe(true);
  });
  it('normalizeMesh scales to target radius', () => {
    const m = prismMesh([[-10, -10], [10, -10], [10, 10], [-10, 10]], 20);
    const n = normalizeMesh(m, 4);
    let maxR = 0;
    for (const t of n.tris) {
      for (const p of [t.a, t.b, t.c]) maxR = Math.max(maxR, Math.hypot(p.x, p.y, p.z));
    }
    expect(maxR).toBeCloseTo(4, 6);
  });
  it('facesFromNormals builds a cube from vertex table', () => {
    const verts = [
      { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
      { x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 }, { x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 },
    ];
    const norms: { x: number; y: number; z: number }[] = [
      { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 },
      { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
      { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
    ];
    const m = facesFromNormals(verts, norms);
    expect(m.tris.length).toBe(12);
  });
  it('parametric mesh drops NaN regions', () => {
    const m = generateParametricMesh(
      (u) => (Math.abs(Math.cos(u)) < 0.2 ? { x: NaN, y: NaN, z: NaN } : { x: Math.cos(u), y: Math.sin(u), z: 0 }),
      0, Math.PI * 2, 0, 1, 36, 4
    );
    expect(finiteTris(m)).toBe(true);
  });
});
