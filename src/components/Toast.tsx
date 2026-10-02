import { useSyncExternalStore } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { notifications } from '../utils/notifications';
import { Button } from './Button';
export function Toast() {
  const notices = useSyncExternalStore(notifications.subscribe, notifications.getSnapshot);
  return <aside className="toast-region" aria-label="请求提示">{notices.map(item => <div className="toast" role="alert" key={item.id}><AlertCircle size={20} aria-hidden="true" /><p>{item.message}</p><Button variant="ghost" aria-label="关闭提示" onClick={() => notifications.dismiss(item.id)}><X size={20} aria-hidden="true" /></Button></div>)}</aside>;
}
