import { useQuery } from '@tanstack/react-query';
import { getPlanRevision } from '../api/generated/schedule/schedule';
import {
usePlan,
usePlans
} from '../api/schedule';
import { Button } from '../components/Button';
import { CyclePicker,useCycle } from '../features/cycle/CycleContext';
import { Link,useSearchParams } from '../features/cycle/navigation';
import { CreatePlan } from '../features/schedule/CreatePlan';
import '../features/schedule/schedule.css';

import { PlanView } from '../features/schedule/PlanWorkspace';
import { State } from '../features/schedule/ScheduleState';
export function SchedulePage() {
  const [params, setParams] = useSearchParams();
  const cycle = useCycle();
  const cycleId = params.get('cycleId') || undefined;
  const plans = usePlans(cycleId, !cycle || !!cycleId);
  const selected = params.get('planId') || plans.data?.items[0]?.id || '';
  return (
    <div className="schedule-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">PLAN / 学习计划</p>
          <h1>把时间留给重点。</h1>
          <p className="secondary">从今天的安排出发，处理逾期，逐步完成整个周期。</p>
        </div>
        <div className="stack">
          <CyclePicker />
          <CreatePlan />
        </div>
      </header>
      {cycle && !cycleId ? (
        <State
          loading={cycle.pending}
          error={cycle.error ? new Error('考试周期加载失败，请重新加载。') : null}
          retry={cycle.retry}
          empty="请先选择考试周期，再查看学习安排。"
          action={
            <Link className="button button-secondary" to="/study">
              返回备考总览
            </Link>
          }
        />
      ) : plans.isPending || (plans.isError && !plans.data) ? (
        <State loading={plans.isPending} error={plans.error} retry={() => void plans.refetch()} />
      ) : (
        <>
          {plans.isError && <State error={plans.error} retry={() => void plans.refetch()} />}
          {!selected ? (
            <State
              empty="当前周期尚未生成学习计划。计划根据本周期的科目、学习内容与考试日期安排。"
              action={
                <div className="schedule-actions">
                  <Link className="button button-secondary" to="/study/courses">
                    查看我的科目
                  </Link>
                  <Link className="button button-secondary" to="/study">
                    返回备考总览
                  </Link>
                  <Button onClick={() => void plans.refetch()}>刷新计划列表</Button>
                </div>
              }
            />
          ) : (
            <>
              <label className="schedule-plan-picker">
                选择计划
                <select
                  value={selected}
                  onChange={(event) =>
                    setParams((previous) => {
                      const next = new URLSearchParams(previous);
                      next.set('planId', event.target.value);
                      next.delete('week');
                      next.delete('revision');
                      return next;
                    })
                  }
                >
                  {!plans.data?.items.some((item) => item.id === selected) && (
                    <option value={selected}>链接指定的计划</option>
                  )}
                  {plans.data?.items.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.startDate} 至 {plan.endDate} · 版本 {plan.revision}
                    </option>
                  ))}
                </select>
              </label>
              <PlanPanel key={selected} id={selected} cycleId={cycleId} />
            </>
          )}
        </>
      )}
    </div>
  );
}
function PlanPanel({ id, cycleId }: { id: string; cycleId?: string }) {
  const current = usePlan(id);
  const [params, setParams] = useSearchParams();
  const revision = Number(params.get('revision'));
  const old = useQuery({
    queryKey: ['plan-revision', id, revision],
    enabled: Number.isInteger(revision) && revision > 0,
    queryFn: async () => (await getPlanRevision(id, revision, { silent: true })).data,
  });
  const query = revision > 0 ? old : current;
  if (query.isPending || (query.isError && !query.data))
    return (
      <State loading={query.isPending} error={query.error} retry={() => void query.refetch()} />
    );
  if (cycleId && query.data?.config.cycleId !== cycleId)
    return <State empty="这份计划不属于当前考试周期，请重新选择计划。" />;
  return (
    <>
      {query.isError && <State error={query.error} retry={() => void query.refetch()} />}
      {current.data && (
        <label className="plan-version-select">
          计划版本
          <select
            value={revision > 0 ? String(revision) : ''}
            onChange={(e) =>
              setParams((prev) => {
                const next = new URLSearchParams(prev);
                if (e.target.value) next.set('revision', e.target.value);
                else next.delete('revision');
                return next;
              })
            }
          >
            <option value="">当前版本 · {current.data.revision}</option>
            {Array.from({ length: current.data.revision - 1 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                旧版本 {i + 1} · 只读
              </option>
            ))}
          </select>
        </label>
      )}
      <PlanView plan={query.data!} refreshing={query.isFetching} readOnly={revision > 0} />
    </>
  );
}
export const Component = SchedulePage;
