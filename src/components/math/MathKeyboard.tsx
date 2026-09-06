import { memo } from 'react';

interface MathKeyboardProps {
  open: boolean;
  onInsert: (text: string, caretOffset?: number) => void;
  /** Extra keys appended (used by the 3D surface keyboard). */
  extraKeys?: Key[];
}

export interface Key {
  label: string;
  insert: string;
  /** Where to put the caret after inserting (offset from insert start). */
  caret?: number;
  wide?: boolean;
}

const KEYS: Key[] = [
  { label: 'x²', insert: 'x²' },
  { label: 'x³', insert: 'x³' },
  { label: 'xⁿ', insert: '^', caret: 1 },
  { label: 'eˣ', insert: 'e^()', caret: 3 },
  { label: '⁻', insert: '⁻' },
  { label: '√', insert: 'sqrt()', caret: 5 },
  { label: '|x|', insert: '|x|' },
  { label: 'π', insert: 'π' },
  { label: 'θ', insert: 'θ' },
  { label: 'sin', insert: 'sin()', caret: 4 },
  { label: 'cos', insert: 'cos()', caret: 4 },
  { label: 'tan', insert: 'tan()', caret: 4 },
  { label: 'ln', insert: 'ln()', caret: 3 },
  { label: 'log', insert: 'log()', caret: 4 },
  { label: 'abs', insert: 'abs()', caret: 4 },
  { label: '7', insert: '7' },
  { label: '8', insert: '8' },
  { label: '9', insert: '9' },
  { label: '÷', insert: '/' },
  { label: '(', insert: '(' },
  { label: ')', insert: ')' },
  { label: '4', insert: '4' },
  { label: '5', insert: '5' },
  { label: '6', insert: '6' },
  { label: '×', insert: '*' },
  { label: '^', insert: '^' },
  { label: '∞', insert: '∞' },
  { label: '1', insert: '1' },
  { label: '2', insert: '2' },
  { label: '3', insert: '3' },
  { label: '−', insert: '−' },
  { label: '=', insert: '=' },
  { label: 'e', insert: 'e' },
  { label: '0', insert: '0' },
  { label: '.', insert: '.' },
  { label: '⌫', insert: '\b', wide: true },
];

export const MathKeyboard = memo(function MathKeyboard({ open, onInsert, extraKeys }: MathKeyboardProps) {
  const keys = extraKeys ? [...extraKeys, ...KEYS] : KEYS;
  return (
    <div className={`math-kbd ${open ? 'math-kbd--open' : ''}`} aria-hidden={!open}>
      {open && (
        <>
          <p className="math-kbd__hint">
            Tap <strong>xⁿ</strong> or <strong>eˣ</strong> for exponents — powers like x⁻¹ work too.
          </p>
          <div className="math-kbd__grid">
            {keys.map((k, i) => (
              <button
                key={`${k.label}-${i}`}
                type="button"
                className={`math-kbd__key ${k.wide ? 'math-kbd__key--wide' : ''}`}
                onClick={() => onInsert(k.insert, k.caret)}
                tabIndex={-1}
              >
                {k.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
});
