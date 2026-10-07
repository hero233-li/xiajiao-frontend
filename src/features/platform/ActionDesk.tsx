import { useQueries } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { moduleFor, personalSpaces, switchTarget } from '../../spaces/registry';
import type { Directory, SpaceSummary, SummaryViewProps } from '../../spaces/types';
import { useState, type ComponentType } from 'react';
import { SpaceIcon } from './SpaceIcon';
import { Button } from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';
export function ActionDesk({
  directory,
  tasksOnly = false,
}: {
  directory: Directory;
  tasksOnly?: boolean;
}) {
  const [selectedSpace, setSelectedSpace] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const spaces = personalSpaces(directory, true);
  const { user } = useAuth();
  const results = useQueries({
    queries: spaces.map(({ space }) => ({
      queryKey: ['space-summary', user?.id, space.id],
      staleTime: 0,
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const module = await moduleFor(space.id)!.load();
        return { summary: await module.loadSummary(signal), View: module.Summary } as {
          summary: SpaceSummary;
          View: ComponentType<SummaryViewProps>;
        };
      },
    })),
  });
  const tasks = results.flatMap(
    (r, index) => r.data?.summary.tasks.map((task) => ({ task, space: spaces[index].space })) ?? [],
  );
  const pending = results.some((r) => r.isPending);
  const failures = results.filter((r) => r.isError).length;
  const shown = tasksOnly
    ? tasks.filter(
        ({ task, space }) =>
          (selectedSpace === 'all' || space.id === selectedSpace) &&
          (selectedStatus === 'all' ||
            (selectedStatus === 'pending'
              ? !['已完成', '已记录', '休息', '已跳过'].includes(task.status)
              : ['已完成', '已记录', '休息', '已跳过'].includes(task.status))),
      )
    : tasks
        .filter(({ task }) => !['已完成', '已记录', '休息', '已跳过'].includes(task.status))
        .slice(0, 5);
  return (
    <>
      <section className="action-ledger" aria-label="跨空间今日任务">
        <header className="ledger-heading">
          <div>
            <h2>{tasksOnly ? '今天的任务' : '优先行动'}</h2>
            <p>
              {pending
                ? '各空间正在独立读取安排…'
                : `${tasks.length} 项真实安排${failures ? ` · ${failures} 个空间暂不可用` : ''}`}
            </p>
          </div>
          {!tasksOnly && (
            <Link to="/today">
              全部任务 <ArrowUpRight size={16} />
            </Link>
          )}
        </header>
        {tasksOnly && (
          <div className="task-filters">
            <label>
              空间
              <select value={selectedSpace} onChange={(e) => setSelectedSpace(e.target.value)}>
                <option value="all">全部已加入空间</option>
                {spaces.map(({ space }) => (
                  <option key={space.id} value={space.id}>
                    {space.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              状态
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="all">全部状态</option>
                <option value="pending">待处理</option>
                <option value="done">已完成或已记录</option>
              </select>
            </label>
          </div>
        )}
        {shown.map(({ task, space }) => (
          <Link className="action-row" key={`${space.id}-${task.id}`} to={task.to}>
            <SpaceIcon icon={space.icon} accent={space.accent} />
            <div>
              <span className="task-space">
                {space.name} · {task.date}
              </span>
              <strong>{task.title}</strong>
            </div>
            <span className="task-state">{task.status}</span>
            <ArrowUpRight size={18} />
          </Link>
        ))}
        {!shown.length && !pending && (
          <div className="ledger-empty">
            <h3>
              {tasksOnly && (selectedSpace !== 'all' || selectedStatus !== 'all')
                ? '没有匹配的任务'
                : failures
                  ? '已加载的空间暂无待办'
                  : '今天没有待完成的安排'}
            </h3>
            <p>可以继续上次内容，或在下方空间设置下一步。</p>
            <Link to="/spaces">管理我的空间</Link>
          </div>
        )}
        {pending && (
          <p className="ledger-empty" role="status">
            正在加载今日任务…
          </p>
        )}
      </section>
      <div className="section-title growth-section-title">
        <h2>{tasksOnly ? '空间加载状态' : '我的空间'}</h2>
        <Link to="/spaces">管理入口</Link>
      </div>
      {!spaces.some(({ preference }) => tasksOnly || !preference.hidden) && (
        <section className="platform-section">
          <h3>还没有显示中的空间</h3>
          <p>加入空间或恢复已隐藏的入口，即可在这里查看任务与摘要。</p>
          <Link className="button button-primary" to="/spaces">
            选择空间
          </Link>
        </section>
      )}
      <div className="space-summary-grid">
        {spaces.map(({ space, preference }, index) => {
          if (preference.hidden && !tasksOnly) return null;
          const r = results[index];
          return (
            <section className="space-summary" key={space.id}>
              <header>
                <SpaceIcon icon={space.icon} accent={space.accent} />
                <h3>{space.name}</h3>
                <Link to={switchTarget(space, preference)}>
                  进入空间 <ArrowUpRight size={16} />
                </Link>
              </header>
              {r.isPending ? (
                <p role="status">正在读取摘要…</p>
              ) : r.error ? (
                <div role="alert">
                  <p>摘要暂不可用：{r.error.message}</p>
                  <Button variant="secondary" onClick={() => void r.refetch()}>
                    重试{space.name}摘要
                  </Button>
                </div>
              ) : r.data ? (
                <>
                  <r.data.View summary={r.data.summary} />
                  <div className="summary-actions">
                    {r.data.summary.resume && (
                      <Link to={r.data.summary.resume.to}>继续：{r.data.summary.resume.label}</Link>
                    )}
                    <Link to={r.data.summary.next.to}>
                      {r.data.summary.next.label} <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </>
              ) : null}
            </section>
          );
        })}
      </div>
    </>
  );
}
