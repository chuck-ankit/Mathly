/* ============================================================
   Mathly 3D: mesh generation
   Dependency-free builders for heightfield surfaces (z = f(x,y)),
   parametric surfaces, and polyhedra. All meshes are triangle
   lists; invalid regions (NaN / |z| beyond the range) are clipped
   the same way the 2D sampler clips asymptotes.
   ============================================================ */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Tri {
  a: Vec3;
  b: Vec3;
  c: Vec3;
}

export interface TriMesh {
  tris: Tri[];
}

export interface SurfaceDomain {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
  zmin: number;
  zmax: number;
}

export interface SurfaceOptions {
  /** Grid resolution per axis (default 48). */
  resolution?: number;
}

const valid = (v: Vec3): boolean =>
  Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);

/**
 * Build a triangle mesh for z = f(x, y) over the domain.
 * Triangles touching NaN or |z| > range are dropped (clean clipping
 * instead of ugly walls at blow-ups).
 */
export function generateSurfaceMesh(
  f: (x: number, y: number) => number,
  domain: SurfaceDomain,
  opts: SurfaceOptions = {}
): TriMesh {
  const n = Math.max(4, Math.min(120, opts.resolution ?? 48));
  const tris: Tri[] = [];
  const dx = (domain.xmax - domain.xmin) / n;
  const dy = (domain.ymax - domain.ymin) / n;

  const z: number[][] = [];
  for (let i = 0; i <= n; i++) {
    z[i] = [];
    const x = domain.xmin + i * dx;
    for (let j = 0; j <= n; j++) {
      const y = domain.ymin + j * dy;
      const v = f(x, y);
      const inRange = Number.isFinite(v) && v >= domain.zmin && v <= domain.zmax;
      z[i][j] = inRange ? v : Number.NaN;
    }
  }

  const p = (i: number, j: number): Vec3 => ({
    x: domain.xmin + i * dx,
    y: domain.ymin + j * dy,
    z: z[i][j],
  });

  const push = (a: Vec3, b: Vec3, c: Vec3): void => {
    if (valid(a) && valid(b) && valid(c)) tris.push({ a, b, c });
  };

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      push(p(i, j), p(i + 1, j), p(i + 1, j + 1));
      push(p(i, j), p(i + 1, j + 1), p(i, j + 1));
    }
  }
  return { tris };
}

/**
 * Build a mesh from a parametric surface fn(u, v) → [x, y, z].
 * Triangles with any NaN vertex are dropped.
 */
export function generateParametricMesh(
  fn: (u: number, v: number) => Vec3,
  u0: number,
  u1: number,
  v0: number,
  v1: number,
  nu = 48,
  nv = 24
): TriMesh {
  nu = Math.max(3, Math.min(160, nu));
  nv = Math.max(3, Math.min(160, nv));
  const tris: Tri[] = [];
  const grid: (Vec3 | null)[][] = [];
  for (let i = 0; i <= nu; i++) {
    grid[i] = [];
    const u = u0 + ((u1 - u0) * i) / nu;
    for (let j = 0; j <= nv; j++) {
      const v = v0 + ((v1 - v0) * j) / nv;
      const p = fn(u, v);
      grid[i][j] = valid(p) ? p : null;
    }
  }
  const push = (a: Vec3 | null, b: Vec3 | null, c: Vec3 | null): void => {
    if (a && b && c) tris.push({ a, b, c });
  };
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      push(grid[i][j], grid[i + 1][j], grid[i + 1][j + 1]);
      push(grid[i][j], grid[i + 1][j + 1], grid[i][j + 1]);
    }
  }
  return { tris };
}

/** Fan-triangulate an ordered polygon face. */
export function polygonToTris(face: Vec3[]): Tri[] {
  const tris: Tri[] = [];
  for (let i = 1; i < face.length - 1; i++) {
    tris.push({ a: face[0], b: face[i], c: face[i + 1] });
  }
  return tris;
}

