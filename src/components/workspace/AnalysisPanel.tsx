import { AnalysisResult } from '../../lib/math/analyze';
import { PrettyMath } from '../math/PrettyMath';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import './workspace.css';

const KIND_TONE: Record<string, 'accent' | 'gold' | 'good' | 'default'> = {
  quadratic: 'accent',
  trig: 'gold',
  exponential: 'gold',
  cubic: 'accent',
  linear: 'good',
};

interface AnalysisPanelProps {
  analysis: AnalysisResult | null;
  derivativeLatex?: string;
  onPlotDerivative?: () => void;
  suggestions?: { label: string; action: () => void }[];
}

export function AnalysisPanel({
  analysis,
  derivativeLatex,
  onPlotDerivative,
  suggestions = [],
}: AnalysisPanelProps) {
  if (!analysis) {
    return (
      <div className="analysis-panel">
        <p className="analysis-panel__empty">
          Select an equation to see what mathematics can tell us about it.
        </p>
      </div>
    );
  }

  return (
    <div className="analysis-panel">
      <div className="analysis-panel__kind">
        <Badge tone={KIND_TONE[analysis.kind] ?? 'default'}>{analysis.kindLabel}</Badge>
      </div>

      {analysis.items.length > 0 && (
        <dl className="analysis-items">
          {analysis.items.map((item) => (
            <div key={item.key} className="analysis-items__row">
              <dt>{item.key}</dt>
              <dd>
                {item.latex ? <PrettyMath tex={item.latex} /> : item.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="analysis-facts">
        {analysis.keyFacts.map((f, i) => (
          <p key={i}>{f}</p>
        ))}
      </div>

      {derivativeLatex && (
        <div className="analysis-deriv">
          <div className="analysis-deriv__label">Derivative</div>
          <div className="analysis-deriv__eq">
            <PrettyMath tex={`\\frac{d}{dx}\\left(${derivativeLatex}\\right)`} />
          </div>
          {onPlotDerivative && (
            <Button size="sm" variant="ghost" onClick={onPlotDerivative}>
              Plot its derivative →
            </Button>
          )}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="analysis-suggest">
          <div className="analysis-suggest__label">You might also like</div>
          <div className="analysis-suggest__list">
            {suggestions.map((s, i) => (
              <button key={i} type="button" className="analysis-suggest__chip" onClick={s.action}>
                {s.label} →
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}