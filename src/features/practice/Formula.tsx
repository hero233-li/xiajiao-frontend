import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
export default function Formula({
  raw,
  expression,
  block,
}: {
  raw: string;
  expression: string;
  block: boolean;
}) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(expression, {
        displayMode: block,
        throwOnError: true,
        trust: false,
        strict: 'error',
        maxExpand: 1000,
        maxSize: 20,
      });
    } catch {
      return null;
    }
  }, [expression, block]);
  return html ? (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span title="公式渲染失败，已保留原文">{raw}</span>
  );
}
