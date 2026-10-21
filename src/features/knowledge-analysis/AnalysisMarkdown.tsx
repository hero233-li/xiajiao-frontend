import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { MathText } from '../../components/MathText';
import { safeAnalysisImage, safeAnalysisUrl } from './safeUrl';

export function AnalysisMarkdown({ text }: { text: string }) {
  return (
    <div className="ka-markdown">
      <ReactMarkdown
        skipHtml
        remarkPlugins={[remarkGfm, remarkMath]}
        components={{
          code: ({ children, className }) =>
            className?.includes('language-math') ? (
              <MathText
                text={`${className.includes('math-display') ? '$$' : '$'}${String(children).trim()}${className.includes('math-display') ? '$$' : '$'}`}
              />
            ) : (
              <code className={className}>{children}</code>
            ),
          a: ({ children, href }) => {
            const url = safeAnalysisUrl(href);
            return url ? (
              <a
                href={url}
                target={url.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            );
          },
          img: ({ src, alt }) => {
            const url = safeAnalysisImage(src);
            return url ? (
              <img src={url} alt={alt || '知识说明图'} loading="lazy" />
            ) : (
              <span>{alt}</span>
            );
          },
          h1: ({ children }) => <h4>{children}</h4>,
          h2: ({ children }) => <h4>{children}</h4>,
          h3: ({ children }) => <h5>{children}</h5>,
          table: ({ children }) => (
            <div className="ka-table-scroll">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
