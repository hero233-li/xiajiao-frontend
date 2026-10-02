export function Skeleton({ label = '正在加载', block = false }: { label?: string; block?: boolean }) {
  return <div role="status" aria-live="polite" aria-label={label} className="stack"><span>{label}</span><div aria-hidden="true" className={`skeleton ${block ? 'skeleton-block' : ''}`} /></div>;
}
