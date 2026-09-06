import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspace, paramRanges } from '../state/useWorkspace';
import { usePipeline } from '../lib/graph/pipeline';
import { GraphCanvas } from '../components/graph/GraphCanvas';
import { EquationRow } from '../components/workspace/EquationRow';
import { AnalysisPanel } from '../components/workspace/AnalysisPanel';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import { Slider } from '../components/ui/Slider';
import { CommandPalette, Command } from '../components/ui/CommandPalette';
import { HandwritingModal } from '../components/handwriting/HandwritingModal';
import { useToast } from '../components/ui/Toasts';
import { graphUrl } from '../lib/url';
import { nodeToInput } from '../lib/math/latex';
import { parse } from '../lib/math/parser';
import { PrettyMath } from '../components/math/PrettyMath';
import '../components/workspace/workspace.css';

interface WorkspaceProps {
  forcePresentation?: boolean;
}

export function GraphWorkspace({ forcePresentation = false }: WorkspaceProps) {
  const ws = useWorkspace(forcePresentation);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [handwritingOpen, setHandwritingOpen] = useState(false);
  const [tab, setTab] = useState<'equations' | 'analysis'>('equations');
  const [presentInput, setPresentInput] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const pipeline = usePipeline({
    equations: ws.equations,
    viewport: ws.viewport,
    params: ws.params,
  });

  const derivationById = useMemo(() => {
    const m = new Map<string, ReturnType<typeof usePipeline>['curves'][number]>();
    pipeline.curves.forEach((d, i) => m.set(ws.equations[i].id, d));
    return m;
  }, [pipeline, ws.equations]);

  const colorById = useMemo(() => {
    const m = new Map<string, string>();
    ws.equations.forEach((e) => {
      m.set(e.id, `var(--curve-${e.colorIndex % 8})`);
    });
    return m;
  }, [ws.equations]);

  const curvesForCanvas = useMemo(() => {
    return pipeline.validCurves.map((c) => ({
      id: c.id,
      color: c.color,
      dash: c.dash,
      segments: c.segments,
      evaluate: c.evaluate,
      label: c.label,
      sig: `${c.input}|${JSON.stringify(c.params)}`,
    }));
  }, [pipeline.validCurves]);

  const markers = useMemo(() => {
    return pipeline.validCurves.flatMap((c) =>
      c.analysis.markers.map((m) => ({
        ...m,
        color: c.color,
        curveId: c.id,
      }))
    );
  }, [pipeline.validCurves]);

  // Focused curve for analysis
  const focused = ws.focusedId ? derivationById.get(ws.focusedId) : undefined;
  const focusedCurve = focused?.ok ? focused.curve : undefined;
  const focusedError = focused && !focused.ok ? focused.error : undefined;

  const handleCommit = useCallback(
    (id: string) => {
      const d = derivationById.get(id);
      if (d?.ok) {
        ws.addEquation('');
      }
    },
    [derivationById, ws]
  );

  const shareLink = useCallback(() => {
    const url =
      window.location.origin +
      '/graph?' +
      graphUrl({
        equations: ws.equations.map((e) => e.input).filter(Boolean),
        viewport: ws.viewport,
        presentation: ws.presentation,
      }).replace(/^\//, '');
    navigator.clipboard?.writeText(url).then(
      () => toast('Link copied — anyone can open this experiment.'),
      () => toast('Could not copy the link automatically.')
    );
  }, [ws.equations, ws.viewport, ws.presentation, toast]);

  const plotDerivative = useCallback(() => {
    if (!focusedCurve) return;
    const derivAst = focusedCurve.analysis.derivativeAst;
    if (!derivAst) return;
    const input = nodeToInput(derivAst);
    ws.addEquation(input);
  }, [focusedCurve, ws]);

  const commands: Command[] = useMemo(
    () => [
      { id: 'add', label: 'Add equation', icon: '＋', desc: 'Ctrl+Enter', action: () => ws.addEquation('') },
      { id: 'explore', label: 'Open examples', icon: '✦', action: () => navigate('/explore') },
      { id: 'daily', label: "Today's equation", icon: '★', action: () => navigate('/daily') },
      { id: 'reset', label: 'Reset graph', icon: '⌂', action: ws.resetViewport },
      { id: 'present', label: 'Presentation mode', icon: '▶', action: () => ws.setPresentation(true) },
      { id: 'share', label: 'Copy share link', icon: '🔗', action: shareLink },
      { id: 'draw', label: 'Draw an equation', icon: '✍', action: () => setHandwritingOpen(true) },
    ],
    [ws, navigate, shareLink]
  );

  const presentSubmit = useCallback(() => {
    const v = presentInput.trim();
    if (!v) return;
    ws.addEquation(v);
    setPresentInput('');
  }, [presentInput, ws]);

  return (
    <div className={`workspace ${ws.presentation ? 'workspace--present' : ''}`}>
      {!ws.presentation && (
        <aside className="workspace__side" aria-label="Equations">
          <div className="workspace__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'equations'}
              className={`workspace__tab ${tab === 'equations' ? 'is-active' : ''}`}
              onClick={() => setTab('equations')}
            >
              Equations
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'analysis'}
              className={`workspace__tab ${tab === 'analysis' ? 'is-active' : ''}`}
              onClick={() => setTab('analysis')}
            >
              Analysis
            </button>
          </div>

          {tab === 'equations' && (
            <div className="workspace__eqlist">
              {ws.equations.map((eq) => {
                const d = derivationById.get(eq.id);
                return (
                  <EquationRow
                    key={eq.id}
                    id={eq.id}
                    input={eq.input}
                    color={colorById.get(eq.id) ?? 'var(--accent)'}
                    visible={eq.visible}
                    focused={ws.focusedId === eq.id}
                    error={d && !d.ok ? d.error : null}
                    label={d?.ok ? d.curve.label : 'y'}
                    onInputChange={ws.updateInput}
                    onCommit={handleCommit}
                    onToggleVisible={ws.toggleVisible}
                    onRemove={ws.removeEquation}
                    onDuplicate={ws.duplicateEquation}
                    onFocusRow={ws.focusRow}
                    showKeyboard={false}
                  />
                );
              })}

              {focusedCurve && focusedCurve.params && Object.keys(focusedCurve.params).length > 0 && (
                <div className="workspace__params">
                  <div className="workspace__params-title">Parameters — drag to experiment</div>
                  {Object.keys(focusedCurve.params).map((name) => {
                    const range = paramRanges(name);
                    const value = ws.params[focusedCurve.id]?.[name] ?? focusedCurve.params[name];
                    return (
                      <Slider
                        key={name}
                        label={name}
                        value={value}
                        min={range.min}
                        max={range.max}
                        step={range.step}
                        onChange={(v) => ws.setParam(focusedCurve.id, name, v)}
                      />
                    );
                  })}
                </div>
              )}

              {ws.equations.every((e) => e.input.trim() === '') && (
                <div className="workspace__starter">
                  <p className="muted">Start exploring:</p>
                  <div className="workspace__starter-chips">
                    {['y = x²', 'sin(x)', 'y = 1/x', 'y = x³ - 3x', 'y = e^x'].map((ex) => (
                      <button key={ex} type="button" className="starter-chip" onClick={() => ws.addEquation(ex)}>
                        <PrettyMath tex={toLatex(ex)} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button type="button" className="workspace__add" onClick={() => ws.addEquation('')}>
                <span aria-hidden="true">＋</span> Add equation
              </button>
            </div>
          )}

          {tab === 'analysis' && (
            <div className="workspace__analysis-mobile">
              <AnalysisPanel
                analysis={focusedCurve?.analysis ?? null}
                derivativeLatex={focusedCurve?.analysis.derivativeLatex}
                onPlotDerivative={plotDerivative}
              />
              {focusedError && <div className="eq-row__error">{focusedError.message}</div>}
            </div>
          )}
        </aside>
      )}

      <main className="workspace__main" aria-label="Graph">
        <div className="workspace__toolbar">
          <div className="workspace__toolbar-left">
            {!ws.presentation && (
              <Button size="sm" onClick={() => ws.addEquation('')}>
                ＋ Add
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={ws.resetViewport} title="Reset view (double-click the graph)">
              ⌂ Reset
            </Button>
            <span className="workspace__toolbar-hint muted" aria-hidden="true">
              drag to pan · scroll to zoom
            </span>
          </div>
          <div className="workspace__toolbar-right">
            <Toggle
              checked={ws.gridVisible}
              onChange={ws.setGridVisible}
              label="Grid"
            />
            {!ws.presentation && (
              <Button size="sm" variant="ghost" onClick={() => ws.setPresentation(true)}>
                ▶ Present
              </Button>
            )}
            {!ws.presentation && (
              <Button size="sm" variant="ghost" onClick={() => setHandwritingOpen(true)} title="Draw an equation by hand">
                ✍ Draw
              </Button>
            )}
            {!ws.presentation && (
              <Button size="sm" variant="ghost" onClick={shareLink} title="Copy share link">
                🔗 Share
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setPaletteOpen(true)} title="Ctrl+K">
              ⌘
            </Button>
          </div>
        </div>

        <GraphCanvas
          viewport={ws.viewport}
          onViewportChange={ws.setViewport}
          curves={curvesForCanvas}
          markers={markers}
          intersections={pipeline.intersections}
          ariaLabel="Graph of your equations. Drag to pan, scroll or pinch to zoom."
        />

        {ws.presentation && (
          <div className="workspace__present-bar">
            <div className="workspace__present-input">
              <label className="visually-hidden" htmlFor="present-eq">Equation</label>
              <input
                id="present-eq"
                value={presentInput}
                onChange={(e) => setPresentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') presentSubmit();
                  if (e.key === 'Escape') ws.setPresentation(false);
                }}
                placeholder="Type an equation and press Enter…"
                autoFocus
              />
              <Button variant="primary" onClick={presentSubmit}>Graph it</Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => ws.setPresentation(false)}>
              Exit presentation (Esc)
            </Button>
          </div>
        )}
      </main>

      {!ws.presentation && (
        <aside className="workspace__analysis" aria-label="Analysis">
          <div className="workspace__analysis-title">Insights</div>
          <AnalysisPanel
            analysis={focusedCurve?.analysis ?? null}
            derivativeLatex={focusedCurve?.analysis.derivativeLatex}
            onPlotDerivative={plotDerivative}
          />
          {focusedError && <div className="eq-row__error">{focusedError.message}</div>}
          {!focusedCurve && (
            <div className="workspace__analysis-links">
              <Link to="/explore">Browse the example library →</Link>
            </div>
          )}
        </aside>
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />

      <HandwritingModal
        open={handwritingOpen}
        onClose={() => setHandwritingOpen(false)}
        onUseEquation={(expr) => ws.addEquation(expr)}
      />

      <p className="visually-hidden" aria-live="polite">
        {pipeline.validCurves.length} equation{pipeline.validCurves.length === 1 ? '' : 's'} plotted
      </p>
    </div>
  );
}

/** Very small helper: turn a known-good expression into display LaTeX. */
function toLatex(input: string): string {
  try {
    return parse(input).latex;
  } catch {
    return input;
  }
}