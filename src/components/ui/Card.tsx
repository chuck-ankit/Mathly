import { HTMLAttributes, ReactNode } from 'react';
import './ui.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
}

export function Card({ children, interactive, className, ...rest }: CardProps) {
  return (
    <div className={`ui-card ${interactive ? 'ui-card--interactive' : ''} ${className ?? ''}`} {...rest}>
      {children}
    </div>
  );
}

interface PanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}

export function Panel({ title, actions, children, flush, className, ...rest }: PanelProps) {
  return (
    <section className={`ui-panel ${className ?? ''}`} {...rest}>
      {(title || actions) && (
        <header className="ui-panel__head">
          <h3 className="ui-panel__title">{title}</h3>
          {actions && <div className="ui-panel__actions">{actions}</div>}
        </header>
      )}
      <div className={`ui-panel__body ${flush ? 'ui-panel__body--flush' : ''}`}>{children}</div>
    </section>
  );
}