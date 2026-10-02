import { useEffect } from 'react';
import { AlarmClock, ArrowRight, CalendarDays, NotebookPen, Sparkles } from 'lucide-react';
import { CyclePicker, useCycle } from '../features/cycle/CycleContext';
import { usePlan } from '../api/schedule';
import { Link, useSearchParams } from '../features/cycle/navigation';
import { useDashboard } from '../api/dashboard';
import type { Dashboard, Plan } from '../api/generated/models';
import { CourseCard } from '../components/dashboard/CourseCard';
import { ProgressBar } from '../components/dashboard/ProgressBar';
import { RegionState } from '../components/dashboard/RegionState';
import {
  dateLabel,
  learningTargetPath,
  orderedExams,
  todayPlanState,
} from '../features/dashboard/navigation';
import '../features/dashboard/dashboard.css';

export function DashboardPage() {
  const [params] = useSearchParams();
  const cycle = useCycle();
  const cycleId = params.get('cycleId') || undefined;
  const planId = params.get('planId') || undefined;
  const query = useDashboard(cycleId ? { cycleId, ...(planId ? { planId } : {}) } : undefined);
  const suffix = params.size ? `?${params}` : '';
  const plan = usePlan(query.data?.selectedPlanId ?? '');
  // A plan detail failure should not hide the dashboard snapshot or its learning action.
  const selectedPlan = plan.data?.config.cycleId === cycleId ? plan.data : undefined;
  useEffect(() => {
    const previous = document.title;
    document.title = '备考总览 · 学习知途';
    return () => {
      document.title = previous;
    };
  }, []);

  let state = null;
  if (cycle?.pending) state = <RegionState kind="loading" message="正在加载考试周期…" />;
  else if (cycle?.error)
    state = <RegionState kind="error" message="考试周期加载失败，请重试。" retry={cycle.retry} />;
  else if (!cycleId)
    state = (
      <RegionState
        kind="empty"
        message={cycle?.cycles.length ? '找不到这个考试周期，请选择其他周期。' : '暂无考试周期。'}
      />
    );
  else if (query.isError)
    state = (
      <RegionState
        kind="error"
        message="备考数据加载失败，请重试。"
        retry={() => void query.refetch()}
      />
    );
  else if (query.isPending) state = <RegionState kind="loading" message="正在加载备考数据…" />;
  const data = query.data;

  return (
    <section className="ov-page ov-dashboard" aria-labelledby="dashboard-title">
      <header className="ov-heading">
        <div>
          <p className="ov-kicker">学习知途</p>
          <h1 id="dashboard-title">备考总览</h1>
          <p className="ov-small ov-current-cycle">
            {cycle?.selected?.name ?? '选择考试周期，开始备考'}
          </p>
        </div>
        <div className="ov-heading-actions">
          <CyclePicker />
          <Link
            className="ov-button ov-secondary ov-icon"
            to={`/zikao/notes${suffix}`}
            aria-label="打开学习备注"
          >
            <NotebookPen aria-hidden="true" />
          </Link>
        </div>
      </header>
      {state ??
        (data && (
          <>
            <section className="ov-card ov-suggestion" aria-labelledby="suggestion-heading">
              <h2 id="suggestion-heading">
                <Sparkles aria-hidden="true" />
                今日优先任务
              </h2>
              <TodayLearning data={data} plan={selectedPlan} suffix={suffix} />
              {data.selectedPlanId &&
                (plan.isError ? (
                  <RegionState
                    kind="error"
                    message="计划详情加载失败，学习入口仍可使用。"
                    retry={() => void plan.refetch()}
                  />
                ) : plan.isPending ? (
                  <p className="ov-small" role="status">
                    正在加载计划详情…
                  </p>
                ) : null)}
            </section>
            <section className="ov-card ov-countdown" aria-labelledby="countdown-heading">
              <div className="ov-section-heading">
                <h2 id="countdown-heading">
                  <AlarmClock aria-hidden="true" />
                  最近考试
                </h2>
                <p className="ov-small">按日期排列，待确认日期列于末尾</p>
              </div>
              <CountdownContent data={data} />
            </section>
            <section className="ov-card ov-overall" aria-labelledby="progress-heading">
              <div className="ov-row">
                <h2 id="progress-heading">整体目录进度</h2>
                <strong>
                  {data.overallProgress.completedItems} / {data.overallProgress.totalItems} 项已完成
                  · {data.overallProgress.percent}%
                </strong>
              </div>
              <p className="ov-small ov-progress-scope">
                首版六科当前已发布目录的汇总进度，不随考试周期或学习计划改变。
              </p>
              {data.overallProgress.totalItems === 0 ? (
                <RegionState kind="empty" message="暂无已发布目录条目。" />
              ) : (
                <ProgressBar progress={data.overallProgress} label="整体目录进度" />
              )}
            </section>
            <section aria-labelledby="courses-heading">
              <div className="ov-section-heading">
                <div>
                  <h2 id="courses-heading">本周期课程</h2>
                  <p className="ov-small">
                    {data.courses.length} 门课程 · 进度按各课当前已发布目录统计
                  </p>
                </div>
                <Link className="ov-text-link" to={`/zikao/courses${suffix}`}>
                  查看全部
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
              {data.courses.length ? (
                <div className="ov-course-grid">
                  {data.courses.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      cycleId={cycleId!}
                      exam={data.cycle?.courses.find((exam) => exam.courseId === course.id)}
                      position={data.continueLearning}
                    />
                  ))}
                </div>
              ) : (
                <RegionState
                  kind="empty"
                  message="当前周期暂无科目。"
                  href={`/zikao/courses${suffix}`}
                />
              )}
            </section>
          </>
        ))}
    </section>
  );
}

