import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraphCanvas } from '../components/graph/GraphCanvas';
import { GraphThumb } from '../components/graph/GraphThumb';
import { PrettyMath } from '../components/math/PrettyMath';
import { EquationEditor } from '../components/math/EquationEditor';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { parse } from '../lib/math/parser';
import { usePipeline } from '../lib/graph/pipeline';
import { DEFAULT_VIEWPORT } from '../lib/graph/viewport';
import { equationOfTheDay } from '../data/daily';
import { CATEGORIES, CATEGORY_ICONS, EXAMPLES, Category } from '../data/examples';
import { SOLIDS } from '../data/solids';
import { normalizeMesh } from '../lib/graph3d/mesh';
import { Graph3DCanvas } from '../components/graph3d/Graph3DCanvas';
import './pages.css';

const HERO_EXAMPLES = [
  'y = x²',
  'y = sin(x)',
  'y = e^x',
  'y = x³ - 3x',
  'y = 1/x',
  'y = cos(3x) + 2sin(x)',
];

const HERO_HINTS: Record<string, string> = {
  'y = x²': 'The parabola — the shape of everything thrown.',
  'y = sin(x)': 'The wave behind sound, light, and tides.',
  'y = e^x': 'Nature’s growth rate — slopes equal to values.',
  'y = x³ - 3x': 'A cubic with a peak, a valley, and a pivot.',
  'y = 1/x': 'The hyperbola — inverse proportion at work.',
  'y = cos(3x) + 2sin(x)': 'Two tones played together, as one curve.',
};

