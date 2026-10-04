import { AlertTriangle,Settings } from 'lucide-react';
import { useEffect,useRef,useState } from 'react';
import type { Plan,PlanTask } from '../../api/generated/models';
import {
useTaskCompletion
} from '../../api/schedule';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { ProgressBar } from '../../components/ProgressBar';
import { Link,useSearchParams } from '../../features/cycle/navigation';
import {
dayLabel,
durationLabel,
planDays,
shanghaiDate,
taskHref
} from './display';
import { PlanConfiguration } from './PlanConfiguration';
import './schedule.css';

import { DayCard } from './PlanDay';
import { Preview,SettingsView } from './ReschedulePreview';
import { State } from './ScheduleState';
import { TaskInbox } from './TaskInbox';
export function PlanView({
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
      <TaskInbox plan={plan} busy={busy} save={save}/>
      <details className="schedule-calendar-view"><summary>按周查看每日安排</summary><div className="schedule-workspace">
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
      </details>
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
