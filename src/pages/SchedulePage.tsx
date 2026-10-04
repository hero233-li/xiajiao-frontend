import { PlanConfiguration } from '../features/schedule/PlanConfiguration';
import { useQuery } from '@tanstack/react-query';
import { getPlanRevision } from '../api/generated/schedule/schedule';
import { CreatePlan } from '../features/schedule/CreatePlan';
import { CyclePicker } from '../features/cycle/CycleContext';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from '../features/cycle/navigation';
import { AlertTriangle, ArrowDown, ArrowUp, CalendarDays, Check, Settings } from 'lucide-react';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { ProgressBar } from '../components/ProgressBar';
import {
  usePlan,
  usePlans,
  useRescheduleConfirm,
  useReschedulePreview,
  useTaskCompletion,
} from '../api/schedule';
import type { Plan, PlanDay, PlanTask, RescheduleRequest } from '../api/generated/models';
import {
  dayLabel,
  durationLabel,
  planDays,
  isWeekend,
  shanghaiDate,
  taskHref,
  wholeHours,
} from '../features/schedule/display';
import '../features/schedule/schedule.css';
import { useCycle } from '../features/cycle/CycleContext';

function State({
  loading,
  error,
  retry,
  empty,
  action,
}: {
  loading?: boolean;
  error?: Error | null;
  retry?: () => void;
  empty?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="card schedule-state" aria-busy={loading || undefined}>
      {loading ? (
        <p role="status">正在加载安排…</p>
      ) : error ? (
        <>
          <p role="alert">{error.message}</p>
          <Button onClick={retry}>重新加载</Button>
        </>
      ) : (
        <>
          <p>{empty}</p>
          {action}
        </>
      )}
    </section>
  );
}
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
function PlanView({
  plan,
  refreshing,
  readOnly = false,
}: {
  plan: Plan;
  refreshing: boolean;
  readOnly?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  // 日期定位来自服务端快照时间；不使用设备日期判断逾期、容量或考试截止。
  const today = shanghaiDate(plan.asOf);
  const savedWeek = Number(params.get('week'));
  const week =
    plan.weeks.find((item) => item.index === savedWeek) ||
    plan.weeks.find((item) => item.startDate <= today && today <= item.endDate) ||
    plan.weeks[0];
  const days = plan.days.filter(
    (day) => week && day.day >= week.startDate && day.day <= week.endDate,
  );
  const past = days.filter((day) => day.day < today);
  const [expanded, setExpanded] = useState(false);
  const [settings, setSettings] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lateOpen, setLateOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const todayElement = useRef<HTMLElement>(null);
  const jumpRequested = useRef(false);
  const [jump, setJump] = useState(0);
  const completion = useTaskCompletion(plan.id);
  const completionLock = useRef(false);
  const busy = completion.isPending || readOnly;
  useEffect(() => {
    if (jumpRequested.current && todayElement.current) {
      todayElement.current.scrollIntoView?.({ block: 'start', behavior: 'auto' });
      todayElement.current.focus({ preventScroll: true });
      jumpRequested.current = false;
    }
  }, [jump, week?.index]);
  function save(tasks: PlanTask[], completed: boolean) {
    if (completionLock.current) return;
    completionLock.current = true;
    completion.mutate(
      { tasks, completed },
      {
        onSettled: () => {
          completionLock.current = false;
        },
      },
    );
  }
  const late = plan.days.flatMap((day) =>
    day.day < today
      ? day.segments
          .map((segment) => ({
            day: day.day,
            segment,
            task: plan.tasks.find((task) => task.id === segment.taskId),
          }))
          .filter((item) => item.task && !item.task.completed)
      : [],
  );
  const todayDay = plan.days.find((day) => day.day === today);
  const nextTask = todayDay?.segments
    .map((segment) => plan.tasks.find((task) => task.id === segment.taskId))
    .find((task) => task && !task.completed);
  const todayWeek = plan.weeks.find((item) => item.startDate <= today && today <= item.endDate);
  function selectWeek(index: number) {
    setExpanded(false);
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set('week', String(index));
        return next;
      },
      { replace: true },
    );
  }
  return (
    <>
      {readOnly && (
        <p className="status-warning" role="status">
          正在查看历史安排；任务完成状态仍以实际学习记录为准。修改计划请切回当前版本。
        </p>
      )}
      <div className="schedule-toolbar">
        <p>
          <strong>{plan.config.name ?? '学习计划'}</strong>
          <br />
          {plan.config.startDate} 至 {plan.config.endDate} · 共{' '}
          {planDays(plan.config.startDate, plan.config.endDate)} 天
        </p>
        <div className="plan-toolbar-actions">
          {!readOnly && <PlanConfiguration plan={plan} />}
          <Button variant="ghost" aria-label="查看计划设置" onClick={() => setSettings(true)}>
            <Settings size={20} aria-hidden="true" />
            查看计划设置
          </Button>
        </div>
      </div>
      <section className="schedule-today-summary" aria-label="今日任务摘要">
        <h2>今日任务</h2>
        <p>
          {nextTask
            ? `下一项：${nextTask.title}`
            : todayDay?.segments.length
              ? '今天的任务已全部完成。'
              : '今天暂无学习任务。'}
        </p>
        <div className="schedule-actions">
          {nextTask && (
            <Link className="button button-primary" to={taskHref(nextTask, plan.config.cycleId)}>
              开始今日任务
            </Link>
          )}
          {todayDay && todayWeek && (
            <Button
              variant="secondary"
              onClick={() => {
                selectWeek(todayWeek.index);
                setExpanded(false);
                jumpRequested.current = true;
                setJump((value) => value + 1);
              }}
            >
              跳到今天
            </Button>
          )}
        </div>
      </section>
      {!readOnly && plan.overdueUncompletedMinutes > 0 && (
        <aside className="schedule-warning">
          <p>
            <AlertTriangle size={20} aria-hidden="true" />
            落后任务：未完成约 {durationLabel(plan.overdueUncompletedMinutes)}
          </p>
          <div className="schedule-actions">
            <Button
              disabled={busy}
              disabledReason="正在保存任务，请稍候"
              onClick={() => setPreviewOpen(true)}
            >
              顺延未完成任务
            </Button>
            <Button variant="secondary" onClick={() => setLateOpen(true)}>
              查看落下的任务
            </Button>
          </div>
        </aside>
      )}
      {refreshing && <p role="status">正在同步计划…</p>}
      {completion.isPending && <p role="status">正在保存任务，统计以服务器确认结果为准。</p>}
      {completion.isError && (
        <div className="card" data-state="error" role="alert">
          <p>{completion.error.message}。已刷新真实完成状态。</p>
          <Button
            onClick={() => {
              if (completion.variables)
                save(completion.variables.tasks, completion.variables.completed);
            }}
          >
            重试保存任务
          </Button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      <div className="schedule-workspace">
        <nav className="schedule-weeks" aria-label="按周浏览">
          {plan.weeks.map((item) => (
            <button
              key={item.index}
              className="schedule-week-button"
              aria-current={item.index === week?.index ? 'date' : undefined}
              onClick={() => selectWeek(item.index)}
            >
              <strong>第 {item.index} 周</strong>
              {plan.config.strategy === 'WEEKLY_35' && (
                <span>
                  {item.index === 5
                    ? '真题与复习'
                    : plan.courseSummaries.find(
                        (c) => c.id === plan.config.coursePriority[item.index - 1],
                      )?.name}
                </span>
              )}
              <span>
                {item.startDate} 至 {item.endDate}
              </span>
              <small>
                {item.startDate <= today && today <= item.endDate
                  ? '本周'
                  : item.endDate < today
                    ? '已过去'
                    : '未来'}{' '}
                · {item.percent}%
              </small>
            </button>
          ))}
        </nav>
        <section className="schedule-agenda" aria-label="本周每日安排">
          <div className="section-title">
            <h2>第 {week?.index} 周安排</h2>
            <span>
              {week?.startDate} — {week?.endDate}
            </span>
          </div>
          {!days.length ? (
            <State empty="这一周暂无每日安排。" />
          ) : (
            <>
              {past.length > 0 && (
                <section className="schedule-past">
                  <Button
                    variant="secondary"
                    aria-expanded={expanded}
                    onClick={() => setExpanded((value) => !value)}
                  >
                    已过去 {past.length} 天 · {expanded ? '收起' : '展开'}
                  </Button>
                  <p>本计划逾期未完成约 {durationLabel(plan.overdueUncompletedMinutes)}</p>
                </section>
              )}
              <div className="schedule-days">
                {days
                  .filter(
                    (day) =>
                      expanded ||
                      day.day >= today ||
                      day.segments.some(
                        (segment) =>
                          !plan.tasks.find((task) => task.id === segment.taskId)?.completed,
                      ),
                  )
                  .map((day) => (
                    <section
                      key={day.day}
                      ref={day.day === today ? todayElement : undefined}
                      tabIndex={day.day === today ? -1 : undefined}
                      className={`schedule-day ${day.day === today ? 'schedule-today' : ''} ${day.day < today && day.segments.some((segment) => !plan.tasks.find((task) => task.id === segment.taskId)?.completed) ? 'schedule-overdue-day' : ''}`}
                      data-state={completion.isError ? 'error' : undefined}
                      aria-busy={busy || undefined}
                      aria-label={day.day === today ? '今天的安排' : `${dayLabel(day.day)}的安排`}
                    >
                      <DayCard
                        day={day}
                        plan={plan}
                        today={day.day === today}
                        busy={busy}
                        save={save}
                      />
                    </section>
                  ))}
              </div>
            </>
          )}
        </section>
      </div>
      {(plan.unscheduled.length > 0 || plan.awaitingDate.length > 0) && (
        <section className="card schedule-unplaced">
          <h2>待安排任务</h2>
          {plan.unscheduled.map((segment) => (
            <p key={segment.id}>
              <AlertTriangle size={16} aria-hidden="true" />
              未排入：{plan.tasks.find((task) => task.id === segment.taskId)?.title ||
                '任务'} · {durationLabel(segment.minutes)}
            </p>
          ))}
          {plan.awaitingDate.map((segment) => (
            <p key={segment.id}>
              等待考试日期：{plan.tasks.find((task) => task.id === segment.taskId)?.title || '任务'}{' '}
              · {durationLabel(segment.minutes)}
            </p>
          ))}
        </section>
      )}
      <details className="schedule-summary-details">
        <summary>计划进度与统计</summary>
        <section className="card schedule-overview" aria-label="计划概览">
          <ProgressBar label="计划完成度" value={plan.progress.percent} percentage />
          <p className="schedule-muted">
            按预计学习时长统计：已完成 {durationLabel(plan.progress.completedMinutes)} / 共{' '}
            {durationLabel(plan.progress.totalEstimatedMinutes)}
          </p>
          <div className="schedule-metrics">
            <p>
              计划学习时长<strong>{durationLabel(plan.progress.totalEstimatedMinutes)}</strong>
            </p>
            <p>
              已完成天数
              <strong>
                {plan.completedDayCount} / {plan.dayCount} 天（
                {plan.dayCount ? Math.round((plan.completedDayCount / plan.dayCount) * 100) : 0}%）
              </strong>
            </p>
          </div>
          <details className="schedule-course-details">
            <summary>课程目录完成度</summary>
            {plan.courseSummaries.length ? (
              <div className="schedule-course-progress">
                {plan.courseSummaries.map((course) => (
                  <ProgressBar
                    key={course.id}
                    label={course.name}
                    value={course.progress.percent}
                    percentage
                  />
                ))}
              </div>
            ) : (
              <>
                <p>暂无课程统计。</p>
                <Link className="button button-secondary" to="/study/courses">
                  查看我的科目
                </Link>
              </>
            )}
          </details>
        </section>
      </details>
      <Modal open={settings} title="查看计划设置" onClose={() => setSettings(false)}>
        {settings && <SettingsView plan={plan} />}
      </Modal>
      <Modal open={lateOpen} title="落下的任务" onClose={() => setLateOpen(false)}>
        <div className="schedule-dialog">
          {late.length ? (
            <ul>
              {late.map((item) => (
                <li key={item.segment.id}>
                  {dayLabel(item.day)} · {item.task!.title} · {durationLabel(item.segment.minutes)}
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p>暂无落下的任务。</p>
              <Button onClick={() => setLateOpen(false)}>返回安排</Button>
            </>
          )}
        </div>
      </Modal>
      <Modal open={previewOpen} title="顺延预览" onClose={() => setPreviewOpen(false)}>
        {previewOpen && (
          <Preview
            plan={plan}
            onDone={() => {
              setPreviewOpen(false);
              setNotice('顺延已确认，计划已刷新。');
            }}
            onCancel={() => setPreviewOpen(false)}
          />
        )}
      </Modal>
    </>
  );
}
function DayCard({
  day,
  plan,
  today,
  busy,
  save,
}: {
  day: PlanDay;
  plan: Plan;
  today: boolean;
  busy: boolean;
  save: (tasks: PlanTask[], completed: boolean) => void;
}) {
  const groupKey = (task: PlanTask) =>
    `${task.courseId}:${task.kind}:${task.target.chapterId || ''}`;
  const courseIds = [
    ...new Set(
      day.segments
        .map((segment) => {
          const task = plan.tasks.find((task) => task.id === segment.taskId);
          return task ? groupKey(task) : undefined;
        })
        .filter(Boolean),
    ),
  ];
  return (
    <>
      <header className="schedule-day-header">
        <h2>
          <CalendarDays size={20} aria-hidden="true" />
          {dayLabel(day.day)}
          <span className="schedule-today-label">
            {today
              ? '今天'
              : day.segments.length &&
                  day.segments.every(
                    (segment) => plan.tasks.find((task) => task.id === segment.taskId)?.completed,
                  )
                ? '已完成'
                : day.day < shanghaiDate(plan.asOf)
                  ? day.segments.length
                    ? '逾期未完成'
                    : '已过去'
                  : '待学习'}
          </span>
        </h2>
        <span>
          {durationLabel(day.reservedMinutes)} · 完成度 {day.percent}%
        </span>
      </header>
      {!day.segments.length ? (
        <>
          <p>当天暂无学习任务。</p>
          <Link className="button button-secondary" to="/study/courses">
            查看我的科目
          </Link>
        </>
      ) : (
        courseIds.map((courseId) => {
          const segments = day.segments.filter((segment) =>
            (() => {
              const task = plan.tasks.find((task) => task.id === segment.taskId);
              return task && groupKey(task) === courseId;
            })(),
          );
          const tasks = [
            ...new Map(
              segments.map((segment) => {
                const task = plan.tasks.find((task) => task.id === segment.taskId)!;
                return [task.id, task];
              }),
            ).values(),
          ];
          const course = plan.courseSummaries.find((course) => course.id === tasks[0].courseId);
          const first = tasks.find((task) => !task.completed) || tasks[0];
          return (
            <div className="schedule-task-group" key={courseId}>
              <details className="schedule-task-block" open={tasks.length <= 4 ? true : undefined}>
                <summary>
                  {course?.name || first.target.courseCode} · {tasks.length} 项任务
                </summary>
                <div className="schedule-subtasks">
                  {tasks.map((task) => (
                    <label key={task.id} className="schedule-task" data-completed={task.completed}>
                      <input
                        type="checkbox"
                        aria-label={task.title}
                        checked={task.completed}
                        disabled={busy}
                        title={busy ? '正在保存任务，请稍候' : undefined}
                        onChange={(event) => save([task], event.target.checked)}
                      />
                      <span>
                        {task.completed && <Check size={16} aria-hidden="true" />}
                        {task.title}
                        <small>
                          {segments
                            .filter((segment) => segment.taskId === task.id)
                            .map((segment) => `${durationLabel(segment.minutes)}`)
                            .join(' + ')}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="schedule-actions">
                  <Button
                    variant="secondary"
                    disabled={busy || tasks.every((task) => task.completed)}
                    disabledReason={busy ? '正在保存任务，请稍候' : '本组任务已全部完成'}
                    onClick={() =>
                      save(
                        tasks.filter((task) => !task.completed),
                        true,
                      )
                    }
                  >
                    全部标记完成
                  </Button>
                </div>
                {tasks
                  .filter((task) => task.kind !== first.kind)
                  .map((task) => (
                    <Link
                      className="schedule-task-link"
                      key={task.id}
                      to={taskHref(task, plan.config.cycleId)}
                    >
                      {task.kind === 'PAPER' ? '进入历年试卷' : '进入学习资料'}：{task.title}
                    </Link>
                  ))}
              </details>
              <Link className="schedule-task-entry" to={taskHref(first, plan.config.cycleId)}>
                {first.kind === 'PAPER'
                  ? '进入历年试卷'
                  : first.kind === 'ITEM'
                    ? '进入学习目录'
                    : first.target.pane === 'PRACTICE'
                      ? '进入复习练习'
                      : '进入复习资料'}
              </Link>
            </div>
          );
        })
      )}
    </>
  );
}
function Priority({
  ids,
  plan,
  setIds,
}: {
  ids: string[];
  plan: Plan;
  setIds: (ids: string[]) => void;
}) {
  function move(index: number, delta: number) {
    const next = [...ids];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setIds(next);
  }
  return (
    <ol className="schedule-priority">
      {ids.map((id, index) => {
        const name =
          plan.courseSummaries.find((course) => course.id === id)?.name || `科目 ${index + 1}`;
        return (
          <li key={id}>
            <span>{name}</span>
            <Button
              variant="secondary"
              aria-label={`${name}上移`}
              disabled={index === 0}
              disabledReason="已经是第一位"
              onClick={() => move(index, -1)}
            >
              <ArrowUp size={20} aria-hidden="true" />
            </Button>
            <Button
              variant="secondary"
              aria-label={`${name}下移`}
              disabled={index === ids.length - 1}
              disabledReason="已经是最后一位"
              onClick={() => move(index, 1)}
            >
              <ArrowDown size={20} aria-hidden="true" />
            </Button>
          </li>
        );
      })}
    </ol>
  );
}
function SettingsView({ plan }: { plan: Plan }) {
  function capacityLabel(weekend: boolean) {
    const values = [
      ...new Set(
        plan.config.dayCapacities
          .filter((item) => isWeekend(item.day) === weekend)
          .map((item) => item.capacityMinutes),
      ),
    ];
    return values.length === 1
      ? durationLabel(values[0])
      : values.length
        ? '按日期单独配置（见下方）'
        : '未配置';
  }
  return (
    <div className="schedule-dialog">
      <p role="note">
        当前计划设置仅供查看。暂不支持修改日期、每日容量或科目顺序；关闭即可返回，无需保存。
      </p>
      <dl className="schedule-settings-values">
        <div>
          <dt>起始日期</dt>
          <dd>{plan.config.startDate}</dd>
        </div>
        <div>
          <dt>结束日期</dt>
          <dd>{plan.config.endDate}</dd>
        </div>
        <div>
          <dt>计划天数</dt>
          <dd>{planDays(plan.config.startDate, plan.config.endDate)} 天</dd>
        </div>
        <div>
          <dt>工作日每日容量</dt>
          <dd>{capacityLabel(false)}</dd>
        </div>
        <div>
          <dt>周末每日容量</dt>
          <dd>{capacityLabel(true)}</dd>
        </div>
      </dl>
      <h3>科目顺序</h3>
      <ol>
        {plan.config.coursePriority.map((id, index) => (
          <li key={id}>
            {plan.courseSummaries.find((course) => course.id === id)?.name || `科目 ${index + 1}`}
          </li>
        ))}
      </ol>
      <details>
        <summary>查看各日容量</summary>
        <ul>
          {plan.config.dayCapacities.map((item) => (
            <li key={item.day}>
              {item.day} · {durationLabel(item.capacityMinutes)}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
function Preview({
  plan,
  onDone,
  onCancel,
}: {
  plan: Plan;
  onDone: () => void;
  onCancel: () => void;
}) {
  const preview = useReschedulePreview(plan.id);
  const confirm = useRescheduleConfirm(plan.id);
  const started = useRef(false);
  const requestLock = useRef(false);
  const [accept, setAccept] = useState(false);
  const [adjust, setAdjust] = useState<'time' | 'priority' | null>(null);
  const [work, setWork] = useState('');
  const [weekend, setWeekend] = useState('');
  const [priority, setPriority] = useState(plan.config.coursePriority);
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      preview.mutate({ baseRevision: plan.revision });
    }
  }, [plan.revision, preview]);
  function repreview(body: RescheduleRequest) {
    if (requestLock.current) return;
    requestLock.current = true;
    setAccept(false);
    confirm.reset();
    preview.mutate(
      { ...preview.variables, ...body },
      {
        onSuccess: () => setAdjust(null),
        onSettled: () => {
          requestLock.current = false;
        },
      },
    );
  }
  const data = preview.data;
  const frozen = preview.isPending || confirm.isPending;
  return (
    <div className="schedule-dialog">
      <p>
        已完成任务、今天和未来的安排保持不动。逾期未完成任务由服务器从明天重新安排，不延长考试日期。
      </p>
      <p className="schedule-caption">预览仅保存预览资源，正式计划在确认后才改变。</p>
      {preview.isPending ? (
        <State loading />
      ) : preview.isError ? (
        <State
          error={preview.error}
          retry={() => repreview(preview.variables || { baseRevision: plan.revision })}
        />
      ) : (
        data && (
          <>
            <h3>将移动的任务</h3>
            {data.moves.length ? (
              <ul>
                {data.moves.map((move) => {
                  const original = plan.days
                    .flatMap((day) => day.segments)
                    .find((segment) => segment.id === move.segmentId);
                  return (
                    <li key={move.segmentId}>
                      {plan.tasks.find((task) => task.id === original?.taskId)?.title || '任务'}：
                      {move.fromDate} →{' '}
                      {move.toSegments.length
                        ? move.toSegments
                            .map(
                              (segment) =>
                                `${segment.scheduledOn || '未排入'}（${durationLabel(segment.minutes)}）`,
                            )
                            .join('、')
                        : '未排入'}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <>
                <p>暂无需要移动的任务。</p>
                <Button
                  variant="secondary"
                  onClick={() => repreview({ baseRevision: plan.revision })}
                >
                  重新预览
                </Button>
              </>
            )}
            <details>
              <summary>不动的已完成任务</summary>
              {plan.tasks.some((task) => task.completed) ? (
                <ul>
                  {plan.tasks
                    .filter((task) => task.completed)
                    .map((task) => (
                      <li key={task.id}>
                        <Check size={16} aria-hidden="true" />
                        {task.title}
                      </li>
                    ))}
                </ul>
              ) : (
                <p>暂无已完成任务。</p>
              )}
            </details>
            {data.gapMinutes > 0 && (
              <section className="schedule-warning">
                <p>
                  <AlertTriangle size={20} aria-hidden="true" />
                  缺口约 {wholeHours(data.gapHours)} 小时（{data.gapMinutes}{' '}
                  分钟），考试日期不会延长。
                </p>
                <div className="schedule-actions">
                  {data.options.includes('INCREASE_DAILY_TIME') && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setAdjust('time');
                        setAccept(false);
                      }}
                    >
                      增加每日时长
                    </Button>
                  )}
                  {data.options.includes('CHANGE_COURSE_PRIORITY') && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setAdjust('priority');
                        setAccept(false);
                      }}
                    >
                      调整科目优先级
                    </Button>
                  )}
                  {data.options.includes('ACCEPT_UNSCHEDULED') && (
                    <label className="schedule-task">
                      <input
                        type="checkbox"
                        checked={accept}
                        onChange={(event) => {
                          setAccept(event.target.checked);
                          setAdjust(null);
                        }}
                      />
                      接受溢出任务标记为“未排入”
                    </label>
                  )}
                </div>
              </section>
            )}
            {adjust === 'time' && (
              <section>
                <h3>调整逾期重排容量</h3>
                <div className="schedule-fields">
                  <label>
                    工作日每日小时
                    <input
                      type="number"
                      step="any"
                      value={work}
                      onChange={(event) => setWork(event.target.value)}
                    />
                  </label>
                  <label>
                    周末每日小时
                    <input
                      type="number"
                      step="any"
                      value={weekend}
                      onChange={(event) => setWeekend(event.target.value)}
                    />
                  </label>
                </div>
                <Button
                  loading={preview.isPending}
                  disabled={!work && !weekend}
                  disabledReason="请填写至少一种每日时长"
                  onClick={() =>
                    repreview({
                      baseRevision: plan.revision,
                      dayCapacities: plan.config.dayCapacities.map((item) => ({
                        ...item,
                        capacityMinutes:
                          item.day <= data.asOf
                            ? item.capacityMinutes
                            : (isWeekend(item.day) ? weekend : work) !== ''
                              ? Number(isWeekend(item.day) ? weekend : work) * 60
                              : item.capacityMinutes,
                      })),
                    })
                  }
                >
                  重新预览
                </Button>
              </section>
            )}
            {adjust === 'priority' && (
              <section>
                <h3>科目优先级</h3>
                <Priority ids={priority} plan={plan} setIds={setPriority} />
                <Button
                  onClick={() =>
                    repreview({ baseRevision: plan.revision, coursePriority: priority })
                  }
                >
                  重新预览
                </Button>
              </section>
            )}
          </>
        )
      )}
      {confirm.isError && <p role="alert">{confirm.error.message}。如预览已失效，请重新预览。</p>}
      <div className="schedule-actions schedule-dialog-footer">
        <Button
          disabled={
            !data ||
            preview.isError ||
            confirm.isError ||
            preview.isPending ||
            (data.gapMinutes > 0 && !accept) ||
            adjust !== null
          }
          disabledReason={
            !data || preview.isError || preview.isPending || confirm.isError
              ? '请先取得有效预览'
              : adjust
                ? '修改后请先重新预览'
                : '请调整方案或明确接受未排入任务'
          }
          loading={confirm.isPending}
          loadingLabel="正在确认顺延"
          onClick={() => {
            if (data && !confirm.isPending)
              confirm.mutate(
                {
                  previewId: data.id,
                  body: {
                    baseRevision: data.baseRevision,
                    inputFingerprint: data.inputFingerprint,
                    acceptUnscheduled: accept,
                    confirm: true,
                  },
                },
                { onSuccess: onDone },
              );
          }}
        >
          确认顺延
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          取消
        </Button>
        {confirm.isError && (
          <Button
            variant="secondary"
            disabled={frozen}
            disabledReason="正在处理请求"
            onClick={() => {
              setAdjust(null);
              repreview({ baseRevision: plan.revision });
            }}
          >
            重新预览
          </Button>
        )}
      </div>
    </div>
  );
}
export const Component = SchedulePage;
