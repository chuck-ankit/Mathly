import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePipeline } from '../lib/graph/pipeline';
import { GraphCanvas } from '../components/graph/GraphCanvas';
import { Slider } from '../components/ui/Slider';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { AnalysisPanel } from '../components/workspace/AnalysisPanel';
import { PrettyMath } from '../components/math/PrettyMath';
import { parse } from '../lib/math/parser';
import { formatNumber } from '../lib/math/format';
import { DEFAULT_VIEWPORT } from '../lib/graph/viewport';
import './pages.css';

interface Preset { a: number; b: number; c: number; label: string }

const PRESETS: Preset[] = [
  { a: 1, b: 0, c: 0, label: 'Classic' },
  { a: 1, b: -4, c: 3, label: 'Two roots' },
  { a: -1, b: 4, c: 0, label: 'Frown' },
  { a: 0.5, b: 0, c: -4, label: 'Wide' },
  { a: 2, b: -8, c: 6, label: 'Narrow' },
  { a: -0.5, b: 2, c: 5, label: 'Drifting' },
];

function fmt(v: number): string {
  return formatNumber(v, 3);
}

function buildInput(a: number, b: number, c: number): string {
  // Skip zero coefficients so the equation never shows stray "+ 0" terms
  const segs: { sign: '' | '+' | '−'; text: string }[] = [];
  if (a !== 0) segs.push({ sign: a < 0 ? '−' : '', text: `${fmt(Math.abs(a))}x²` });
  if (b !== 0) segs.push({ sign: b < 0 ? '−' : '+', text: `${fmt(Math.abs(b))}x` });
  if (c !== 0) segs.push({ sign: c < 0 ? '−' : '+', text: fmt(Math.abs(c)) });
  if (segs.length === 0) return 'y = 0';
  return `y = ${segs.map((s) => `${s.sign}${s.text}`).join(' ')}`;
}

