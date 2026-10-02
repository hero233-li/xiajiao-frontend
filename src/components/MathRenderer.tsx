import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
export default function MathRenderer({ expression, block = false }: { expression: string; block?: boolean }) {
  const html = useMemo(() => { try { return katex.renderToString(expression, { displayMode: block, throwOnError: true, trust: false, strict: 'error', maxExpand: 1000, maxSize: 20 }); } catch { return null; } }, [expression,block]);
  return html ? <span dangerouslySetInnerHTML={{ __html: html }} /> : <span role="note" className="status-error">公式暂时无法显示</span>;
}
