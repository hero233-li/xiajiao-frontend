import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { CourseFrame } from '../course/CourseContext';
import { routeTitle } from '../../app/navigation';
import { studyRoutes } from '../../spaces/modules/study-routes';
import { learningTargetPath } from '../dashboard/navigation';
const mock = vi.hoisted(() => ({ knowledge: false }));
vi.mock('../../api/catalog', () => ({
  useCatalogCourse: () => ({
    data: {
      id: 'course',
      code: '00023',
      name: '高等数学',
      progress: { completedItems: 0, totalItems: 1, percent: 0 },
      capabilities: {
        knowledge: mock.knowledge,
        catalog: true,
        practice: true,
        exams: true,
        manual: false,
      },
    },
  }),
}));
vi.mock('../cycle/CycleContext', () => ({
  useCycle: () => ({ cycleId: 'cycle' }),
  cycleKey: () => 'cycle',
}));
beforeEach(() => {
  mock.knowledge = false;
});
function mount() {
  return render(
    <MemoryRouter initialEntries={['/study/course/00023/knowledge']}>
      <Routes>
        <Route
          path="/study/course/:code/*"
          element={
            <CourseFrame>
              <p>页面内容</p>
            </CourseFrame>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}
it('hides the analysis and reference tabs from the course page', () => {
  mount();
  const nav = screen.getByRole('navigation', { name: '课程页面' });
  expect(within(nav).queryByRole('link', { name: '知识点梳理' })).not.toBeInTheDocument();
  expect(within(nav).queryByRole('link', { name: '参考知识' })).not.toBeInTheDocument();
});
it('keeps the reference route reachable without a course tab entry', () => {
  mock.knowledge = true;
  mount();
  const nav = screen.getByRole('navigation', { name: '课程页面' });
  expect(within(nav).queryByRole('link', { name: '参考知识' })).not.toBeInTheDocument();
  expect(studyRoutes.find((route) => route.path === '/study/course/:code/reference')).toBeTruthy();
});
it('keeps old structured KNOWLEDGE learning targets in the reference library with their stable module ID', () => {
  const path = learningTargetPath({
    pane: 'KNOWLEDGE',
    courseCode: '00023',
    chapterId: null,
    itemId: 'stable-module-id',
    questionId: null,
  });
  expect(path).toBe('/study/course/00023/reference?moduleId=stable-module-id');
});
it('preserves the old route and provides a separate reference route with consistent titles', () => {
  expect(routeTitle('/study/course/00023/knowledge', '')).toBe('知识点梳理');
  expect(routeTitle('/study/course/00023/reference', '')).toBe('参考知识');
  const analysis = studyRoutes.find((route) => route.path === '/study/course/:code/knowledge');
  const reference = studyRoutes.find((route) => route.path === '/study/course/:code/reference');
  expect(analysis?.handle.title).toBe('知识点梳理');
  expect(reference?.handle.title).toBe('参考知识');
  expect(analysis?.lazy).toBeTypeOf('function');
  expect(reference?.lazy).toBeTypeOf('function');
});
