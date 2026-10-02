import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { CycleProvider, CyclePicker, useCycle, cycleKey } from './CycleContext';
import { Link } from './navigation';
import type { ExamCycle } from '../../api/generated/models';
const now: ExamCycle = {
  id: '0ebdbbfe-d607-54b5-9c21-4e0adade5e4c',
  name: '当前周期',
  startDate: '2026-10-01',
  endDate: '2099-10-31',
  timezone: 'Asia/Shanghai',
  courses: [],
};
const later: ExamCycle = {
  ...now,
  id: '7654243a-0494-4623-acd8-efea36830a6b',
  name: '另一周期',
  startDate: '2099-11-01',
  endDate: '2099-11-30',
};
function Page() {
  const cycle = useCycle();
  return (
    <>
      <CyclePicker />
      <p data-testid="selected">{cycle?.selected?.name}</p>
      <Link to="/zikao/course/00023/catalog">课程</Link>
    </>
  );
}
function mount(path = '/zikao') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <CycleProvider>
            <Page />
          </CycleProvider>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}
function handler(items: ExamCycle[]) {
  server.use(
    http.get('/api/v1/exams/cycles', () =>
      HttpResponse.json({
        code: 0,
        message: 'ok',
        data: { items, page: 1, size: 100, total: items.length },
      }),
    ),
  );
}
describe('周期上下文', () => {
  it('切换后保存选择，短参数支持后退和前进', async () => {
    localStorage.clear();
    handler([now, later]);
    const router = mount();
    await waitFor(() => expect(screen.getByTestId('selected')).toHaveTextContent('当前周期'));
    await userEvent.selectOptions(screen.getByLabelText('考试周期'), later.id);
    await waitFor(() => expect(router.state.location.search).toBe(`?cycle=${cycleKey(later)}`));
    expect(screen.getByRole('link', { name: '课程' })).toHaveAttribute(
      'href',
      `/zikao/course/00023/catalog?cycle=${cycleKey(later)}`,
    );
    expect(localStorage.getItem('learning.exam-cycle')).toBe(later.id);
    await act(() => router.navigate(-1));
    await waitFor(() => expect(screen.getByTestId('selected')).toHaveTextContent('当前周期'));
    await act(() => router.navigate(1));
    await waitFor(() => expect(screen.getByTestId('selected')).toHaveTextContent('另一周期'));
  });
  it('新会话恢复本地选择并转换旧 UUID 深链接', async () => {
    localStorage.setItem('learning.exam-cycle', later.id);
    handler([now, later]);
    const router = mount(`/zikao?cycleId=${later.id}`);
    await waitFor(() => expect(router.state.location.search).toBe(`?cycle=${cycleKey(later)}`));
    expect(screen.getByTestId('selected')).toHaveTextContent('另一周期');
  });
  it('枚举分页后才确定默认周期，避免漏掉第二页当前周期', async () => {
    localStorage.clear();
    server.use(
      http.get('/api/v1/exams/cycles', ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('page'));
        return HttpResponse.json({
          code: 0,
          message: 'ok',
          data: { items: page === 1 ? [later] : [now], page, size: 1, total: 2 },
        });
      }),
    );
    mount();
    await waitFor(() => expect(screen.getByTestId('selected')).toHaveTextContent('当前周期'));
  });
});
