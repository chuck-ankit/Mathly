import { useMemo } from 'react';
import katex from 'katex';

interface PrettyMathProps {
  tex: string;
  display?: boolean;
  className?: string;
}

/** Render a LaTeX string with KaTeX; falls back to monospace text. */
export function PrettyMath({ tex, display = false, className }: PrettyMathProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        throwOnError: false,
        displayMode: display,
        strict: false,
      });
    } catch {
      return null;
    }
  }, [tex, display]);

  if (html === null) {
    return <span className={`mono ${className ?? ''}`}>{tex}</span>;
  }
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}