import { useEffect, useRef } from 'react';
import { ArrowRight, Check, Clock, CalendarDays } from 'lucide-react';
import { CyclePicker, useCycle } from '../features/cycle/CycleContext';
import { usePlan, useTaskCompletion } from '../api/schedule';
import { Link, useSearchParams } from '../features/cycle/navigation';
import { useDashboard } from '../api/dashboard';
import { RegionState } from '../components/dashboard/RegionState';
import { learningTargetPath, orderedExams, dateLabel } from '../features/dashboard/navigation';
import type { Plan } from '../api/generated/models';
import { Button } from '../components/Button';
import { MathText } from '../components/MathText';
function TodayTasks({ plan, date }: { plan: Plan; date: string }) {
  const mutation = useTaskCompletion(plan.id);
  const saving = useRef(false);
  const segments = plan.days.find((day) => day.day === date)?.segments ?? [];
  const tasks = [...new Set(segments.map((segment) => segment.taskId))]
    .map((id) => plan.tasks.find((task) => task.id === id)!)
    .filter((task) => task && task.target);
  return (
    <section className="desk-section">
      <div className="section-title">
        <h2>今日清单</h2>
        <span>
          {tasks.filter((t) => t.completed).length} / {tasks.length} 完成
        </span>
      </div>
      {mutation.isError && (
        <p role="alert" className="status-error">
          {mutation.error.message}，请刷新后重试。
        </p>
      )}
      {tasks.length ? (
        <ol className="task-ledger">
          {tasks.map((task) => (
            <li key={task.id} data-done={task.completed}>
              <Button
                variant="ghost"
                disabled={mutation.isPending}
                aria-label={`${task.completed ? '取消完成' : '完成'}：${task.title}`}
                onClick={() => {
                  if (saving.current) return;
                  saving.current = true;
                  mutation.mutate(
                    { tasks: [task], completed: !task.completed },
                    {
                      onSettled: () => {
                        saving.current = false;
                      },
                    },
                  );
                }}
              >
                <span className="task-check">{task.completed && <Check size={14} />}</span>
              </Button>
              <div>
                <Link to={learningTargetPath(task.target)}>
                  <MathText text={task.title} />
                </Link>
                <small>
                  {plan.courseSummaries.find((c) => c.id === task.courseId)?.name} · 预计{' '}
                  {task.estimatedMinutes} 分钟
                </small>
              </div>
              <Link
                className="ledger-go"
                to={learningTargetPath(task.target)}
                aria-label={`学习：${task.title}`}
              >
                <ArrowRight size={18} />
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="inline-empty">今天没有安排，选一门课程按自己的节奏学习。</p>
      )}
      <Link className="text-action" to="/zikao/schedule">
        查看整周安排 <ArrowRight size={15} />
      </Link>
    </section>
  );
}
export function DashboardPage() {
  const cycle = useCycle();
  const [params] = useSearchParams();
  const cycleId = params.get('cycleId') || undefined;
  const query = useDashboard(
    cycleId
      ? { cycleId, ...(params.get('planId') ? { planId: params.get('planId')! } : {}) }
      : undefined,
  );
  const plan = usePlan(query.data?.selectedPlanId ?? '');
  useEffect(() => {
    document.title = '今日学习 · 学习知途';
  }, []);
  const data = query.data;
  const target =
    data?.todaySuggestion ??
    (data?.continueLearning && data.courses.some((c) => c.id === data.continueLearning?.courseId)
      ? data.continueLearning
      : null);
  return (
    <section className="desk-home">
      <header className="page-heading">
        <div>
          <p className="eyebrow">YOUR STUDY DESK / 今日学习</p>
          <h1>从下一步开始。</h1>
          <p className="secondary">{data?.localDate ?? '今天'} · 把注意力留给眼前这一项。</p>
        </div>
        <CyclePicker />
      </header>
      {cycle?.pending ? (
        <RegionState kind="loading" message="正在准备学习工作台…" />
      ) : cycle?.error ? (
        <RegionState kind="error" message="考试周期加载失败" retry={cycle.retry} />
      ) : !cycleId ? (
        <RegionState kind="empty" message="暂无可用考试周期。" />
      ) : query.isPending ? (
        <RegionState kind="loading" message="正在读取今日任务…" />
      ) : query.isError ? (
        <RegionState
          kind="error"
          message="学习数据加载失败，请重试。"
          retry={() => void query.refetch()}
        />
      ) : (
        data && (
          <div className="home-workspace">
            <div className="home-primary">
              <section className="next-study">
                <p className="eyebrow">
                  <span className="live-dot" />{' '}
                  {data.todaySuggestion ? '下一项 · 来自今日计划' : '继续学习'}
                </p>
                <h2>
                  {target ? <MathText text={target.title} /> : '选择一门课程，开始今天的学习'}
                </h2>
                <p>
                  {target
                    ? data.courses.find((c) => c.code === target.target.courseCode)?.name ===
                      target.title
                      ? '接着上次阅读位置继续，或在目录中选择下一项。'
                      : data.courses.find((c) => c.code === target.target.courseCode)?.name
                    : '阅读、练习与复习，从这里接着往前。'}
                </p>
                <div className="next-study-actions">
                  <Link
                    className="button button-primary"
                    to={target ? learningTargetPath(target.target) : '/zikao/courses'}
                  >
                    {target ? '开始这一项' : '选择课程'}
                    <ArrowRight size={18} />
                  </Link>
                  {data.todaySuggestion &&
                    data.continueLearning &&
                    learningTargetPath(data.todaySuggestion.target) !==
                      learningTargetPath(data.continueLearning.target) && (
                      <Link
                        className="text-action"
                        to={learningTargetPath(data.continueLearning.target)}
                      >
                        回到上次位置
                      </Link>
                    )}
                  <Link className="text-action" to="/zikao/schedule">
                    调整安排
                  </Link>
                </div>
              </section>
              {plan.data && plan.data.config.cycleId === cycleId ? (
                <TodayTasks plan={plan.data} date={data.localDate} />
              ) : (
                <section className="desk-section">
                  <h2>今日清单</h2>
                  {plan.isError ? (
                    <RegionState
                      kind="error"
                      message="计划详情读取失败。"
                      retry={() => void plan.refetch()}
                    />
                  ) : data.selectedPlanId ? (
                    <p role="status">正在加载清单…</p>
                  ) : (
                    <>
                      <p className="secondary">
                        还没有学习计划。设置每日可用时间，让任务有明确的落点。
                      </p>
                      <Link className="button button-secondary" to="/zikao/schedule">
                        建立学习计划
                      </Link>
                    </>
                  )}
                </section>
              )}
              <section className="desk-section">
                <div className="section-title">
                  <h2>我的学习书架</h2>
                  <Link className="text-action" to="/zikao/courses">
                    全部课程 <ArrowRight size={15} />
                  </Link>
                </div>
                <div className="home-books">
                  {data.courses.map((course, i) => (
                    <Link
                      key={course.id}
                      className="book-entry"
                      to={`/zikao/course/${course.code}/${course.capabilities.manual ? 'manual' : 'catalog'}`}
                    >
                      <span className="book-number">{String(i + 1).padStart(2, '0')}</span>
                      <span>
                        <strong>{course.name}</strong>
                        <small>
                          {course.progress.completedItems} / {course.progress.totalItems} 项完成
                        </small>
                      </span>
                      <ArrowRight size={16} />
                    </Link>
                  ))}
                </div>
                {!data.courses.length && <p className="inline-empty">本周期尚未开放课程。</p>}
              </section>
            </div>
            <aside className="home-context">
              <section>
                <p className="eyebrow">考试日历</p>
                <h2>{cycle?.selected?.name}</h2>
                <ul className="exam-agenda">
                  {orderedExams(data).map((item) => (
                    <li key={item.courseId}>
                      <CalendarDays size={17} />
                      <div>
                        <strong>
                          {data.courses.find((c) => c.id === item.courseId)?.name ??
                            item.courseCode}
                        </strong>
                        <small>{item.examDate ? dateLabel(item.examDate) : '日期待确认'}</small>
                      </div>
                      <span>
                        {item.status === 'TODAY'
                          ? '今天'
                          : item.status === 'FINISHED'
                            ? '已结束'
                            : item.daysRemaining !== null
                              ? `${item.daysRemaining}天`
                              : '待定'}
                      </span>
                    </li>
                  ))}
                </ul>
                {!data.countdowns.length && (
                  <p className="inline-empty">考试日期公布后显示在这里。</p>
                )}
              </section>
              <section className="quiet-progress">
                <p className="eyebrow">持续积累</p>
                <p>
                  <strong>{data.overallProgress.completedItems}</strong> /{' '}
                  {data.overallProgress.totalItems} 项
                </p>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${data.overallProgress.percent}%` }}
                  />
                </div>
                <small>已发布目录完成度 {data.overallProgress.percent}%</small>
              </section>
              <section className="desk-tip">
                <Clock size={19} />
                <p>
                  完成阅读后标记进度。
                  <br />
                  练习成绩与阅读进度分别记录。
                </p>
              </section>
              <Link className="text-action" to="/zikao/notes">
                打开学习笔记 <ArrowRight size={15} />
              </Link>
            </aside>
          </div>
        )
      )}
    </section>
  );
}
export { DashboardPage as Component };
