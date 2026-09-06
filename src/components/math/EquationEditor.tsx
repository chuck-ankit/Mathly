import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ParseIssue } from '../../lib/math/types';
import { MathKeyboard, Key } from './MathKeyboard';
import {
  adjustCaretForStrippedNewlines,
  highlight,
  TokenSpan,
} from './editorUtils';
import './editor.css';

interface EquationEditorProps {
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  error?: ParseIssue | null;
  placeholder?: string;
  autoFocus?: boolean;
  large?: boolean;
  ariaLabel?: string;
  showKeyboard?: boolean;
  onKeyboardToggle?: (open: boolean) => void;
  /** Extra keys appended to the math keyboard (e.g. y² for 3D input). */
  extraKeys?: Key[];
  id?: string;
}

interface Suggestion {
  insert: string;
  label: string;
  kind: 'function' | 'constant' | 'symbol';
}

const SUGGESTIONS: Suggestion[] = [
  { insert: 'sin(', label: 'sin', kind: 'function' },
  { insert: 'cos(', label: 'cos', kind: 'function' },
  { insert: 'tan(', label: 'tan', kind: 'function' },
  { insert: 'asin(', label: 'asin', kind: 'function' },
  { insert: 'acos(', label: 'acos', kind: 'function' },
  { insert: 'atan(', label: 'atan', kind: 'function' },
  { insert: 'sqrt(', label: 'sqrt', kind: 'function' },
  { insert: 'cbrt(', label: 'cbrt', kind: 'function' },
  { insert: 'abs(', label: 'abs', kind: 'function' },
  { insert: 'ln(', label: 'ln', kind: 'function' },
  { insert: 'log(', label: 'log', kind: 'function' },
  { insert: 'exp(', label: 'exp', kind: 'function' },
  { insert: 'sinh(', label: 'sinh', kind: 'function' },
  { insert: 'cosh(', label: 'cosh', kind: 'function' },
  { insert: 'tanh(', label: 'tanh', kind: 'function' },
  { insert: 'floor(', label: 'floor', kind: 'function' },
  { insert: 'ceil(', label: 'ceil', kind: 'function' },
  { insert: 'min(', label: 'min', kind: 'function' },
  { insert: 'max(', label: 'max', kind: 'function' },
  { insert: 'π', label: 'π', kind: 'constant' },
  { insert: 'τ', label: 'τ', kind: 'constant' },
  { insert: 'e', label: 'e', kind: 'constant' },
  { insert: 'θ', label: 'θ', kind: 'symbol' },
  { insert: '∞', label: '∞', kind: 'symbol' },
];

const fnName = (s: Suggestion): string => s.label;

function renderToken(s: TokenSpan, key: string) {
  return (
    <span key={key} className={s.className}>
      {s.text}
    </span>
  );
}