/** Turn an unordered polygon face into a consistently ordered one (Newell). */
export function orderFace(face: Vec3[]): Vec3[] {
  if (face.length < 3) return face;
  // Face normal via Newell's method on centroid-sorted ring
  let nx = 0;
  let ny = 0;
  let nz = 0;
  const n = face.length;
  for (let i = 0; i < n; i++) {
    const a = face[i];
    const b = face[(i + 1) % n];
    nx += (a.y - b.y) * (a.z + b.z);
    ny += (a.z - b.z) * (a.x + b.x);
    nz += (a.x - b.x) * (a.y + b.y);
  }
  const normal = { x: nx, y: ny, z: nz };
  let nlen = Math.hypot(normal.x, normal.y, normal.z);
  if (nlen < 1e-12) {
    // Newell can cancel on adversarial orderings of coplanar points; any
    // non-collinear triple gives the same (up to sign) plane normal.
    outer: for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        for (let k = j + 1; k < n; k++) {
          const u = { x: face[j].x - face[i].x, y: face[j].y - face[i].y, z: face[j].z - face[i].z };
          const w = { x: face[k].x - face[i].x, y: face[k].y - face[i].y, z: face[k].z - face[i].z };
          const c = {
            x: u.y * w.z - u.z * w.y,
            y: u.z * w.x - u.x * w.z,
            z: u.x * w.y - u.y * w.x,
          };
          const cl = Math.hypot(c.x, c.y, c.z);
          if (cl > 1e-9) {
            normal.x = c.x;
            normal.y = c.y;
            normal.z = c.z;
            nlen = cl;
            break outer;
          }
        }
      }
    }
  }
  if (nlen < 1e-12) return face;
  // Build in-plane basis (from `normal`, which the fallback keeps in sync —
  // nx/ny/nz themselves may have cancelled to zero)
  const nrm = { x: normal.x / nlen, y: normal.y / nlen, z: normal.z / nlen };
  const centroid = face.reduce((acc, p) => ({ x: acc.x + p.x / n, y: acc.y + p.y / n, z: acc.z + p.z / n }), { x: 0, y: 0, z: 0 });
  let ref = { x: face[0].x - centroid.x, y: face[0].y - centroid.y, z: face[0].z - centroid.z };
  const rlen = Math.hypot(ref.x, ref.y, ref.z) || 1;
  ref = { x: ref.x / rlen, y: ref.y / rlen, z: ref.z / rlen };
  const ux = ref;
  const uy = {
    x: nrm.y * ux.z - nrm.z * ux.y,
    y: nrm.z * ux.x - nrm.x * ux.z,
    z: nrm.x * ux.y - nrm.y * ux.x,
  };
  const sorted = [...face].sort((p1, p2) => {
    const a1 = Math.atan2(
      (p1.x - centroid.x) * uy.x + (p1.y - centroid.y) * uy.y + (p1.z - centroid.z) * uy.z,
      (p1.x - centroid.x) * ux.x + (p1.y - centroid.y) * ux.y + (p1.z - centroid.z) * ux.z
    );
    const a2 = Math.atan2(
      (p2.x - centroid.x) * uy.x + (p2.y - centroid.y) * uy.y + (p2.z - centroid.z) * uy.z,
      (p2.x - centroid.x) * ux.x + (p2.y - centroid.y) * ux.y + (p2.z - centroid.z) * ux.z
    );
    return a1 - a2;
  });
  return sorted;
}

/** Triangulate an ordered polygon face (public helper for solids). */
export function faceToTris(face: Vec3[]): Tri[] {
  return polygonToTris(orderFace(face));
}

/**
 * Recover faces of a uniform (Platonic/Archimedean-style) solid from its
 * vertices and face-normal directions: every face plane passes through the
 * origin direction of its normal, so verts with maximal dot product form the
 * face. Vertices are Newell-ordered and fan-triangulated.
 */
