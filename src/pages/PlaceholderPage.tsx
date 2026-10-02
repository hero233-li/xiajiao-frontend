import { useMatches, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { Breadcrumb } from '../components/Breadcrumb';
export function Component() {
  const navigate = useNavigate(); const matches = useMatches();
  const handle = matches.at(-1)?.handle as { title?: string } | undefined;
  return <><Breadcrumb items={[{ label: '健康检查', to: '/health' },{ label: handle?.title || '工程占位' }]} /><h1>{handle?.title || '工程占位'}</h1><EmptyState message="此路由已就绪，业务内容尚未实现。" actionLabel="前往健康检查" onAction={() => navigate('/health')} /></>;
}
