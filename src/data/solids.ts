/* ============================================================
   Mathly 3D: catalog of solids & surfaces
   Every entry pairs the math (formulas, defining equation) with
   a mesh builder. Groups follow the classic taxonomy:
   polyhedra → Platonic/Archimedean → quadrics → revolution → advanced.
   ============================================================ */

import {
  TriMesh,
  Vec3,
  prismMesh,
  pyramidMesh,
  frustumMesh,
  regularPolygon,
  revolutionMesh,
  spherePatchMesh,
  generateParametricMesh,
  hullMesh,
  convexHullFaces,
} from '../lib/graph3d/mesh';

export type SolidGroup =
  | 'Polyhedra'
  | 'Regular & Archimedean'
  | 'Quadric Surfaces'
  | 'Revolution Solids'
  | 'Advanced Surfaces';

export interface SolidEntry {
  id: string;
  name: string;
  group: SolidGroup;
  blurb: string;
  /** Volume formula (LaTeX). */
  volume?: string;
  /** Surface-area formula (LaTeX). */
  area?: string;
  /** Defining equation (LaTeX), for surfaces. */
  equation?: string;
  /** "What to notice" note shown on the detail page. */
  notice: string;
  build: () => TriMesh;
}

const PENTAGON_STAR = Math.sqrt(5 * (5 + 2 * Math.sqrt(5)));
void PENTAGON_STAR;

/* ------------------------------------------------------------
   1. Polyhedra
   ------------------------------------------------------------ */

const polyhedra: SolidEntry[] = [
  {
    id: 'cube',
    name: 'Cube',
    group: 'Polyhedra',
    blurb: 'A regular polyhedron with 6 identical square faces.',
    volume: 'V = a^3',
    area: 'A = 6a^2',
    notice: 'Every face meets every other at a right angle — the only Platonic solid that tiles space by itself.',
    build: () => prismMesh([[-1, -1], [1, -1], [1, 1], [-1, 1]], 2),
  },
  {
    id: 'cuboid',
    name: 'Cuboid (Rectangular Prism)',
    group: 'Polyhedra',
    blurb: 'A box-shaped object with six rectangular faces.',
    volume: 'V = lwh',
    area: 'A = 2(lw + lh + wh)',
    notice: 'Stretch a cube along one axis and volume grows linearly in each dimension — but surface area couples them.',
    build: () => prismMesh([[-1.5, -1], [1.5, -1], [1.5, 1], [-1.5, 1]], 2.4),
  },
  {
    id: 'triangular-prism',
    name: 'Triangular Prism',
    group: 'Polyhedra',
    blurb: 'A prism with two parallel triangular bases joined by three rectangular sides.',
    volume: 'V = \\tfrac{1}{2}bha\\cdot L',
    area: 'A = bh + (s_1 + s_2 + s_3)L',
    notice: 'The Toblerone shape: slide a triangle along a line and you get a prism.',
    build: () => prismMesh([[-1.4, -1], [1.4, -1], [0, 1.4]], 2.6),
  },
  {
    id: 'pentagonal-prism',
    name: 'Pentagonal Prism',
    group: 'Polyhedra',
    blurb: 'A prism with two parallel regular pentagon bases.',
    volume: 'V = \\tfrac{1}{4}\\sqrt{5(5+2\\sqrt{5})}\\,a^2h',
    notice: 'Pentagons refuse to tile the plane, but stack them and they make a perfectly honest solid.',
    build: () => prismMesh(regularPolygon(5, 1.5, -Math.PI / 2), 2.4),
  },
  {
    id: 'hexagonal-prism',
    name: 'Hexagonal Prism',
    group: 'Polyhedra',
    blurb: 'A prism with two parallel regular hexagon bases.',
    volume: 'V = \\tfrac{3\\sqrt{3}}{2}a^2h',
    notice: "The honeycomb cell: hexagons tile the plane with the least wall per unit area — bees figured this out first.",
    build: () => prismMesh(regularPolygon(6, 1.5), 2.2),
  },
  {
    id: 'octagonal-prism',
    name: 'Octagonal Prism',
    group: 'Polyhedra',
    blurb: 'A prism with two parallel regular octagon bases.',
    volume: 'V = 2(1+\\sqrt{2})a^2h',
    notice: 'Stop signs are octagons for the same reason this solid looks almost round: more sides, closer to a circle.',
    build: () => prismMesh(regularPolygon(8, 1.5), 2),
  },
  {
    id: 'square-pyramid',
    name: 'Square Pyramid',
    group: 'Polyhedra',
    blurb: 'A pyramid featuring a square base and four triangular faces meeting at an apex.',
    volume: 'V = \\tfrac{1}{3}a^2h',
    area: 'A = a^2 + 2a\\sqrt{\\tfrac{a^2}{4} + h^2}',
    notice: 'The pyramids of Giza: volume is exactly one third of the box that contains it.',
    build: () => pyramidMesh([[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]], 2.4),
  },
  {
    id: 'tetrahedron-pyramid',
    name: 'Triangular Pyramid (Tetrahedron)',
    group: 'Polyhedra',
    blurb: 'A pyramid with a triangular base and three triangular sides.',
    volume: 'V = \\tfrac{1}{3}\\cdot \\text{Base Area}\\cdot h',
    notice: 'The simplest solid possible: 4 faces, 4 vertices, 6 edges — no other polyhedron has fewer.',
    build: () => pyramidMesh(regularPolygon(3, 1.7), 2.4),
  },
  {
    id: 'pentagonal-pyramid',
    name: 'Pentagonal Pyramid',
    group: 'Polyhedra',
    blurb: 'A pyramid with a pentagonal base.',
    volume: 'V = \\tfrac{1}{3}\\left(\\tfrac{5}{4}a^2\\cot\\tfrac{\\pi}{5}\\right)h',
    notice: 'The regular pentagonal pyramid is one of the 92 Johnson solids — all faces regular, no uniform vertex arrangement.',
    build: () => pyramidMesh(regularPolygon(5, 1.6, -Math.PI / 2), 2.4),
  },
  {
    id: 'hexagonal-pyramid',
    name: 'Hexagonal Pyramid',
    group: 'Polyhedra',
    blurb: 'A pyramid with a hexagonal base.',
    volume: 'V = \\tfrac{\\sqrt{3}}{2}a^2h',
    notice: 'Six triangles rising to a point — the shape of certain crystal grains of snow.',
    build: () => pyramidMesh(regularPolygon(6, 1.6), 2.4),
  },
  {
    id: 'oblique-prism',
    name: 'Oblique Prism',
    group: 'Polyhedra',
    blurb: 'A prism whose parallel sides are not perpendicular to its bases.',
    volume: 'V = \\text{Base Area}\\cdot h',
    notice: "Lean it as far as you like — volume only cares about the perpendicular height, a fact known since Euclid.",
    build: () => prismMesh(regularPolygon(6, 1.4), 2.2, [0.9, 0]),
  },
  {
    id: 'oblique-pyramid',
    name: 'Oblique Pyramid',
    group: 'Polyhedra',
    blurb: 'A pyramid whose apex is not directly above the center of its base.',
    volume: 'V = \\tfrac{1}{3}\\cdot \\text{Base Area}\\cdot h',
    notice: 'Slide the apex sideways: the volume stays the same as long as the height does. Cavalieri would approve.',
    build: () => pyramidMesh([[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]], 2.4, [1.1, 0.5]),
  },
  {
    id: 'frustum',
    name: 'Truncated Pyramid (Frustum)',
    group: 'Polyhedra',
    blurb: 'The bottom section of a pyramid when cut by a plane parallel to its base.',
    volume: 'V = \\tfrac{1}{3}h(A_1 + A_2 + \\sqrt{A_1A_2})',
    notice: "Cut a pyramid anywhere: the volume formula averages the two end areas in a beautifully symmetric way — the same formula carves the classic bucket.",
    build: () => frustumMesh([[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]], 2, 0.55),
  },
  {
    id: 'decagonal-prism',
    name: 'Decagonal Prism',
    group: 'Polyhedra',
    blurb: 'A prism with two parallel regular decagon bases.',
    volume: 'V = \\tfrac{5}{2}\\sqrt{5 + 2\\sqrt{5}}\\;a^2 h',
    notice: 'Ten sides is where a prism starts to look convincingly round — the old masonry trick behind faceted pillars and towers.',
    build: () => prismMesh(regularPolygon(10, 1.5), 2),
  },
  {
    id: 'dodecagonal-prism',
    name: 'Dodecagonal Prism',
    group: 'Polyhedra',
    blurb: 'A prism with two parallel regular dodecagon bases — twelve sides.',
    volume: 'V = 3(2 + \\sqrt{3})\\;a^2 h',
    notice: 'Every extra side pulls a prism closer to a cylinder. Twelve-siders are why many coins feel almost perfectly round.',
    build: () => prismMesh(regularPolygon(12, 1.5), 2),
  },
  {
    id: 'rhombic-prism',
    name: 'Rhombic Prism',
    group: 'Polyhedra',
    blurb: 'A prism whose bases are rhombi — the lozenge that stacks into rhombohedra.',
    volume: 'V = a^2 \\sin\\theta \\; h',
    notice: 'The parallelogram law rules here: volume is the base area times the perpendicular height. Calcite crystals grow as rhombohedra — oblique rhombic prisms, not boxy ones.',
    build: () => prismMesh([[-1.4, 0], [0, -1.1], [1.4, 0], [0, 1.1]], 2.2),
  },
  {
    id: 'square-antiprism',
    name: 'Square Antiprism',
    group: 'Polyhedra',
    blurb: 'Two parallel squares, twisted 45°, joined by eight triangles.',
    notice: 'An antiprism is a prism whose top ring is rotated half a step. The triangular belt that results is the signature of "twisted stacking" — and why some crystal habits sparkle.',
    build: () => hullMesh(antiprismVerts(4, 1.5, 1.5)),
  },
  {
    id: 'pentagonal-antiprism',
    name: 'Pentagonal Antiprism',
    group: 'Polyhedra',
    blurb: 'Two twisted pentagons joined by ten triangles.',
    notice: 'Twist a pentagonal prism by 36° and its rectangular sides become triangles. Nature uses the same trick in drum-like viral capsids and some coordination geometries.',
    build: () => hullMesh(antiprismVerts(5, 1.5, 1.5)),
  },
  {
    id: 'hexagonal-antiprism',
    name: 'Hexagonal Antiprism',
    group: 'Polyhedra',
    blurb: 'Two twisted hexagons joined by twelve triangles — a classic unwrapped stack.',
    notice: 'Half a notch between the rings turns six rectangles into twelve triangles. Six atoms over six, offset — a 12-coordinate geometry chemists study in real complexes.',
    build: () => hullMesh(antiprismVerts(6, 1.5, 1.5)),
  },
];

