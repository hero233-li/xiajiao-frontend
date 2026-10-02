import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import type {
  Plan,
  PlanConfig,
  PlanDay,
  PlanTask,
  RescheduleRequest,
} from '../api/generated/models';
import {
  dayLabel,
  hours,
  isWeekend,
  shanghaiDate,
  taskHref,
  wholeHours,
} from '../features/schedule/display';
import '../features/schedule/schedule.css';

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
  const plans = usePlans(params.get('cycleId') || undefined);
  const selected = params.get('planId') || plans.data?.items[0]?.id || '';
  return (
    <div className="schedule-page">
      <h1>35 天安排</h1>
      {plans.isPending || (plans.isError && !plans.data) ? (
        <State loading={plans.isPending} error={plans.error} retry={() => void plans.refetch()} />
      ) : (
        <>
          {plans.isError && <State error={plans.error} retry={() => void plans.refetch()} />}
          {!selected ? (
            <State
              empty="暂无学习计划；如果刚创建过计划，可以刷新列表。"
              action={<Button onClick={() => void plans.refetch()}>刷新计划列表</Button>}
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
              <PlanPanel key={selected} id={selected} />
            </>
          )}
        </>
      )}
    </div>
  );
}
function PlanPanel({ id }: { id: string }) {
  const query = usePlan(id);
  if (query.isPending || (query.isError && !query.data))
    return (
      <State loading={query.isPending} error={query.error} retry={() => void query.refetch()} />
    );
  return (
    <>
      {query.isError && <State error={query.error} retry={() => void query.refetch()} />}
      <PlanView plan={query.data!} refreshing={query.isFetching} />
    </>
  );
}
function PlanView({ plan, refreshing }: { plan: Plan; refreshing: boolean }) {
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
  const scrolled = useRef(false);
  const completion = useTaskCompletion(plan.id);
  const completionLock = useRef(false);
  const busy = completion.isPending;
  useEffect(() => {
    if (!scrolled.current && todayElement.current) {
      todayElement.current.scrollIntoView?.({ block: 'start', behavior: 'auto' });
      scrolled.current = true;
    }
  }, [today, week?.index]);
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
  return (
    <>
      <div className="schedule-toolbar">
        <p>
          计划日期：{plan.config.startDate} 至 {plan.config.endDate}
        </p>
        <Button variant="secondary" aria-label="打开计划设置" onClick={() => setSettings(true)}>
          <Settings size={20} aria-hidden="true" />
          设置
        </Button>
      </div>
      <section className="card schedule-overview" aria-label="计划概览">
        <ProgressBar label="计划完成度" value={plan.progress.percent} />
        <div className="schedule-metrics">
          <p>
            总计划工时<strong>{hours(plan.progress.totalEstimatedMinutes)} 小时</strong>
          </p>
          <p>
            已完成天数
            <strong>
              {plan.completedDayCount} / {plan.dayCount} 天
            </strong>
          </p>
        </div>
        <h2>课程目录完成度</h2>
        {plan.courseSummaries.length ? (
          <div className="schedule-course-progress">
            {plan.courseSummaries.map((course) => (
              <ProgressBar key={course.id} label={course.name} value={course.progress.percent} />
            ))}
          </div>
        ) : (
          <>
            <p>暂无课程统计。</p>
            <Link className="button button-secondary" to="/zikao/courses">
              查看我的科目
            </Link>
          </>
        )}
      </section>
      {plan.overdueUncompletedMinutes > 0 && (
        <aside className="schedule-warning">
          <p>
            <AlertTriangle size={20} aria-hidden="true" />
            落后任务：未完成约 {hours(plan.overdueUncompletedMinutes)} 小时
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
      <div className="schedule-weeks" role="group" aria-label="选择周">
        {plan.weeks.map((item) => (
          <Button
            key={item.index}
            variant={item.index === week?.index ? 'primary' : 'secondary'}
            aria-pressed={item.index === week?.index}
            onClick={() => {
              setExpanded(false);
              setParams(
                (previous) => {
                  const next = new URLSearchParams(previous);
                  next.set('week', String(item.index));
                  return next;
                },
                { replace: true },
              );
            }}
          >
            第 {item.index} 周
          </Button>
        ))}
      </div>
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
      {!days.length ? (
        <State
          empty="这一周暂无每日安排。"
          action={<Button onClick={() => setSettings(true)}>查看计划设置</Button>}
        />
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
              <p>本计划逾期未完成约 {hours(plan.overdueUncompletedMinutes)} 小时</p>
            </section>
          )}
          <div className="schedule-days">
            {days
              .filter((day) => expanded || day.day >= today)
              .map((day) => (
                <section
                  key={day.day}
                  ref={day.day === today ? todayElement : undefined}
                  className={`card schedule-day ${day.day === today ? 'schedule-today' : ''}`}
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
      {(plan.unscheduled.length > 0 || plan.awaitingDate.length > 0) && (
        <section className="card schedule-unplaced">
          <h2>待安排任务</h2>
          {plan.unscheduled.map((segment) => (
            <p key={segment.id}>
              <AlertTriangle size={16} aria-hidden="true" />
              未排入：{plan.tasks.find((task) => task.id === segment.taskId)?.title ||
                '任务'} · {hours(segment.minutes)} 小时
            </p>
          ))}
          {plan.awaitingDate.map((segment) => (
            <p key={segment.id}>
              等待考试日期：{plan.tasks.find((task) => task.id === segment.taskId)?.title || '任务'}{' '}
              · {hours(segment.minutes)} 小时
            </p>
          ))}
        </section>
      )}
      <Modal open={settings} title="计划设置" onClose={() => setSettings(false)}>
        {settings && <SettingsForm plan={plan} />}
      </Modal>
      <Modal open={lateOpen} title="落下的任务" onClose={() => setLateOpen(false)}>
        <div className="schedule-dialog">
          {late.length ? (
            <ul>
              {late.map((item) => (
                <li key={item.segment.id}>
                  {dayLabel(item.day)} · {item.task!.title} · {hours(item.segment.minutes)} 小时
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
          {today && <span className="schedule-today-label">今天</span>}
        </h2>
        <span>
          {hours(day.reservedMinutes)} 小时 · 完成度 {day.percent}%
        </span>
      </header>
      {!day.segments.length ? (
        <>
          <p>当天暂无学习任务。</p>
          <Link className="button button-secondary" to="/zikao/courses">
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
          const first = tasks[0];
          return (
            <details
              className="schedule-task-block"
              key={courseId}
              open={tasks.length <= 4 ? true : undefined}
            >
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
                          .map((segment) => `${hours(segment.minutes)} 小时`)
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
                <Link className="button button-secondary" to={taskHref(first, plan.config.cycleId)}>
                  {first.kind === 'PAPER'
                    ? '进入历年试卷'
                    : first.kind === 'ITEM'
                      ? '进入学习目录'
                      : '进入复习资料'}
                </Link>
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
function initialHours(config: PlanConfig, weekend: boolean) {
  const values = [
    ...new Set(
      config.dayCapacities
        .filter((item) => isWeekend(item.day) === weekend)
        .map((item) => item.capacityMinutes),
    ),
  ];
  return values.length === 1 ? String(values[0] / 60) : '';
}
function SettingsForm({ plan }: { plan: Plan }) {
  const [start, setStart] = useState(plan.config.startDate);
  const [end, setEnd] = useState(plan.config.endDate);
  const [work, setWork] = useState(initialHours(plan.config, false));
  const [weekend, setWeekend] = useState(initialHours(plan.config, true));
  const [priority, setPriority] = useState(plan.config.coursePriority);
  return (
    <div className="schedule-dialog">
      <p>将重新生成未开始日期的计划，已完成与过去的日期不受影响</p>
      <p role="note">当前接口不支持保存这种修改；下方配置可编辑查看，尚不会提交。</p>
      <div className="schedule-fields">
        <label>
          起始日期
          <input type="date" value={start} onChange={(event) => setStart(event.target.value)} />
        </label>
        <label>
          结束日期
          <input type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
        </label>
        <label>
          工作日每日小时
          <input
            type="number"
            step="any"
            placeholder="各日容量不同，请填写"
            value={work}
            onChange={(event) => setWork(event.target.value)}
          />
        </label>
        <label>
          周末每日小时
          <input
            type="number"
            step="any"
            placeholder="各日容量不同，请填写"
            value={weekend}
            onChange={(event) => setWeekend(event.target.value)}
          />
        </label>
      </div>
      <h3>科目顺序</h3>
      <Priority ids={priority} plan={plan} setIds={setPriority} />
      <Button disabled disabledReason="缺少保留已完成与过去日期的计划设置更新接口">
        保存设置
      </Button>
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
                                `${segment.scheduledOn || '未排入'}（${hours(segment.minutes)} 小时）`,
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
            preview.isPending ||
            (data.gapMinutes > 0 && !accept) ||
            adjust !== null
          }
          disabledReason={
            !data || preview.isError || preview.isPending
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
