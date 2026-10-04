import { CycleProvider } from '../features/cycle/CycleContext';
import { CourseFrame } from '../features/course/CourseContext';
import { lazy, Suspense } from 'react';
import { Outlet, useMatch, useLocation } from 'react-router-dom';

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
  const course = useMatch('/study/course/:code/*');
  const chapter = useMatch('/study/course/:code/practice/:chapterId');
  const test = useMatch('/study/course/:code/tests/*');
  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>

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
            {location.pathname.endsWith('/exams') && (
              <div className="exam-note-action">
                <Suspense fallback={null}>
                  <CourseQuickNote key={course.params.code} code={course.params.code ?? ''} />
                </Suspense>
              </div>
            )}
            <Outlet />
          </CourseFrame>
        ) : (
          <Outlet />
        )}
      </main>
      {course && !chapter && !test && !location.pathname.endsWith('/exams') && (
        <Suspense fallback={null}>
          <CourseQuickNote key={course.params.code} code={course.params.code ?? ''} />
        </Suspense>
      )}
    </>
  );
}