export function facesFromNormals(verts: Vec3[], normals: Vec3[]): TriMesh {
  const tris: Tri[] = [];
  for (const rawN of normals) {
    const len = Math.hypot(rawN.x, rawN.y, rawN.z);
    if (len < 1e-12) continue;
    const n = { x: rawN.x / len, y: rawN.y / len, z: rawN.z / len };
    let maxDot = -Infinity;
    const dots = verts.map((v) => {
      const d = v.x * n.x + v.y * n.y + v.z * n.z;
      if (d > maxDot) maxDot = d;
      return d;
    });
    // Tolerance relative to vertex scale
    const scale = Math.max(...verts.map((v) => Math.hypot(v.x, v.y, v.z)));
    const face = verts.filter((_, i) => maxDot - dots[i] < 1e-6 * scale * scale + 1e-9);
    if (face.length >= 3) tris.push(...faceToTris(face));
  }
  return { tris };
}

/* ------------------------------------------------------------
   Convex-hull face extraction
   ------------------------------------------------------------ */

export interface MeshStats {
  /** Unique vertices (3-decimal key). */
  v: number;
  /** Unique edges (undirected, keyed by sorted endpoint indices). */
  e: number;
  /** Unique planar faces — triangles merged across coplanar neighbours. */
  f: number;
  /** Euler characteristic v − e + f (2 for every convex polyhedron). */
  chi: number;
}

/** Count unique verts/edges/planar-faces of a mesh built from a convex polyhedron. */
export function meshStats(mesh: TriMesh): MeshStats {
  // Unique vertices
  const key = (p: Vec3): string => `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`;
  const vIndex = new Map<string, number>();
  const verts: Vec3[] = [];
  const indexOf = (p: Vec3): number => {
    const k = key(p);
    let i = vIndex.get(k);
    if (i === undefined) {
      i = verts.length;
      vIndex.set(k, i);
      verts.push(p);
    }
    return i;
  };
  const triIdx: [number, number, number][] = mesh.tris.map((t) => [indexOf(t.a), indexOf(t.b), indexOf(t.c)]);

  // Merge coplanar adjacent triangles into polygonal faces, then take the
  // edges from each face's ordered vertex ring (NOT the fan diagonals).
  const n = triIdx.length;
  const triNormal = (t: [number, number, number]): Vec3 => {
    const [a, b, c] = [verts[t[0]], verts[t[1]], verts[t[2]]];
    const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const w = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
    const nx = u.y * w.z - u.z * w.y;
    const ny = u.z * w.x - u.x * w.z;
    const nz = u.x * w.y - u.y * w.x;
    const len = Math.hypot(nx, ny, nz) || 1;
    return { x: nx / len, y: ny / len, z: nz / len };
  };
  const normals = triIdx.map(triNormal);
  const centroid = (t: [number, number, number]): Vec3 => ({
    x: (verts[t[0]].x + verts[t[1]].x + verts[t[2]].x) / 3,
    y: (verts[t[0]].y + verts[t[1]].y + verts[t[2]].y) / 3,
    z: (verts[t[0]].z + verts[t[1]].z + verts[t[2]].z) / 3,
  });
  const sameFace = (i: number, j: number): boolean => {
    const ni = normals[i];
    const nj = normals[j];
    if (Math.abs(ni.x * nj.x + ni.y * nj.y + ni.z * nj.z) < 0.99999) return false;
    const ci = centroid(triIdx[i]);
    const cj = centroid(triIdx[j]);
    const d = (cj.x - ci.x) * ni.x + (cj.y - ci.y) * ni.y + (cj.z - ci.z) * ni.z;
    return Math.abs(d) < 1e-6;
  };
  // Adjacency via shared edge
  const edgeMap = new Map<string, number[]>();
  triIdx.forEach(([a, b, c], i) => {
    for (const [p, q] of [[a, b], [b, c], [a, c]] as [number, number][]) {
      const ek = p < q ? `${p}_${q}` : `${q}_${p}`;
      const list = edgeMap.get(ek);
      if (list) list.push(i);
      else edgeMap.set(ek, [i]);
    }
  });
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const list of edgeMap.values()) {
    for (let x = 0; x < list.length; x++) {
      for (let y = x + 1; y < list.length; y++) {
        if (sameFace(list[x], list[y])) {
          adj[list[x]].push(list[y]);
          adj[list[y]].push(list[x]);
        }
      }
    }
  }
  let faces = 0;
  const edges = new Set<string>();
  const seen = new Array<boolean>(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (seen[i]) continue;
    faces++;
    const comp: number[] = [];
    const stack = [i];
    seen[i] = true;
    while (stack.length) {
      const cur = stack.pop()!;
      comp.push(cur);
      for (const nb of adj[cur]) {
        if (!seen[nb]) {
          seen[nb] = true;
          stack.push(nb);
        }
      }
    }
    // Ordered ring of this face's vertices → perimeter edges
    const vset = new Set<number>();
    for (const ti of comp) for (const vi of triIdx[ti]) vset.add(vi);
    const ring = orderFace([...vset].map((vi) => verts[vi]));
    for (let r = 0; r < ring.length; r++) {
      const a = indexOf(ring[r]);
      const b = indexOf(ring[(r + 1) % ring.length]);
      if (a !== b) edges.add(a < b ? `${a}_${b}` : `${b}_${a}`);
    }
  }

  return { v: verts.length, e: edges.size, f: faces, chi: verts.length - edges.size + faces };
}

