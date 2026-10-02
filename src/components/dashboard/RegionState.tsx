import { AlertCircle, LoaderCircle, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
export function RegionState({
  kind,
  message,
  retry,
  href = '/zikao/courses',
  action = '查看我的科目',
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
      className={`ov-state ov-state-${kind}`}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <Icon aria-hidden="true" className={kind === 'loading' ? 'ov-spin' : ''} />
      <p>{message}</p>
      {kind === 'error' ? (
        <button className="ov-button ov-secondary" onClick={retry}>
          重新加载
        </button>
      ) : kind === 'empty' ? (
        <Link className="ov-button ov-secondary" to={href}>
          {action}
        </Link>
      ) : null}
    </div>
  );
}
