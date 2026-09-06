import { useEffect, useRef, useState } from 'react';
import { CurveRender, GraphEngine, HoverInfo, IntersectionPoint } from '../../lib/graph/engine';
import { GraphMarker } from '../../lib/math/analyze';
import { Viewport } from '../../lib/math/sample';
import { formatCoord } from '../../lib/math/format';
import './graph.css';

export interface GraphMarkerWithColor extends GraphMarker {
  color: string;
  curveId: string;
}

interface GraphCanvasProps {
  viewport: Viewport;
  onViewportChange?: (vp: Viewport) => void;
  curves: CurveRender[];
  markers?: GraphMarkerWithColor[];
  intersections?: IntersectionPoint[];
  onHover?: (info: HoverInfo | null) => void;
  interactive?: boolean;
  className?: string;
  ariaLabel?: string;
  showTooltip?: boolean;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function GraphCanvas({
  viewport,
  onViewportChange,
  curves,
  markers,
  intersections,
  onHover,
  interactive = true,
  className,
  ariaLabel = 'Interactive graph of your equations. Drag to pan, scroll to zoom.',
  showTooltip = true,
}: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GraphEngine | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  // Keep callbacks fresh without recreating the engine
  const cbRef = useRef({ onViewportChange, onHover });
  cbRef.current = { onViewportChange, onHover };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GraphEngine(canvas, {
      reducedMotion: prefersReducedMotion(),
      onHover: (info) => {
        setHover(info);
        cbRef.current.onHover?.(info);
      },
      onViewportChange: (vp) => cbRef.current.onViewportChange?.(vp),
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setViewport(viewport);
  }, [viewport]);

  useEffect(() => {
    engineRef.current?.setCurves(curves);
  }, [curves]);

  useEffect(() => {
    engineRef.current?.setMarkers(markers ?? []);
  }, [markers]);

  useEffect(() => {
    engineRef.current?.setIntersections(intersections ?? []);
  }, [intersections]);

  useEffect(() => {
    if (interactive) return;
    engineRef.current?.clearHover();
  }, [interactive]);

  // Keep the tooltip inside the graph box: flip it when it would overflow
  // the right or bottom edge, and clamp so it never leaves the canvas.
  useEffect(() => {
    const tip = tooltipRef.current;
    const wrap = wrapRef.current;
    if (!tip || !wrap || !hover) return;
    const wrapW = wrap.clientWidth;
    const wrapH = wrap.clientHeight;
    const tipW = tip.offsetWidth;
    const tipH = tip.offsetHeight;
    const gap = 10;
    let left = hover.sx + gap;
    let top = hover.sy;
    if (left + tipW > wrapW - 4) left = hover.sx - tipW - gap;
    if (top + tipH / 2 > wrapH - 4) top = wrapH - tipH / 2 - 4;
    if (top - tipH / 2 < 4) top = Math.max(4, tipH / 2 + 4);
    left = Math.max(4, Math.min(left, wrapW - tipW - 4));
    top = Math.max(tipH / 2 + 4, Math.min(top, wrapH - tipH / 2 - 4));
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }, [hover]);

  return (
    <div ref={wrapRef} className={`graph-wrap ${className ?? ''}`}>
      <canvas
        ref={canvasRef}
        className={`graph-canvas ${interactive ? 'is-interactive' : ''}`}
        aria-label={ariaLabel}
        role="img"
      />
      {showTooltip && hover && interactive && (
        <div
          ref={tooltipRef}
          className="graph-tooltip"
          role="status"
          style={{
            left: Math.max(4, Math.min(hover.sx + 14, 9999)),
            top: hover.sy,
          }}
        >
          <span className="graph-tooltip-label" style={{ color: hover.color }}>
            {hover.label}
          </span>
          <span className="graph-tooltip-coords">
            ({formatCoord(hover.x)}, {formatCoord(hover.y)})
          </span>
          {hover.slope !== undefined && hover.curveId && (
            <span className="graph-tooltip-slope">slope {formatCoord(hover.slope)}</span>
          )}
        </div>
      )}
    </div>
  );
}