/**
 * Exact convex-hull face extraction for polyhedra given their vertices
 * (replaces fragile face-normal tables).
 * Every coplanar polygon of the hull (triangle, quad, pentagon, …) becomes
 * one face; faces are Newell-ordered and fan-triangulated.
 */
export function convexHullFaces(points: Vec3[]): TriMesh {
  const tris = hullTriangles(points);
  return { tris: mergeCoplanarFaces(tris, points) };
}

/** Convenience: hull of [x,y,z] tuples, scaled to a nice scene radius. */
export function hullMesh(points: [number, number, number][], targetRadius = 2.2): TriMesh {
  const pts: Vec3[] = points.map(([x, y, z]) => ({ x, y, z }));
  return normalizeMesh(convexHullFaces(pts), targetRadius);
}

/** O(n⁴) strict hull — perfectly fine for n ≤ 60 (all Archimedean solids). */
function hullTriangles(points: Vec3[]): { a: Vec3; b: Vec3; c: Vec3 }[] {
  const n = points.length;
  const out: { a: Vec3; b: Vec3; c: Vec3 }[] = [];
  const scale = Math.max(...points.map((p) => Math.hypot(p.x, p.y, p.z))) || 1;
  const eps = 1e-6 * scale;
  const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: b.x - a.x, y: b.y - a.y, z: b.z - a.z });
  const cross = (u: Vec3, w: Vec3): Vec3 => ({
    x: u.y * w.z - u.z * w.y,
    y: u.z * w.x - u.x * w.z,
    z: u.x * w.y - u.y * w.x,
  });
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const a = points[i];
        const b = points[j];
        const c = points[k];
        const nrm = cross(sub(a, b), sub(a, c));
        const nlen = Math.hypot(nrm.x, nrm.y, nrm.z);
        if (nlen < eps) continue; // collinear
        const d = nrm.x * a.x + nrm.y * a.y + nrm.z * a.z;
        const nn = { x: nrm.x / nlen, y: nrm.y / nlen, z: nrm.z / nlen };
        const dd = d / nlen;
        let hasPos = false;
        let hasNeg = false;
        for (let m = 0; m < n; m++) {
          if (m === i || m === j || m === k) continue;
          const s = nn.x * points[m].x + nn.y * points[m].y + nn.z * points[m].z - dd;
          if (s > eps) hasPos = true;
          else if (s < -eps) hasNeg = true;
          if (hasPos && hasNeg) break;
        }
        if (hasPos && hasNeg) continue; // interior edge
        // Hull face — emit with OUTWARD orientation. All other vertices sit
        // on one side of the plane; the solid body is on that side, so the
        // outward normal points the opposite way. Flipping (b,c) when the
        // triple's normal points into the body keeps winding consistent
        // across coplanar triangles (needed for face merging + shading).
        if (hasPos && !hasNeg) out.push({ a, b: c, c: b });
        else out.push({ a, b, c });
      }
    }
  }
  return out;
}

/**
 * Merge hull triangles into their coplanar polygonal faces. Each hull face is
 * a connected component of same-plane adjacent triangles; the polygon is
 * rebuilt by ordering its vertices by angle around the face centroid.
 */
