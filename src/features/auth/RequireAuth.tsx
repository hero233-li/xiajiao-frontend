import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { useNavigate } from '../cycle/navigation';
export function RequireAuth({ admin = false }: { admin?: boolean }) {
  const auth = useAuth(); const location = useLocation(); const navigate = useNavigate();
  if (auth.status === 'checking') return <Skeleton label="正在确认登录状态" block />;
  if (auth.status === 'anonymous') return <Navigate to={`/login?${new URLSearchParams({ redirect: location.pathname + location.search + location.hash })}`} replace />;
  if (admin && auth.user?.role !== 'ADMIN') return <EmptyState message="当前账号没有管理员权限。" actionLabel="返回备考总览" onAction={() => navigate('/zikao')} />;
  return <Outlet />;
}
