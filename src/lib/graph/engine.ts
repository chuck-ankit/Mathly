/* ============================================================
   Graph engine: draws grid, axes, curves, markers and hover
   state to a 2D canvas. Framework-free; React wraps it.
   ============================================================ */

import { CurveSegment, Viewport } from '../math/sample';
import { GraphMarker } from '../math/analyze';
import { numericDerivative } from '../math/evaluator';
import { formatGridLabel } from '../math/format';
import { dataToScreen, gridStep, screenToData, ScreenBox } from './viewport';

export interface CurveRender {
  id: string;
  color: string;
  dash: number[];
  segments: CurveSegment[];
  evaluate: (x: number) => number;
  /** Set by the engine; used to restart draw animations only when the curve changes. */
  drawAnim?: number;
  /** Optional signature — when unchanged, the draw animation is preserved across updates. */
  sig?: string;
  label: string;
}

export interface IntersectionPoint {
  x: number;
  y: number;
}

export interface HoverInfo {
  x: number;
  y: number;
  sx: number;
  sy: number;
  curveId: string | null;
  color: string;
  label: string;
  slope?: number;
}

export interface GraphEngineOptions {
  reducedMotion?: boolean;
  onHover?: (info: HoverInfo | null) => void;
  onViewportChange?: (vp: Viewport) => void;
}

const HOVER_RADIUS = 14;
const INTERSECTION_RADIUS = 9;

