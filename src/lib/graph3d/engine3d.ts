/* ============================================================
   Mathly 3D: canvas render engine
   Orbit camera + painter's-algorithm rasterizer. Same hygiene as
   the 2D engine: rAF only when dirty, dpr-aware, pointer capture,
   touch orbit + pinch zoom.
   ============================================================ */

import { TriMesh, Vec3 } from './mesh';

export interface Camera3d {
  theta: number; // azimuth (radians)
  phi: number; // elevation (radians)
  dist: number; // camera distance
  fov: number; // vertical half-angle (radians)
}

export const DEFAULT_CAMERA: Camera3d = {
  theta: -Math.PI / 5,
  phi: Math.PI / 4.2,
  dist: 15,
  fov: 0.42,
};

/** Named preset views exposed to the UI. */
export type View3D = 'iso' | 'top' | 'front' | 'side';

export const VIEW_CAMERAS: Record<View3D, Camera3d> = {
  iso: { ...DEFAULT_CAMERA },
  top: { theta: 0, phi: Math.PI / 2 - 0.02, dist: 16, fov: 0.42 },
  front: { theta: 0, phi: 0.16, dist: 16, fov: 0.42 },
  side: { theta: Math.PI / 2, phi: 0.16, dist: 16, fov: 0.42 },
};

export interface DrawStyle {
  /** Height-gradient colors [low, high] or a single color. */
  colorLow: string;
  colorHigh: string;
  opacity: number;
  /** Draw wireframe edges on top. */
  wireframe: boolean;
}

export const DEFAULT_STYLE: DrawStyle = {
  colorLow: '#4f7cff',
  colorHigh: '#a86cff',
  opacity: 0.96,
  wireframe: true,
};

interface CameraVectors {
  eye: Vec3;
  fwd: Vec3;
  right: Vec3;
  up: Vec3;
}

function cameraVectors(c: Camera3d): CameraVectors {
  const cp = Math.cos(c.phi);
  const sp = Math.sin(c.phi);
  const ct = Math.cos(c.theta);
  const st = Math.sin(c.theta);
  const eye: Vec3 = { x: c.dist * cp * st, y: c.dist * cp * ct, z: c.dist * sp };
  // Look at origin
  const fl = Math.hypot(eye.x, eye.y, eye.z);
  const fwd: Vec3 = { x: -eye.x / fl, y: -eye.y / fl, z: -eye.z / fl };
  // World up projected
  const worldUp: Vec3 = { x: 0, y: 0, z: 1 };
  const rx = worldUp.y * fwd.z - worldUp.z * fwd.y;
  const ry = worldUp.z * fwd.x - worldUp.x * fwd.z;
  const rz = worldUp.x * fwd.y - worldUp.y * fwd.x;
  const rl = Math.hypot(rx, ry, rz);
  let right: Vec3;
  if (rl < 1e-6) {
    // Directly above/below (top view): world-up is parallel to fwd — pick an
    // arbitrary horizontal right axis instead of a degenerate cross product.
    right = { x: 1, y: 0, z: 0 };
  } else {
    right = { x: rx / rl, y: ry / rl, z: rz / rl };
  }
  const up: Vec3 = {
    x: fwd.y * right.z - fwd.z * right.y,
    y: fwd.z * right.x - fwd.x * right.z,
    z: fwd.x * right.y - fwd.y * right.x,
  };
  return { eye, fwd, right, up };
}

interface Projected {
  px: number;
  py: number;
  depth: number;
  ok: boolean;
}

export interface Scene {
  mesh: TriMesh;
  /** Axis ranges for drawing the reference box. */
  box: { xr: number; yr: number; zr: number };
  zLo: number;
  zHi: number;
}

