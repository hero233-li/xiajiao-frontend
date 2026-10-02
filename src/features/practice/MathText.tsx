import { lazy, Suspense } from 'react';
import { ErrorBoundary } from '../../components/ErrorBoundary';
const Formula = lazy(() => import('./Formula'));
/** 仅用于做题页：模块加载和表达式解析失败都保留完整原文。 */
export function MathText({ text }: { text: string }) {
  const parts = text.split(/(?<!\\)(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);
  return (
    <span className="math-text">
      {parts.map((part, index) => {
        if (!part.startsWith('$') || !part.endsWith('$') || part.length < 3)
          return <span key={index}>{part.replace(/\\\$/g, '$')}</span>;
        const block = part.startsWith('$$');
        return (
          <ErrorBoundary key={index} fallback={<span>{part}</span>}>
            <Suspense fallback={<span aria-busy="true">{part}</span>}>
              <Formula
                raw={part}
                expression={part.slice(block ? 2 : 1, block ? -2 : -1)}
                block={block}
              />
            </Suspense>
          </ErrorBoundary>
        );
      })}
    </span>
  );
}
