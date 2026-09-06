import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CATEGORY_ICONS, getExample, relatedExamples } from '../data/examples';
import { usePipeline } from '../lib/graph/pipeline';
import { GraphCanvas } from '../components/graph/GraphCanvas';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PrettyMath } from '../components/math/PrettyMath';
import { parse } from '../lib/math/parser';
import { DEFAULT_VIEWPORT } from '../lib/graph/viewport';
import { EmptyState } from '../components/ui/EmptyState';
import { GraphThumb } from '../components/graph/GraphThumb';
import './pages.css';

const DIFF_TONE: Record<string, 'good' | 'default' | 'gold' | 'bad'> = {
  Beginner: 'good',
  Intermediate: 'default',
  Advanced: 'gold',
  Expert: 'bad',
};

export function ExperimentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const example = id ? getExample(id) : undefined;

  const equations = useMemo(
    () => (example ? [{ id: 'ex', input: example.equation, visible: true, colorIndex: 0 }] : []),
    [example]
  );

  const pipeline = usePipeline({ equations, viewport: DEFAULT_VIEWPORT, params: {} });
  const curve = pipeline.validCurves[0];

  if (!example) {
    return (
      <div className="page container page-enter">
        <EmptyState icon="❓" title="We couldn't find that experiment" action={<Link to="/explore">← Back to Explore</Link>}>
          It may have been renamed. Browse the library to find it.
        </EmptyState>
      </div>
    );
  }

  const latex = useMemo(() => {
    try {
      return parse(example.equation).latex;
    } catch {
      return example.equation;
    }
  }, [example.equation]);

  const related = relatedExamples(example.id);

  return (
    <div className="page container page-enter">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/explore">Explore</Link>
        <span aria-hidden="true">/</span>
        <span>{example.category}</span>
      </nav>

      <header className="detail-head">
        <div className="detail-head__meta">
          <span className="example-card__cat">
            {CATEGORY_ICONS[example.category]} {example.category}
          </span>
          <Badge tone={DIFF_TONE[example.difficulty]}>{example.difficulty}</Badge>
        </div>
        <h1>{example.title}</h1>
        <div className="detail-eq">
          <PrettyMath tex={latex} display />
        </div>
        <p className="detail-desc">{example.shortDescription}</p>
      </header>

      <div className="detail-graph">
        <GraphCanvas
          viewport={DEFAULT_VIEWPORT}
          curves={curve ? [curve] : []}
          markers={curve ? curve.analysis.markers.map((m) => ({ ...m, color: curve.color, curveId: curve.id })) : []}
          ariaLabel={`Graph of ${example.title}`}
        />
        <div className="detail-graph__overlay">
          <Button
            variant="primary"
            onClick={() => navigate(`/graph?eq=${encodeURIComponent(example.equation)}`)}
          >
            Open in workspace →
          </Button>
        </div>
      </div>

      <div className="detail-body">
        <section className="detail-section">
          <h2>Why it&apos;s interesting</h2>
          <p>{example.educationalExplanation}</p>
        </section>

        <section className="detail-section">
          <h2>Concepts</h2>
          <div className="detail-concepts">
            {example.concepts.map((c) => (
              <Badge key={c} tone="accent">{c}</Badge>
            ))}
          </div>
        </section>

        {curve && (
          <section className="detail-section">
            <h2>What the analysis says</h2>
            <div className="detail-analysis">
              <ul className="detail-facts">
                {curve.analysis.items.slice(0, 8).map((item) => (
                  <li key={item.key}>
                    <span className="muted">{item.key}:</span> <span className="mono">{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>

      {related.length > 0 && (
        <section className="detail-related">
          <h2>Keep exploring</h2>
          <div className="explore-grid">
            {related.map((r) => (
              <article
                key={r.id}
                className="example-card example-card--mini"
                onClick={() => navigate(`/explore/${r.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/explore/${r.id}`)}
                tabIndex={0}
                role="link"
              >
                <GraphThumb expression={r.equation} width={240} height={110} />
                <div className="example-card__body">
                  <h3 className="example-card__title">{r.title}</h3>
                  <div className="example-card__eq">
                    <PrettyMath tex={(() => { try { return parse(r.equation).latex; } catch { return r.equation; } })()} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}