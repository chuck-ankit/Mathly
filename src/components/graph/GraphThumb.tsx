import { useEffect, useRef } from 'react';
import { makeEvaluator, sampleCurveFixed } from '../../lib/math/sample';
import { parse } from '../../lib/math/parser';
import { MathParseError } from '../../lib/math/types';
import { dataToScreen, gridStep, niceStep } from '../../lib/graph/viewport';
import { formatGridLabel } from '../../lib/math/format';
import { defaultParamValue } from '../../lib/math/evaluator';

interface GraphThumbProps {
  expression: string;
  color?: string;
  viewport?: { xmin: number; xmax: number; ymin: number; ymax: number };
  width?: number;
  height?: number;
  className?: string;
  animated?: boolean;
}

const DEFAULT_VP = { xmin: -8, xmax: 8, ymin: -5.5, ymax: 5.5 };

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/**
 * Lightweight static graph preview. Recomputes on expression change only,
 * so it stays cheap for dozens of cards.
 */
export function GraphThumb({
  expression,
  color,
  viewport = DEFAULT_VP,
  width = 220,
  height = 120,
  className,
  animated = false,
}: GraphThumbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let curveColor = color;
    if (!curveColor) {
      const colors = [
        '--curve-0', '--curve-1', '--curve-2', '--curve-3', '--curve-4',
        '--curve-5', '--curve-6', '--curve-7',
      ];
      curveColor = cssVar(colors[Math.abs(hash(expression)) % colors.length], '#7483ff');
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = cssVar('--graph-bg', '#0c1224');
    ctx.fillRect(0, 0, width, height);

    // Grid
    const step = gridStep(viewport, { width, height }, 42);
    const gridLine = cssVar('--grid-line', 'rgba(140,155,200,0.09)');
    const axisLine = cssVar('--axis-line', 'rgba(200,210,240,0.5)');
    ctx.strokeStyle = gridLine;
    ctx.lineWidth = 1;
    for (let x = Math.ceil(viewport.xmin / step) * step; x <= viewport.xmax; x += step) {
      if (Math.abs(x) < step * 0.001) continue;
      const sx = dataToScreen(viewport, { width, height }, x, 0).sx;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
      ctx.stroke();
    }
    for (let y = Math.ceil(viewport.ymin / step) * step; y <= viewport.ymax; y += step) {
      if (Math.abs(y) < step * 0.001) continue;
      const sy = dataToScreen(viewport, { width, height }, 0, y).sy;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
      ctx.stroke();
    }
    ctx.strokeStyle = axisLine;
    ctx.lineWidth = 1.2;
    const xAxisY = dataToScreen(viewport, { width, height }, 0, 0).sy;
    if (xAxisY >= 0 && xAxisY <= height) {
      ctx.beginPath();
      ctx.moveTo(0, xAxisY);
      ctx.lineTo(width, xAxisY);
      ctx.stroke();
    }
    const yAxisX = dataToScreen(viewport, { width, height }, 0, 0).sx;
    if (yAxisX >= 0 && yAxisX <= width) {
      ctx.beginPath();
      ctx.moveTo(yAxisX, 0);
      ctx.lineTo(yAxisX, height);
      ctx.stroke();
    }
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = cssVar('--axis-label', '#7f89ab');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x = Math.ceil(viewport.xmin / step) * step; x <= viewport.xmax; x += step) {
      if (Math.abs(x) < step * 0.5) continue;
      const sx = dataToScreen(viewport, { width, height }, x, 0).sx;
      if (sx > 6 && sx < width - 6 && sx !== yAxisX) {
        ctx.fillText(formatGridLabel(x), sx, height - 12);
      }
    }

    // Curve
    try {
      const parsed = parse(expression);
      const params: Record<string, number> = {};
      for (const p of parsed.params) params[p] = defaultParamValue(p);
      const f = makeEvaluator(parsed.expression, params);
      const pts = sampleCurveFixed(f, viewport.xmin, viewport.xmax, 260);
      if (pts.length > 1) {
        ctx.strokeStyle = curveColor;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        let started = false;
        for (const p of pts) {
          const sp = dataToScreen(viewport, { width, height }, p.x, p.y);
          if (!started) {
            ctx.moveTo(sp.sx, sp.sy);
            started = true;
          } else {
            ctx.lineTo(sp.sx, sp.sy);
          }
        }
        if (animated) {
          // subtle live shimmer on the thumbnail
          let t = 0;
          let rafId = 0;
          const raf = (): void => {
            t += 0.02;
            const offset = (Math.sin(t * 3) * 6) % 12;
            ctx.strokeStyle = curveColor;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.lineDashOffset = -offset;
            ctx.stroke();
            ctx.setLineDash([]);
            rafId = requestAnimationFrame(raf);
          };
          rafId = requestAnimationFrame(raf);
          return () => cancelAnimationFrame(rafId);
        } else {
          ctx.stroke();
        }
      }
    } catch (e) {
      if (e instanceof MathParseError) {
        // draw a faint "?" hint instead of a broken graph
        ctx.fillStyle = cssVar('--text-3', '#7f89ab');
        ctx.font = '20px var(--font-serif), serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', width / 2, height / 2);
      }
    }
  }, [expression, color, width, height, viewport.xmin, viewport.xmax, viewport.ymin, viewport.ymax, animated]);

  return <canvas ref={canvasRef} className={`graph-thumb ${className ?? ''}`} aria-hidden="true" />;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export { niceStep };