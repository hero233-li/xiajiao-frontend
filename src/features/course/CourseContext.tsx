import { createContext, useContext, useEffect, useRef, type PropsWithChildren } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { NavLink, Link } from '../cycle/navigation';
import { useCycle } from '../cycle/CycleContext';
import { useCatalogCourse } from '../../api/catalog';
import { useDashboard } from '../../api/dashboard';
import type { Course } from '../../api/generated/models';
import { Breadcrumb } from '../../components/Breadcrumb';
import { ApiError } from '../../api/errors';
const CourseContext = createContext<Course | null>(null);
export const useCourse = () => useContext(CourseContext);
export function CourseFrame({ children }: PropsWithChildren) {
  const { code = '' } = useParams();
  const location = useLocation();
  const frame = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLElement>(null);
  const cycle = useCycle();
  const query = useCatalogCourse(code, cycle?.cycleId ?? '');
  const dashboard = useDashboard(cycle?.cycleId ? { cycleId: cycle.cycleId } : undefined);
  useEffect(() => {
    if (!head.current || !frame.current) return;
    const measure = () =>
      frame.current?.style.setProperty(
        '--course-head-height',
        `${head.current?.getBoundingClientRect().height ?? 0}px`,
      );
    measure();
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(head.current);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [query.data, location.pathname]);
  if (cycle?.pending || (query.isPending && !!cycle?.cycleId))
    return <p role="status">正在加载课程…</p>;
  if (!cycle?.cycleId)
    return (
      <section className="state">
        <h1>
          {cycle?.error
            ? '考试周期加载失败'
            : cycle?.cycles.length
              ? '找不到这个考试周期'
              : '暂无考试周期'}
        </h1>
        <Link to="/study">返回备考总览</Link>
      </section>
    );
  if (query.isError && !query.data)
    return (
      <section className="state">
        <h1>
          {query.error instanceof ApiError && query.error.status === 404
            ? '课程不存在'
            : '课程加载失败'}
        </h1>
        <p>请返回我的科目选择课程，或稍后重试。</p>
        <Link to="/study/courses">我的科目</Link>
        <button onClick={() => void query.refetch()}>重试</button>
      </section>
    );
  const course = query.data;
  if (!course) return null;
  const countdown = dashboard.data?.countdowns.find((c) => c.courseId === course.id);
  const tabs = [
    ['catalog', '阅读与进度'],
    ['knowledge', '知识索引'],
    ['practice', '练习与检测'],
    ['exams', '真题与成绩'],
    ['notes', '课程笔记'],
    ...(course.capabilities.manual ? [['manual', '实践手册']] : []),
  ].filter(
    ([path]) => path === 'notes' || course.capabilities[path as keyof Course['capabilities']],
  );
  return (
    <CourseContext.Provider value={course}>
      <div ref={frame} className="study-course-frame">
        <header ref={head} className="study-course-heading">
          <Breadcrumb
            items={[
              { label: '今日学习', to: '/study' },
              { label: '学习书架', to: '/study/courses' },
              { label: course.name },
            ]}
          />
          <div className="study-course-title">
            <div>
              <h1>{course.name}</h1>
              <p className="secondary">
                课程代码 {course.code}
                {countdown && (
                  <>
                    {' '}
                    ·{' '}
                    {countdown.status === 'TODAY'
                      ? '今天考试'
                      : countdown.status === 'FINISHED'
                        ? '考试已结束'
                        : countdown.daysRemaining !== null
                          ? `距考试 ${countdown.daysRemaining} 天`
                          : '考试日期待确认'}
                  </>
                )}
              </p>
            </div>
            <div className="study-course-meter">
              目录完成 {course.progress.percent}%<br />
              <small>
                {course.progress.completedItems} / {course.progress.totalItems} 项
              </small>
            </div>
          </div>
          <nav aria-label="课程页面" className="study-course-tabs">
            {tabs.map(([path, title]) => (
              <NavLink key={path} to={`/study/course/${code}/${path}`}>
                {title}
              </NavLink>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </CourseContext.Provider>
  );
}
