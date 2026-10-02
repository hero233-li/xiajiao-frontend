import { AlertCircle } from 'lucide-react';
import { Button } from './Button';
export function ErrorState({ message = '暂时无法加载，请稍后重试', onRetry, loading = false }: { message?: string; onRetry: () => void; loading?: boolean }) {
  return <div className="state" role="alert"><AlertCircle className="state-icon status-error" aria-hidden="true" size={32} /><h2>加载遇到问题</h2><p>{message}</p><Button variant="secondary" onClick={onRetry} loading={loading} loadingLabel="正在重新加载">重新加载</Button></div>;
}
