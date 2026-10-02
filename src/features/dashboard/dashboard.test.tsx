import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { act, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';
import type { Course, Dashboard, ExamCycle } from '../../api/generated/models';
import { DashboardPage } from '../../pages/DashboardPage';
import { learningTargetPath, dateLabel } from './navigation';
const course = (
  id: string,
  code: string,
  name: string,
  percent: number,
  courseType: Course['courseType'] = 'THEORY',
): Course => ({
  id,
  code,
  name,
  courseType,
  active: true,
  releaseId: null,
  enrollment: null,
  capabilities: {
    catalog: true,
    knowledge: true,
    practice: true,
    exams: courseType === 'THEORY',
    manual: courseType === 'PRACTICE',
  },
  progress: { completedItems: percent > 0 ? 8 : 0, totalItems: 20, percent },
});
const cycle: ExamCycle = {
  id: 'cycle-1',
  name: '测试考试周期',
  startDate: '2026-10-01',
  endDate: '2026-10-31',
  timezone: 'Asia/Shanghai',
  courses: [
    { courseId: 'a', examDate: '2026-10-24', startsAt: '14:30:00', endsAt: '17:00:00' },
    { courseId: 'b', examDate: '2026-10-25', startsAt: '09:00:00', endsAt: null },
  ],
};
const target = {
  pane: 'PRACTICE',
  courseCode: '99999',
  chapterId: 'chapter-1',
  itemId: 'item-2',
  questionId: 'question-3',
} as const;
const fixture: Dashboard = {
  snapshotId: 'test-snapshot',
  asOf: '2026-10-02T02:00:00Z',
  localDate: '2026-10-02',
  cycle,
  courses: [
    course('a', '99999', '测试理论课程', 40),
    course('b', '00001', '测试未开始课程', 0),
    course('c', '00002', '测试实践课程', 0, 'PRACTICE'),
    course('d', '00003', '第四门课程', 0),
  ],
  overallProgress: { completedItems: 63, totalItems: 546, percent: 12 },
  countdowns: [
    {
      courseId: 'a',
      courseCode: '99999',
      examDate: '2026-10-24',
      daysRemaining: 22,
      status: 'UPCOMING',
    },
  ],
  continueLearning: {
    courseId: 'a',
    target,
    title: '后端最近位置',
    updatedAt: '2026-10-02T02:00:00Z',
  },
  todaySuggestion: {
    title: '完成今日计划条目',
    reason: '后端计划建议摘要',
    taskId: 'task-1',
    target,
  },
  selectedPlanId: 'plan-1',
  todaySuggestionMessage: '后端今日建议',
};
const cyclesHandler = http.get('/api/v1/exams/cycles', () =>
  HttpResponse.json({
    code: 0,
    message: 'ok',
    data: { items: [cycle], page: 1, size: 20, total: 1 },
  }),
);
const dashboardHandler = http.get('/api/v1/dashboard', () =>
  HttpResponse.json({ code: 0, message: 'ok', data: fixture }),
);
const server = setupServer(cyclesHandler, dashboardHandler);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
function Destination() {
  const location = useLocation();
  return (
    <p>
      目标位置：{location.pathname}
      {location.search}
    </p>
  );
}
function mount(path = '/zikao?cycleId=cycle-1') {
  const router = createMemoryRouter(
    [
      { path: '/zikao', element: <DashboardPage /> },
      { path: '*', element: <Destination /> },
    ],
    { initialEntries: [path], future: { v7_relativeSplatPath: true } },
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </QueryClientProvider>,
  );
  return router;
}
describe('备考总览', () => {
  it('使用后端顺序展示前 3 门，0% 不显示进度条', async () => {
    mount();
    await screen.findByRole('heading', { name: '测试理论课程' });
    const cards = screen.getAllByRole('article');
    expect(cards.map((c) => within(c).getByRole('heading').textContent)).toEqual([
      '测试理论课程',
      '测试未开始课程',
      '测试实践课程',
    ]);
    expect(screen.queryByText('第四门课程')).not.toBeInTheDocument();
    expect(within(cards[0]).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    expect(within(cards[1]).queryByRole('progressbar')).not.toBeInTheDocument();
    expect(within(cards[2]).queryByText('历年试卷')).not.toBeInTheDocument();
    expect(screen.getByText('63 / 546 项已完成')).toBeInTheDocument();
    expect(screen.getByText('10/24 14:30–17:00')).toBeInTheDocument();
  });
  it('建议与后端最近位置使用完全相同的结构化路由', async () => {
    const router = mount();
    await screen.findByRole('heading', { name: '测试理论课程' });
    const suggestion = screen.getByRole('link', { name: '开始今日学习' });
    expect(suggestion).toHaveAttribute('href', learningTargetPath(target, 'cycle-1'));
    expect(screen.getByRole('link', { name: '继续学习 8/20' })).toHaveAttribute(
      'href',
      suggestion.getAttribute('href'),
    );
    await userEvent.click(suggestion);
    expect(router.state.location.pathname).toBe('/zikao/course/99999/practice/chapter-1');
    expect(router.state.location.search).toContain('questionId=question-3');
  });
  it('路由标签支持前进、后退及刷新后直接定位', async () => {
    const router = mount();
    await screen.findByRole('heading', { name: '测试理论课程' });
    expect(
      within(screen.getByRole('navigation')).getByRole('link', { name: '备考总览' }),
    ).toHaveAttribute('aria-current', 'page');
    await userEvent.click(
      within(screen.getByRole('navigation')).getByRole('link', { name: '我的科目' }),
    );
    expect(router.state.location.pathname).toBe('/zikao/courses');
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe('/zikao');
    await act(() => router.navigate(1));
    expect(router.state.location.pathname).toBe('/zikao/courses');
  });
  it('备注与查看全部使用真实链接并保留周期', async () => {
    mount();
    await screen.findByRole('heading', { name: '测试理论课程' });
    expect(screen.getByRole('link', { name: '打开学习备注' })).toHaveAttribute(
      'href',
      '/zikao/notes?cycleId=cycle-1',
    );
    expect(screen.getByRole('link', { name: '查看全部' })).toHaveAttribute(
      'href',
      '/zikao/courses?cycleId=cycle-1',
    );
    expect(screen.getAllByRole('link', { name: '管理' })[0]).toHaveAttribute(
      'href',
      '/zikao/courses?cycleId=cycle-1',
    );
  });
  it('每个异步数据区域都有加载状态', async () => {
    server.use(
      http.get('/api/v1/dashboard', async () => {
        await delay(150);
        return HttpResponse.json({ code: 0, message: 'ok', data: fixture });
      }),
    );
    mount();
    expect(screen.getAllByText('正在加载备考数据…')).toHaveLength(4);
    await screen.findByRole('heading', { name: '测试理论课程' });
  });
  it('空建议、空科目、空倒计时和空目录有说明及行动', async () => {
    server.use(
      http.get('/api/v1/dashboard', () =>
        HttpResponse.json({
          code: 0,
          message: 'ok',
          data: {
            ...fixture,
            todaySuggestion: null,
            todaySuggestionMessage: '暂无今日安排',
            courses: [],
            countdowns: [],
            overallProgress: { completedItems: 0, totalItems: 0, percent: 0 },
          },
        }),
      ),
    );
    mount();
    await screen.findByText('暂无今日安排');
    expect(screen.getByRole('link', { name: '查看 35 天安排' })).toBeInTheDocument();
    expect(screen.getByText('当前周期暂无科目。')).toBeInTheDocument();
    expect(screen.getByText('暂无考试倒计时安排。')).toBeInTheDocument();
    expect(screen.getByText('暂无已发布目录条目。')).toBeInTheDocument();
  });
  it('接口失败可重试，恢复后展示数据', async () => {
    let calls = 0;
    server.use(
      http.get('/api/v1/dashboard', () => {
        calls++;
        return calls === 1
          ? HttpResponse.json({ code: 50001, data: null, message: '服务暂不可用' }, { status: 500 })
          : HttpResponse.json({ code: 0, data: fixture, message: 'ok' });
      }),
    );
    mount();
    await screen.findAllByText('备考数据加载失败，请重试。');
    expect(screen.getAllByRole('alert')).toHaveLength(4);
    await userEvent.click(screen.getAllByRole('button', { name: '重新加载' })[0]);
    await screen.findByRole('heading', { name: '测试理论课程' });
    expect(calls).toBe(2);
  });
  it('业务错误码也进入可重试失败状态', async () => {
    server.use(
      http.get('/api/v1/dashboard', () =>
        HttpResponse.json({ code: 40902, data: null, message: '周期状态冲突' }),
      ),
    );
    mount();
    await screen.findAllByText('备考数据加载失败，请重试。');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
  it('未提供下一步时禁用按钮，给出原因和目录入口', async () => {
    mount();
    await screen.findByText('测试未开始课程');
    const card = screen.getAllByRole('article')[1];
    expect(within(card).getByRole('button', { name: '从第 1 节开始 0/20' })).toBeDisabled();
    expect(within(card).getByRole('button')).toHaveAccessibleDescription(
      '暂无法直达：接口未提供本课的下一学习位置。',
    );
    expect(within(card).getByRole('link', { name: '查看课程目录' })).toBeInTheDocument();
    expect(screen.queryByText('补课')).not.toBeInTheDocument();
    expect(screen.queryByText('按计划')).not.toBeInTheDocument();
  });
  it('明确选择周期并在 URL 保存；不猜测当前周期', async () => {
    const router = mount('/zikao');
    await screen.findByLabelText('考试周期');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('考试周期'), 'cycle-1');
    await screen.findByRole('heading', { name: '测试理论课程' });
    expect(router.state.location.search).toBe('?cycleId=cycle-1');
  });
  it('周期区域支持失败、重试和空状态', async () => {
    server.use(
      http.get('/api/v1/exams/cycles', () =>
        HttpResponse.json({ code: 50001, data: null, message: '失败' }, { status: 500 }),
      ),
    );
    mount('/zikao');
    await screen.findByText('考试周期加载失败，请重试。');
    server.use(
      http.get('/api/v1/exams/cycles', () =>
        HttpResponse.json({
          code: 0,
          message: 'ok',
          data: { items: [], page: 1, size: 20, total: 0 },
        }),
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: '重新加载' }));
    await screen.findByText('暂无可选考试周期。');
  });
  it('业务日期保持上海日期，状态显示以后端字段为准', async () => {
    expect(dateLabel('2026-10-24')).toBe('10/24');
    server.use(
      http.get('/api/v1/dashboard', () =>
        HttpResponse.json({
          code: 0,
          message: 'ok',
          data: {
            ...fixture,
            countdowns: [{ ...fixture.countdowns[0], daysRemaining: 99, status: 'FINISHED' }],
          },
        }),
      ),
    );
    mount();
    await screen.findByText('考试已结束');
    expect(screen.queryByText('距考试 99 天')).not.toBeInTheDocument();
  });
  it('计划 ID 原样传给 API，刷新后保留选中参数', async () => {
    let received = '';
    server.use(
      http.get('/api/v1/dashboard', ({ request }) => {
        received = new URL(request.url).search;
        return HttpResponse.json({ code: 0, message: 'ok', data: fixture });
      }),
    );
    mount('/zikao?cycleId=cycle-1&planId=plan-selected');
    await screen.findByRole('heading', { name: '测试理论课程' });
    await waitFor(() => expect(received).toContain('planId=plan-selected'));
  });
});
