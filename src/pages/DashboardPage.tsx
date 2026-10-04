import { WeakItems } from '../features/dashboard/WeakItems';
import { useEffect, useRef } from 'react';
import { ArrowRight, Check, CalendarDays } from 'lucide-react';
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
        <p className="inline-empty">今天没有安排。可以创建或调整学习计划，为任务安排时间。</p>
      )}
      <Link className="text-action" to="/study/schedule">
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
    document.title = '今日学习 · 知途个人管理平台';
  }, []);
  const data = query.data;
  const target =
    data?.todaySuggestion ??
    (data?.continueLearning && data.courses.some((c) => c.id === data.continueLearning?.courseId)
      ? data.continueLearning
      : null);
  return (
    <section className="study-workbench">
      <header className="page-heading">
        <div>
          <p className="eyebrow">自学空间</p>
          <h1>今日学习</h1>
          <p className="secondary">{data?.localDate ?? '今天'} · 从一项明确的任务开始。</p>
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
          <>
            <section className="study-focus-banner">
              <div>
                <p className="eyebrow">
                  {data.todaySuggestion ? '今日计划 / 下一项' : '接着上次的位置'}
                </p>
                <h2>
                  {target ? <MathText text={target.title} /> : '选择一门课程，开始今天的学习'}
                </h2>
                <p>
                  {target
                    ? data.courses.find((c) => c.code === target.target.courseCode)?.name
                    : '阅读、练习与复习，都从这里接着往前。'}
                </p>
                <div className="row">
                  <Link
                    className="button button-primary"
                    to={target ? learningTargetPath(target.target) : '/study/courses'}
                  >
                    {target ? '开始这一项' : '选择课程'} <ArrowRight size={17} />
                  </Link>
                  {data.continueLearning &&
                    target &&
                    learningTargetPath(data.continueLearning.target) !==
                      learningTargetPath(target.target) &&
                    data.courses.some((c) => c.id === data.continueLearning?.courseId) && (
                      <Link to={learningTargetPath(data.continueLearning.target)}>
                        回到上次位置
                      </Link>
                    )}
                </div>
              </div>
              <div className="study-progress-summary">
                <span>全部课程累计进度</span>
                <strong>
                  {data.overallProgress.percent}
                  <small>%</small>
                </strong>
                <span>
                  {data.overallProgress.completedItems} / {data.overallProgress.totalItems} 项
                </span>
              </div>
            </section>
            <div className="study-workbench-grid">
              <div>
                {plan.data && plan.data.config.cycleId === cycleId ? (
                  <TodayTasks plan={plan.data} date={data.localDate} />
                ) : (
                  <section className="platform-section">
                    <div className="section-title">
                      <h2>今日清单</h2>
                      <Link to="/study/schedule">管理学习计划</Link>
                    </div>
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
                        <p className="inline-empty">
                          还没有学习计划。设置可用时间，让每个任务有明确的落点。
                        </p>
                        <Link className="button button-secondary" to="/study/schedule?create=1">
                          建立学习计划
                        </Link>
                      </>
                    )}
                  </section>
                )}
                <WeakItems courses={data.courses} />
                <section className="platform-section">
                  <div className="section-title">
                    <h2>我的科目</h2>
                    <Link to="/study/courses">管理科目</Link>
                  </div>
                  <div className="study-course-ledger">
                    {data.courses.map((c, i) => (
                      <Link
                        key={c.id}
                        to={`/study/course/${c.code}/${c.capabilities.manual ? 'manual' : 'catalog'}`}
                      >
                        <span className="course-order">{String(i + 1).padStart(2, '0')}</span>
                        <div>
                          <h3>{c.name}</h3>
                          <p>
                            {c.code} · {c.capabilities.manual ? '实践手册' : '阅读目录'}
                          </p>
                        </div>
                        <div className="course-mini-progress">
                          <span>
                            {c.progress.completedItems} / {c.progress.totalItems}
                          </span>
                          <progress value={c.progress.percent} max={100} />
                        </div>
                        <ArrowRight size={17} />
                      </Link>
                    ))}
                  </div>
                  {!data.courses.length && <p className="inline-empty">本周期还没有开放课程。</p>}
                </section>
              </div>
              <aside className="study-agenda">
                <div className="section-title">
                  <h2>考试日历</h2>
                  <CalendarDays size={18} />
                </div>
                <p className="secondary">{cycle?.selected?.name}</p>
                {orderedExams(data).map((item) => (
                  <div className="study-exam-line" key={item.courseId}>
                    <div>
                      <strong>
                        {data.courses.find((c) => c.id === item.courseId)?.name ?? item.courseCode}
                      </strong>
                      <span>{item.examDate ? dateLabel(item.examDate) : '日期待确认'}</span>
                    </div>
                    <small>
                      {item.status === 'TODAY'
                        ? '今天'
                        : item.status === 'FINISHED'
                          ? '已结束'
                          : item.daysRemaining != null
                            ? `${item.daysRemaining} 天`
                            : '—'}
                    </small>
                  </div>
                ))}
                {!data.countdowns.length && (
                  <p className="inline-empty">报考科目后，在这里查看考试安排。</p>
                )}
                <div className="study-tools">
                  <h3>学习工具</h3>
                  <Link to="/study/training">
                    练习与能力检测 <ArrowRight size={15} />
                  </Link>
                  <Link to="/study/notes">
                    学习笔记 <ArrowRight size={15} />
                  </Link>
                  <Link to="/study/schedule">
                    查看学习计划 <ArrowRight size={15} />
                  </Link>
                </div>
              </aside>
            </div>
          </>
        )
      )}
    </section>
  );
}
export const Component = DashboardPage;