/* ------------------------------------------------------------
   2. Regular & Archimedean solids
   ------------------------------------------------------------ */

function phi3(): number {
  return (1 + Math.sqrt(5)) / 2;
}

const archimedean: SolidEntry[] = [
  {
    id: 'tetrahedron',
    name: 'Regular Tetrahedron',
    group: 'Regular & Archimedean',
    blurb: 'A regular solid made of 4 equilateral triangles.',
    volume: 'V = \\tfrac{a^3}{6\\sqrt{2}}',
    notice: 'Four faces is the minimum for a closed solid — and the tetrahedron is the strongest shape in truss bridges.',
    build: () =>
      hullMesh([
        [1, 1, 1],
        [1, -1, -1],
        [-1, 1, -1],
        [-1, -1, 1],
      ]),
  },
  {
    id: 'octahedron',
    name: 'Regular Octahedron',
    group: 'Regular & Archimedean',
    blurb: 'A regular solid made of 8 equilateral triangles.',
    volume: 'V = \\tfrac{\\sqrt{2}}{3}a^3',
    notice: 'Two square pyramids glued base-to-base; the dual of the cube, and the shape of diamond octahedra.',
    build: () =>
      hullMesh([
        [1, 0, 0], [-1, 0, 0],
        [0, 1, 0], [0, -1, 0],
        [0, 0, 1], [0, 0, -1],
      ]),
  },
  {
    id: 'dodecahedron',
    name: 'Regular Dodecahedron',
    group: 'Regular & Archimedean',
    blurb: 'A regular solid made of 12 regular pentagons.',
    volume: 'V = \\tfrac{15+7\\sqrt{5}}{4}a^3',
    notice: 'Plato assigned it to the cosmos itself. Twelve pentagons, twenty vertices — and quasicrystals grow this way.',
    build: () => {
      const p = phi3();
      return hullMesh([
        [-1,-1,-1],[-1,-1,1],[-1,1,-1],[-1,1,1],
        [1,-1,-1],[1,-1,1],[1,1,-1],[1,1,1],
        [0,-1/p,-p],[0,-1/p,p],[0,1/p,-p],[0,1/p,p],
        [-1/p,-p,0],[-1/p,p,0],[1/p,-p,0],[1/p,p,0],
        [-p,0,-1/p],[-p,0,1/p],[p,0,-1/p],[p,0,1/p],
      ]);
    },
  },
  {
    id: 'icosahedron',
    name: 'Regular Icosahedron',
    group: 'Regular & Archimedean',
    blurb: 'A regular solid made of 20 equilateral triangles.',
    volume: 'V = \\tfrac{5}{12}(3+\\sqrt{5})a^3',
    notice: 'Twenty triangles, twelve vertices — the roundest Platonic solid, and the shape of many virus capsids.',
    build: () => {
      const p = phi3();
      return hullMesh([
        [0, -1, -p], [0, -1, p], [0, 1, -p], [0, 1, p],
        [-1, -p, 0], [-1, p, 0], [1, -p, 0], [1, p, 0],
        [-p, 0, -1], [-p, 0, 1], [p, 0, -1], [p, 0, 1],
      ]);
    },
  },
  {
    id: 'cuboctahedron',
    name: 'Cuboctahedron',
    group: 'Regular & Archimedean',
    blurb: 'An Archimedean solid with 8 triangular faces and 6 square faces.',
    volume: 'V = \\tfrac{5}{3}\\sqrt{2}a^3',
    notice: "Truncate a cube halfway and the cube's vertices become this solid's triangles. Buckminster Fuller called it the vector equilibrium.",
    build: () =>
      hullMesh([
        [-1,-1,0],[-1,1,0],[1,-1,0],[1,1,0],
        [0,-1,-1],[0,-1,1],[0,1,-1],[0,1,1],
        [-1,0,-1],[1,0,-1],[-1,0,1],[1,0,1],
      ]),
  },
  {
    id: 'truncated-cube',
    name: 'Truncated Cube',
    group: 'Regular & Archimedean',
    blurb: 'A cube with its 8 vertices cleanly sliced off.',
    volume: 'V = \\tfrac{1}{3}(21 + 14\\sqrt{2})a^3',
    notice: 'Slice deep enough and each corner becomes a triangle while the square faces rotate into octagons.',
    build: () => hullMesh(truncCubeVerts()),
  },
  {
    id: 'truncated-octahedron',
    name: 'Truncated Octahedron',
    group: 'Regular & Archimedean',
    blurb: 'An octahedron with its 6 vertices cleanly sliced off.',
    volume: 'V = 8\\sqrt{2}a^3',
    notice: 'The only Archimedean solid that tiles space by itself — bees would love it; it is the cell of the bitruncated cubic honeycomb.',
    build: () => hullMesh(allPermutations(0, 1, 2)),
  },
  {
    id: 'rhombicuboctahedron',
    name: 'Rhombicuboctahedron',
    group: 'Regular & Archimedean',
    blurb: 'A solid with 18 square faces and 8 triangular faces.',
    volume: 'V = (4 + \\tfrac{10\\sqrt{2}}{3})a^3',
    notice: "Pull a cube's faces apart, twist 45°, and bridge the gaps: 26 faces of two kinds, all vertices identical.",
    build: () =>
      hullMesh([
        ...allPermutations(1, 1, 1),
        ...allPermutations(1, 1, 1 + Math.SQRT2),
      ]),
  },
  {
    id: 'icosidodecahedron',
    name: 'Icosidodecahedron',
    group: 'Regular & Archimedean',
    blurb: 'A solid featuring 20 triangular faces and 12 pentagonal faces.',
    volume: 'V = \\tfrac{1}{6}(45 + 17\\sqrt{5})a^3',
    notice: 'Halfway between an icosahedron and a dodecahedron — each is the other with corners expanded into faces.',
    build: () => {
      // The icosidodecahedron is the rectified icosahedron: its 30 vertices
      // are exactly the edge midpoints of an icosahedron (edge length 2).
      const p = phi3();
      const ico: [number, number, number][] = [
        [0, -1, -p], [0, -1, p], [0, 1, -p], [0, 1, p],
        [-1, -p, 0], [-1, p, 0], [1, -p, 0], [1, p, 0],
        [-p, 0, -1], [-p, 0, 1], [p, 0, -1], [p, 0, 1],
      ];
      const mid: [number, number, number][] = [];
      for (let i = 0; i < ico.length; i++) {
        for (let j = i + 1; j < ico.length; j++) {
          const dx = ico[i][0] - ico[j][0];
          const dy = ico[i][1] - ico[j][1];
          const dz = ico[i][2] - ico[j][2];
          if (Math.abs(Math.hypot(dx, dy, dz) - 2) < 1e-9) {
            mid.push([
              (ico[i][0] + ico[j][0]) / 2,
              (ico[i][1] + ico[j][1]) / 2,
              (ico[i][2] + ico[j][2]) / 2,
            ]);
          }
        }
      }
      return hullMesh(mid);
    },
  },
  {
    id: 'rhombic-dodecahedron',
    name: 'Rhombic Dodecahedron',
    group: 'Regular & Archimedean',
    blurb: 'Twelve rhombic faces — the Voronoi cell of the face-centred cubic lattice.',
    volume: 'V = \\tfrac{16\\sqrt{3}}{9}\\,a^3',
    area: 'A = 8\\sqrt{2}\\,a^2',
    notice: 'It tiles space with no gaps, the 3D analogue of the honeycomb hexagon. Garnets crystallise as rhombic dodecahedra, and it is the cell that stacking spheres (oranges!) actually owns.',
    build: () =>
      hullMesh([
        [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
        [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
        [2, 0, 0], [-2, 0, 0], [0, 2, 0], [0, -2, 0], [0, 0, 2], [0, 0, -2],
      ]),
  },
  {
    id: 'truncated-tetrahedron',
    name: 'Truncated Tetrahedron',
    group: 'Regular & Archimedean',
    blurb: 'A tetrahedron with all four corners sliced off — 4 hexagons and 4 triangles.',
    volume: 'V = \\tfrac{23}{12}\\sqrt{2}\\,a^3',
    notice: 'Slice the four tips off a tetrahedron and each triangular face grows into a hexagon while the cuts become new triangles. The result keeps the tetrahedral dual symmetry of the original.',
    build: () => hullMesh(truncate(tetraVerts(), 1 / 3)),
  },
  {
    id: 'truncated-icosahedron',
    name: 'Truncated Icosahedron',
    group: 'Regular & Archimedean',
    blurb: 'The soccer ball: 12 pentagons and 20 hexagons.',
    volume: 'V = \\tfrac{1}{4}(125 + 43\\sqrt{5})\\,a^3',
    notice: 'Slice each icosahedron vertex past a third of every edge and the 20 triangles become hexagons, leaving 12 pentagons — kick it, and you have a football. The same vertex positions host the buckminsterfullerene C₆₀ molecule: 60 carbon atoms, one per corner.',
    build: () => hullMesh(truncate(icosaVerts(), 1 / 3)),
  },
  {
    id: 'truncated-dodecahedron',
    name: 'Truncated Dodecahedron',
    group: 'Regular & Archimedean',
    blurb: 'A dodecahedron with all 20 corners sliced off — 20 triangles and 12 decagons.',
    volume: 'V = \\tfrac{5}{3}(99 + 47\\sqrt{5})\\,a^3',
    notice: 'Cut the dodecahedron\'s razor points and each pentagonal face widens into a decagon while the cuts flatland into triangles. Twenty triangular cuts, twelve gently rounded decagons — the quiet cousin of the soccer ball.',
    build: () => hullMesh(truncate(dodecaVerts(), 1 / 3)),
  },
];

/* Helpers for vertex tables */

/** Truncated cube: 24 vertices, 3 per cube corner. */
function truncCubeVerts(): [number, number, number][] {
  const t = 1 / (1 + Math.SQRT2);
  const s = 1;
  const verts: [number, number, number][] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    verts.push([sx * s, sy * s * t, sz * s]);
    verts.push([sx * s, sy * s, sz * s * t]);
    verts.push([sx * s * t, sy * s, sz * s]);
  }
  return verts;
}

function allPermutations(...vals: number[]): [number, number, number][] {
  const out: [number, number, number][] = [];
  const rec = (prefix: number[], rest: number[]): void => {
    if (rest.length === 0) {
      // all sign choices for non-zero entries
      const signs = 1 << prefix.filter((v) => v !== 0).length;
      for (let m = 0; m < signs; m++) {
        let bit = 0;
        const combo = prefix.map((v) => {
          if (v === 0) return 0;
          const s = (m >> bit) & 1 ? 1 : -1;
          bit++;
          return v * s;
        });
        out.push([combo[0], combo[1], combo[2]]);
      }
      return;
    }
    for (let i = 0; i < rest.length; i++) {
      rec([...prefix, rest[i]], [...rest.slice(0, i), ...rest.slice(i + 1)]);
    }
  };
  rec([], vals);
  return out;
}

/** Antiprism vertices: bottom n-gon ring + top ring twisted by π/n. */
function antiprismVerts(n: number, r: number, h: number): [number, number, number][] {
  const verts: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI;
    verts.push([r * Math.cos(a), r * Math.sin(a), -h / 2]);
  }
  const twist = Math.PI / n;
  for (let i = 0; i < n; i++) {
    const a = twist + (i / n) * 2 * Math.PI;
    verts.push([r * Math.cos(a), r * Math.sin(a), h / 2]);
  }
  return verts;
}

