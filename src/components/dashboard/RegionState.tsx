import { AlertCircle, LoaderCircle, Inbox } from 'lucide-react';
import { Link } from '../../features/cycle/navigation';
export function RegionState({
  kind,
  message,
  retry,
  href = '/study/courses',
  action = '查看学习书架',
}: {
  kind: 'loading' | 'empty' | 'error';
  message: string;
  retry?: () => void;
  href?: string;
  action?: string;
}) {
  const Icon = kind === 'loading' ? LoaderCircle : kind === 'error' ? AlertCircle : Inbox;
  return (
    <div
      className={`desk-state desk-state-${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <Icon size={24} aria-hidden="true" className={kind === 'loading' ? 'spin' : ''} />
      <div>
        <p>{message}</p>
        {kind === 'error' ? (
          <button className="button button-secondary" onClick={retry}>
            重新加载
          </button>
        ) : kind === 'empty' ? (
          <Link className="button button-secondary" to={href}>
            {action}
          </Link>
        ) : (
          <small>内容就绪后会自动显示。</small>
        )}
      </div>
    </div>
  );
}
