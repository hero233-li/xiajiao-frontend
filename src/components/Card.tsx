import type { HTMLAttributes, PropsWithChildren } from 'react';
import { AlertCircle, LoaderCircle, LockKeyhole } from 'lucide-react';
type CardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>> & { state?: 'default' | 'disabled' | 'loading' | 'error'; message?: string };
export function Card({ children, state = 'default', message, className = '', ...props }: CardProps) {
  const inactive = state === 'disabled' || state === 'loading';
  return <div {...props} className={`card ${className}`} data-state={state} aria-disabled={state === 'disabled' || undefined} aria-busy={state === 'loading' || undefined}>
    {state !== 'default' && <p className={state === 'error' ? 'status-error' : 'secondary'} role={state === 'error' ? 'alert' : 'status'}>{state === 'loading' ? <LoaderCircle aria-hidden="true" size={20} className="spin" /> : state === 'disabled' ? <LockKeyhole aria-hidden="true" size={20} /> : <AlertCircle aria-hidden="true" size={20} />} {message || (state === 'loading' ? '正在加载' : state === 'disabled' ? '内容暂不可用' : '加载失败')}</p>}
    <div inert={inactive ? '' : undefined}>{children}</div>
  </div>;
}