export class GraphEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private box: ScreenBox = { width: 0, height: 0 };
  private dpr = 1;

  // Static layers (grid, curves, markers, intersections) render into an
  // offscreen canvas. Interactions only blit that layer + draw the hover,
  // so pan/zoom/hover cost is constant regardless of point count.
  private base: HTMLCanvasElement;
  private baseCtx: CanvasRenderingContext2D | null;
  private baseDirty = true;

  viewport: Viewport = { xmin: -10, xmax: 10, ymin: -7, ymax: 7 };
  showGrid = true;
  curves: CurveRender[] = [];
  markers: (GraphMarker & { color: string; curveId: string })[] = [];
  intersections: IntersectionPoint[] = [];
  hover: HoverInfo | null = null;

  private raf = 0;
  private lastTime = 0;
  private dirty = true;
  opts: GraphEngineOptions;

  private dragging = false;
  private lastPointer: { x: number; y: number } | null = null;
  private pinchDist = 0;
  private pinchStart: Viewport | null = null;
  private pointers = new Map<number, { x: number; y: number }>();

  constructor(canvas: HTMLCanvasElement, opts: GraphEngineOptions = {}) {
    this.canvas = canvas;
    this.opts = opts;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.base = document.createElement('canvas');
    this.baseCtx = this.base.getContext('2d');
    this.attachEvents();
    this.lastTime = performance.now();
    this.loop();
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.detachEvents();
  }

  resize(width: number, height: number): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.box = { width, height };
    this.canvas.width = Math.max(1, Math.round(width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(height * this.dpr));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    if (this.base) {
      this.base.width = this.canvas.width;
      this.base.height = this.canvas.height;
    }
    this.baseDirty = true;
    this.dirty = true;
  }

  setViewport(vp: Viewport): void {
    this.viewport = vp;
    this.dirty = true;
    this.baseDirty = true;
  }

  setCurves(curves: CurveRender[]): void {
    const prev = new Map(this.curves.map((c) => [c.id, c]));
    this.curves = curves.map((c) => {
      const old = prev.get(c.id);
      if (old && old.sig === c.sig && old.drawAnim !== undefined) {
        return { ...c, drawAnim: old.drawAnim };
      }
      return { ...c, drawAnim: 0 };
    });
    this.dirty = true;
    this.baseDirty = true;
  }

  setMarkers(markers: (GraphMarker & { color: string; curveId: string })[]): void {
    this.markers = markers;
    this.dirty = true;
    this.baseDirty = true;
  }

  setIntersections(pts: IntersectionPoint[]): void {
    this.intersections = pts;
    this.dirty = true;
    this.baseDirty = true;
  }

  setGridVisible(visible: boolean): void {
    this.showGrid = visible;
    this.dirty = true;
    this.baseDirty = true;
  }

  clearHover(): void {
    if (this.hover) {
      this.hover = null;
      this.opts.onHover?.(null);
      this.dirty = true;
    }
  }

  getHoverAt(sx: number, sy: number): HoverInfo | null {
    const { x } = screenToData(this.viewport, this.box, sx, sy);

    // Intersections first
    let best: HoverInfo | null = null;
    let bestDist = INTERSECTION_RADIUS;
    for (const p of this.intersections) {
      const sp = dataToScreen(this.viewport, this.box, p.x, p.y);
      const d = Math.hypot(sp.sx - sx, sp.sy - sy);
      if (d < bestDist) {
        bestDist = d;
        best = {
          x: p.x,
          y: p.y,
          sx: sp.sx,
          sy: sp.sy,
          curveId: null,
          color: 'var(--gold)',
          label: 'Intersection',
        };
      }
    }

    // Curves — the closest within the hover radius wins
    for (const c of this.curves) {
      const cy = c.evaluate(x);
      if (!Number.isFinite(cy)) continue;
      const sp = dataToScreen(this.viewport, this.box, x, cy);
      const d = Math.hypot(sp.sx - sx, sp.sy - sy);
      // Be a bit lenient horizontally so the cursor can ride the curve
      const effective = Math.min(d, Math.abs(sp.sy - sy) + 3);
      if (effective < HOVER_RADIUS && effective < bestDist) {
        bestDist = effective;
        best = {
          x,
          y: cy,
          sx: sp.sx,
          sy: sp.sy,
          curveId: c.id,
          color: c.color,
          label: c.label,
        };
      }
    }
    if (best && best.curveId) {
      const c = this.curves.find((cc) => cc.id === best!.curveId);
      if (c) {
        const slope = numericDerivative(c.evaluate, best.x);
        if (Number.isFinite(slope)) best.slope = slope;
      }
    }
    return best;
  }

  /* ---------------- animation loop ---------------- */

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    let animating = false;
    for (const c of this.curves) {
      const anim = c.drawAnim ?? 1;
      if (anim < 1) {
        c.drawAnim = Math.min(1, anim + dt * 1.6);
        animating = true;
      }
    }
    if (animating) this.baseDirty = true;
    if (animating || this.dirty) {
      this.draw();
      this.dirty = false;
    }
  };

  /* ---------------- drawing ---------------- */

  draw(): void {
    const { ctx, box, dpr } = this;
    if (box.width === 0 || box.height === 0) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, box.width, box.height);

    // Rebuild the static base layer only when something in it changed;
    // interactions just blit it and draw the hover overlay on top.
    if (this.baseDirty) {
      this.renderBase();
      this.baseDirty = false;
    }
    ctx.drawImage(this.base, 0, 0, box.width, box.height);
    this.drawHover();
  }

  private renderBase(): void {
    const base = this.baseCtx;
    if (!base) return;
    const { box, dpr } = this;
    base.setTransform(dpr, 0, 0, dpr, 0, 0);
    base.clearRect(0, 0, box.width, box.height);

    const bg = getCSSVar('--graph-bg', '#0c1224');
    base.fillStyle = bg;
    base.fillRect(0, 0, box.width, box.height);

    this.drawGrid(base);
    this.drawCurves(base);
    this.drawMarkers(base);
    this.drawIntersections(base);
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    const { box, viewport: vp } = this;
    if (!this.showGrid) {
      // Still draw the axes
      const axisLine = getCSSVar('--axis-line', 'rgba(200,210,240,0.5)');
      ctx.strokeStyle = axisLine;
      ctx.lineWidth = 1.4;
      const xAxisSy = dataToScreen(vp, box, 0, 0).sy;
      if (xAxisSy >= 0 && xAxisSy <= box.height) {
        ctx.beginPath();
        ctx.moveTo(0, xAxisSy);
        ctx.lineTo(box.width, xAxisSy);
        ctx.stroke();
      }
      const yAxisSx = dataToScreen(vp, box, 0, 0).sx;
      if (yAxisSx >= 0 && yAxisSx <= box.width) {
        ctx.beginPath();
        ctx.moveTo(yAxisSx, 0);
        ctx.lineTo(yAxisSx, box.height);
        ctx.stroke();
      }
      return;
    }
    const step = gridStep(vp, box);
    const gridLine = getCSSVar('--grid-line', 'rgba(140,155,200,0.09)');
    const axisLine = getCSSVar('--axis-line', 'rgba(200,210,240,0.5)');
    const labelColor = getCSSVar('--axis-label', '#7f89ab');

    const x0 = Math.ceil(vp.xmin / step) * step;
    const y0 = Math.ceil(vp.ymin / step) * step;

    // Vertical lines
    for (let x = x0; x <= vp.xmax; x += step) {
      if (Math.abs(x) < step * 0.001) continue; // axis drawn separately
      const sx = dataToScreen(vp, box, x, 0).sx;
      ctx.strokeStyle = gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, box.height);
      ctx.stroke();
    }
    // Horizontal lines
    for (let y = y0; y <= vp.ymax; y += step) {
      if (Math.abs(y) < step * 0.001) continue;
      const sy = dataToScreen(vp, box, 0, y).sy;
      ctx.strokeStyle = gridLine;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(box.width, sy);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = axisLine;
    ctx.lineWidth = 1.4;
    const xAxisSy = dataToScreen(vp, box, 0, 0).sy;
    if (xAxisSy >= 0 && xAxisSy <= box.height) {
      ctx.beginPath();
      ctx.moveTo(0, xAxisSy);
      ctx.lineTo(box.width, xAxisSy);
      ctx.stroke();
    }
    const yAxisSx = dataToScreen(vp, box, 0, 0).sx;
    if (yAxisSx >= 0 && yAxisSx <= box.width) {
      ctx.beginPath();
      ctx.moveTo(yAxisSx, 0);
      ctx.lineTo(yAxisSx, box.height);
      ctx.stroke();
    }

    // Labels
    ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = labelColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x = x0; x <= vp.xmax; x += step) {
      if (Math.abs(x) < step * 0.5) continue;
      const sx = dataToScreen(vp, box, x, 0).sx;
      const sy = Math.min(box.height - 18, Math.max(2, xAxisSy + 6));
      if (sx > 8 && sx < box.width - 8) {
        ctx.fillText(formatGridLabel(x), sx, sy);
      }
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = y0; y <= vp.ymax; y += step) {
      if (Math.abs(y) < step * 0.5) continue;
      const sy = dataToScreen(vp, box, 0, y).sy;
      const sx = Math.min(box.width - 6, Math.max(box.width - 40, yAxisSx - 6));
      if (sy > 6 && sy < box.height - 6) {
        ctx.fillText(formatGridLabel(y), sx, sy);
      }
    }

    // Axis letters
    ctx.fillStyle = labelColor;
    ctx.font = '600 13px var(--font-serif), serif';
    if (yAxisSx >= 0 && yAxisSx <= box.width) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('y', Math.min(box.width - 16, yAxisSx + 6), 14);
    }
    if (xAxisSy >= 0 && xAxisSy <= box.height) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('x', box.width - 8, Math.max(16, xAxisSy - 6));
    }
  }

  private drawCurves(ctx: CanvasRenderingContext2D): void {
    const { box, viewport: vp } = this;
    for (const curve of this.curves) {
      const anim = curve.drawAnim ?? 1;
      if (!anim) continue;
      ctx.save();
      ctx.strokeStyle = curve.color;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash(curve.dash);
      ctx.beginPath();
      let started = false;
      for (const seg of curve.segments) {
        for (const p of seg.points) {
          const sp = dataToScreen(vp, box, p.x, p.y);
          const cx = clampCoord(sp.sx, box.width);
          const cy = clampCoord(sp.sy, box.height);
          if (!started) {
            ctx.moveTo(cx, cy);
            started = true;
          } else {
            ctx.lineTo(cx, cy);
          }
        }
      }
      if (anim < 1) {
        // Reveal left → right
        ctx.save();
        ctx.beginPath();
        const right = dataToScreen(vp, box, vp.xmin + (vp.xmax - vp.xmin) * anim, 0).sx;
        ctx.rect(0, 0, Math.max(0, right), box.height);
        ctx.clip();
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawMarkers(ctx: CanvasRenderingContext2D): void {
    const { box, viewport: vp } = this;
    const t = performance.now() / 1000;
    // Skip markers that would pile on top of an already-drawn one (e.g. a
    // double root coinciding with a vertex) so symbols never visually merge.
    const placed: { x: number; y: number }[] = [];
    const overlaps = (sx: number, sy: number): boolean =>
      placed.some((p) => Math.hypot(p.x - sx, p.y - sy) < 9);
    for (const m of this.markers) {
      if (m.x < vp.xmin || m.x > vp.xmax || m.y < vp.ymin || m.y > vp.ymax) continue;
      const sp = dataToScreen(vp, box, m.x, m.y);
      if (overlaps(sp.sx, sp.sy)) continue;
      placed.push({ x: sp.sx, y: sp.sy });
      const pulse = 1 + 0.22 * Math.sin(t * 2.2 + m.x * 3);
      ctx.save();
      ctx.strokeStyle = m.color;
      ctx.fillStyle = m.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const r = 4.5 * pulse;
      if (m.type === 'root') {
        ctx.arc(sp.sx, sp.sy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = getCSSVar('--graph-bg', '#0c1224');
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (m.type === 'vertex') {
        drawDiamond(ctx, sp.sx, sp.sy, r + 2);
        ctx.fill();
      } else if (m.type === 'critical') {
        ctx.rect(sp.sx - r, sp.sy - r, r * 2, r * 2);
        ctx.fill();
      } else if (m.type === 'inflection') {
        drawTriangle(ctx, sp.sx, sp.sy, r + 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawIntersections(ctx: CanvasRenderingContext2D): void {
    const { box, viewport: vp } = this;
    for (const p of this.intersections) {
      if (p.x < vp.xmin || p.x > vp.xmax || p.y < vp.ymin || p.y > vp.ymax) continue;
      const sp = dataToScreen(vp, box, p.x, p.y);
      ctx.save();
      ctx.strokeStyle = getCSSVar('--gold', '#f2b84b');
      ctx.lineWidth = 2;
      const s = 5;
      ctx.beginPath();
      ctx.moveTo(sp.sx - s, sp.sy - s);
      ctx.lineTo(sp.sx + s, sp.sy + s);
      ctx.moveTo(sp.sx + s, sp.sy - s);
      ctx.lineTo(sp.sx - s, sp.sy + s);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawHover(): void {
    const { ctx, box } = this;
    const h = this.hover;
    if (!h) return;

    ctx.save();
    // Guide lines
    ctx.strokeStyle = 'rgba(140,155,200,0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(h.sx, 0);
    ctx.lineTo(h.sx, box.height);
    ctx.moveTo(0, h.sy);
    ctx.lineTo(box.width, h.sy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tangent line
    if (h.slope !== undefined && h.curveId) {
      const dx = 1.4;
      const x1 = h.x - dx;
      const x2 = h.x + dx;
      const p1 = dataToScreen(this.viewport, box, x1, h.y - h.slope * dx);
      const p2 = dataToScreen(this.viewport, box, x2, h.y + h.slope * dx);
      ctx.strokeStyle = h.color;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // Hover point
    ctx.beginPath();
    ctx.arc(h.sx, h.sy, 5, 0, Math.PI * 2);
    ctx.fillStyle = h.color;
    ctx.fill();
    ctx.strokeStyle = getCSSVar('--graph-bg', '#0c1224');
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  /* ---------------- events ---------------- */

  private onPointerDown = (e: PointerEvent): void => {
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      this.pinchStart = { ...this.viewport };
      this.dragging = false;
      return;
    }
    this.dragging = true;
    this.lastPointer = { x: e.offsetX, y: e.offsetY };
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (this.pointers.has(e.pointerId)) {
      this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    }
    if (this.pointers.size === 2 && this.pinchStart) {
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const factor = this.pinchDist > 0 ? this.pinchDist / dist : 1;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const mid = screenToData(this.pinchStart, this.box, midX, midY);
      const next = zoomViewport(this.pinchStart, factor, mid.x, mid.y);
      this.setViewport(next);
      this.opts.onViewportChange?.(next);
      return;
    }
    if (this.dragging && this.lastPointer) {
      const dx = e.offsetX - this.lastPointer.x;
      const dy = e.offsetY - this.lastPointer.y;
      this.lastPointer = { x: e.offsetX, y: e.offsetY };
      const next = panViewport(this.viewport, dx, dy, this.box);
      this.setViewport(next);
      this.opts.onViewportChange?.(next);
      return;
    }
    if (!this.dragging) {
      const info = this.getHoverAt(e.offsetX, e.offsetY);
      this.hover = info;
      this.opts.onHover?.(info);
      this.dirty = true;
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) {
      this.pinchStart = null;
    }
    this.dragging = false;
    this.lastPointer = null;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
    const mid = screenToData(this.viewport, this.box, e.offsetX, e.offsetY);
    const next = zoomViewport(this.viewport, factor, mid.x, mid.y);
    this.setViewport(next);
    this.opts.onViewportChange?.(next);
  };

  private onPointerLeave = (): void => {
    this.clearHover();
  };

  private onResize = (): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.resize(rect.width, rect.height);
  };

  private attachEvents(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('dblclick', this.onDblClick);
    window.addEventListener('resize', this.onResize);
    const rect = this.canvas.getBoundingClientRect();
    this.resize(rect.width, rect.height);
  }

  private detachEvents(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('dblclick', this.onDblClick);
    window.removeEventListener('resize', this.onResize);
  }

  private onDblClick = (): void => {
    // Double-click resets the view
    this.setViewport({ xmin: -10, xmax: 10, ymin: -7, ymax: 7 });
    this.opts.onViewportChange?.(this.viewport);
  };

}

function zoomViewport(vp: Viewport, factor: number, fx: number, fy: number): Viewport {
  const cx = (vp.xmin + vp.xmax) / 2;
  const cy = (vp.ymin + vp.ymax) / 2;
  const newCx = fx - (fx - cx) * factor;
  const newCy = fy - (fy - cy) * factor;
  const halfW = ((vp.xmax - vp.xmin) * factor) / 2;
  const halfH = ((vp.ymax - vp.ymin) * factor) / 2;
  return {
    xmin: newCx - halfW,
    xmax: newCx + halfW,
    ymin: newCy - halfH,
    ymax: newCy + halfH,
  };
}

function panViewport(vp: Viewport, dxPx: number, dyPx: number, box: ScreenBox): Viewport {
  const dx = (-dxPx / box.width) * (vp.xmax - vp.xmin);
  const dy = (dyPx / box.height) * (vp.ymax - vp.ymin);
  return { xmin: vp.xmin + dx, xmax: vp.xmax + dx, ymin: vp.ymin + dy, ymax: vp.ymax + dy };
}

function clampCoord(v: number, size: number): number {
  const lim = size * 200 + 2000;
  return Math.max(-lim, Math.min(lim, v));
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
}

function drawTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.9, y + r * 0.75);
  ctx.lineTo(x - r * 0.9, y + r * 0.75);
  ctx.closePath();
}

let cssVarCache = new Map<string, string>();
function getCSSVar(name: string, fallback: string): string {
  const cached = cssVarCache.get(name);
  if (cached) return cached;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  cssVarCache.set(name, value);
  return value;
}

/** Invalidate the CSS var cache (call when theme changes). */
export function clearCssVarCache(): void {
  cssVarCache = new Map();
}

export type { Viewport };