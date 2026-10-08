import { CycleProvider } from '../features/cycle/CycleContext';
import { CourseFrame } from '../features/course/CourseContext';
import { lazy, Suspense } from 'react';
import { Outlet, useMatch } from 'react-router-dom';

const CourseQuickNote = lazy(() => import('../features/notes/CourseQuickNote'));
export function AppLayout() {
  return (
    <CycleProvider>
      <Layout />
    </CycleProvider>
  );
}
function Layout() {
  const course = useMatch('/study/course/:code/*');
  const chapter = useMatch('/study/course/:code/practice/:chapterId');
  const test = useMatch('/study/course/:code/tests/*');
  return (
    <>
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
            <div className="course-note-action">
              <Suspense fallback={null}>
                <CourseQuickNote key={course.params.code} code={course.params.code ?? ''} />
              </Suspense>
            </div>
            <Outlet />
          </CourseFrame>
        ) : (
          <Outlet />
        )}
      </main>
    </>
  );
}
