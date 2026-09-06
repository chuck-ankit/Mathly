import { ReactNode } from 'react';
import './ui.css';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="ui-empty">
      {icon && <div className="ui-empty__icon" aria-hidden="true">{icon}</div>}
      <h4 className="ui-empty__title">{title}</h4>
      {children && <div className="ui-empty__body">{children}</div>}
      {action && <div className="ui-empty__action">{action}</div>}
    </div>
  );
}