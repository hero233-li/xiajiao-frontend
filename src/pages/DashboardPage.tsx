import { CyclePicker, useCycle } from '../features/cycle/CycleContext';
import { usePlan } from '../api/schedule';
import { Link, NavLink, useSearchParams } from '../features/cycle/navigation';
import { AlarmClock, ArrowRight, CalendarDays, NotebookPen, Sparkles } from 'lucide-react';
import { useDashboard } from '../api/dashboard';
import type { Dashboard } from '../api/generated/models';
import { CourseCard } from '../components/dashboard/CourseCard';
import { ProgressBar } from '../components/dashboard/ProgressBar';
import { RegionState } from '../components/dashboard/RegionState';
import { dateLabel, learningTargetPath } from '../features/dashboard/navigation';
import '../features/dashboard/dashboard.css';

export function DashboardPage() {
  const [params] = useSearchParams();
  const cycle = useCycle();
  const cycleId = params.get('cycleId') || undefined;
  const planId = params.get('planId') || undefined;
  const query = useDashboard(cycleId ? { cycleId, ...(planId ? { planId } : {}) } : undefined);
  const suffix = params.size ? `?${params}` : '';
  const plan = usePlan(query.data?.selectedPlanId ?? '');
  const planDay = plan.data && query.data ? Math.floor((Date.parse(query.data.localDate) - Date.parse(plan.data.config.startDate)) / 86400000) + 1 : 0;
  const state = query.isError ? (
    <RegionState
      kind="error"
      message="备考数据加载失败，请重试。"
      retry={() => void query.refetch()}
    />
  ) : query.isPending ? (
    <RegionState kind="loading" message="正在加载备考数据…" />
  ) : null;
  return (
    <section className="ov-page" aria-label="备考总览">
      <header className="ov-heading">
        <div>
          <p className="ov-kicker">学习知途 · 备考总览</p>
          <h1>一步一步，学有所成。</h1>
        </div>
        <CyclePicker />
        <Link
          className="ov-button ov-secondary ov-icon"
          to={`/zikao/notes${suffix}`}
          aria-label="打开学习备注"
        >
          <NotebookPen aria-hidden="true" />
        </Link>
      </header>
      {cycle?.pending ? <RegionState kind="loading" message="正在加载考试周期…" /> : cycle?.error ? <RegionState kind="error" message="考试周期加载失败，请重试。" retry={cycle.retry} /> : !cycleId ? <RegionState kind="empty" message={cycle?.cycles.length ? '找不到这个考试周期，请选择其他周期。' : '暂无考试周期。'} href="/zikao/courses" action="查看我的科目" /> : state ? state : <>
      <div className="ov-top-grid">
        <section
          className="ov-card ov-countdown"
          aria-busy={!!cycleId && query.isPending}
          aria-labelledby="countdown-heading"
        >
          <h2 id="countdown-heading">
            <AlarmClock aria-hidden="true" />
            考试倒计时
          </h2>
          {state ?? (query.data && <CountdownContent data={query.data} />)}
        </section>
        <section
          className="ov-card ov-suggestion"
          aria-busy={!!cycleId && query.isPending}
          aria-labelledby="suggestion-heading"
        >
          <h2 id="suggestion-heading">
            <Sparkles aria-hidden="true" />
            今日计划
          </h2>
          {state ??
            (query.data?.todaySuggestion ? (
              <>
                <h3>{query.data.todaySuggestion.title}</h3>
                <p className="ov-small">来自 35 天安排{planDay > 0 ? ` · 第 ${planDay} 天` : ''}</p>
                {query.data.continueLearning?.target.pane === 'CATALOG' && query.data.continueLearning.target.courseCode === query.data.todaySuggestion.target.courseCode && JSON.stringify(query.data.continueLearning.target) !== JSON.stringify(query.data.todaySuggestion.target) && <><p>你的目录进度在 {query.data.continueLearning.title}，今日计划安排的是 {query.data.todaySuggestion.title}。</p><Link className="ov-button ov-secondary" to={learningTargetPath(query.data.continueLearning.target, cycleId!)}>继续上次位置</Link></>}
                <p className="ov-small">
                  {query.data.courses.find(
                    (c) => c.code === query.data?.todaySuggestion?.target.courseCode,
                  )?.name ?? `课程 ${query.data.todaySuggestion.target.courseCode}`}
                </p>
                <Link
                  className="ov-button ov-primary"
                  to={learningTargetPath(query.data.todaySuggestion.target, cycleId!)}
                >
                  按计划学习
                  <ArrowRight aria-hidden="true" />
                </Link>
              </>
            ) : (
              <RegionState
                kind="empty"
                message={query.data?.todaySuggestionMessage ?? '暂无今日安排'}
                href={`/zikao/schedule${suffix}`}
                action="查看 35 天安排"
              />
            ))}
        </section>
      </div>
      <section
        className="ov-card ov-overall"
        aria-busy={!!cycleId && query.isPending}
        aria-labelledby="progress-heading"
      >
        <div className="ov-row">
          <h2 id="progress-heading">目录完成度</h2>
          {query.data && !state && (
            <strong>
              {query.data.overallProgress.completedItems} / {query.data.overallProgress.totalItems}{' '}
              项已完成
            </strong>
          )}
        </div>
        {state ??
          (query.data &&
            (query.data.overallProgress.totalItems === 0 ? (
              <RegionState kind="empty" message="暂无已发布目录条目。" />
            ) : (
              <ProgressBar progress={query.data.overallProgress} label="目录完成度" />
            )))}
      </section>
      <nav className="ov-tabs" aria-label="备考页面">
        {[
          ['/zikao', '备考总览'],
          ['/zikao/courses', '我的科目'],
          ['/zikao/schedule', '35 天安排'],
          ['/zikao/notes', '学习备注'],
        ].map(([path, label]) => (
          <NavLink key={path} end to={`${path}${suffix}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <section aria-labelledby="courses-heading">
        <div className="ov-section-heading">
          <h2 id="courses-heading">最近考试的科目</h2>
          <Link className="ov-text-link" to={`/zikao/courses${suffix}`}>
            查看全部
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        {state ??
          (query.data?.courses.length ? (
            <div className="ov-course-grid">
              {query.data.courses.slice(0, 3).map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  cycleId={cycleId!}
                  exam={query.data.cycle?.courses.find((exam) => exam.courseId === course.id)}
                  position={query.data.continueLearning}
                />
              ))}
            </div>
          ) : (
            <RegionState
              kind="empty"
              message="当前周期暂无科目。"
              href={`/zikao/courses${suffix}`}
            />
          ))}
      </section>
      </>}
    </section>
  );
}
function CountdownContent({ data }: { data: Dashboard }) {
  // 契约仅提供逐科倒计时，因此全部展示，不推导一个聚合理论倒计时。
  if (!data.cycle || !data.countdowns.length)
    return <RegionState kind="empty" message="暂无考试倒计时安排。" />;
  return (
    <>
      <ul className="ov-countdown-list">
        {data.countdowns.map((item) => {
          const course = data.courses.find((c) => c.id === item.courseId);
          const exam = data.cycle?.courses.find((c) => c.courseId === item.courseId);
          const type =
            course?.courseType === 'THEORY'
              ? '理论'
              : course?.courseType === 'PRACTICE'
                ? '实践'
                : '';
          return (
            <li key={item.courseId}>
              <div>
                <span>{course?.name ?? item.courseCode}</span>
                <p className="ov-small">
                  {exam?.examDate ? `${dateLabel(exam.examDate)} ${type}课` : `${type}课日期待确认`}
                </p>
              </div>
              <strong className={`ov-status-${item.status}`}>
                {item.status === 'UPCOMING'
                  ? item.daysRemaining === null
                    ? '倒计时待确认'
                    : `距${type}考试 ${item.daysRemaining} 天`
                  : item.status === 'TODAY'
                    ? '今天考试'
                    : item.status === 'FINISHED'
                      ? '考试已结束'
                      : '日期待确认'}
              </strong>
            </li>
          );
        })}
      </ul>
      <p className="ov-small ov-exam">
        <CalendarDays aria-hidden="true" />
        考试周期 {dateLabel(data.cycle.startDate)}–{dateLabel(data.cycle.endDate)} ·{' '}
        {data.cycle.name}
      </p>
    </>
  );
}

export { DashboardPage as Component };
