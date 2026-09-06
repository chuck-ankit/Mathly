import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { parse3d } from '../lib/math/parser';
import { MathParseError, ParseIssue } from '../lib/math/types';
import { makeSurfaceEvaluator, buildSurface } from '../lib/graph3d/surface';
import { View3D } from '../lib/graph3d/engine3d';
import { Graph3DCanvas } from '../components/graph3d/Graph3DCanvas';
import { PrettyMath } from '../components/math/PrettyMath';
import { EquationEditor } from '../components/math/EquationEditor';
import { Key } from '../components/math/MathKeyboard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toasts';
import './graph3d.css';

const Z3D_KEYS: Key[] = [
  { label: 'y²', insert: 'y²' },
  { label: 'x·y', insert: 'xy' },
  { label: 'z =', insert: 'z = ' },
];

const PRESETS: { label: string; eq: string }[] = [
  { label: 'Saddle', eq: 'z = (x² - y²)/4' },
  { label: 'Paraboloid', eq: 'z = (x² + y²)/4 - 4' },
  { label: 'Ripples', eq: 'z = 3sin(sqrt(x² + y²))' },
  { label: 'Gaussian', eq: 'z = 4e^(-(x² + y²)/6)' },
  { label: 'Monkey saddle', eq: 'z = (x³ - 3xy²)/8' },
  { label: 'Egg box', eq: 'z = sin(x)·cos(y)·2' },
  { label: 'Waves', eq: 'z = sin(x - y²/3)·2' },
  { label: 'Cone', eq: 'z = 8 - 2·sqrt(x² + y²)' },
];

const DEFAULT_EQ = 'z = (x² - y²)/4';

const VIEWS: { id: View3D; label: string; title: string }[] = [
  { id: 'iso', label: 'Iso', title: 'Isometric view' },
  { id: 'top', label: 'Top', title: 'Look straight down' },
  { id: 'front', label: 'Front', title: 'Look along the y-axis' },
  { id: 'side', label: 'Side', title: 'Look along the x-axis' },
];

const PALETTES: { id: string; label: string; low: string; high: string }[] = [
  { id: 'violet', label: 'Violet', low: '#4f7cff', high: '#a86cff' },
  { id: 'ocean', label: 'Ocean', low: '#1e9bd6', high: '#19d3b1' },
  { id: 'sunset', label: 'Sunset', low: '#ff8a3d', high: '#ff4d79' },
  { id: 'forest', label: 'Forest', low: '#22b877', high: '#9be15d' },
  { id: 'candy', label: 'Candy', low: '#6b5cff', high: '#ff4ecb' },
];