/** Canonical vertex tables for the truncatable regular solids. */
function tetraVerts(): [number, number, number][] {
  return [
    [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1],
  ];
}

function icosaVerts(): [number, number, number][] {
  const p = phi3();
  return [
    [0, -1, -p], [0, -1, p], [0, 1, -p], [0, 1, p],
    [-1, -p, 0], [-1, p, 0], [1, -p, 0], [1, p, 0],
    [-p, 0, -1], [-p, 0, 1], [p, 0, -1], [p, 0, 1],
  ];
}

function dodecaVerts(): [number, number, number][] {
  const p = phi3();
  return [
    [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1],
    [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1],
    [0, -1 / p, -p], [0, -1 / p, p], [0, 1 / p, -p], [0, 1 / p, p],
    [-1 / p, -p, 0], [-1 / p, p, 0], [1 / p, -p, 0], [1 / p, p, 0],
    [-p, 0, -1 / p], [-p, 0, 1 / p], [p, 0, -1 / p], [p, 0, 1 / p],
  ];
}

/** Edges of the convex hull: true hull edges are shared by two non-coplanar
 *  triangles; fan diagonals inside a merged face are coplanar, so dropped. */
function hullEdges(verts: [number, number, number][]): [number, number][] {
  const pts: Vec3[] = verts.map(([x, y, z]) => ({ x, y, z }));
  const indexByKey = new Map<string, number>();
  pts.forEach((p, i) => indexByKey.set(`${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}`, i));
  const indexOf = (p: Vec3): number =>
    indexByKey.get(`${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}`) ?? -1;

  const mesh = convexHullFaces(pts);
  const normals = mesh.tris.map((t) => {
    const u = { x: t.b.x - t.a.x, y: t.b.y - t.a.y, z: t.b.z - t.a.z };
    const w = { x: t.c.x - t.a.x, y: t.c.y - t.a.y, z: t.c.z - t.a.z };
    const cr = {
      x: u.y * w.z - u.z * w.y,
      y: u.z * w.x - u.x * w.z,
      z: u.x * w.y - u.y * w.x,
    };
    const len = Math.hypot(cr.x, cr.y, cr.z) || 1;
    return { x: cr.x / len, y: cr.y / len, z: cr.z / len };
  });

  const edgeTris = new Map<string, number[]>();
  mesh.tris.forEach((t, idx) => {
    for (const [p, q] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]] as [Vec3, Vec3][]) {
      const i = indexOf(p);
      const j = indexOf(q);
      if (i < 0 || j < 0) continue;
      const key = i < j ? `${i}_${j}` : `${j}_${i}`;
      const list = edgeTris.get(key);
      if (list) list.push(idx);
      else edgeTris.set(key, [idx]);
    }
  });

  const edges: [number, number][] = [];
  for (const [key, list] of edgeTris) {
    if (list.length < 2) continue;
    const n0 = normals[list[0]];
    const dihedral = list.some(
      (idx) => n0.x * normals[idx].x + n0.y * normals[idx].y + n0.z * normals[idx].z < 0.99999
    );
    if (!dihedral) continue;
    const [i, j] = key.split('_').map(Number);
    edges.push(i < j ? [i, j] : [j, i]);
  }
  edges.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  return edges;
}

