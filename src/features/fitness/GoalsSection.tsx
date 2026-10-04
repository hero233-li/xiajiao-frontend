import { fitnessApi } from '../../api/fitness';
import { Button } from '../../components/Button';
import { goalNames } from '../../features/fitness/Editor';

import type { FitnessWorkspace } from '../../pages/FitnessPage';
import { State, WeightChart } from './display';

export function GoalsSection({ workspace }: { workspace: FitnessWorkspace }) {
  const { confirm, summary, history, goals, setNotice, mutation, s, goal, weight } = workspace;

  return (
    <>
      <State loading={history.isPending} error={history.error} retry={history.refetch}>
        {null}
      </State>

      <State loading={summary.isPending} error={summary.error} retry={summary.refetch}>
        {s && (
          <section className="goal-overview">
            <div>
              <span className="eyebrow">当前目标</span>
              <h2>{goal ? goalNames[goal.type] : '尚未设置'}</h2>
              <p>
                {goal
                  ? `${goal.startDate} 开始 · ${goal.startWeight} kg → ${goal.targetWeight} kg`
                  : '目标由你自己维护。设置后即可跟踪真实变化。'}
              </p>
              {goal?.note && <p>{goal.note}</p>}
              {goal && (
                <Button
                  variant="ghost"
                  disabled={mutation.isPending}
                  onClick={async () => {
                    if (await confirm('确定结束当前目标？历史目标与所有记录会保留。'))
                      void mutation
                        .mutateAsync(() => fitnessApi.endGoal(s.goalRevision))
                        .then(() => setNotice('当前目标已结束'))
                        .catch((e) => setNotice(e.message));
                  }}
                >
                  结束当前目标
                </Button>
              )}
            </div>
            <div>
              <span className="secondary">距离目标体重</span>
              <strong className="large-number">
                {goal && weight ? Math.abs(weight.kg - goal.targetWeight).toFixed(1) : '—'}
                <small> kg</small>
              </strong>
              <p className="help">绝对差距，不预测达成日期。</p>
            </div>
          </section>
        )}
      </State>
      <section className="platform-section">
        <h2>近期体重趋势</h2>
        <State loading={history.isPending} error={history.error} retry={history.refetch}>
          <WeightChart days={history.data ?? []} />
        </State>
      </section>
      <section className="platform-section">
        <h2>目标历史</h2>
        <State loading={goals.isPending} error={goals.error} retry={goals.refetch}>
          {goals.data?.length ? (
            <ol className="record-ledger">
              {goals.data.map(
                (e) =>
                  e.data && (
                    <li key={e.key}>
                      <strong>
                        {goalNames[e.data.type]} · {e.data.startWeight} → {e.data.targetWeight} kg
                      </strong>
                      <span>
                        {e.data.startDate} 开始
                        {e.key === s?.currentGoal?.key ? ' · 当前生效' : ''}
                        {e.data.targetDate ? ` · 目标日期 ${e.data.targetDate}` : ''}
                      </span>
                      <small>{e.data.note}</small>
                    </li>
                  ),
              )}
            </ol>
          ) : (
            <p className="inline-empty">没有历史目标。</p>
          )}
          {goals.hasMore && (
            <Button variant="ghost" onClick={() => goals.loadMore()}>
              加载更多目标
            </Button>
          )}
        </State>
      </section>
    </>
  );
}
