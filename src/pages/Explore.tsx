import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CATEGORIES,
  CATEGORY_ICONS,
  Category,
  DIFFICULTIES,
  Difficulty,
  EXAMPLES,
  searchExamples,
} from '../data/examples';
import { GraphThumb } from '../components/graph/GraphThumb';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { PrettyMath } from '../components/math/PrettyMath';
import { parse } from '../lib/math/parser';
import './pages.css';

const DIFF_TONE: Record<Difficulty, 'good' | 'default' | 'gold' | 'bad'> = {
  Beginner: 'good',
  Intermediate: 'default',
  Advanced: 'gold',
  Expert: 'bad',
};

const FEATURED_IDS = ['parabola-opening-up', 'sine-wave', 'exp-natural', 'cubic-snake', 'bell-curve', 'logistic'];

export function ExplorePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'All'>('All');
  const [difficulty, setDifficulty] = useState<Difficulty | 'All'>('All');

  useEffect(() => {
    const cat = searchParams.get('cat');
    if (cat && (CATEGORIES as string[]).includes(cat)) {
      setCategory(cat as Category);
    }
  }, [searchParams]);

  const results = useMemo(
    () => searchExamples(query, category, difficulty),
    [query, category, difficulty]
  );

  const categoryCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of CATEGORIES) {
      out[c] = searchExamples(query, c, difficulty).length;
    }
    return out;
  }, [query, difficulty]);

  const allCount = useMemo(
    () => searchExamples(query, 'All', difficulty).length,
    [query, difficulty]
  );

  const featured = useMemo(
    () => FEATURED_IDS.map((id) => EXAMPLES.find((e) => e.id === id)).filter(Boolean),
    []
  );

  const open = (id: string): void => navigate(`/explore/${id}`);

  const surprise = (): void => {
    if (results.length > 0) open(results[Math.floor(Math.random() * results.length)].id);
  };

  return (
    <div className="page container page-enter">
      <header className="page-head">
        <p className="eyebrow">Explore</p>
        <h1>Beautiful mathematics to play with</h1>
        <p className="page-head__sub">
          {EXAMPLES.length} curated experiments — pick one, open it, and change it.
        </p>
      </header>

      <div className="explore-featured">
        <h2 className="explore-section-title">Today&apos;s picks</h2>
        <div className="explore-grid">
          {featured.map((e) =>
            e ? (
              <ExampleCard key={e.id} id={e.id} onOpen={open} />
            ) : null
          )}
        </div>
      </div>

      <div className="explore-controls">
        <label className="visually-hidden" htmlFor="explore-search">Search examples</label>
        <input
          id="explore-search"
          className="explore-search"
          type="search"
          placeholder="Search equations, concepts, ideas…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="explore-filters" role="group" aria-label="Category filter">
          <button
            type="button"
            className={`explore-chip ${category === 'All' ? 'is-active' : ''}`}
            onClick={() => setCategory('All')}
          >
            All<span className="explore-chip__count">{allCount}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`explore-chip ${category === c ? 'is-active' : ''}`}
              onClick={() => setCategory(c)}
            >
              <span aria-hidden="true">{CATEGORY_ICONS[c]}</span> {c}
              <span className="explore-chip__count">{categoryCounts[c]}</span>
            </button>
          ))}
        </div>
        <div className="explore-diff" role="group" aria-label="Difficulty filter">
          <span className="muted">Difficulty:</span>
          {(['All', ...DIFFICULTIES] as const).map((d) => (
            <button
              key={d}
              type="button"
              className={`explore-chip explore-chip--sm ${difficulty === d ? 'is-active' : ''}`}
              onClick={() => setDifficulty(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="explore-results">
        <div className="explore-results__bar">
          <p className="explore-count" aria-live="polite">
            {results.length} example{results.length === 1 ? '' : 's'}
          </p>
          {results.length > 0 && (
            <button type="button" className="explore-surprise" onClick={surprise}>
              🎲 Surprise me
            </button>
          )}
        </div>
        {results.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="Nothing matched that search"
            action={
              <button
                type="button"
                className="explore-chip is-active"
                onClick={() => {
                  setQuery('');
                  setCategory('All');
                  setDifficulty('All');
                }}
              >
                Clear filters
              </button>
            }
          >
            Try searching for “parabola”, “wave”, or “growth”.
          </EmptyState>
        ) : (
          <div className="explore-grid">
            {results.map((e) => (
              <ExampleCard key={e.id} id={e.id} onOpen={open} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExampleCard({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  // Hooks must run unconditionally. The `if (!example) return null` used to
  // sit ABOVE useMemo — a Rules-of-Hooks violation that could crash the
  // moment a hook order shifts between renders.
  const example = EXAMPLES.find((e) => e.id === id);
  const latex = useMemo(() => {
    if (!example) return '';
    try {
      return parse(example.equation).latex;
    } catch {
      return example.equation;
    }
  }, [example]);
  if (!example) return null;

  return (
    <article className="example-card" onClick={() => onOpen(example.id)} onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpen(example.id);
      }
    }} tabIndex={0} role="link" aria-label={`Open ${example.title}`}>
      <div className="example-card__thumb">
        <GraphThumb expression={example.equation} width={320} height={150} />
      </div>
      <div className="example-card__body">
        <div className="example-card__meta">
          <span className="example-card__cat">
            {CATEGORY_ICONS[example.category]} {example.category}
          </span>
          <Badge tone={DIFF_TONE[example.difficulty]}>{example.difficulty}</Badge>
        </div>
        <h3 className="example-card__title">{example.title}</h3>
        <div className="example-card__eq">
          <PrettyMath tex={latex} />
        </div>
        <p className="example-card__desc">{example.shortDescription}</p>
      </div>
    </article>
  );
}