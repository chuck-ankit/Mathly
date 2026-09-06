import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from './Modal';
import './ui.css';

export interface Command {
  id: string;
  label: string;
  desc?: string;
  icon?: string;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q) || (c.desc ?? '').toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const run = (c: Command): void => {
    onClose();
    c.action();
  };

  return (
    <Modal open={open} onClose={onClose} title="Commands" width={480}>
      <input
        ref={inputRef}
        className="cmd-input"
        placeholder="Search commands…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelected((s) => Math.min(s + 1, filtered.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelected((s) => Math.max(s - 1, 0));
          } else if (e.key === 'Enter' && filtered[selected]) {
            e.preventDefault();
            run(filtered[selected]);
          }
        }}
        aria-label="Search commands"
      />
      <div className="cmd-list" role="listbox">
        {filtered.length === 0 && <div className="ui-empty__body" style={{ padding: 'var(--s-4)' }}>No commands match “{query}”.</div>}
        {filtered.map((c, i) => (
          <button
            key={c.id}
            type="button"
            role="option"
            aria-selected={i === selected}
            className={`cmd-item ${i === selected ? 'is-selected' : ''}`}
            onMouseEnter={() => setSelected(i)}
            onClick={() => run(c)}
          >
            {c.icon && <span className="cmd-item__icon" aria-hidden="true">{c.icon}</span>}
            <span>{c.label}</span>
            {c.desc && <span className="cmd-item__desc">{c.desc}</span>}
          </button>
        ))}
      </div>
    </Modal>
  );
}