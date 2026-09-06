import { describe, expect, it } from 'vitest';
import { SOLIDS } from '../../../data/solids';
import { meshStats, TriMesh } from '../mesh';

/** All vertices finite + no degenerate triangles. */
function expectHealthy(mesh: TriMesh): void {
  expect(mesh.tris.length).toBeGreaterThan(0);
  for (const t of mesh.tris) {
    for (const p of [t.a, t.b, t.c]) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(Number.isFinite(p.z)).toBe(true);
    }
  }
}

/** (V, E, F) for every polyhedron in the catalog. */
const TOPOLOGY: Record<string, [number, number, number]> = {
  // 1. Polyhedra
  cube: [8, 12, 6],
  cuboid: [8, 12, 6],
  'triangular-prism': [6, 9, 5],
  'pentagonal-prism': [10, 15, 7],
  'hexagonal-prism': [12, 18, 8],
  'octagonal-prism': [16, 24, 10],
  'square-pyramid': [5, 8, 5],
  'tetrahedron-pyramid': [4, 6, 4],
  'pentagonal-pyramid': [6, 10, 6],
  'hexagonal-pyramid': [7, 12, 7],
  'oblique-prism': [12, 18, 8],
  'oblique-pyramid': [5, 8, 5],
  frustum: [8, 12, 6],
  'decagonal-prism': [20, 30, 12],
  'dodecagonal-prism': [24, 36, 14],
  'rhombic-prism': [8, 12, 6],
  'square-antiprism': [8, 16, 10],
  'pentagonal-antiprism': [10, 20, 12],
  'hexagonal-antiprism': [12, 24, 14],
  // 2. Platonic + Archimedean
  tetrahedron: [4, 6, 4],
  octahedron: [6, 12, 8],
  dodecahedron: [20, 30, 12],
  icosahedron: [12, 30, 20],
  cuboctahedron: [12, 24, 14],
  'truncated-cube': [24, 36, 14],
  'truncated-octahedron': [24, 36, 14],
  rhombicuboctahedron: [24, 48, 26],
  icosidodecahedron: [30, 60, 32],
  'rhombic-dodecahedron': [14, 24, 12],
  'truncated-tetrahedron': [12, 18, 8],
  'truncated-icosahedron': [60, 90, 32],
  'truncated-dodecahedron': [60, 90, 32],
};

describe('polyhedron topology (Euler audit)', () => {
  const polyIds = Object.keys(TOPOLOGY);

  it('covers every polyhedron entry in the catalog', () => {
    const inCatalog = SOLIDS.filter((s) => s.group === 'Polyhedra' || s.group === 'Regular & Archimedean').map((s) => s.id);
    expect([...polyIds].sort()).toEqual([...inCatalog].sort());
  });

  for (const [id, [V, E, F]] of Object.entries(TOPOLOGY)) {
    it(`${id}: V=${V}, E=${E}, F=${F}, χ=2`, () => {
      const entry = SOLIDS.find((s) => s.id === id)!;
      const mesh = entry.build();
      expectHealthy(mesh);
      const st = meshStats(mesh);
      expect(st.v).toBe(V);
      expect(st.e).toBe(E);
      expect(st.f).toBe(F);
      expect(st.chi).toBe(2);
    });
  }

  it('every convex-hull face has at least 3 unique vertices', () => {
    for (const entry of SOLIDS.filter((s) => s.group === 'Regular & Archimedean')) {
      const mesh = entry.build();
      const seen = new Set<string>();
      for (const t of mesh.tris) {
        const keys = [t.a, t.b, t.c].map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`);
        expect(new Set(keys).size).toBe(3);
        keys.forEach((k) => seen.add(k));
      }
      expect(seen.size).toBe(TOPOLOGY[entry.id][0]);
    }
  });
});

describe('all catalog solids build healthy meshes', () => {
  it('every entry produces finite, non-empty triangles', () => {
    for (const entry of SOLIDS) {
      expectHealthy(entry.build());
    }
  });

  it('catalog covers all 5 requested groups', () => {
    const groups = new Set(SOLIDS.map((s) => s.group));
    expect(groups).toEqual(
      new Set(['Polyhedra', 'Regular & Archimedean', 'Quadric Surfaces', 'Revolution Solids', 'Advanced Surfaces'])
    );
  });
});
