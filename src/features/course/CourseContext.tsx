import { createContext, useContext, type PropsWithChildren } from 'react';
import { useParams } from 'react-router-dom';
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
  const cycle = useCycle();
  const query = useCatalogCourse(code, cycle?.cycleId ?? '');
  const dashboard = useDashboard(cycle?.cycleId ? { cycleId: cycle.cycleId } : undefined);
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
        <Link to="/zikao">返回备考总览</Link>
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
        <Link to="/zikao/courses">我的科目</Link>
        <button onClick={() => void query.refetch()}>重试</button>
      </section>
    );
  const course = query.data;
  if (!course) return null;
  const countdown = dashboard.data?.countdowns.find((c) => c.courseId === course.id);
  const tabs = [
    ['catalog', '学习目录'],
    ['knowledge', '知识合集'],
    ['practice', '刷题'],
    ['exams', '历年试卷'],
    ['notes', '备注'],
    ...(course.capabilities.manual ? [['manual', '实践手册']] : []),
  ];
  return (
    <CourseContext.Provider value={course}>
      <header className="course-frame-head">
        <Breadcrumb
          items={[
            { label: '备考总览', to: '/zikao' },
            { label: '我的科目', to: '/zikao/courses' },
            { label: course.name },
          ]}
        />
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
        <nav aria-label="课程页面" className="course-tabs">
          {tabs.map(([path, title]) => (
            <NavLink key={path} to={`/zikao/course/${code}/${path}`}>
              {title}
            </NavLink>
          ))}
        </nav>
      </header>
      {children}
    </CourseContext.Provider>
  );
}