/**
 * Uniform truncation: slide each hull edge toward both endpoints by t,
 * producing 2·E vertices whose hull is the truncated solid.
 */
function truncate(verts: [number, number, number][], t: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const [i, j] of hullEdges(verts)) {
    const a = verts[i];
    const b = verts[j];
    out.push([
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ]);
    out.push([
      a[0] + (b[0] - a[0]) * (1 - t),
      a[1] + (b[1] - a[1]) * (1 - t),
      a[2] + (b[2] - a[2]) * (1 - t),
    ]);
  }
  return out;
}

/* ------------------------------------------------------------
   3. Quadric surfaces
   ------------------------------------------------------------ */

const quadrics: SolidEntry[] = [
  {
    id: 'sphere',
    name: 'Sphere',
    group: 'Quadric Surfaces',
    blurb: 'A perfectly round geometric object.',
    equation: 'x^2 + y^2 + z^2 = r^2',
    volume: 'V = \\tfrac{4}{3}\\pi r^3',
    area: 'A = 4\\pi r^2',
    notice: 'Minimum surface for a given volume — why bubbles are round and why planets settle into spheres.',
    build: () => spherePatchMesh(1.6),
  },
  {
    id: 'ellipsoid',
    name: 'Ellipsoid',
    group: 'Quadric Surfaces',
    blurb: 'A sphere stretched along one or more of its axes (egg-shaped).',
    equation: '\\tfrac{x^2}{a^2} + \\tfrac{y^2}{b^2} + \\tfrac{z^2}{c^2} = 1',
    notice: 'Every planar slice is an ellipse. The Earth is very slightly one: flattened at the poles.',
    build: () =>
      generateParametricMesh(
        (u, v) => {
          const th = v * Math.PI;
          return { x: 1.9 * Math.sin(th) * Math.cos(u), y: 1.4 * Math.sin(th) * Math.sin(u), z: 1.6 * Math.cos(th) };
        },
        0, 2 * Math.PI, 0, 1, 48, 24
      ),
  },
  {
    id: 'elliptic-paraboloid',
    name: 'Elliptic Paraboloid',
    group: 'Quadric Surfaces',
    blurb: 'A cup-shaped surface that opens upwards.',
    equation: 'z = \\tfrac{x^2}{a^2} + \\tfrac{y^2}{b^2}',
    notice: 'Slice it horizontally and you get ellipses; vertically, parabolas. Satellite dishes use exactly this shape to focus signals.',
    build: () =>
      generateParametricMesh(
        (u, v) => {
          const r = v * 2;
          const a = 0.55;
          return { x: r * Math.cos(u), y: r * Math.sin(u), z: a * r * r - 2 };
        },
        0, 2 * Math.PI, 0, 1, 48, 24
      ),
  },
  {
    id: 'hyperbolic-paraboloid',
    name: 'Hyperbolic Paraboloid',
    group: 'Quadric Surfaces',
    blurb: 'A smooth, double-curved surface resembling a riding saddle or a Pringles potato crisp.',
    equation: 'z = \\tfrac{y^2}{b^2} - \\tfrac{x^2}{a^2}',
    notice: 'Negative Gaussian curvature everywhere: two valleys cross at the centre. Pringles and roof shells both exploit it.',
    build: () =>
      generateParametricMesh(
        (u, v) => ({ x: u * 2.4, y: v * 2.4, z: (v * v - u * u) * 1.2 }),
        -1, 1, -1, 1, 40, 40
      ),
  },
  {
    id: 'hyperboloid-one',
    name: 'Hyperboloid of One Sheet',
    group: 'Quadric Surfaces',
    blurb: 'A continuous, hourglass-like cooling tower shape.',
    equation: '\\tfrac{x^2}{a^2} + \\tfrac{y^2}{b^2} - \\tfrac{z^2}{c^2} = 1',
    notice: 'Built entirely from straight lines! Two families of skew rulers trace the whole surface — which is why lattice cooling towers use straight beams.',
    build: () =>
      revolutionMesh((z) => Math.sqrt(0.5 + (z * z) / 3), -2.4, 2.4),
  },
  {
    id: 'hyperboloid-two',
    name: 'Hyperboloid of Two Sheets',
    group: 'Quadric Surfaces',
    blurb: 'Two distinct, mirror-image bowling pin-like cups facing away from each other.',
    equation: '\\tfrac{x^2}{a^2} + \\tfrac{y^2}{b^2} - \\tfrac{z^2}{c^2} = -1',
    notice: 'The equation differs by a single sign from the one-sheet version — and the surface splits in two. Sign flips can create or destroy connectedness.',
    build: () =>
      generateParametricMesh(
        (u, v) => {
          // Two caps z = ±sqrt(1 + r²)·c, r ∈ [0, rmax]
          const r = v * 1.5;
          const zc = Math.sqrt(0.8 + (r * r) / 2.2);
          const sgn = u < Math.PI ? 1 : -1;
          return { x: r * Math.cos(u * 2), y: r * Math.sin(u * 2), z: sgn * zc };
        },
        0, 2 * Math.PI, 0, 1, 48, 20
      ),
  },
  {
    id: 'elliptic-cone',
    name: 'Elliptic Cone',
    group: 'Quadric Surfaces',
    blurb: 'A continuous double-cone centered at the origin.',
    equation: '\\tfrac{x^2}{a^2} + \\tfrac{y^2}{b^2} - \\tfrac{z^2}{c^2} = 0',
    notice: 'The only quadric with a singular point. Light cones in relativity are exactly this shape, with time as the axis.',
    build: () =>
      generateParametricMesh(
        (u, v) => {
          const r = v * 1.8;
          const sgn = u < Math.PI ? 1 : -1;
          return { x: r * Math.cos(u * 2), y: r * Math.sin(u * 2), z: sgn * r * 0.9 };
        },
        0, 2 * Math.PI, 0, 1, 48, 20
      ),
  },
  {
    id: 'elliptic-cylinder',
    name: 'Elliptic Cylinder',
    group: 'Quadric Surfaces',
    blurb: 'A cylinder whose horizontal cross-section forms an ellipse.',
    equation: '\\tfrac{x^2}{a^2} + \\tfrac{y^2}{b^2} = 1',
    notice: 'No z in the equation means infinite in z — a quadric with no curvature along one axis.',
    build: () =>
      generateParametricMesh(
        (u, v) => ({ x: 1.7 * Math.cos(u), y: 1.3 * Math.sin(u), z: (v - 0.5) * 3.4 }),
        0, 2 * Math.PI, 0, 1, 48, 8
      ),
  },
  {
    id: 'parabolic-cylinder',
    name: 'Parabolic Cylinder',
    group: 'Quadric Surfaces',
    blurb: 'A continuous trough shape defined by a parabola.',
    equation: 'x^2 = 2py',
    notice: 'Slide a parabola along a straight line. Troughs like this collect rainwater — and radio signals.',
    build: () =>
      generateParametricMesh(
        (u, v) => ({ x: (u / Math.PI) * 1.4, y: (u / Math.PI) ** 2 * 0.7 - 1.4, z: (v - 0.5) * 3.4 }),
        -Math.PI, Math.PI, 0, 1, 40, 8
      ),
  },
  {
    id: 'hyperbolic-cylinder',
    name: 'Hyperbolic Cylinder',
    group: 'Quadric Surfaces',
    blurb: 'Two separate, smoothly curved sheets bowing outward from one another.',
    equation: '\\tfrac{x^2}{a^2} - \\tfrac{y^2}{b^2} = 1',
    notice: 'Two curved walls that never meet, always one unit of hyperbola apart in shape.',
    build: () =>
      generateParametricMesh(
        (u, v) => {
          const t = u / Math.PI; // cosh-like parameter via hyperbola param
          const x = 1.6 / Math.cos(t * 0.9);
          const y = 1.2 * Math.tan(t * 0.9);
          return { x, y, z: (v - 0.5) * 3.4 };
        },
        -Math.PI, Math.PI, 0, 1, 40, 8
      ),
  },
  {
    id: 'spheroid-oblate',
    name: 'Spheroid (Oblate)',
    group: 'Quadric Surfaces',
    blurb: 'A sphere squashed from the top and bottom (like the planet Earth).',
    equation: '\\tfrac{x^2+y^2}{a^2} + \\tfrac{z^2}{c^2} = 1 \\;(a > c)',
    notice: 'Earth is 21 km flatter at the poles than a perfect sphere — it spins, so it bulges.',
    build: () =>
      generateParametricMesh(
        (u, v) => {
          const th = v * Math.PI;
          return { x: 1.9 * Math.sin(th) * Math.cos(u), y: 1.9 * Math.sin(th) * Math.sin(u), z: 1.35 * Math.cos(th) };
        },
        0, 2 * Math.PI, 0, 1, 48, 24
      ),
  },
  {
    id: 'spheroid-prolate',
    name: 'Spheroid (Prolate)',
    group: 'Quadric Surfaces',
    blurb: 'A sphere stretched vertically out into a rugby or American football shape.',
    equation: '\\tfrac{x^2+y^2}{a^2} + \\tfrac{z^2}{c^2} = 1 \\;(a < c)',
    notice: 'Spin a prolate spheroid and it precesses like a wobbling top — the physics behind a tight spiralling pass.',
    build: () =>
      generateParametricMesh(
        (u, v) => {
          const th = v * Math.PI;
          return { x: 1.25 * Math.sin(th) * Math.cos(u), y: 1.25 * Math.sin(th) * Math.sin(u), z: 1.95 * Math.cos(th) };
        },
        0, 2 * Math.PI, 0, 1, 48, 24
      ),
  },
];

