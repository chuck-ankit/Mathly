import { useEffect, useRef } from 'react';
import { EquationEditor } from '../math/EquationEditor';
import { ParseIssue } from '../../lib/math/types';
import './workspace.css';

interface EquationRowProps {
  id: string;
  input: string;
  color: string;
  visible: boolean;
  focused: boolean;
  error: ParseIssue | null;
  label: string;
  onInputChange: (id: string, value: string) => void;
  onCommit: (id: string, value: string) => void;
  onToggleVisible: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onFocusRow: (id: string) => void;
  autoFocus?: boolean;
  showKeyboard: boolean;
}

export function EquationRow({
  id,
  input,
  color,
  visible,
  focused,
  error,
  label,
  onInputChange,
  onCommit,
  onToggleVisible,
  onRemove,
  onDuplicate,
  onFocusRow,
  autoFocus,
  showKeyboard,
}: EquationRowProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus) {
      const ta = ref.current?.querySelector('textarea');
      ta?.focus();
    }
  }, [autoFocus]);

  return (
    <div
      className={`eq-row ${focused ? 'is-focused' : ''} ${!visible ? 'is-hidden' : ''}`}
      ref={ref}
      onClick={() => onFocusRow(id)}
    >
      <div className="eq-row__main">
        <span
          className="eq-row__dot"
          style={{ background: color, opacity: visible ? 1 : 0.35 }}
          aria-hidden="true"
        />
        <EquationEditor
          value={input}
          onChange={(v) => onInputChange(id, v)}
          onCommit={(v) => onCommit(id, v)}
          error={error}
          placeholder={`${label} = …`}
          ariaLabel={`Equation ${label}`}
          autoFocus={autoFocus}
          showKeyboard={showKeyboard}
        />
        <div className="eq-row__actions">
          <button
            type="button"
            className="eq-row__action"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisible(id);
            }}
            aria-label={visible ? `Hide ${label}` : `Show ${label}`}
            title={visible ? 'Hide' : 'Show'}
          >
            {visible ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z" />
                <circle cx="12" cy="12" r="2.6" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 4l16 16" />
                <path d="M10.5 6.2A11 11 0 0 1 12 6c6.5 0 10 6 10 6a18 18 0 0 1-2.6 3.4M6.6 6.6A17 17 0 0 0 2 12s3.5 6.5 10 6.5c1.9 0 3.5-.5 4.9-1.2" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="eq-row__action"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(id);
            }}
            aria-label={`Duplicate ${label}`}
            title="Duplicate"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="8" y="8" width="12" height="12" rx="2" />
              <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
            </svg>
          </button>
          <button
            type="button"
            className="eq-row__action eq-row__action--danger"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(id);
            }}
            aria-label={`Delete ${label}`}
            title="Delete"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
            </svg>
          </button>
        </div>
      </div>
      {error && (
        <div className="eq-row__error" role="alert">
          {error.message}
          {error.hint && <span className="eq-row__hint"> {error.hint}.</span>}
        </div>
      )}
    </div>
  );
}