import { useId } from 'react';
import './ui.css';
import { formatNumber } from '../../lib/math/format';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (v: number) => string;
  accent?: string;
}

export function Slider({ label, value, min, max, step = 0.1, onChange, format, accent }: SliderProps) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  const display = format ? format(value) : formatNumber(value);
  return (
    <div className="ui-slider">
      <div className="ui-slider__head">
        <label className="ui-slider__label" htmlFor={id}>
          {label}
        </label>
        <span className="ui-slider__value mono">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        className="ui-slider__input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={
          {
            '--fill': `${pct}%`,
            '--accent': accent ?? 'var(--accent)',
          } as React.CSSProperties
        }
        aria-label={label}
      />
    </div>
  );
}