import { useEffect, useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '../../components/Button';
export function CodeBlock({
  source,
  language,
  id,
}: {
  source: string;
  language: string;
  id?: string;
}) {
  const [tokens, setTokens] = useState<ReactNode>(source);
  const [highlightState, setHighlightState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [copyState, setCopyState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  useEffect(() => {
    let active = true;
    setHighlightState(language ? 'loading' : 'ready');
    if (language)
      import('./highlight')
        .then((module) => module.highlightCode(language, source))
        .then((result) => {
          if (active) {
            setTokens(result);
            setHighlightState('ready');
          }
        })
        .catch(() => {
          if (active) setHighlightState('error');
        });
    else setTokens(source);
    return () => {
      active = false;
    };
  }, [language, source, retry]);
  async function copy() {
    setCopyState('loading');
    try {
      await navigator.clipboard.writeText(source);
      setCopyState('success');
    } catch {
      setCopyState('error');
    }
  }
  return (
    <figure
      id={id}
      tabIndex={-1}
      className="manual-code card"
      aria-busy={highlightState === 'loading' || undefined}
      data-state={highlightState === 'error' || copyState === 'error' ? 'error' : 'ready'}
    >
      <figcaption>
        <span>{language ? `代码 · ${language}` : '代码'}</span>
        <Button
          variant="secondary"
          loading={copyState === 'loading'}
          loadingLabel="正在复制"
          error={copyState === 'error' ? '复制失败，请重试或手动选择代码复制。' : undefined}
          onClick={() => void copy()}
        >
          {copyState === 'success' ? (
            <Check size={18} aria-hidden="true" />
          ) : (
            <Copy size={18} aria-hidden="true" />
          )}
          {copyState === 'success' ? '已复制' : '复制'}
        </Button>
      </figcaption>
      {highlightState === 'loading' && <p role="status">正在加载代码高亮</p>}
      {highlightState === 'error' && (
        <div role="alert">
          <p>代码高亮加载失败，仍可阅读和复制原文。</p>
          <Button variant="secondary" onClick={() => setRetry((value) => value + 1)}>
            重试代码高亮
          </Button>
        </div>
      )}
      <pre tabIndex={0} aria-label="代码内容，可横向滚动">
        <code>{tokens}</code>
      </pre>
      {copyState === 'success' && <span role="status">代码已复制到剪贴板</span>}
    </figure>
  );
}
