import { isValidElement } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import { MathText } from '../../components/MathText';

/** Markdown 的公式节点仍统一交给公共 MathText，不启用原始 HTML。 */
export function KnowledgeMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      skipHtml
      remarkPlugins={[remarkMath, remarkGfm]}
      components={{
        code: ({ children, className }) => {
          if (className?.split(' ').includes('language-math')) {
            const delimiter = className.includes('math-display') ? '$$' : '$';
            return <MathText text={`${delimiter}${String(children).trim()}${delimiter}`} />;
          }
          return <code className={className}>{children}</code>;
        },
        pre: ({ children }) =>
          isValidElement<{ className?: string }>(children) &&
          children.props.className?.includes('language-math') ? (
            <div className="kh-markdown-math">{children}</div>
          ) : (
            <pre tabIndex={0} role="region" aria-label="代码，可横向滚动">
              {children}
            </pre>
          ),
        a: ({ children, href }) => (
          <a
            href={href}
            target={href?.startsWith('https:') || href?.startsWith('http:') ? '_blank' : undefined}
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        img: ({ src, alt }) => <img src={src} alt={alt || '知识模块配图'} loading="lazy" />,
        h1: ({ children }) => <h4>{children}</h4>,
        h2: ({ children }) => <h4>{children}</h4>,
        h3: ({ children }) => <h5>{children}</h5>,
        h4: ({ children }) => <h5>{children}</h5>,
        h5: ({ children }) => <h6>{children}</h6>,
        table: ({ children }) => (
          <div
            className="kh-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="知识表格，可横向滚动"
          >
            <table>{children}</table>
          </div>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
