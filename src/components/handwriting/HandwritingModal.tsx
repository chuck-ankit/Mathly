import { useCallback, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { HandwritingCanvas } from './HandwritingCanvas';
import { RECOGNIZERS } from '../../lib/handwriting/recognizer';
import { RecognitionResult, Stroke } from '../../lib/handwriting/types';
import './handwriting.css';

interface HandwritingModalProps {
  open: boolean;
  onClose: () => void;
  onUseEquation: (expression: string) => void;
}

export function HandwritingModal({ open, onClose, onUseEquation }: HandwritingModalProps) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  const historyRef = useRef<Stroke[][]>([]);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [recognizing, setRecognizing] = useState(false);

  const recognizer = RECOGNIZERS[0];

  const reset = useCallback(() => {
    setStrokes([]);
    historyRef.current = [];
    setResult(null);
  }, []);

  const handleStroke = useCallback((stroke: Stroke) => {
    historyRef.current = [...historyRef.current.slice(-20), strokesRef.current];
    setStrokes((s) => {
      strokesRef.current = [...s, stroke];
      return strokesRef.current;
    });
    setResult(null);
  }, []);

  const undo = useCallback(() => {
    const h = historyRef.current;
    const prev = h[h.length - 1];
    if (prev) {
      setStrokes(prev);
      strokesRef.current = prev;
      historyRef.current = h.slice(0, -1);
    } else {
      setStrokes([]);
      strokesRef.current = [];
    }
    setResult(null);
  }, []);

  const clear = useCallback(() => {
    reset();
  }, [reset]);

  const recognize = useCallback(async () => {
    setRecognizing(true);
    const res = await recognizer.recognize(strokes);
    setResult(res);
    setRecognizing(false);
  }, [recognizer, strokes]);

  const useIt = useCallback(() => {
    if (!result || !result.expression) return;
    onUseEquation(result.expression);
    reset();
    onClose();
  }, [result, onUseEquation, reset, onClose]);

  const hasStrokes = strokes.length > 0;

  return (
    <Modal open={open} onClose={onClose} title="Draw your equation" width={560}>
      <div className="hand-modal">
        <p className="hand-modal__intro">
          Write an expression with your mouse, finger, or stylus. Try{' '}
          <span className="mono">x² + 1</span>, <span className="mono">y = 2x</span> — numbers, x, y, z,{' '}
          <span className="mono">+ − = / √ π ÷ ( )</span>. Draw each symbol with a little space between;
          draw <span className="mono">x</span> as two crossing strokes, and write powers small and up high.
        </p>

        <HandwritingCanvas strokes={strokes} onStroke={handleStroke} height={240} />

        <div className="hand-modal__tools">
          <Button size="sm" variant="ghost" onClick={undo} disabled={!hasStrokes}>
            ↩ Undo
          </Button>
          <Button size="sm" variant="ghost" onClick={clear} disabled={!hasStrokes}>
            ✕ Clear
          </Button>
          <div className="hand-modal__tools-right">
            <Button size="sm" variant="secondary" onClick={recognize} disabled={!hasStrokes || recognizing}>
              {recognizing ? 'Recognizing…' : 'Recognize'}
            </Button>
          </div>
        </div>

        {result && (
          <div className={`hand-modal__result ${result.confidence > 0 ? 'is-ok' : 'is-low'}`} role="status">
            <div className="hand-modal__result-main">
              {result.expression ? (
                <>
                  <span className="muted">Recognized:</span>{' '}
                  <span className="hand-modal__expr mono">{result.expression}</span>
                </>
              ) : (
                <span className="hand-modal__expr">—</span>
              )}
            </div>
            <p className="hand-modal__notes">{result.notes}</p>
            {result.expression && (
              <Button variant="primary" size="sm" onClick={useIt}>
                Use this equation →
              </Button>
            )}
          </div>
        )}

        <p className="hand-modal__limitation">
          <strong>Heads up:</strong> {recognizer.description}
        </p>
      </div>
    </Modal>
  );
}