export const EquationEditor = memo(function EquationEditor({
  value,
  onChange,
  onCommit,
  error,
  placeholder = 'Type an equation…',
  autoFocus = false,
  large = false,
  ariaLabel = 'Equation input',
  showKeyboard = false,
  onKeyboardToggle,
  extraKeys,
  id,
}: EquationEditorProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pendingCaretRef = useRef<number | null>(null);
  const selectGuardRef = useRef(false);

  // Restore the caret after keyboard inserts / suggestion / backspace / a
  // paste whose newlines were stripped, once React has committed the new
  // controlled value to the textarea.
  useEffect(() => {
    const pending = pendingCaretRef.current;
    if (pending === null) return;
    pendingCaretRef.current = null;
    const ta = taRef.current;
    if (ta) {
      selectGuardRef.current = true;
      ta.focus();
      const clamped = Math.min(pending, ta.value.length);
      ta.setSelectionRange(clamped, clamped);
      const raf = requestAnimationFrame(() => {
        selectGuardRef.current = false;
      });
      return () => cancelAnimationFrame(raf);
    }
  });
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(showKeyboard);

  const spans = useMemo(() => highlight(value, error), [value, error]);

  const syncScroll = useCallback(() => {
    const ta = taRef.current;
    const bg = bgRef.current;
    if (ta && bg) {
      bg.scrollTop = ta.scrollTop;
      bg.scrollLeft = ta.scrollLeft;
    }
  }, []);

  const updateSuggestions = useCallback((v: string, caret: number) => {
    const before = v.slice(0, caret);
    const match = before.match(/([a-zA-Z]{1,6})$/);
    if (!match) {
      setSuggestions(null);
      return;
    }
    const prefix = match[1].toLowerCase();
    const candidates = SUGGESTIONS.filter((s) =>
      fnName(s).toLowerCase().startsWith(prefix)
    );
    if (candidates.length === 0) {
      setSuggestions(null);
      return;
    }
    setSuggestions(candidates.slice(0, 7));
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const raw = e.target.value;
      const v = raw.replace(/\n/g, '');
      onChange(v);
      const rawCaret = e.target.selectionStart ?? v.length;
      let caret = rawCaret;
      if (raw.includes('\n')) {
        caret = adjustCaretForStrippedNewlines(raw, rawCaret);
        pendingCaretRef.current = Math.min(caret, v.length);
      }
      updateSuggestions(v, Math.min(caret, v.length));
      requestAnimationFrame(syncScroll);
    },
    [onChange, updateSuggestions, syncScroll]
  );

  const handleSelect = useCallback(
    (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      // Ignore the programmatic caret moves done during caret restore.
      if (selectGuardRef.current) return;
      const ta = e.currentTarget;
      const start = ta.selectionStart ?? 0;
      const end = ta.selectionEnd ?? 0;
      // Only offer autocomplete for a collapsed caret — never during a
      // drag-selection (would pop the suggestions box over the text).
      if (start === end) {
        updateSuggestions(ta.value, start);
      } else {
        setSuggestions(null);
      }
    },
    [updateSuggestions]
  );

  // Suppress the popup as soon as the pointer goes down inside the field:
  // pressing the mouse collapses a selection even before a drag begins, which
  // onSelect would otherwise treat as a normal caret (flashing the box over
  // the text being selected). Re-open it on release only when the resulting
  // selection is genuinely collapsed (a click, not a drag).
  const handlePointerDown = useCallback(() => {
    setSuggestions(null);
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      const start = ta.selectionStart ?? 0;
      const end = ta.selectionEnd ?? 0;
      if (start === end) {
        updateSuggestions(ta.value, start);
      }
    },
    [updateSuggestions]
  );

  const insertAtCursor = useCallback(
    (text: string, caretOffset?: number) => {
      const ta = taRef.current;
      const start = ta?.selectionStart ?? value.length;
      const end = ta?.selectionEnd ?? value.length;

      if (text === '\b') {
        // Backspace: delete the selection, or the character before the caret.
        const hasSelection = start !== end;
        const next = hasSelection
          ? value.slice(0, start) + value.slice(end)
          : value.slice(0, Math.max(0, start - 1)) + value.slice(end);
        const caret = hasSelection ? start : Math.max(0, start - 1);
        onChange(next);
        pendingCaretRef.current = caret;
        updateSuggestions(next, caret);
        requestAnimationFrame(syncScroll);
        return;
      }

      const next = value.slice(0, start) + text + value.slice(end);
      onChange(next);
      // Optional caret offset (e.g. inside inserted parens); default = after insert.
      const caret = start + (caretOffset !== undefined ? caretOffset : text.length);
      // Apply after React commits the controlled value (a bare rAF can run
      // before React's DOM update, which then resets the caret to the end).
      pendingCaretRef.current = caret;
      requestAnimationFrame(() => {
        ta?.focus();
        syncScroll();
        updateSuggestions(next, caret);
      });
    },
    [value, onChange, syncScroll, updateSuggestions]
  );

  const applySuggestion = useCallback(
    (s: Suggestion) => {
      const ta = taRef.current;
      const caret = ta?.selectionStart ?? value.length;
      const before = value.slice(0, caret);
      const match = before.match(/([a-zA-Z]{1,6})$/);
      const replaceStart = match ? caret - match[1].length : caret;
      const next = value.slice(0, replaceStart) + s.insert + value.slice(caret);
      onChange(next);
      pendingCaretRef.current = replaceStart + s.insert.length;
      setSuggestions(null);
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (suggestions && suggestions.length > 0) {
          applySuggestion(suggestions[0]);
        } else {
          onCommit?.(value);
        }
      } else if (e.key === 'Tab' && suggestions && suggestions.length > 0) {
        e.preventDefault();
        applySuggestion(suggestions[0]);
      } else if (e.key === 'Escape') {
        setSuggestions(null);
      }
    },
    [suggestions, applySuggestion, onCommit, value]
  );

  const toggleKeyboard = useCallback(() => {
    const next = !keyboardOpen;
    setKeyboardOpen(next);
    onKeyboardToggle?.(next);
  }, [keyboardOpen, onKeyboardToggle]);

  useEffect(() => {
    setKeyboardOpen(showKeyboard);
  }, [showKeyboard]);

  return (
    <div className={`eq-editor ${large ? 'eq-editor--large' : ''}`}>
      <div className="eq-editor__field" onClick={() => taRef.current?.focus()}>
        <div className="eq-editor__stage">
          <div ref={bgRef} className="eq-editor__bg" aria-hidden="true">
            {value.length === 0 ? (
              <span className="eq-editor__placeholder">{placeholder}</span>
            ) : (
              spans.map((s, i) => renderToken(s, `${i}-${s.start}`))
            )}
            <span className="eq-editor__caret-fill" />
          </div>
          <textarea
            ref={taRef}
            id={id}
            className="eq-editor__ta"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onScroll={syncScroll}
            onSelect={handleSelect}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            placeholder=""
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            aria-label={ariaLabel}
            autoFocus={autoFocus}
            rows={1}
          />
        </div>
        {suggestions && suggestions.length > 0 && (
          <div className="eq-editor__popup" ref={popupRef} role="listbox" aria-label="Suggestions">
            {suggestions.map((s) => (
              <button
                key={s.label}
                type="button"
                role="option"
                aria-selected={false}
                className="eq-editor__sugg"
                onClick={() => applySuggestion(s)}
                onMouseDown={(e) => e.preventDefault()}
              >
                <span className="eq-editor__sugg-label">{s.label}</span>
                {s.kind === 'function' && <span className="eq-editor__sugg-kind">function</span>}
                {s.kind === 'constant' && <span className="eq-editor__sugg-kind">constant</span>}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className={`eq-editor__kbd-btn tap-target ${keyboardOpen ? 'is-active' : ''}`}
          onClick={toggleKeyboard}
          aria-label={keyboardOpen ? 'Hide math keyboard' : 'Show math keyboard'}
          aria-pressed={keyboardOpen}
          title="Math keyboard"
        >
          <span aria-hidden="true">Σ</span>
        </button>
      </div>
      <MathKeyboard open={keyboardOpen} onInsert={insertAtCursor} extraKeys={extraKeys} />
    </div>
  );
});