export function PlaygroundPage() {
  const navigate = useNavigate();
  const [a, setA] = useState(1);
  const [b, setB] = useState(-4);
  const [c, setC] = useState(3);

  const input = useMemo(() => buildInput(a, b, c), [a, b, c]);

  const equations = useMemo(
    () => [{ id: 'pg', input, visible: true, colorIndex: 0 }],
    [input]
  );
  const pipeline = usePipeline({ equations, viewport: DEFAULT_VIEWPORT, params: {} });
  const curve = pipeline.validCurves[0];

  const latex = useMemo(() => {
    try {
      return parse(input).latex;
    } catch {
      return input;
    }
  }, [input]);

  const randomize = useCallback(() => {
    const rand = (min: number, max: number, zeroOk = false): number => {
      for (let i = 0; i < 20; i++) {
        const v = min + Math.random() * (max - min);
        if (zeroOk || Math.abs(v) > 0.15) return v;
      }
      return min;
    };
    setA(Math.round(rand(-3, 3) * 10) / 10);
    setB(Math.round(rand(-8, 8) * 10) / 10);
    setC(Math.round(rand(-8, 8) * 10) / 10);
  }, []);

  const vertexX = -b / (2 * a);
  const vertexY = a * vertexX * vertexX + b * vertexX + c;
  const disc = b * b - 4 * a * c;

  const aNote = useMemo(() => {
    const abs = Math.abs(a);
    if (Math.abs(a) < 0.05) return 'a is near zero — the parabola is flattening into a line.';
    const dir = a > 0 ? 'opens upward' : 'opens downward';
    const width = abs > 1 ? `narrower than y = x² (|a| = ${fmt(abs)})` : abs < 1 ? `wider than y = x² (|a| = ${fmt(abs)})` : 'the same width as y = x²';
    return `a = ${fmt(a)} ${dir} and is ${width}.`;
  }, [a]);

  const bNote = useMemo(() => {
    const vx = -b / (2 * a);
    return `b = ${fmt(b)} pushes the vertex sideways to x = ${fmt(vx)} (the axis of symmetry).`;
  }, [a, b]);

  const cNote = useMemo(() => {
    return `c = ${fmt(c)} is the y-intercept: the parabola crosses the y-axis at (0, ${fmt(c)}).`;
  }, [c]);

  const rootNote = useMemo(() => {
    if (disc < -1e-9) return 'The discriminant is negative — no real roots; the parabola never touches the x-axis.';
    if (Math.abs(disc) < 1e-9) return `The discriminant is zero — one double root at x = ${fmt(vertexX)}; the parabola just kisses the axis.`;
    const r1 = (-b - Math.sqrt(disc)) / (2 * a);
    const r2 = (-b + Math.sqrt(disc)) / (2 * a);
    return `Discriminant ${fmt(disc)} > 0 — two real roots at x = ${fmt(r1)} and x = ${fmt(r2)}.`;
  }, [disc, a, b, vertexX]);

  return (
    <div className="page container page-enter">
      <header className="page-head">
        <p className="eyebrow">Parameter Playground</p>
        <h1>What does a coefficient do?</h1>
        <p className="page-head__sub">
          Drag the sliders and watch how each number reshapes the parabola — and the mathematics behind it.
        </p>
      </header>

      <div className="playground">
        <section className="playground__controls" aria-label="Controls">
          <div className="playground__eq">
            <PrettyMath tex={latex} display />
          </div>

          <div className="playground__sliders">
            <Slider label="a — width & direction" value={a} min={-3} max={3} step={0.1} onChange={setA} accent="var(--curve-0)" />
            <Slider label="b — tilt & shift" value={b} min={-10} max={10} step={0.1} onChange={setB} accent="var(--curve-1)" />
            <Slider label="c — height" value={c} min={-10} max={10} step={0.1} onChange={setC} accent="var(--curve-3)" />
          </div>

          <div className="playground__notes">
            <p><span className="playground__dot" style={{ background: 'var(--curve-0)' }} />{aNote}</p>
            <p><span className="playground__dot" style={{ background: 'var(--curve-1)' }} />{bNote}</p>
            <p><span className="playground__dot" style={{ background: 'var(--curve-3)' }} />{cNote}</p>
            <p className="playground__note-extra">📐 {rootNote}</p>
          </div>

          <div className="playground__presets">
            <span className="muted">Try:</span>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={`explore-chip ${a === p.a && b === p.b && c === p.c ? 'is-active' : ''}`}
                onClick={() => { setA(p.a); setB(p.b); setC(p.c); }}
              >
                {p.label}
              </button>
            ))}
            <button type="button" className="explore-chip" onClick={randomize}>🎲 Random</button>
          </div>

          <div className="playground__actions">
            <Button
              variant="primary"
              onClick={() => navigate('/graph?eq=' + encodeURIComponent('y = ax² + bx + c'))}
            >
              Open with sliders in the workspace →
            </Button>
            <Button variant="ghost" onClick={() => navigate('/explore')}>Browse examples</Button>
          </div>
        </section>

        <section className="playground__graph" aria-label="Live graph">
          <GraphCanvas
            viewport={DEFAULT_VIEWPORT}
            curves={curve ? [curve] : []}
            markers={curve ? curve.analysis.markers.map((m) => ({ ...m, color: curve.color, curveId: curve.id })) : []}
            ariaLabel="Live graph of the parabola you are shaping"
          />
        </section>

        <section className="playground__analysis" aria-label="Live analysis">
          <div className="workspace__analysis-title">Live analysis</div>
          {curve ? (
            <AnalysisPanel
              analysis={curve.analysis}
              derivativeLatex={curve.analysis.derivativeLatex}
            />
          ) : (
            <p className="muted">Analyzing…</p>
          )}
          <div className="playground__live">
            <Badge tone="accent">Vertex ({fmt(vertexX)}, {fmt(vertexY)})</Badge>
          </div>
        </section>
      </div>
    </div>
  );
}