function project(v: Vec3, cam: Camera3d, cv: CameraVectors, width: number, height: number): Projected {
  const dx = v.x - cv.eye.x;
  const dy = v.y - cv.eye.y;
  const dz = v.z - cv.eye.z;
  const depth = dx * cv.fwd.x + dy * cv.fwd.y + dz * cv.fwd.z;
  if (depth <= 0.2) return { px: 0, py: 0, depth, ok: false };
  const px = (dx * cv.right.x + dy * cv.right.y + dz * cv.right.z) / depth;
  const py = (dx * cv.up.x + dy * cv.up.y + dz * cv.up.z) / depth;
  const scale = height / 2 / Math.tan(cam.fov);
  return {
    px: width / 2 + px * scale,
    py: height / 2 - py * scale,
    depth,
    ok: true,
  };
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function mixColor(low: string, high: string, t: number): string {
  const [r1, g1, b1] = parseHex(low);
  const [r2, g2, b2] = parseHex(high);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

/** Simple lambert-ish factor from a triangle normal and a fixed light. */
function shadeFactor(a: Vec3, b: Vec3, c: Vec3): number {
  const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  let nx = u.y * v.z - u.z * v.y;
  let ny = u.z * v.x - u.x * v.z;
  let nz = u.x * v.y - u.y * v.x;
  const len = Math.hypot(nx, ny, nz);
  if (len < 1e-12) return 0.7;
  nx /= len;
  ny /= len;
  nz /= len;
  const light = { x: -0.4, y: -0.5, z: 0.76 };
  const d = Math.abs(nx * light.x + ny * light.y + nz * light.z);
  return 0.45 + 0.55 * d;
}

/* ------------------------------------------------------------ */

export class Engine3D {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private box = { width: 0, height: 0 };
  private dpr = 1;
  private camera: Camera3d = { ...DEFAULT_CAMERA };
  private style: DrawStyle = { ...DEFAULT_STYLE };
  private scene: Scene | null = null;
  private raf = 0;
  private rafIsTimeout = false;
  private dirty = true;
  private palette: string[] = [];
  private paletteKey = '';
  private tokensCache: { theme: string; bg: string; axis: string; grid: string } | null = null;
  private autoRotate = false;
  private autoRotateSpeed = 0.0075;
  private target: Camera3d | null = null;
  private opts: { onCameraChange?: (c: Camera3d) => void };
  private pointers = new Map<number, { x: number; y: number }>();
  private lastPinch = 0;
  private dragging = false;
  private lastPointer: { x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement, opts: { onCameraChange?: (c: Camera3d) => void } = {}) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.canvas = canvas;
    this.ctx = ctx;
    this.opts = opts;
    this.attach();
    this.buildPalette(this.style);
    this.schedule();
  }

  destroy(): void {
    this.cancelFrame();
    this.detach();
  }

  resize(width: number, height: number): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.box = { width, height };
    this.canvas.width = Math.max(1, Math.round(width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(height * this.dpr));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.dirty = true;
    this.schedule();
  }

  setScene(scene: Scene | null): void {
    this.scene = scene;
    this.dirty = true;
    this.schedule();
  }

  setStyle(style: DrawStyle): void {
    const s = this.style;
    if (
      s.colorLow === style.colorLow &&
      s.colorHigh === style.colorHigh &&
      s.opacity === style.opacity &&
      s.wireframe === style.wireframe
    ) {
      return; // identical style — skip the repaint entirely
    }
    this.style = style;
    this.buildPalette(style);
    this.dirty = true;
    this.schedule();
  }

  setCamera(cam: Camera3d): void {
    this.camera = cam;
    this.dirty = true;
    this.schedule();
  }

  getCamera(): Camera3d {
    return this.camera;
  }

  /** Smoothly glide to a named preset view. */
  setView(view: View3D): void {
    this.target = { ...VIEW_CAMERAS[view] };
    this.dirty = true;
    this.schedule();
  }

  /** Animate back to the default isometric view. */
  resetView(): void {
    this.target = { ...VIEW_CAMERAS.iso };
    this.dirty = true;
    this.schedule();
  }

  /** Continuously orbit the scene until disabled or the user grabs it. */
  setAutoRotate(on: boolean, speed?: number): void {
    this.autoRotate = on;
    if (typeof speed === 'number' && Number.isFinite(speed)) this.autoRotateSpeed = speed;
    this.dirty = true;
    this.schedule();
  }

  /** Request the next animation frame — at most one pending at a time. */
  private schedule(): void {
    if (this.raf !== 0) return;
    if (typeof requestAnimationFrame === 'function') {
      this.rafIsTimeout = false;
      this.raf = requestAnimationFrame(this.loop);
    } else {
      // Headless/preview webviews where rAF never fires.
      this.rafIsTimeout = true;
      this.raf = window.setTimeout(this.loop, 16);
    }
  }

  private cancelFrame(): void {
    if (this.raf === 0) return;
    if (this.rafIsTimeout) window.clearTimeout(this.raf);
    else cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** True while camera animation (glide or auto-rotate) needs more frames. */
  private needsFrame(): boolean {
    return this.target !== null || (this.autoRotate && !this.dragging && this.pointers.size === 0);
  }

  /**
   * Event-driven loop: a frame runs only while something is dirty or
   * animating, then the loop stops. Idle canvases cost literally zero —
   * unlike the old always-on 60 Hz timer.
   */
  private loop = (): void => {
    this.raf = 0;
    this.advance();
    if (this.dirty) {
      this.dirty = false;
      this.draw();
    }
    if (this.needsFrame()) this.schedule();
  };

  /** Per-tick camera animation: settle toward a target, then auto-rotate. */
  private advance(): void {
    if (this.target && this.dragging) {
      // The user grabs the wheel mid-flight — cancel the glide they've overridden.
      this.target = null;
    }
    let moved = false;
    if (this.target) {
      const c = this.camera;
      const t = this.target;
      const dTheta = t.theta - c.theta;
      const dPhi = t.phi - c.phi;
      // Shortest-path theta wrap (never spin the long way around).
      const theta = c.theta + wrapAngle(dTheta) * 0.16;
      const phi = c.phi + dPhi * 0.16;
      const dist = c.dist + (t.dist - c.dist) * 0.13;
      const fov = c.fov + (t.fov - c.fov) * 0.13;
      moved =
        Math.abs(theta - t.theta) > 1e-3 ||
        Math.abs(phi - t.phi) > 1e-3 ||
        Math.abs(dist - t.dist) > 1e-3 ||
        Math.abs(fov - t.fov) > 1e-3;
      this.camera.theta = theta;
      this.camera.phi = clamp(phi, 0.04, Math.PI / 2 - 0.02);
      this.camera.dist = clampDist(dist);
      this.camera.fov = fov;
      if (!moved) this.target = null;
    }
    if (this.autoRotate && !this.target && !this.dragging && this.pointers.size === 0) {
      this.camera.theta += this.autoRotateSpeed;
      moved = true;
    }
    if (moved) {
      this.opts.onCameraChange?.(this.camera);
      this.dirty = true;
    }
  }

  /* ---------------- events ---------------- */

  private attach(): void {
    const c = this.canvas;
    c.addEventListener('pointerdown', this.onDown);
    c.addEventListener('pointermove', this.onMove);
    c.addEventListener('pointerup', this.onUp);
    c.addEventListener('pointercancel', this.onUp);
    c.addEventListener('wheel', this.onWheel, { passive: false });
    c.addEventListener('dblclick', this.onDbl);
  }

  private detach(): void {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onDown);
    c.removeEventListener('pointermove', this.onMove);
    c.removeEventListener('pointerup', this.onUp);
    c.removeEventListener('pointercancel', this.onUp);
    c.removeEventListener('wheel', this.onWheel);
    c.removeEventListener('dblclick', this.onDbl);
  }

  private onDown = (e: PointerEvent): void => {
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (this.pointers.size === 2) {
      const [p1, p2] = [...this.pointers.values()];
      this.lastPinch = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      this.dragging = false;
      return;
    }
    this.dragging = true;
    this.lastPointer = { x: e.offsetX, y: e.offsetY };
  };

  private onMove = (e: PointerEvent): void => {
    if (this.pointers.has(e.pointerId)) {
      this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    }
    if (this.pointers.size === 2) {
      const [p1, p2] = [...this.pointers.values()];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      if (this.lastPinch > 0 && d > 0) {
        this.camera.dist = clampDist(this.camera.dist * (this.lastPinch / d));
        this.opts.onCameraChange?.(this.camera);
        this.dirty = true;
        this.schedule();
      }
      this.lastPinch = d;
      return;
    }
    if (this.dragging && this.lastPointer) {
      const dx = e.offsetX - this.lastPointer.x;
      const dy = e.offsetY - this.lastPointer.y;
      this.lastPointer = { x: e.offsetX, y: e.offsetY };
      this.camera.theta += dx * 0.008;
      this.camera.phi = clamp(this.camera.phi + dy * 0.006, 0.06, Math.PI / 2 - 0.02);
      this.opts.onCameraChange?.(this.camera);
      this.dirty = true;
      this.schedule();
    }
  };

  private onUp = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.lastPinch = 0;
    if (this.pointers.size === 0) {
      this.dragging = false;
      this.lastPointer = null;
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const f = e.deltaY > 0 ? 1.1 : 1 / 1.1;
    this.camera.dist = clampDist(this.camera.dist * f);
    this.opts.onCameraChange?.(this.camera);
    this.dirty = true;
    this.schedule();
  };

  private onDbl = (): void => {
    this.resetView();
  };

  /* ---------------- rendering ---------------- */

  /**
   * Theme colors, cached until the data-theme attribute changes.
   * Replaces 3 getComputedStyle calls per frame with a string compare.
   */
  private tokens(): { bg: string; axis: string; grid: string } {
    const theme = this.canvas.ownerDocument.documentElement.getAttribute('data-theme') ?? '';
    const cached = this.tokensCache;
    if (cached && cached.theme === theme) return cached;
    const css = getComputedStyle(this.canvas);
    const next = {
      theme,
      bg: css.getPropertyValue('--graph-bg').trim() || '#0c1224',
      axis: css.getPropertyValue('--axis-line').trim() || 'rgba(140,150,180,0.5)',
      grid: css.getPropertyValue('--grid-line').trim() || 'rgba(140,150,180,0.16)',
    };
    this.tokensCache = next;
    return next;
  }

  /**
   * Precompute the height-gradient × shading color table. Per triangle per
   * frame this replaces parseHex + mixColor + a regex darken() (three string
   * allocations) with one array lookup.
   */
  private buildPalette(style: DrawStyle): void {
    const key = `${style.colorLow}|${style.colorHigh}`;
    if (this.paletteKey === key && this.palette.length === GRAD_STEPS * SHADE_STEPS) return;
    const palette: string[] = new Array(GRAD_STEPS * SHADE_STEPS);
    for (let s = 0; s < SHADE_STEPS; s++) {
      const shade = SHADE_LO + ((1 - SHADE_LO) * s) / (SHADE_STEPS - 1);
      for (let g = 0; g < GRAD_STEPS; g++) {
        palette[s * GRAD_STEPS + g] = darken(
          mixColor(style.colorLow, style.colorHigh, g / (GRAD_STEPS - 1)),
          shade
        );
      }
    }
    this.palette = palette;
    this.paletteKey = key;
  }

  private draw(): void {
    const { ctx, box, dpr } = this;
    if (box.width === 0 || box.height === 0) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tokens = this.tokens();
    ctx.fillStyle = tokens.bg;
    ctx.fillRect(0, 0, box.width, box.height);

    const cv = cameraVectors(this.camera);
    const proj = (v: Vec3): Projected => project(v, this.camera, cv, box.width, box.height);

    this.drawBox(proj);

    const scene = this.scene;
    if (!scene) return;

    // Depth-sort triangles back-to-front (painter's algorithm)
    const items: { d: number; pts: Projected[]; shade: number; zAvg: number }[] = [];
    for (const t of scene.mesh.tris) {
      const pa = proj(t.a);
      const pb = proj(t.b);
      const pc = proj(t.c);
      if (!pa.ok || !pb.ok || !pc.ok) continue;
      const d = (pa.depth + pb.depth + pc.depth) / 3;
      const zAvg = (t.a.z + t.b.z + t.c.z) / 3;
      items.push({ d, pts: [pa, pb, pc], shade: shadeFactor(t.a, t.b, t.c), zAvg });
    }
    items.sort((p, q) => q.d - p.d);

    const span = Math.max(1e-9, scene.box.zr * 2);
    ctx.globalAlpha = this.style.opacity;
    for (const it of items) {
      const tNorm = clamp((it.zAvg - scene.zLo) / span, 0, 1);
      // Height gradient, then lambert shading — one LUT lookup per triangle
      const gi = clamp(Math.round(tNorm * (GRAD_STEPS - 1)), 0, GRAD_STEPS - 1);
      const si = clamp(Math.round((it.shade - SHADE_LO) * SHADE_SCALE), 0, SHADE_STEPS - 1);
      ctx.fillStyle = this.palette[si * GRAD_STEPS + gi];
      ctx.beginPath();
      const [p0, p1, p2] = it.pts;
      ctx.moveTo(p0.px, p0.py);
      ctx.lineTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.closePath();
      ctx.fill();
      if (this.style.wireframe && items.length < 26000) {
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawBox(project: (v: Vec3) => Projected): void {
    const { ctx, box } = this;
    const tokens = this.tokens();
    const axis = tokens.axis;
    const grid = tokens.grid;
    const { xr, yr, zr } = this.scene?.box ?? { xr: 5, yr: 5, zr: 5 };

    // Base grid at z = -zr
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    for (let g = -1; g <= 1; g += 0.5) {
      line(ctx, project({ x: g * xr, y: -yr, z: -zr }), project({ x: g * xr, y: yr, z: -zr }));
      line(ctx, project({ x: -xr, y: g * yr, z: -zr }), project({ x: xr, y: g * yr, z: -zr }));
    }
    // Box edges
    ctx.strokeStyle = axis;
    ctx.lineWidth = 1.2;
    const corners: [Vec3, Vec3][] = [
      [{ x: -xr, y: -yr, z: -zr }, { x: xr, y: -yr, z: -zr }],
      [{ x: xr, y: -yr, z: -zr }, { x: xr, y: yr, z: -zr }],
      [{ x: xr, y: yr, z: -zr }, { x: -xr, y: yr, z: -zr }],
      [{ x: -xr, y: yr, z: -zr }, { x: -xr, y: -yr, z: -zr }],
      [{ x: -xr, y: -yr, z: zr }, { x: xr, y: -yr, z: zr }],
      [{ x: xr, y: -yr, z: zr }, { x: xr, y: yr, z: zr }],
      [{ x: xr, y: yr, z: zr }, { x: -xr, y: yr, z: zr }],
      [{ x: -xr, y: yr, z: zr }, { x: -xr, y: -yr, z: zr }],
      [{ x: -xr, y: -yr, z: -zr }, { x: -xr, y: -yr, z: zr }],
      [{ x: xr, y: -yr, z: -zr }, { x: xr, y: -yr, z: zr }],
      [{ x: xr, y: yr, z: -zr }, { x: xr, y: yr, z: zr }],
      [{ x: -xr, y: yr, z: -zr }, { x: -xr, y: yr, z: zr }],
    ];
    for (const [a, b] of corners) {
      if (Math.abs(a.z - zr) < 1e-9 && Math.abs(b.z - zr) < 1e-9) continue; // open top
      line(ctx, project(a), project(b));
    }
    // Axis labels
    ctx.fillStyle = axis;
    ctx.font = '11px system-ui, sans-serif';
    const lx = project({ x: xr * 1.12, y: -yr, z: -zr });
    const ly = project({ x: -xr, y: yr * 1.12, z: -zr });
    const lz = project({ x: -xr, y: -yr, z: zr * 1.1 });
    if (lx.ok) ctx.fillText('x', lx.px + 4, lx.py);
    if (ly.ok) ctx.fillText('y', ly.px + 4, ly.py);
    if (lz.ok) ctx.fillText('z', lz.px + 4, lz.py - 4);
    void box;
  }
}

/* ------------------------------------------------------------ */

function line(ctx: CanvasRenderingContext2D, a: Projected, b: Projected): void {
  if (!a.ok || !b.ok) return;
  ctx.beginPath();
  ctx.moveTo(a.px, a.py);
  ctx.lineTo(b.px, b.py);
  ctx.stroke();
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Signed angle in (-π, π] for the shortest rotation between angles. */
function wrapAngle(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function clampDist(d: number): number {
  return clamp(d, 4, 60);
}

/* Color LUT granularity: 64 gradient steps × 16 shade steps = 1024 strings,
   rebuilt only when the palette colors change. shadeFactor emits [0.45, 1]. */
const GRAD_STEPS = 64;
const SHADE_STEPS = 16;
const SHADE_LO = 0.45;
const SHADE_SCALE = (SHADE_STEPS - 1) / (1 - SHADE_LO);

function darken(rgb: string, factor: number): string {
  const m = rgb.match(/rgb\((\d+),(\d+),(\d+)\)/);
  if (!m) return rgb;
  const r = Math.round(Number(m[1]) * factor);
  const g = Math.round(Number(m[2]) * factor);
  const b = Math.round(Number(m[3]) * factor);
  return `rgb(${r},${g},${b})`;
}

export function makeScene(mesh: TriMesh, zLo: number, zHi: number): Scene {
  let xr = 1;
  let yr = 1;
  let zr = 1;
  for (const t of mesh.tris) {
    for (const p of [t.a, t.b, t.c]) {
      xr = Math.max(xr, Math.abs(p.x));
      yr = Math.max(yr, Math.abs(p.y));
      zr = Math.max(zr, Math.abs(p.z));
    }
  }
  return { mesh, box: { xr, yr, zr }, zLo, zHi };
}