/* ------------------------------------------------------------
   4. Revolution solids
   ------------------------------------------------------------ */

const revolution: SolidEntry[] = [
  {
    id: 'cylinder',
    name: 'Right Circular Cylinder',
    group: 'Revolution Solids',
    blurb: 'A standard straight pipe shape.',
    volume: 'V = \\pi r^2 h',
    equation: 'x^2 + y^2 = r^2 \\;(0 \\le z \\le h)',
    notice: 'Unroll the side and you get a rectangle — Archimedes used exactly this trick to found integral calculus.',
    build: () =>
      generateParametricMesh(
        (u, v) => ({ x: 1.4 * Math.cos(u), y: 1.4 * Math.sin(u), z: (v - 0.5) * 3 }),
        0, 2 * Math.PI, 0, 1, 48, 6
      ),
  },
  {
    id: 'cone',
    name: 'Right Circular Cone',
    group: 'Revolution Solids',
    blurb: 'A classic party hat shape.',
    volume: 'V = \\tfrac{1}{3}\\pi r^2 h',
    equation: 'x^2 + y^2 = \\left(\\tfrac{r}{h}\\right)^2 z^2',
    notice: 'One third of the cylinder around it. And unrolled, its side is a sector of a circle — the origin of trigonometry.',
    build: () => revolutionMesh((z) => ((2.4 - z) / 2.4) * 1.6, 0, 2.4),
  },
  {
    id: 'cone-frustum',
    name: 'Cone Frustum',
    group: 'Revolution Solids',
    blurb: 'A cone with its top pointed tip chopped off flatly.',
    volume: 'V = \\tfrac{1}{3}\\pi h(R^2 + Rr + r^2)',
    notice: 'A bucket! The average of the radii times circumference integrates exactly — no approximations needed.',
    build: () => revolutionMesh((z) => 1.6 - (z / 2.2) * 0.9, 0, 2.2),
  },
  {
    id: 'torus',
    name: 'Torus',
    group: 'Revolution Solids',
    blurb: 'A classic smooth, 3D doughnut shape.',
    equation: '\\left(R - \\sqrt{x^2 + y^2}\\right)^2 + z^2 = r^2',
    notice: 'Topologically unlike a sphere: a coffee cup with a handle is a torus. Mathematicians care about the hole, not the glaze.',
    build: () =>
      generateParametricMesh(
        (u, v) => {
          const R = 1.7;
          const r = 0.65;
          return { x: (R + r * Math.cos(v * 2 * Math.PI)) * Math.cos(u), y: (R + r * Math.cos(v * 2 * Math.PI)) * Math.sin(u), z: r * Math.sin(v * 2 * Math.PI) };
        },
        0, 2 * Math.PI, 0, 1, 56, 22
      ),
  },
  {
    id: 'spherical-cap',
    name: 'Spherical Cap',
    group: 'Revolution Solids',
    blurb: 'The top portion cut off from a sphere by a plane.',
    volume: 'V = \\tfrac{1}{6}\\pi h(3a^2 + h^2)',
    notice: 'A dome! The volume depends only on the cap height and the cut radius — no πr³ needed.',
    build: () => spherePatchMesh(1.7, 0, Math.PI / 3.2, 2 * Math.PI, 48, 14),
  },
  {
    id: 'spherical-wedge',
    name: 'Spherical Wedge',
    group: 'Revolution Solids',
    blurb: 'A slice of a sphere cut out by two planes meeting at an axis (like a watermelon wedge).',
    volume: 'V = \\tfrac{2}{3}\\theta r^3',
    notice: 'Volume is proportional to the wedge angle θ — half the pie, half the volume.',
    build: () => spherePatchMesh(1.7, 0, Math.PI, Math.PI / 2.6, 30, 20),
  },
  {
    id: 'hollow-cylinder',
    name: 'Hollow Cylinder (Pipe)',
    group: 'Revolution Solids',
    blurb: 'A thick pipe with an empty core.',
    volume: 'V = \\pi(R^2 - r^2)h',
    notice: 'Volume is the annulus area times height. Inertia of these shapes governs how flywheels store energy.',
    build: () =>
      generateParametricMesh(
        (u, v) => {
          const r = 0.9 + v * 0.5;
          return { x: r * Math.cos(u), y: r * Math.sin(u), z: (v - 0.5) * 2.6 };
        },
        0, 2 * Math.PI, 0, 1, 48, 6
      ),
  },
  {
    id: 'paraboloid-dish',
    name: 'Paraboloid Dish',
    group: 'Revolution Solids',
    blurb: 'A dish whose cross-section is a parabola — the secret behind satellite dishes and headlights.',
    equation: 'z = a(x^2 + y^2)',
    volume: 'V = \\tfrac{1}{2}\\pi r^2 h',
    notice: 'Rotate the parabola y = ax² around its axis and parallel rays reflect onto a single point — the focus. Satellite dishes and car headlights both exploit this one geometric gift.',
    build: () => revolutionMesh((z) => Math.sqrt(1.8 * z), 0, 1.8),
  },
  {
    id: 'bullet-ogive',
    name: 'Bullet (Ogive)',
    group: 'Revolution Solids',
    blurb: 'The aerodynamic nose of a bullet: a circular arc rotated around its chord.',
    volume: 'V = \\pi \\int_0^L r(z)^2\\,dz',
    notice: 'Artillery shells and darts use the ogive — a rotated arc — because it keeps air flowing smoothly past the tip until the final instant. Geometry turning shape into accuracy.',
    build: () => revolutionMesh((z) => 1.6 * Math.sqrt(1 - (z / 2.2) ** 1.4), 0, 2.2),
  },
  {
    id: 'curious-egg',
    name: 'Curious Egg',
    group: 'Revolution Solids',
    blurb: 'A lopsided egg: rounder at one end, pointier at the other.',
    volume: 'V = \\pi \\int_{-0.5}^{2.5} r(z)^2\\,dz',
    notice: 'Eggs are not ellipsoids — the pointier end hosts the chick\'s head. Two different power laws (one per end) shape a single shell, and volume needs a genuine integral, not a formula.',
    build: () => revolutionMesh((z) => 0.62 * Math.sqrt((2.5 - z) ** 0.85 * (z + 0.5) ** 1.2), -0.5, 2.5),
  },
  {
    id: 'goblet',
    name: 'Goblet',
    group: 'Revolution Solids',
    blurb: 'A chalice: flaring base, slim stem, and a bowl carved by rotation.',
    volume: 'V = \\pi \\int_0^{2.6} r(z)^2\\,dz',
    notice: 'A profile with two humps — base flare and bowl — and a narrow waist between them, spun around its axis. Pottery wheels and lathes produce solids exactly this way, from flat curves.',
    build: () =>
      revolutionMesh(
        (z) => 1.05 * Math.exp(-((z - 0.1) ** 2) / 0.5) + 0.55 + 0.75 * Math.exp(-((z - 2.5) ** 2) / 0.4),
        0, 2.6
      ),
  },
];