export function Graph3DPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { toast } = useToast();

  const [input, setInput] = useState(() => {
    const q = params.get('eq');
    if (q) return q.includes('=') ? q : `z = ${q}`;
    return DEFAULT_EQ;
  });
  const [range, setRange] = useState(6);
  const [quality, setQuality] = useState(48);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [view, setView] = useState<View3D>('iso');
  const [autoRotate, setAutoRotate] = useState(false);
  const [wireframe, setWireframe] = useState(true);
  const [opacity, setOpacity] = useState(0.96);
  const [palette, setPalette] = useState(PALETTES[0].id);
  const [recents, setRecents] = useState<string[]>([]);

  const derived = useMemo(() => {
    try {
      const parsed = parse3d(input);
      const f = makeSurfaceEvaluator(parsed.expression, {});
      const built = buildSurface(f, range, quality);
      return { parsed, built, error: null as ParseIssue | null };
    } catch (e) {
      const issue =
        e instanceof MathParseError
          ? e.issue
          : { message: 'Something went wrong while reading this surface.', start: 0, end: input.length };
      return { parsed: null, built: null, error: issue };
    }
  }, [input, range, quality]);

  const mesh = derived.built?.mesh ?? null;

  // Keep ?eq= in the address bar so the surface is shareable & reloadable.
  useEffect(() => {
    if (!input.trim()) return;
    const next = new URLSearchParams(location.search);
    next.set('eq', input);
    const nextStr = next.toString();
    if (location.search.replace('?', '') !== nextStr) {
      navigate(`${location.pathname}?${nextStr}`, { replace: true });
    }
  }, [input, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!derived.parsed) return;
    try {
      const stored: string[] = JSON.parse(localStorage.getItem('mathly.z3d.recents') ?? '[]');
      const next = [input, ...stored.filter((r) => r !== input)].slice(0, 8);
      localStorage.setItem('mathly.z3d.recents', JSON.stringify(next));
      setRecents(next);
    } catch {
      // ignore storage failures
    }
  }, [input, derived.parsed]);

  const openInWorkspace2d = useCallback(() => {
    navigate('/graph');
  }, [navigate]);

  const copyShareLink = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?eq=${encodeURIComponent(input)}`;
    const done = () => toast('Share link copied — send it to a friend.', 'gold');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(done);
    } else {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } finally {
        ta.remove();
      }
      done();
    }
  }, [input, toast]);

  const paletteColors = PALETTES.find((p) => p.id === palette) ?? PALETTES[0];

  return (
    <div className="page container page-enter g3d-page">
      <header className="page-head">
        <p className="eyebrow">3D Studio</p>
        <h1>Surfaces in three dimensions</h1>
        <p className="page-head__sub">
          Type any <strong>z = f(x, y)</strong> — saddles, ripples, cones — then drag to orbit, scroll to zoom, or
          jump to a preset view.
        </p>
      </header>

      <div className="g3d-layout">
        <section className="g3d-stage" aria-label="3D graph">
          {mesh ? (
            <>
              <Graph3DCanvas
                mesh={mesh}
                zLo={derived.built?.zLo ?? -1}
                zHi={derived.built?.zHi ?? 1}
                view={view}
                autoRotate={autoRotate}
                style={{
                  colorLow: paletteColors.low,
                  colorHigh: paletteColors.high,
                  opacity,
                  wireframe,
                }}
                ariaLabel={`3D surface of ${input}`}
              />

              <div className="g3d-toolbar g3d-toolbar--views" role="group" aria-label="Camera views">
                {VIEWS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={`g3d-view-btn ${view === v.id ? 'is-active' : ''}`}
                    title={v.title}
                    aria-pressed={view === v.id}
                    aria-label={`${v.title}, ${v.label}`}
                    onClick={() => setView(v.id)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              <div className="g3d-toolbar g3d-toolbar--actions" role="group" aria-label="View actions">
                <button
                  type="button"
                  className={`g3d-icon-btn ${autoRotate ? 'is-active' : ''}`}
                  title={autoRotate ? 'Stop rotating' : 'Spin the surface'}
                  aria-pressed={autoRotate}
                  aria-label={autoRotate ? 'Stop rotating' : 'Spin the surface'}
                  onClick={() => setAutoRotate((a) => !a)}
                >
                  {autoRotate ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button
                  type="button"
                  className="g3d-icon-btn"
                  title="Reset view"
                  aria-label="Reset view"
                  onClick={() => setView('iso')}
                >
                  <ResetIcon />
                </button>
                <button
                  type="button"
                  className={`g3d-icon-btn ${wireframe ? 'is-active' : ''}`}
                  title={wireframe ? 'Hide wireframe' : 'Show wireframe'}
                  aria-pressed={wireframe}
                  aria-label={wireframe ? 'Hide wireframe' : 'Show wireframe'}
                  onClick={() => setWireframe((w) => !w)}
                >
                  <WireframeIcon />
                </button>
              </div>

              <div className="g3d-stage__badge">
                <Badge tone="accent">{mesh.tris.length.toLocaleString()} triangles</Badge>
              </div>

              <div className="g3d-hint">
                <span>Drag to rotate</span>
                <span className="g3d-hint__dot" aria-hidden="true" />
                <span>Scroll to zoom</span>
                <span className="g3d-hint__dot" aria-hidden="true" />
                <span>Double-click to reset</span>
              </div>
            </>
          ) : (
            <div className="g3d-stage__empty">
              <EmptyState
                icon={
                  <span className="g3d-stage__empty-glyph serif" aria-hidden="true">
                    z
                  </span>
                }
                title="Awaiting a surface"
              >
                {derived.error
                  ? derived.error.message
                  : 'Type a surface like z = sin(x)·cos(y) and it will appear here, ready to spin.'}
              </EmptyState>
            </div>
          )}
        </section>

        <aside className="g3d-controls" aria-label="Surface controls">
          <div className="g3d-editor">
            <EquationEditor
              value={input}
              onChange={setInput}
              error={derived.error}
              placeholder="z = sin(x)·cos(y)"
              ariaLabel="3D surface equation"
              large
              showKeyboard={keyboardOpen}
              onKeyboardToggle={setKeyboardOpen}
              extraKeys={Z3D_KEYS}
            />
          </div>
          <div className="g3d-pretty">
            {derived.parsed ? <PrettyMath tex={derived.parsed.latex} display /> : null}
          </div>

          <div className="g3d-presets">
            <h2 className="g3d-section-title">Try a surface</h2>
            <div className="explore-filters" role="group" aria-label="Preset surfaces">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={`explore-chip ${input === p.eq ? 'is-active' : ''}`}
                  onClick={() => setInput(p.eq)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {recents.length > 0 && (
            <div className="g3d-recents">
              <h2 className="g3d-section-title">Recently used</h2>
              <div className="g3d-recents__list">
                {recents.map((r) => (
                  <button key={r} type="button" className="g3d-recent" onClick={() => setInput(r)} title={r}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="g3d-appearance">
            <h2 className="g3d-section-title">Appearance</h2>

            <div className="g3d-palettes" role="group" aria-label="Color palette">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`g3d-swatch ${palette === p.id ? 'is-active' : ''}`}
                  title={p.label}
                  aria-label={p.label}
                  aria-pressed={palette === p.id}
                  onClick={() => setPalette(p.id)}
                >
                  <span className="g3d-swatch__bar" style={{ background: `linear-gradient(90deg, ${p.low}, ${p.high})` }} />
                </button>
              ))}
            </div>

            <label className="g3d-range">
              <span>Opacity</span>
              <input
                type="range"
                min={0.45}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
              />
            </label>

            <label className="g3d-range">
              <span>Domain: ±{range}</span>
              <input
                type="range"
                min={2}
                max={12}
                step={1}
                value={range}
                onChange={(e) => setRange(Number(e.target.value))}
              />
            </label>

            <label className="g3d-quality">
              <span>Detail</span>
              <select value={quality} onChange={(e) => setQuality(Number(e.target.value))}>
                <option value={24}>Low · fast</option>
                <option value={48}>Medium</option>
                <option value={72}>High · slow</option>
              </select>
            </label>
          </div>

          <div className="g3d-links">
            <Button variant="secondary" size="sm" onClick={copyShareLink} disabled={!mesh}>
              Copy share link
            </Button>
            <Button variant="ghost" size="sm" onClick={openInWorkspace2d}>
              2D workspace →
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/solids')}>
              Browse 3D solids →
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ---------------- Icons ---------------- */

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 4.6a1 1 0 0 1 1.52-.86l11 6.9a1 1 0 0 1 0 1.72l-11 6.9A1 1 0 0 1 7 18.4V4.6Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4.5" width="4" height="15" rx="1.2" />
      <rect x="14" y="4.5" width="4" height="15" rx="1.2" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 4v5h5" />
      <path d="M4.6 13a8 8 0 1 0 .4-5.5L4 9" />
    </svg>
  );
}

function WireframeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  );
}