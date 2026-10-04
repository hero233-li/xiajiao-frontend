import { Button } from '../../components/Button';
import './schedule.css';

export function State({
  loading,
  error,
  retry,
  empty,
  action,
}: {
  loading?: boolean;
  error?: Error | null;
  retry?: () => void;
  empty?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="card schedule-state" aria-busy={loading || undefined}>
      {loading ? (
        <p role="status">正在加载安排…</p>
      ) : error ? (
        <>
          <p role="alert">{error.message}</p>
          <Button onClick={retry}>重新加载</Button>
        </>
      ) : (
        <>
          <p>{empty}</p>
          {action}
        </>
      )}
    </section>
  );
}