/* ------------------------------------------------------------
   5. Advanced surfaces
   ------------------------------------------------------------ */

const advanced: SolidEntry[] = [
  {
    id: 'catenoid',
    name: 'Catenoid',
    group: 'Advanced Surfaces',
    blurb: 'The unique minimal surface formed by stretching a soap film between two parallel rings.',
    equation: '\\sqrt{x^2 + y^2} = c\\,\\cosh\\left(\\tfrac{z}{c}\\right)',
    notice: 'Dip two wire rings in soap and the film forms this exact shape — nature minimises area. Locally it is isometric to a helicoid!',
    build: () =>
      generateParametricMesh(
        (u, v) => {
          const z = (v - 0.5) * 3.4;
          const r = Math.cosh(z / 1.7) * 0.9;
          return { x: r * Math.cos(u), y: r * Math.sin(u), z };
        },
        0, 2 * Math.PI, 0, 1, 52, 22
      ),
  },
  {
    id: 'helicoid',
    name: 'Helicoid',
    group: 'Advanced Surfaces',
    blurb: 'A continuous, smooth screw-like or spiral staircase shape.',
    equation: 'x = \\rho\\cos\\theta,\\; y = \\rho\\sin\\theta,\\; z = \\alpha\\theta',
    notice: 'Screw threads, spiral staircases — and the only ruled minimal surface besides the plane and catenoid.',
    build: () =>
      generateParametricMesh(
        (u, v) => {
          const rho = v * 2;
          return { x: rho * Math.cos(u), y: rho * Math.sin(u), z: 0.45 * u - 1.4 };
        },
        -2 * Math.PI, 2 * Math.PI, 0, 1, 72, 10
      ),
  },
  {
    id: 'mobius',
    name: 'Möbius Strip',
    group: 'Advanced Surfaces',
    blurb: 'A non-orientable surface possessing only one single side and one single boundary edge.',
    equation: 'x = \\left(1 + \\tfrac{v}{2}\\cos\\tfrac{u}{2}\\right)\\cos u',
    notice: 'One side, one edge. An ant can walk the whole surface without crossing an edge — and paper bands like this inspired entire fields of topology.',
    build: () =>
      generateParametricMesh(
        (u, v) => {
          const w = (v - 0.5) * 1.3;
          return {
            x: (1.7 + w * Math.cos(u / 2)) * Math.cos(u),
            y: (1.7 + w * Math.cos(u / 2)) * Math.sin(u),
            z: w * Math.sin(u / 2),
          };
        },
        0, 2 * Math.PI, 0, 1, 80, 8
      ),
  },
  {
    id: 'klein-figure8',
    name: 'Klein Bottle (Figure-8 Immersion)',
    group: 'Advanced Surfaces',
    blurb: 'A mind-bending, one-sided closed bottle surface that loops back inside itself.',
    equation: 'x = \\left(r + \\cos\\tfrac{u}{2}\\sin v - \\sin\\tfrac{u}{2}\\sin 2v\\right)\\cos u',
    notice: 'No inside, no outside, no boundary. It cannot exist in 3D without passing through itself — this is the classic figure-8 immersion.',
    build: () =>
      generateParametricMesh(
        (u, v) => {
          const r = 2.1;
          const cu = Math.cos(u / 2);
          const su = Math.sin(u / 2);
          const sv = Math.sin(v * 2 * Math.PI);
          const x = (r + cu * sv - su * Math.sin(2 * v * 2 * Math.PI)) * Math.cos(u);
          const y = (r + cu * sv - su * Math.sin(2 * v * 2 * Math.PI)) * Math.sin(u);
          const z = su * sv + cu * Math.sin(2 * v * 2 * Math.PI);
          return { x, y, z: z * 1.2 };
        },
        0, 2 * Math.PI, 0, 1, 72, 24
      ),
  },
  {
    id: 'gabriel-horn',
    name: "Gabriel's Horn",
    group: 'Advanced Surfaces',
    blurb: 'An infinite funnel with a finite volume but an infinite surface area.',
    equation: 'y^2 + z^2 = \\tfrac{1}{x^2} \\;(x \\ge 1)',
    notice: "You could fill it with paint (finite volume) — but you could never paint it (infinite area). Torricelli's paradox from 1643.",
    build: () =>
      revolutionMesh((z) => 1.15 / (1 + z * 1.1), 0, 5.2, 40, 40),
  },
  {
    id: 'superellipsoid',
    name: 'Superellipsoid',
    group: 'Advanced Surfaces',
    blurb: 'A highly versatile 3D shape that can smoothly shift between a regular cylinder, cube, or ellipsoid.',
    equation: '\\left(\\left|\\tfrac{x}{a}\\right|^r + \\left|\\tfrac{y}{b}\\right|^r\\right)^{s/r} + \\left|\\tfrac{z}{c}\\right|^s = 1',
    notice: 'One equation, a whole family of shapes: tweak the exponents r and s to morph from sphere to box to pillow.',
    build: () =>
      generateParametricMesh(
        (u, v) => {
          const th = v * Math.PI - Math.PI / 2;
          const e = 0.35; // roundness exponent
          const ct = Math.cos(th);
          const st = Math.sin(th);
          const cap = (sg: number) => Math.sign(sg) * Math.abs(sg) ** (e * 0.55);
          return { x: cap(ct) * 1.6 * Math.sign(Math.cos(u)) * Math.abs(Math.cos(u)) ** 0.35, y: cap(ct) * Math.sign(Math.sin(u)) * Math.abs(Math.sin(u)) ** 0.35 * 1.6, z: cap(st) * 1.8 };
        },
        0, 2 * Math.PI, 0, 1, 48, 24
      ),
  },
  {
    id: 'pluckers-conoid',
    name: "Plücker's Conoid",
    group: 'Advanced Surfaces',
    blurb: 'A ruled surface whose straight lines pass through a fixed vertical axis.',
    equation: 'z = \\tfrac{2xy}{x^2 + y^2}',
    notice: 'Every straight generator crosses the central axis — a ruled surface that twists a full 2π around a single point.',
    build: () =>
      generateParametricMesh(
        (u, v) => {
          const rho = 0.35 + v * 2;
          return { x: rho * Math.cos(u), y: rho * Math.sin(u), z: Math.sin(2 * u) * 0.9 };
        },
        0, 2 * Math.PI, 0, 1, 72, 8
      ),
  },
  {
    id: 'monkey-saddle',
    name: 'Monkey Saddle',
    group: 'Advanced Surfaces',
    blurb: 'A specialized saddle surface possessing three dips instead of two (two for legs, one for the tail).',
    equation: 'z = x^3 - 3xy^2',
    notice: 'The classic saddle has two dips; add one more (the tail!) and the surface gains a three-fold symmetry.',
    build: () =>
      generateParametricMesh(
        (u, v) => ({ x: u * 2.2, y: v * 2.2, z: (u ** 3 - 3 * u * v * v) * 0.35 }),
        -1, 1, -1, 1, 40, 40
      ),
  },
  {
    id: 'enneper',
    name: 'Enneper Surface',
    group: 'Advanced Surfaces',
    blurb: 'A self-intersecting minimal surface that branches out beautifully like a flower petal.',
    equation: 'x = u - \\tfrac{u^3}{3} + uv^2,\\; y = v - \\tfrac{v^3}{3} + u^2v,\\; z = u^2 - v^2',
    notice: 'Mean curvature zero everywhere, defined by elegant polynomial maps — a favourite of soap-film physics and differential geometry.',
    build: () =>
      generateParametricMesh(
        (u, v) => ({
          x: u - (u ** 3) / 3 + u * v * v,
          y: v - (v ** 3) / 3 + u * u * v,
          z: (u * u - v * v) * 0.8,
        }),
        -1.7, 1.7, -1.7, 1.7, 46, 46
      ),
  },
  {
    id: 'pseudosphere',
    name: 'Pseudosphere',
    group: 'Advanced Surfaces',
    blurb: 'A surface of constant negative curvature — the hyperbolic cousin of the sphere.',
    equation: 'r = \\operatorname{sech} t,\\;\\; z = t - \\tanh t',
    notice: 'Take a sphere\'s equation and replace r² by −r² and the sphere turns inside-out into this infinite trumpet. Every patch of it is locally hyperbolic geometry — the model Beltrami used to embed it.',
    build: () =>
      generateParametricMesh(
        (u, v) => {
          const t = 0.001 + v * 2.9;
          const th = Math.tanh(t);
          const r = 1 / Math.cosh(t);
          return { x: r * Math.cos(u), y: r * Math.sin(u), z: t - th };
        },
        0, 2 * Math.PI, 0, 1, 56, 28
      ),
  },
  {
    id: 'scherk-surface',
    name: "Scherk's Surface",
    group: 'Advanced Surfaces',
    blurb: 'A doubly-periodic minimal surface that climbs to ±∞ in a checkerboard pattern.',
    equation: 'z = \\ln\\left(\\tfrac{\\cos y}{\\cos x}\\right)',
    notice: 'Its towers of +∞ and −∞ stagger like chessboard squares as you approach the grid lines x = ±π/2, y = ±π/2. Soap films over crossing frames dream about this minimising shape.',
    build: () =>
      generateParametricMesh(
        (u, v) => ({ x: u, y: v, z: Math.log(Math.cos(v) / Math.cos(u)) }),
        -1.45, 1.45, -1.45, 1.45, 40, 40
      ),
  },
  {
    id: 'catalan-surface',
    name: "Catalan's Surface",
    group: 'Advanced Surfaces',
    blurb: 'A minimal surface that sweeps a parabola along a cycloid using straight lines.',
    equation: 'x = u - \\sin u\\cosh v,\\; y = 1 - \\cos u\\cosh v,\\; z = 4\\sin\\tfrac{u}{2}\\sinh\\tfrac{v}{2}',
    notice: 'Plane sections reveal parabolas while the surface itself is built from straight generators — a ruled minimal surface discovered by Catalan in 1855. Least area and ruler-straight lines, together.',
    build: () =>
      generateParametricMesh(
        (u, v) => ({
          x: u - Math.sin(u) * Math.cosh(v),
          y: 1 - Math.cos(u) * Math.cosh(v),
          z: 4 * Math.sin(u / 2) * Math.sinh(v / 2),
        }),
        -3, 3, -1.5, 1.5, 46, 26
      ),
  },
  {
    id: 'astroidal-ellipsoid',
    name: 'Astroidal Ellipsoid',
    group: 'Advanced Surfaces',
    blurb: 'An ellipsoid pinched into eight star-sharp points.',
    equation: 'x = a\\cos^3 u\\cos^3 v,\\; y = b\\sin^3 u\\cos^3 v,\\; z = c\\sin^3 v',
    notice: 'Replace the circle\'s (cos, sin) with (cos³, sin³) — the cusped astroid curve — and rotate it into a surface: round bellies, needle-sharp points. Its cross-sections are four-pointed stars.',
    build: () =>
      generateParametricMesh(
        (u, v) => {
          const c3 = Math.cos(v) ** 3;
          return {
            x: 2.1 * Math.cos(u) ** 3 * c3,
            y: 2.1 * Math.sin(u) ** 3 * c3,
            z: 1.9 * Math.sin(v) ** 3,
          };
        },
        0, 2 * Math.PI, -Math.PI / 2, Math.PI / 2, 48, 24
      ),
  },
  {
    id: 'whitney-umbrella',
    name: 'Whitney Umbrella',
    group: 'Advanced Surfaces',
    blurb: 'The simplest singular surface: a self-intersecting sheet mounted on a stick.',
    equation: 'x = uv,\\; y = u,\\; z = v^2',
    notice: 'Every horizontal plane above the base cuts two crossing lines that meet only along the handle (the y-axis). Whitney\'s map is the textbook model of how projected folds create singularities.',
    build: () =>
      generateParametricMesh(
        (u, v) => ({ x: u * v, y: u, z: v * v }),
        -2, 2, -1.4, 1.4, 40, 24
      ),
  },
  {
    id: 'nautilus-shell',
    name: 'Nautilus Shell',
    group: 'Advanced Surfaces',
    blurb: 'A logarithmic spiral coiled into a shell — growth by pure multiplication.',
    equation: 'x = \\left(1 - \\tfrac{t}{2\\pi}\\right)\\cos t\\,(1 + \\cos u)',
    notice: 'Each chamber of a nautilus is a scaled copy of the last: the spiral widens by a constant factor, so the shell never outgrows its own silhouette. Growth by multiplication, frozen in stone.',
    build: () =>
      generateParametricMesh(
        (u, v) => {
          const t = v * 2 * Math.PI;
          const c = 1 - t / (2 * Math.PI);
          return {
            x: c * Math.cos(t) * (1 + Math.cos(u)) + 0.35 * Math.cos(t),
            y: c * Math.sin(t) * (1 + Math.cos(u)) + 0.35 * Math.sin(t),
            z: c * Math.sin(u),
          };
        },
        0, 2 * Math.PI, 0, 1, 64, 20
      ),
  },
];

export const SOLIDS: SolidEntry[] = [...polyhedra, ...archimedean, ...quadrics, ...revolution, ...advanced];

export const SOLID_GROUPS: SolidGroup[] = [
  'Polyhedra',
  'Regular & Archimedean',
  'Quadric Surfaces',
  'Revolution Solids',
  'Advanced Surfaces',
];

export const GROUP_BLURBS: Record<SolidGroup, string> = {
  Polyhedra: 'Flat-faced solids: prisms, pyramids, and their oblique cousins.',
  'Regular & Archimedean': 'Beautifully symmetrical shapes where every face is a regular polygon.',
  'Quadric Surfaces': 'Smooth surfaces defined by second-degree equations in 3D space.',
  'Revolution Solids': 'Classic engineering shapes made by revolving curves around an axis.',
  'Advanced Surfaces': 'Intriguing surfaces from advanced calculus, physics, and topology.',
};