function mergeCoplanarFaces(tris: { a: Vec3; b: Vec3; c: Vec3 }[], points: Vec3[]): Tri[] {
  const key = (p: Vec3): string => `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`;
  const scale = Math.max(...points.map((p) => Math.hypot(p.x, p.y, p.z))) || 1;

  const normalOf = (t: { a: Vec3; b: Vec3; c: Vec3 }): Vec3 => {
    const u = sub3(t.b, t.a);
    const w = sub3(t.c, t.a);
    const cr = cross3(u, w);
    const len = Math.hypot(cr.x, cr.y, cr.z) || 1;
    return { x: cr.x / len, y: cr.y / len, z: cr.z / len };
  };

  const edgeMap = new Map<string, number[]>();
  tris.forEach((t, i) => {
    const verts = [t.a, t.b, t.c];
    for (let x = 0; x < 3; x++) {
      const k1 = key(verts[x]);
      const k2 = key(verts[(x + 1) % 3]);
      const ek = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
      const list = edgeMap.get(ek);
      if (list) list.push(i);
      else edgeMap.set(ek, [i]);
    }
  });

  const n = tris.length;
  const normals = tris.map(normalOf);
  const sameFace = (i: number, j: number): boolean => {
    const ni = normals[i];
    const nj = normals[j];
    // Same plane = parallel normals AND coplanar offset (hull has no interior
    // duplicates, so parallel is sufficient — kept strict anyway)
    if (ni.x * nj.x + ni.y * nj.y + ni.z * nj.z < 0.99999) return false;
    const c = tris[j].a;
    const d = (c.x - tris[i].a.x) * ni.x + (c.y - tris[i].a.y) * ni.y + (c.z - tris[i].a.z) * ni.z;
    return Math.abs(d) < 1e-5 * scale;
  };

  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const list of edgeMap.values()) {
    for (let x = 0; x < list.length; x++) {
      for (let y = x + 1; y < list.length; y++) {
        if (sameFace(list[x], list[y])) {
          adj[list[x]].push(list[y]);
          adj[list[y]].push(list[x]);
        }
      }
    }
  }

  const out: Tri[] = [];
  const seen = new Array<boolean>(n).fill(false);
  for (let seed = 0; seed < n; seed++) {
    if (seen[seed]) continue;
    const comp: number[] = [];
    const stack = [seed];
    seen[seed] = true;
    while (stack.length) {
      const cur = stack.pop()!;
      comp.push(cur);
      for (const nb of adj[cur]) {
        if (!seen[nb]) {
          seen[nb] = true;
          stack.push(nb);
        }
      }
    }
    // Unique vertices of this face
    const vmap = new Map<string, Vec3>();
    for (const ti of comp) {
      for (const p of [tris[ti].a, tris[ti].b, tris[ti].c]) vmap.set(key(p), p);
    }
    const poly = [...vmap.values()];
    // orderFace's Newell sign is arbitrary on unordered input, so the ring may
    // come out wound backwards. The component's triangles are consistently
    // OUTWARD (guaranteed by hullTriangles), so force the fan to match.
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const ti of comp) {
      const ni = normals[ti];
      cx += ni.x;
      cy += ni.y;
      cz += ni.z;
    }
    const clen = Math.hypot(cx, cy, cz) || 1;
    const compN = { x: cx / clen, y: cy / clen, z: cz / clen };
    for (const t of faceToTris(poly)) {
      const tn = normalOf(t);
      if (tn.x * compN.x + tn.y * compN.y + tn.z * compN.z < 0) {
        out.push({ a: t.a, b: t.c, c: t.b });
      } else {
        out.push(t);
      }
    }
  }
  return out;
}

function sub3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function cross3(u: Vec3, w: Vec3): Vec3 {
  return { x: u.y * w.z - u.z * w.y, y: u.z * w.x - u.x * w.z, z: u.x * w.y - u.y * w.x };
}

