import { CalendarDays,Check } from 'lucide-react';
import type { Plan,PlanDay,PlanTask } from '../../api/generated/models';
import { Button } from '../../components/Button';
import { Link } from '../../features/cycle/navigation';
import {
dayLabel,
durationLabel,
shanghaiDate,
taskHref
} from './display';
import './schedule.css';

export function DayCard({
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
                        <Link to={taskHref(task, plan.config.cycleId)}>{task.title}</Link>
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
