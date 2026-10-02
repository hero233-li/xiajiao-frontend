import ReactMarkdown, { type Components } from 'react-markdown';
import { isValidElement, useEffect, useMemo, useState, type ReactNode } from 'react';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { PluggableList } from 'unified';
import { Button } from '../../components/Button';
import { containsMath, rehypeManual } from './markdown-index';
import { CodeBlock } from './CodeBlock';
function codeText(value: ReactNode): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(codeText).join('');
  if (isValidElement<{ children?: ReactNode }>(value)) return codeText(value.props.children);
  return '';
}
const baseComponents: Components = {
  pre: ({ children, id }) => {
    const code = isValidElement<{ className?: string }>(children) ? children : undefined;
    const language = /language-([^\s]+)/.exec(code?.props.className ?? '')?.[1] ?? '';
    return <CodeBlock source={codeText(children)} language={language} id={id} />;
  },
  table: ({ children, node: _node, ...props }) => (
    <div className="manual-table" tabIndex={0} role="region" aria-label="手册表格，可横向滚动">
      <table {...props}>{children}</table>
    </div>
  ),
  img: ({ node: _node, ...props }) => <img {...props} alt={props.alt ?? ''} loading="lazy" />,
};
export function ManualMarkdown({
  markdown,
  chapterId,
  search,
  onAnchor,
}: {
  markdown: string;
  chapterId: string;
  search: string;
  onAnchor: (id: string) => void;
}) {
  const hasMath = useMemo(() => containsMath(markdown), [markdown]);
  const [mathPlugin, setMathPlugin] = useState<(typeof import('rehype-katex'))['default']>();
  const [mathError, setMathError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!hasMath) return;
    let active = true;
    setMathError(false);
    Promise.all([import('rehype-katex'), import('katex/dist/katex.min.css')])
      .then(([module]) => {
        if (active) setMathPlugin(() => module.default);
      })
      .catch(() => {
        if (active) setMathError(true);
      });
    return () => {
      active = false;
    };
  }, [hasMath, attempt]);
  const rehypePlugins: PluggableList = [
    ...(mathPlugin
      ? ([
          [
            mathPlugin,
            { trust: false, strict: 'warn', throwOnError: false, maxExpand: 1000, maxSize: 20 },
          ],
        ] as PluggableList)
      : []),
    [rehypeManual, { chapterId, search }],
  ];
  const components: Components = {
    ...baseComponents,
    a: ({ children, href }) => (
      <a
        href={href}
        target={href?.startsWith('#') ? undefined : '_blank'}
        rel="noopener noreferrer"
        onClick={(event) => {
          if (href?.startsWith('#')) {
            event.preventDefault();
            try {
              onAnchor(decodeURIComponent(href.slice(1)));
            } catch {
              /* 无效锚点不执行 */
            }
          }
        }}
      >
        {children}
      </a>
    ),
  };
  return (
    <>
      {hasMath && !mathPlugin && !mathError && <p role="status">正在加载公式排版</p>}
      {hasMath && mathError && (
        <div role="alert">
          <p>公式排版加载失败，正在显示公式原文。</p>
          <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>
            重试公式排版
          </Button>
        </div>
      )}
      <ReactMarkdown
        skipHtml
        remarkPlugins={mathPlugin ? [remarkGfm, remarkMath] : [remarkGfm]}
        rehypePlugins={rehypePlugins}
        components={components}
      >
        {markdown}
      </ReactMarkdown>
    </>
  );
}
