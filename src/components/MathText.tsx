import { lazy, Suspense, type ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
const MathRenderer = lazy(() => import('./MathRenderer'));
export function MathText({ text }: { text: string }) {
  const parts: ReactNode[] = []; let plain = ''; let cursor = 0;
  const flush = () => { if (plain) { parts.push(plain); plain = ''; } };
  while (cursor < text.length) {
    if (text[cursor] === '\\' && text[cursor + 1] === '$') { plain += '$'; cursor += 2; continue; }
    if (text[cursor] !== '$') { plain += text[cursor++]; continue; }
    const block = text[cursor + 1] === '$'; const delimiter = block ? '$$' : '$'; const start = cursor + delimiter.length;
    let end = start;
    while (end < text.length) { if (text[end] === '\\') { end += 2; continue; } if (text.startsWith(delimiter,end)) break; end++; }
    if (end >= text.length || end === start) { plain += delimiter; cursor = start; continue; }
    flush(); const expression = text.slice(start,end);
    parts.push(<ErrorBoundary key={cursor} fallback={<span role="note">公式暂时无法加载</span>}><Suspense fallback={<span role="status">正在加载公式</span>}><MathRenderer expression={expression} block={block} /></Suspense></ErrorBoundary>);
    cursor = end + delimiter.length;
  }
  flush(); return <span className="math-text">{parts}</span>;
}