/** Scale a mesh uniformly so it fits nicely in the scene box. */
export function normalizeMesh(mesh: TriMesh, targetRadius = 4): TriMesh {
  let maxR = 0;
  for (const t of mesh.tris) {
    for (const p of [t.a, t.b, t.c]) {
      maxR = Math.max(maxR, Math.hypot(p.x, p.y, p.z));
    }
  }
  if (maxR < 1e-12) return mesh;
  const s = targetRadius / maxR;
  const sc = (p: Vec3): Vec3 => ({ x: p.x * s, y: p.y * s, z: p.z * s });
  return { tris: mesh.tris.map((t) => ({ a: sc(t.a), b: sc(t.b), c: sc(t.c) })) };
}

/* ------------------------------------------------------------
   Solid builders
   ------------------------------------------------------------ */

/** Prism (optionally oblique via shear) from a 2D base polygon + height. */
export function prismMesh(base: [number, number][], height: number, shear: [number, number] = [0, 0]): TriMesh {
  const lower: Vec3[] = base.map(([x, y]) => ({ x, y, z: 0 }));
  const upper: Vec3[] = base.map(([x, y]) => ({ x: x + shear[0], y: y + shear[1], z: height }));
  const tris: Tri[] = [];
  tris.push(...faceToTris(lower));
  tris.push(...faceToTris(upper));
  const n = base.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tris.push({ a: lower[i], b: lower[j], c: upper[j] });
    tris.push({ a: lower[i], b: upper[j], c: upper[i] });
  }
  return { tris };
}

/** Pyramid (optionally oblique via apex offset) from a 2D base polygon. */
export function pyramidMesh(base: [number, number][], apexZ: number, apexOffset: [number, number] = [0, 0]): TriMesh {
  const lower: Vec3[] = base.map(([x, y]) => ({ x, y, z: 0 }));
  const apex: Vec3 = { x: apexOffset[0], y: apexOffset[1], z: apexZ };
  const tris: Tri[] = [...faceToTris(lower)];
  const n = base.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tris.push({ a: lower[i], b: lower[j], c: apex });
  }
  return { tris };
}

/** Frustum: prism whose top polygon is scaled by `topScale` (0 < s < 1). */
export function frustumMesh(base: [number, number][], height: number, topScale: number): TriMesh {
  const lower: Vec3[] = base.map(([x, y]) => ({ x, y, z: 0 }));
  const upper: Vec3[] = base.map(([x, y]) => ({ x: x * topScale, y: y * topScale, z: height }));
  const tris: Tri[] = [];
  tris.push(...faceToTris(lower));
  tris.push(...faceToTris(upper));
  const n = base.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tris.push({ a: lower[i], b: lower[j], c: upper[j] });
    tris.push({ a: lower[i], b: upper[j], c: upper[i] });
  }
  return { tris };
}

/** Regular n-gon base polygon. */
export function regularPolygon(sides: number, radius: number, rotation = 0): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const a = rotation + (2 * Math.PI * i) / sides;
    pts.push([radius * Math.cos(a), radius * Math.sin(a)]);
  }
  return pts;
}

/** Surface of revolution around the z axis: radius r(z) for z ∈ [z0, z1]. */
export function revolutionMesh(
  r: (z: number) => number,
  z0: number,
  z1: number,
  segments = 48,
  steps = 24
): TriMesh {
  return generateParametricMesh(
    (u, v) => {
      const z = z0 + (z1 - z0) * v;
      const rad = r(z);
      if (!Number.isFinite(rad) || rad < 0) return { x: NaN, y: NaN, z: NaN };
      return { x: rad * Math.cos(u), y: rad * Math.sin(u), z };
    },
    0,
    2 * Math.PI,
    0,
    1,
    segments,
    steps
  );
}

/** Sphere patch (optionally limited in azimuth for wedges). */
export function spherePatchMesh(
  radius: number,
  thetaMin = 0,
  thetaMax = Math.PI,
  phiMax = 2 * Math.PI,
  nu = 48,
  nv = 24
): TriMesh {
  return generateParametricMesh(
    (u, v) => {
      const theta = thetaMin + (thetaMax - thetaMin) * v;
      return {
        x: radius * Math.sin(theta) * Math.cos(u),
        y: radius * Math.sin(theta) * Math.sin(u),
        z: radius * Math.cos(theta),
      };
    },
    0,
    phiMax,
    0,
    1,
    nu,
    nv
  );
}
