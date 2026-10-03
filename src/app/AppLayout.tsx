import { CycleProvider } from '../features/cycle/CycleContext';
import { CourseFrame } from '../features/course/CourseContext';
import { lazy, Suspense, useEffect } from 'react';
import { Outlet, useMatch, useLocation } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
const CourseQuickNote = lazy(() => import('../features/notes/CourseQuickNote'));
export function AppLayout() {
  return (
    <CycleProvider>
      <Layout />
    </CycleProvider>
  );
}
function Layout() {
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname;
    const title = path.includes('/practice/')
      ? '章节练习'
      : path.includes('/tests/')
        ? path.endsWith('/result')
          ? '检测结果'
          : '检测作答'
        : path.endsWith('/catalog')
          ? '阅读与进度'
          : path.endsWith('/knowledge')
            ? '知识索引'
            : path.endsWith('/manual')
              ? '实践手册'
              : path.endsWith('/exams')
                ? '真题与成绩'
                : path.endsWith('/notes')
                  ? '学习笔记'
                  : path.endsWith('/courses')
                    ? '学习书架'
                    : path.endsWith('/schedule')
                      ? '学习计划'
                      : path.endsWith('/training')
                        ? '练习与检测'
                        : '今日学习';
    document.title = `${title} · 学习知途`;
  }, [location.pathname]);
  const course = useMatch('/zikao/course/:code/*');
  const chapter = useMatch('/zikao/course/:code/practice/:chapterId');
  const test = useMatch('/zikao/course/:code/tests/*');
  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <AppHeader />
      <main
        id="main-content"
        className={`desk-main ${chapter || test ? 'desk-focus' : ''}`}
        tabIndex={-1}
      >
        {course && (chapter || test) && (
          <div className="focus-note-action">
            <Suspense fallback={null}>
              <CourseQuickNote key={course.params.code} code={course.params.code ?? ''} />
            </Suspense>
          </div>
        )}
        {course && !chapter && !test ? (
          <CourseFrame>
            <Outlet />
          </CourseFrame>
        ) : (
          <Outlet />
        )}
      </main>
      {course && !chapter && !test && (
        <Suspense fallback={null}>
          <CourseQuickNote key={course.params.code} code={course.params.code ?? ''} />
        </Suspense>
      )}
    </>
  );
}
