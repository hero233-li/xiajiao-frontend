import { useQuery } from '@tanstack/react-query';
import { CheckCircle, ShieldCheck } from 'lucide-react';
import { getHealth } from '../../api/generated/dashboard/dashboard';
import { Card } from '../../components/Card';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { errorMessage } from '../../api/errors';
import { isMockMode } from '../../utils/environment';
import { formatShanghaiDate } from '../../utils/date';
export function HealthCheck() {
  const query = useQuery({ queryKey: ['health'], queryFn: ({ signal }) => getHealth({ signal }) });
  const retry = () => { void query.refetch(); };
  const simulate = async (failure: boolean) => { const mock = await import('../../mocks/handlers'); if (failure) mock.revokeMockRefresh(); else mock.expireMockAccess(); await query.refetch(); };
  return <Card state={query.isPending ? 'loading' : query.isError ? 'error' : 'default'} message={query.isPending ? '正在检查服务连接' : query.isError ? '服务连接检查失败' : undefined}>
    {query.isPending ? <Skeleton label="正在请求健康检查接口" block /> : query.isError ? <ErrorState message={errorMessage(query.error)} onRetry={retry} loading={query.isFetching} /> : !query.data?.data ? <EmptyState message="健康检查接口没有返回数据。" actionLabel="重新检查" onAction={retry} /> : <><h2><CheckCircle aria-hidden="true" size={24} className="status-success" /> {query.data.data.status === 'UP' ? '服务连接正常' : '服务返回状态异常'}</h2><p>当前连接：{isMockMode ? '本地示例 Mock' : '真实后端'}</p><p>最近检查时间：{formatShanghaiDate(new Date(query.dataUpdatedAt).toISOString())}</p><Button onClick={retry} loading={query.isFetching} loadingLabel="正在重新检查">重新检查</Button></>}
    {isMockMode && !query.isPending && <div className="stack"><h3><ShieldCheck aria-hidden="true" size={20} /> 验证登录恢复</h3><p className="secondary">模拟访问令牌过期后，原请求应自动刷新并重试。模拟刷新失效后，应回到登录页并保留当前地址。</p><div className="row"><Button variant="secondary" loading={query.isFetching} loadingLabel="正在验证" onClick={() => { void simulate(false); }}>模拟令牌过期</Button><Button variant="secondary" loading={query.isFetching} loadingLabel="正在验证" onClick={() => { void simulate(true); }}>模拟刷新失效</Button></div></div>}
  </Card>;
}
