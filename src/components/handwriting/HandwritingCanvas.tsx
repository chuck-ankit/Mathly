import { useCallback, useEffect, useRef, useState } from 'react';
import { Stroke, StrokePoint } from '../../lib/handwriting/types';
import './handwriting.css';

interface HandwritingCanvasProps {
  strokes: Stroke[];
  onStroke: (stroke: Stroke) => void;
  height?: number;
  disabled?: boolean;
}

let strokeId = 0;

function drawStrokes(ctx: CanvasRenderingContext2D, strokes: Stroke[], w: number, h: number, dpr: number): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // faint baseline guide (handwriting sits on/above this line)
  const baselineY = h * 0.72;
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = 'rgba(140,155,200,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, baselineY);
  ctx.lineTo(w, baselineY);
  ctx.stroke();
  ctx.setLineDash([]);

  // subtle ruled background
  ctx.strokeStyle = 'rgba(140,155,200,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;
    ctx.strokeStyle = 'var(--text-1)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
      const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
      ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY);
    }
    const last = stroke.points[stroke.points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }
}

export function HandwritingCanvas({ strokes, onStroke, height = 260, disabled }: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [w, setW] = useState(0);
  const current = useRef<Stroke | null>(null);
  const rafRef = useRef(0);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    setW(rect.width);
    const all = current.current ? [...strokes, current.current] : strokes;
    drawStrokes(ctx, all, rect.width, height, dpr);
  }, [strokes, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = canvas.getBoundingClientRect().width * dpr;
    canvas.height = height * dpr;
    canvas.style.height = `${height}px`;
    redraw();
  }, [height, redraw, w]);

  const pointFromEvent = (e: React.PointerEvent): StrokePoint => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      t: Date.now(),
      pressure: e.pressure > 0 && e.pressure < 1 ? e.pressure : undefined,
    };
  };

  const scheduleDraw = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const all = current.current ? [...strokes, current.current] : strokes;
      drawStrokes(ctx, all, rect.width, height, dpr);
    });
  }, [strokes, height]);

  return (
    <canvas
      ref={canvasRef}
      className={`hand-canvas ${disabled ? 'is-disabled' : ''}`}
      style={{ height, touchAction: 'none' }}
      aria-label="Draw a mathematical symbol here"
      role="img"
      onPointerDown={(e) => {
        if (disabled) return;
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        current.current = {
          id: ++strokeId,
          points: [pointFromEvent(e)],
        };
        scheduleDraw();
      }}
      onPointerMove={(e) => {
        if (!current.current) return;
        current.current.points.push(pointFromEvent(e));
        scheduleDraw();
      }}
      onPointerUp={() => {
        if (current.current) {
          if (current.current.points.length >= 2) {
            onStroke(current.current);
          }
          current.current = null;
          scheduleDraw();
        }
      }}
      onPointerCancel={() => {
        current.current = null;
        scheduleDraw();
      }}
    />
  );
}