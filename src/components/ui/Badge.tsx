import { ReactNode } from 'react';
import './ui.css';

interface BadgeProps {
  children: ReactNode;
  tone?: 'default' | 'accent' | 'gold' | 'good' | 'bad';
  className?: string;
}

export function Badge({ children, tone = 'default', className }: BadgeProps) {
  return <span className={`ui-badge ui-badge--${tone} ${className ?? ''}`}>{children}</span>;
}