export function HomePage() {
  const navigate = useNavigate();
  const [heroInput, setHeroInput] = useState('y = x²');
  const [rotIndex, setRotIndex] = useState(0);
  const [custom, setCustom] = useState(false);
  const heroEq = custom ? heroInput : HERO_EXAMPLES[rotIndex % HERO_EXAMPLES.length];

  const equations = useMemo(
    () => [{ id: 'hero', input: heroEq, visible: true, colorIndex: 0 }],
    [heroEq]
  );
  const pipeline = usePipeline({ equations, viewport: DEFAULT_VIEWPORT, params: {} });
  const curve = pipeline.validCurves[0];

  // Rotate examples in the hero
  useEffect(() => {
    if (custom) return;
    const t = window.setInterval(() => setRotIndex((i) => i + 1), 4200);
    return () => window.clearInterval(t);
  }, [custom]);

  const heroHint = custom ? 'Type an equation — press Enter to explore it fully.' : (HERO_HINTS[heroEq] ?? 'Drag to pan · scroll to zoom.');

  const commitHero = useCallback(() => {
    const v = heroInput.trim();
    if (!v) return;
    navigate(`/graph?eq=${encodeURIComponent(v)}`);
  }, [heroInput, navigate]);

  const daily = equationOfTheDay();

  const categoryPreview = (cat: Category): string[] => {
    const found = EXAMPLES.filter((e) => e.category === cat).slice(0, 2);
    return found.map((e) => e.equation);
  };

  const scienceChips = useMemo(
    () => [
      { title: 'A thrown ball', equation: 'y = -4.9x² + 10x + 2', note: 'Gravity makes every ball a parabola.' },
      { title: 'A spring’s heartbeat', equation: 'y = 5cos(2x)', note: 'Oscillation — pendulums, swings, strings.' },
      { title: 'Bacteria doubling', equation: 'y = 3·2^x', note: 'Exponential growth — populations, interest.' },
      { title: 'The spread of a rumor', equation: 'y = 1/(1 + e^(-x))', note: 'The logistic S-curve of adoption.' },
    ],
    []
  );

  return (
    <div className="home">
      {/* ---------- Hero ---------- */}
      <section className="hero">
        <div className="container hero__in">
          <div className="hero__copy">
            <p className="eyebrow">An interactive playground for mathematics</p>
            <h1>
              Explore mathematics,
              <br />
              <span className="hero__gradient">visually.</span>
            </h1>
            <p className="hero__sub">
              Type an equation. Draw one. Watch mathematics come alive — no account needed, ever.
            </p>
            <div className="hero__input">
              <EquationEditor
                value={heroInput}
                onChange={(v) => {
                  setHeroInput(v);
                  setCustom(v.trim().length > 0);
                }}
                onCommit={commitHero}
                placeholder="What do you want to explore?"
                ariaLabel="Equation to graph"
                large
              />
              <Button variant="primary" size="lg" onClick={commitHero}>
                Explore it
                <span aria-hidden="true">→</span>
              </Button>
            </div>
            <div className="hero__hint" aria-live="polite">
              {heroHint}
            </div>
            <div className="hero__chips" aria-label="Example equations">
              {HERO_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  className={`hero-chip ${heroEq === ex && !custom ? 'is-active' : ''}`}
                  onClick={() => {
                    setHeroInput(ex);
                    setCustom(false);
                  }}
                >
                  <PrettyMath tex={toLatex(ex)} />
                </button>
              ))}
            </div>
          </div>
          <div className="hero__graph-wrap">
            <GraphCanvas
              viewport={DEFAULT_VIEWPORT}
              curves={curve ? [curve] : []}
              markers={curve ? curve.analysis.markers.map((m) => ({ ...m, color: curve.color, curveId: curve.id })) : []}
              ariaLabel="Interactive example graph. Drag to pan, scroll to zoom."
            />
            <div className="hero__graph-badge">
              <Badge tone="accent">{curve?.analysis.kindLabel ?? 'Graph'}</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Equation of the day ---------- */}
      <section className="home-section">
        <div className="container">
          <div className="daily-teaser" onClick={() => navigate('/daily')} onKeyDown={(e) => e.key === 'Enter' && navigate('/daily')} tabIndex={0} role="link">
            <div className="daily-teaser__text">
              <p className="eyebrow">Today’s equation</p>
              <h2>{daily.title}</h2>
              <p className="muted">{daily.whyInteresting.slice(0, 150)}…</p>
              <span className="daily-teaser__link">See it come alive →</span>
            </div>
            <div className="daily-teaser__eq">
              <PrettyMath tex={daily.latex ?? toLatex(daily.equation)} display />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Explore ---------- */}
      <section className="home-section">
        <div className="container">
          <div className="home-section__head">
            <p className="eyebrow">Explore</p>
            <h2>Hundreds of curated experiments</h2>
            <p className="muted">
              {EXAMPLES.length} hand-picked equations across {CATEGORIES.length} categories — each one ready to poke and prod.
            </p>
          </div>
          <div className="home-cats">
            {CATEGORIES.map((cat) => (
              <Link key={cat} to={`/explore?cat=${encodeURIComponent(cat)}`} className="home-cat">
                <div className="home-cat__icon" aria-hidden="true">{CATEGORY_ICONS[cat]}</div>
                <div className="home-cat__thumbs" aria-hidden="true">
                  {categoryPreview(cat).map((eq) => (
                    <GraphThumb key={eq} expression={eq} width={120} height={64} />
                  ))}
                </div>
                <div className="home-cat__name">{cat}</div>
              </Link>
            ))}
          </div>
          <div className="home-cta-row">
            <Button variant="secondary" size="lg" onClick={() => navigate('/explore')}>
              Open the library →
            </Button>
          </div>
        </div>
      </section>

      {/* ---------- Playground ---------- */}
      <section className="home-section home-section--tinted">
        <div className="container home-split">
          <div className="home-split__copy">
            <p className="eyebrow">Experiment</p>
            <h2>What does a coefficient do?</h2>
            <p className="muted">
              Drag a slider and the graph changes instantly — along with the mathematics behind it. See why a larger{' '}
              <em>a</em> makes a parabola narrower, and what <em>b</em> really does.
            </p>
            <ul className="home-features">
              <li>Live parameter sliders</li>
              <li>Roots, vertex & axis updated in real time</li>
              <li>Plain-language explanations as you drag</li>
            </ul>
            <Button variant="primary" onClick={() => navigate('/playground')}>
              Try the parabola playground →
            </Button>
          </div>
          <div className="home-split__demo">
            <div className="home-demo-eq">
              <PrettyMath tex="y = ax^{2} + bx + c" display />
            </div>
            <GraphThumb expression="y = x²" width={420} height={200} animated />
            <div className="home-demo-sliders" aria-hidden="true">
              <div className="home-demo-slider"><span>a</span><i style={{ width: '38%' }} /></div>
              <div className="home-demo-slider"><span>b</span><i style={{ width: '64%' }} /></div>
              <div className="home-demo-slider"><span>c</span><i style={{ width: '22%' }} /></div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Science ---------- */}
      <section className="home-section">
        <div className="container">
          <div className="home-section__head">
            <p className="eyebrow">Mathematics in science</p>
            <h2>So that’s how math describes motion</h2>
            <p className="muted">The same curves that live in textbooks run the physical world.</p>
          </div>
          <div className="home-science">
            {scienceChips.map((s) => (
              <button
                key={s.title}
                type="button"
                className="science-card"
                onClick={() => navigate(`/graph?eq=${encodeURIComponent(s.equation)}`)}
              >
                <div className="science-card__thumb">
                  <GraphThumb expression={s.equation} width={280} height={130} />
                </div>
                <h3>{s.title}</h3>
                <p className="muted">{s.note}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Draw ---------- */}
      <section className="home-section home-section--tinted">
        <div className="container home-split">
          <div className="home-split__copy">
            <p className="eyebrow">Draw it</p>
            <h2>Your pen is welcome here</h2>
            <p className="muted">
              Sketch symbols by hand with a mouse, finger, or stylus in the workspace. The drawing layer is built for a
              handwriting model — recognition is experimental today and a full model is on the way.
            </p>
            <Button variant="secondary" onClick={() => navigate('/graph')}>
              Open the workspace with the pen tool →
            </Button>
          </div>
          <div className="home-split__demo home-split__demo--draw" aria-hidden="true">
            <svg viewBox="0 0 260 120" className="home-draw-svg">
              <path d="M20 60 Q 40 20, 55 40 Q 65 52, 60 65 Q 50 85, 75 55" fill="none" stroke="var(--curve-0)" strokeWidth="4" strokeLinecap="round" />
              <path d="M90 80 L 125 25 L 160 80 Z" fill="none" stroke="var(--curve-1)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M180 75 h 60" stroke="var(--curve-2)" strokeWidth="5" strokeLinecap="round" />
              <path d="M175 45 h 70" stroke="var(--curve-3)" strokeWidth="5" strokeLinecap="round" />
            </svg>
            <p className="muted home-draw-caption">x − √2 = … — sketched, not typed</p>
          </div>
        </div>
      </section>

      {/* ---------- 3D ---------- */}
      <section className="home-section home-section--tinted">
        <div className="container home-split">
          <div className="home-split__copy">
            <p className="eyebrow">Go 3D</p>
            <h2>Graphs you can grab and turn</h2>
            <p className="muted">
              Type any surface z = f(x, y) — saddles, ripples, cones — and orbit it live. Then browse{' '}
              {SOLIDS.length} solids and surfaces, from the cube to the Klein bottle, each with its formulas.
            </p>
            <div className="home-cta-row">
              <Button variant="primary" onClick={() => navigate('/graph3d')}>
                Open the 3D Studio →
              </Button>
              <Button variant="secondary" onClick={() => navigate('/solids')}>
                Browse the solids gallery →
              </Button>
            </div>
          </div>
          <div className="home-split__demo">
            <div className="home-demo-eq">
              <PrettyMath tex="z = \frac{x^{2}}{4} - \frac{y^{2}}{4}" display />
            </div>
            <div className="home-3d-thumb" aria-hidden="true">
              <SolidThumb3D id="hyperbolic-paraboloid" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="home-section">
        <div className="container">
          <div className="home-cta">
            <h2>Mathematics should feel alive.</h2>
            <p className="muted">
              No login. No walls. Just you, an equation, and something to discover.
            </p>
            <Button variant="primary" size="lg" onClick={() => navigate('/graph')}>
              Start exploring
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function toLatex(input: string): string {
  try {
    return parse(input).latex;
  } catch {
    return input;
  }
}

/** Small static 3D preview for the homepage. */
function SolidThumb3D({ id }: { id: string }) {
  const entry = SOLIDS.find((s) => s.id === id);
  const mesh = useMemo(() => {
    if (!entry) return null;
    try {
      return normalizeMesh(entry.build(), 3.2);
    } catch {
      return null;
    }
  }, [entry]);
  if (!mesh) return null;
  return <Graph3DCanvas mesh={mesh} zLo={-2} zHi={2} style={{ wireframe: false }} />;
}