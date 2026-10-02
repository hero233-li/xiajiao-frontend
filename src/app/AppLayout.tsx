import { CapabilityDebug } from '../features/capabilities/CapabilityDebug';
import { CycleProvider } from '../features/cycle/CycleContext';
import { CourseFrame } from '../features/course/CourseContext';
import { lazy, Suspense } from 'react';
import { Outlet, useMatch } from 'react-router-dom';

import { AppHeader } from '../components/AppHeader';
import { PageContainer } from '../components/PageContainer';
const CourseQuickNote = lazy(() => import('../features/notes/CourseQuickNote'));
export function AppLayout() { return <CycleProvider><Layout /></CycleProvider>; }
function Layout() {
  const course = useMatch('/zikao/course/:code/*');
  const chapter = useMatch('/zikao/course/:code/practice/:chapterId');
  const test = useMatch('/zikao/course/:code/tests/*');
  return <><a className="skip-link" href="#main-content">跳到主要内容</a><AppHeader /><main id="main-content" tabIndex={-1}><PageContainer size={chapter || test ? 'practice' : course ? 'course' : 'list'}>{course && !chapter && !test ? <CourseFrame><Outlet /></CourseFrame> : <Outlet />}</PageContainer></main><CapabilityDebug />{course && <Suspense fallback={<p role="status">正在加载快速备注…</p>}><CourseQuickNote key={course.params.code} code={course.params.code ?? ''} /></Suspense>}</>;
}
