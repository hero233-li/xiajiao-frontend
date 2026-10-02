import { useMatches } from 'react-router-dom';
import { useNavigate } from '../features/cycle/navigation';
import { EmptyState } from '../components/EmptyState';
import { Breadcrumb } from '../components/Breadcrumb';
export function Component() {
  const navigate = useNavigate(); const matches = useMatches();
  const handle = matches.at(-1)?.handle as { title?: string } | undefined;
  return <><Breadcrumb items={[{ label: '备考总览', to: '/zikao' },{ label: handle?.title || '功能准备中' }]} /><h1>{handle?.title || '功能准备中'}</h1><EmptyState message="该功能准备中。" actionLabel="前往备考总览" onAction={() => navigate('/zikao')} /></>;
}
