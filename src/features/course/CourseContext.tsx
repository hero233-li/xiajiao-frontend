import { createContext, useContext, useEffect, useRef, type PropsWithChildren } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { NavLink, Link } from '../cycle/navigation';
import { useCycle } from '../cycle/CycleContext';
import { useCatalogCourse } from '../../api/catalog';
import type { Course } from '../../api/generated/models';
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
  const tabs = [
    ['catalog', '阅读'],
    ['knowledge', '知识'],
    ['practice', '练习与检测'],
    ['exams', '真题与成绩'],
    ['notes', '笔记'],
    ['manual', '手册'],
  ].filter(
    ([path]) => path === 'notes' || course.capabilities[path as keyof Course['capabilities']],
  );
  return (
    <CourseContext.Provider value={course}>
      <div ref={frame} className="course-workspace">
        <header ref={head} className="course-context-row">
          <Link to="/study/courses" className="course-back">
            ← 课程清单
          </Link>
          <div>
            <strong>{course.name}</strong>
            <span>
              {course.code} · 已完成 {course.progress.completedItems} / {course.progress.totalItems}{' '}
              项
            </span>
          </div>
          <progress aria-label="课程完成度" value={course.progress.percent} max={100} />
        </header>
        <nav className="course-tools" aria-label="课程页面">
          {tabs.map(([path, title]) => (
            <NavLink key={path} to={`/study/course/${code}/${path}`}>
              {title}
            </NavLink>
          ))}
        </nav>
        {children}
      </div>
    </CourseContext.Provider>
  );
}
