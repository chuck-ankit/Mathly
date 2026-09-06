import { useEffect, useRef } from 'react';
import { Engine3D, DrawStyle, DEFAULT_STYLE, View3D } from '../../lib/graph3d/engine3d';
import { TriMesh, Tri } from '../../lib/graph3d/mesh';

export interface Graph3DCanvasProps {
  mesh: TriMesh | null;
  zLo: number;
  zHi: number;
  /** Fixed pixel size. Omit to fill the parent element (responsive). */
  width?: number;
  height?: number;
  style?: Partial<DrawStyle>;
  ariaLabel?: string;
  /** Glide to a named camera preset when the value changes. */
  view?: View3D;
  /** Continuously orbit until the user grabs the surface. */
  autoRotate?: boolean;
  /** Radians per tick while auto-rotating (default: engine default). */
  autoRotateSpeed?: number;
}

/** React wrapper around the imperative 3D engine. */
export function Graph3DCanvas({
  mesh,
  zLo,
  zHi,
  width,
  height,
  style,
  ariaLabel,
  view,
  autoRotate,
  autoRotateSpeed,
}: Graph3DCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine3D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine3D(canvas);
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (width !== undefined && height !== undefined) {
      engine.resize(width, height);
      return;
    }
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const apply = () => {
      const r = parent.getBoundingClientRect();
      engine.resize(Math.max(1, Math.floor(r.width)), Math.max(1, Math.floor(r.height)));
    };
    apply();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(apply) : null;
    ro?.observe(parent);
    return () => ro?.disconnect();
  }, [width, height]);

  useEffect(() => {
    engineRef.current?.setStyle({ ...DEFAULT_STYLE, ...style });
  }, [style]);

  useEffect(() => {
    engineRef.current?.setView(view ?? 'iso');
  }, [view]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const reduceMotion =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    engine.setAutoRotate(!!autoRotate && !reduceMotion, autoRotateSpeed);
  }, [autoRotate, autoRotateSpeed]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (!mesh) {
      engine.setScene(null);
      return;
    }
    const { xr, yr, zr } = sceneBox(mesh);
    engine.setScene({ mesh, box: { xr, yr, zr }, zLo, zHi });
  }, [mesh, zLo, zHi]);

  return (
    <canvas
      ref={canvasRef}
      className="g3d-canvas"
      role="img"
      aria-label={ariaLabel ?? 'Interactive 3D graph. Drag to rotate, scroll to zoom.'}
    />
  );
}

function sceneBox(mesh: TriMesh) {
  let xr = 1;
  let yr = 1;
  let zr = 1;
  for (const t of mesh.tris as Tri[]) {
    for (const p of [t.a, t.b, t.c]) {
      xr = Math.max(xr, Math.abs(p.x));
      yr = Math.max(yr, Math.abs(p.y));
      zr = Math.max(zr, Math.abs(p.z));
    }
  }
  return { xr, yr, zr };
}