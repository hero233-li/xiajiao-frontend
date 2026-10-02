import { lazy, Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
const MathRenderer = lazy(() => import('./MathRenderer'));
export function MathText({ text }: { text: string }) {
  const parts = text.split(/(?<!\\)(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g);
  return <span className="math-text">{parts.map((raw, index) => {
    const formula = index % 2 === 1;
    if (!formula) return <span key={index}>{raw.replace(/\\\$/g, '$')}</span>;
    const block = raw.startsWith('$$') || raw.startsWith('\\[');
    const count = raw.startsWith('$') && !block ? 1 : 2;
    return <ErrorBoundary key={index} fallback={<span>{raw}</span>}><Suspense fallback={<span aria-busy="true">{raw}</span>}><MathRenderer raw={raw} expression={raw.slice(count, -count)} block={block} /></Suspense></ErrorBoundary>;
  })}</span>;
}
