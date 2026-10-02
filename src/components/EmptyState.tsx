import { Inbox } from 'lucide-react';
import { Button } from './Button';
export function EmptyState({ message, actionLabel, onAction }: { message: string; actionLabel: string; onAction: () => void }) {
  return <div className="state"><Inbox className="state-icon status-info" aria-hidden="true" size={32} /><p>{message}</p><Button onClick={onAction}>{actionLabel}</Button></div>;
}