function TodayLearning({ data, plan, suffix }: { data: Dashboard; plan?: Plan; suffix: string }) {
  const suggestion = data.todaySuggestion;
  // The aggregate can contain a recent position outside the selected cycle.
  const position =
    data.continueLearning &&
    data.courses.some(
      (course) =>
        course.id === data.continueLearning?.courseId &&
        course.code === data.continueLearning.target.courseCode,
    )
      ? data.continueLearning
      : null;
  const distinctPosition =
    position &&
    (!suggestion || learningTargetPath(position.target) !== learningTargetPath(suggestion.target));
  const planState = todayPlanState(plan, data.localDate);
  const day = plan
    ? Math.floor((Date.parse(data.localDate) - Date.parse(plan.config.startDate)) / 86400000) + 1
    : 0;
  const planDays = plan
    ? Math.floor((Date.parse(plan.config.endDate) - Date.parse(plan.config.startDate)) / 86400000) +
      1
    : 0;
  const planLabel =
    plan && day > 0 && day <= planDays
      ? `来自学习安排 · 第 ${day} / ${planDays} 天`
      : '来自学习安排';

  if (!suggestion) {
    const message = !data.selectedPlanId
      ? '还没有学习计划，可先继续学习或查看学习安排。'
      : planState === 'completed'
        ? '今日计划任务已全部完成。'
        : planState === 'empty'
          ? '今天没有计划任务，可按自己的节奏学习。'
          : data.todaySuggestionMessage;
    return (
      <div className="ov-today-content">
        <div>
          <h3>{message}</h3>
          {position && <p className="ov-small ov-position-title">上次学习：{position.title}</p>}
        </div>
        <div className="ov-today-actions">
          {position ? (
            <Link className="ov-button ov-primary" to={learningTargetPath(position.target)}>
              继续上次位置
              <ArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <Link className="ov-button ov-primary" to={`/zikao/courses${suffix}`}>
              选择课程开始学习
              <ArrowRight aria-hidden="true" />
            </Link>
          )}
          <Link className="ov-text-link" to={`/zikao/schedule${suffix}`}>
            查看学习安排
          </Link>
        </div>
      </div>
    );
  }

  const course = data.courses.find((course) => course.code === suggestion.target.courseCode);
  return (
    <div className="ov-today-content">
      <div>
        <h3>{suggestion.title}</h3>
        <p className="ov-small">
          {course?.name ?? `课程 ${suggestion.target.courseCode}`} · {planLabel}
        </p>
        {distinctPosition && (
          <p className="ov-small ov-position-title">
            上次学习：{position.title}。今日安排与上次位置不同，可选择从哪里继续。
          </p>
        )}
      </div>
      <div className="ov-today-actions">
        <Link className="ov-button ov-primary" to={learningTargetPath(suggestion.target)}>
          按计划学习
          <ArrowRight aria-hidden="true" />
        </Link>
        {distinctPosition && (
          <Link className="ov-text-link" to={learningTargetPath(position.target)}>
            继续上次位置
          </Link>
        )}
      </div>
    </div>
  );
}

function CountdownContent({ data }: { data: Dashboard }) {
  if (!data.cycle || !data.countdowns.length)
    return <RegionState kind="empty" message="暂无考试倒计时安排。" />;
  return (
    <>
      <div className="ov-exam-table">
        <div className="ov-exam-table-head" aria-hidden="true">
          <span>科目</span>
          <span>考试日期</span>
          <span>倒计时</span>
        </div>
        <ul className="ov-countdown-list">
          {orderedExams(data).map((item) => {
            const course = data.courses.find((course) => course.id === item.courseId);
            const exam = data.cycle?.courses.find((exam) => exam.courseId === item.courseId);
            const date = item.examDate ?? exam?.examDate;
            const type =
              course?.courseType === 'THEORY'
                ? '理论课'
                : course?.courseType === 'PRACTICE'
                  ? '实践课'
                  : '';
            const status =
              item.status === 'UPCOMING'
                ? item.daysRemaining === null
                  ? '倒计时待确认'
                  : `剩余 ${item.daysRemaining} 天`
                : item.status === 'TODAY'
                  ? '今天考试'
                  : item.status === 'FINISHED'
                    ? '考试已结束'
                    : '日期待确认';
            return (
              <li key={item.courseId}>
                <div className="ov-exam-course">
                  <span>{course?.name ?? item.courseCode}</span>
                  <span className="ov-small">{type}</span>
                </div>
                <span className="ov-small ov-exam-date">
                  {date ? (
                    <>
                      {dateLabel(date)}
                      {exam?.startsAt ? ` ${exam.startsAt.slice(0, 5)}` : ' · 时间待确认'}
                    </>
                  ) : (
                    '考试日期待确认'
                  )}
                </span>
                <strong className={`ov-status-${item.status}`}>{status}</strong>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="ov-small ov-exam">
        <CalendarDays aria-hidden="true" />
        考试周期 {dateLabel(data.cycle.startDate)}–{dateLabel(data.cycle.endDate)}
      </p>
    </>
  );
}

export { DashboardPage as Component };
