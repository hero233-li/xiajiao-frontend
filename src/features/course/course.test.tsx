import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { renderRoute, startDemoSession } from '../../test/helpers';
import operations from '../../mocks/generated.json';
const dashboard = operations.find((x) => x.operationId === 'getDashboard')!.example
  .data as unknown as {
  cycle: { id: string; name: string; startDate: string; endDate: string; timezone: string };
};
const cycle = dashboard.cycle;
beforeEach(() => {
  localStorage.clear();
  server.use(
    http.get('/api/v1/exams/cycles', () =>
      HttpResponse.json({
        code: 0,
        message: 'ok',
        data: { items: [cycle], page: 1, size: 100, total: 1 },
      }),
    ),
  );
});
it('课程框架保留五位代码，标签支持前进后退', async () => {
  await startDemoSession();
  const { router } = renderRoute('/study/course/00023/catalog');
  const tabs = await screen.findByRole('navigation', { name: '课程页面' });
  expect(await screen.findByText('00023 · 已完成', { exact: false })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '← 课程清单' })).toHaveAttribute(
    'href',
    '/study/courses',
  );
  expect(within(tabs).getAllByRole('link')).toHaveLength(5);
  await userEvent.click(within(tabs).getByRole('link', { name: '真题与成绩' }));
  await waitFor(() => expect(router.state.location.pathname).toBe('/study/course/00023/exams'));
  expect(within(tabs).getByRole('link', { name: '真题与成绩' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await act(() => router.navigate(-1));
  await waitFor(() =>
    expect(
      within(screen.getByRole('navigation', { name: '课程页面' })).getByRole('link', {
        name: '阅读',
      }),
    ).toHaveAttribute('aria-current', 'page'),
  );
  await act(() => router.navigate(1));
  await waitFor(() => expect(router.state.location.pathname).toBe('/study/course/00023/exams'));
  await screen.findByRole('heading', { name: '历年试卷' });
  await waitFor(() => expect(screen.queryAllByText(/^正在加载/)).toHaveLength(0));
});
it('不存在的课程显示友好页面，并保留返回入口', async () => {
  await startDemoSession();
  server.use(
    http.get('/api/v1/courses/by-code/99999', () =>
      HttpResponse.json({ code: 40401, message: '课程不存在', data: null }, { status: 404 }),
    ),
  );
  renderRoute('/study/course/99999/catalog');
  expect(await screen.findByRole('heading', { name: '课程不存在' })).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: '我的科目' }).length).toBeGreaterThan(0);
  expect(screen.queryByRole('navigation', { name: '课程页面' })).not.toBeInTheDocument();
});
