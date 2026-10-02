import { isValidElement } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import { MathText } from '../../components/MathText';

/** Markdown 的公式节点仍统一交给公共 MathText，不启用原始 HTML。 */
export function KnowledgeMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      skipHtml
      remarkPlugins={[remarkMath]}
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
            <pre>{children}</pre>
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
        h1: ({ children }) => <h3>{children}</h3>,
        h2: ({ children }) => <h3>{children}</h3>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
