import { useId } from 'react';
import './ui.css';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  const id = useId();
  return (
    <label className={`ui-toggle ${disabled ? 'ui-toggle--disabled' : ''}`} htmlFor={id}>
      <span className="ui-toggle__label">{label}</span>
      <input
        id={id}
        type="checkbox"
        className="ui-toggle__input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="ui-toggle__track" aria-hidden="true">
        <span className="ui-toggle__thumb" />
      </span>
    </label>
  );
}