import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { equationOfTheDay, formatDay } from '../data/daily';
import { ExampleEquation, getExample } from '../data/examples';
import { GraphCanvas } from '../components/graph/GraphCanvas';
import { PrettyMath } from '../components/math/PrettyMath';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { GraphThumb } from '../components/graph/GraphThumb';
import { parse } from '../lib/math/parser';
import { DEFAULT_VIEWPORT } from '../lib/graph/viewport';
import { usePipeline } from '../lib/graph/pipeline';
import './pages.css';

export function DailyPage() {
  const navigate = useNavigate();
  const daily = equationOfTheDay();
  const dateLabel = formatDay();

  const isIdentity = daily.visualization === 'identity';

  const equations = useMemo(
    () => (isIdentity ? [] : [{ id: 'daily', input: daily.equation, visible: true, colorIndex: 0 }]),
    [daily, isIdentity]
  );
  const pipeline = usePipeline({ equations, viewport: DEFAULT_VIEWPORT, params: {} });
  const curve = pipeline.validCurves[0];

  const latex = useMemo(() => {
    if (daily.latex) return daily.latex;
    try {
      return parse(daily.equation).latex;
    } catch {
      return daily.equation;
    }
  }, [daily]);

  const related = daily.relatedExamples
    .map((id) => getExample(id))
    .filter((e): e is ExampleEquation => Boolean(e));

  return (
    <div className="page container page-enter">
      <header className="page-head daily-head">
        <p className="eyebrow">Equation of the Day</p>
        <h1>Today&apos;s equation</h1>
        <p className="page-head__sub">{dateLabel} · {daily.category}</p>
      </header>

      <section className="daily-card" aria-label={daily.title}>
        <div className="daily-card__top">
          <div>
            <Badge tone="gold">✦ {daily.title}</Badge>
            <Badge tone="default">{daily.category}</Badge>
          </div>
          <Badge tone={daily.difficulty === 'Beginner' ? 'good' : daily.difficulty === 'Advanced' ? 'gold' : daily.difficulty === 'Expert' ? 'bad' : 'default'}>
            {daily.difficulty}
          </Badge>
        </div>

        <div className="daily-card__eq">
          <PrettyMath tex={latex} display />
        </div>

        <div className="daily-card__why">
          <h2>Why is it interesting?</h2>
          <p>{daily.whyInteresting}</p>
          <div className="daily-card__fact">
            <span className="daily-card__fact-label">Fun fact</span>
            <p>{daily.funFact}</p>
          </div>
        </div>

        <div className="daily-card__concepts">
          {daily.concepts.map((c) => (
            <Badge key={c} tone="accent">{c}</Badge>
          ))}
        </div>

        {isIdentity ? (
          <div className="daily-identity-note">
            <p>
              This is an <strong>identity</strong> — a statement of equality, not a function to graph.
              Its beauty is in the relationship it describes, connecting e, i, π, 1 and 0.
            </p>
            <Link to="/explore/exp-natural">Explore e^x, the function behind it →</Link>
          </div>
        ) : (
          <>
            <div className="daily-card__graph">
              <GraphCanvas
                viewport={DEFAULT_VIEWPORT}
                curves={curve ? [curve] : []}
                markers={curve ? curve.analysis.markers.map((m) => ({ ...m, color: curve.color, curveId: curve.id })) : []}
                ariaLabel={`Graph of ${daily.title}`}
              />
            </div>
            <Button variant="primary" size="lg" onClick={() => navigate(`/graph?eq=${encodeURIComponent(daily.equation)}`)}>
              Explore it →
            </Button>
          </>
        )}
      </section>

      {related.length > 0 && (
        <section className="detail-related">
          <h2>Related equations</h2>
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