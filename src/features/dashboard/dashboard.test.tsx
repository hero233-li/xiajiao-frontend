import { CycleProvider } from '../cycle/CycleContext';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';
import type { Course, Dashboard, ExamCycle } from '../../api/generated/models';
import { DashboardPage } from '../../pages/DashboardPage';
import { learningTargetPath, dateLabel, orderedExams } from './navigation';
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
const planHandler = http.get('/api/v1/schedule/plans/:id', () =>
  HttpResponse.json({
    code: 0,
    message: 'ok',
    data: {
      id: 'plan-1',
      config: { cycleId: cycle.id, startDate: '2026-10-01', endDate: '2026-11-06' },
      tasks: [],
      days: [],
    },
  }),
);
const dashboardHandler = http.get('/api/v1/dashboard', () =>
  HttpResponse.json({ code: 0, message: 'ok', data: fixture }),
);
const server = setupServer(cyclesHandler, dashboardHandler, planHandler);
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
      {
        path: '/zikao',
        element: (
          <CycleProvider>
            <DashboardPage />
          </CycleProvider>
        ),
      },
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
describe('今日学习工作台', () => {
  it('下一行动先于今日清单，书架保留真实课程顺序与进度', async () => {
    mount();
    await screen.findByRole('heading', { name: '完成今日计划条目' });
    const shelf = screen.getAllByRole('link').filter((link) => link.className === 'book-entry');
    expect(shelf).toHaveLength(4);
    expect(shelf[0]).toHaveTextContent('测试理论课程');
    expect(shelf[0]).toHaveTextContent('8 / 20');
    expect(shelf[2]).toHaveAttribute('href', '/zikao/course/00002/manual');
    expect(document.title).toBe('今日学习 · 学习知途');
  });
  it('建议采用后端结构化目标，保留前导零与题目定位', async () => {
    mount();
    const link = await screen.findByRole('link', { name: '开始这一项' });
    expect(link).toHaveAttribute('href', learningTargetPath(target));
  });
  it('建议与最近位置不同时保留继续入口', async () => {
    server.use(
      http.get('/api/v1/dashboard', () =>
        HttpResponse.json({
          code: 0,
          message: 'ok',
          data: {
            ...fixture,
            continueLearning: {
              ...fixture.continueLearning,
              target: { ...target, pane: 'CATALOG' },
            },
          },
        }),
      ),
    );
    mount();
    await screen.findByRole('link', { name: '回到上次位置' });
  });
  it('无计划无位置时提供选择课程，不虚构今日任务', async () => {
    server.use(
      http.get('/api/v1/dashboard', () =>
        HttpResponse.json({
          code: 0,
          message: 'ok',
          data: { ...fixture, todaySuggestion: null, continueLearning: null, selectedPlanId: null },
        }),
      ),
    );
    mount();
    expect(await screen.findByRole('link', { name: '选择课程' })).toHaveAttribute(
      'href',
      '/zikao/courses',
    );
    expect(screen.getByRole('link', { name: '建立学习计划' })).toHaveAttribute(
      'href',
      '/zikao/schedule',
    );
  });
  it('加载、业务错误与重试能恢复真正数据', async () => {
    let failed = true;
    server.use(
      http.get('/api/v1/dashboard', async () => {
        await delay(80);
        return HttpResponse.json(
          failed
            ? { code: 50001, data: null, message: '错误' }
            : { code: 0, data: fixture, message: 'ok' },
        );
      }),
    );
    mount();
    await screen.findByText('正在读取今日任务…');
    await screen.findByText('学习数据加载失败，请重试。');
    failed = false;
    await userEvent.click(screen.getByRole('button', { name: '重新加载' }));
    await screen.findByRole('heading', { name: '完成今日计划条目' });
  });
  it('计划区域失败仍可开始建议任务', async () => {
    server.use(http.get('/api/v1/schedule/plans/:id', () => HttpResponse.error()));
    mount();
    await screen.findByText('计划详情读取失败。');
    expect(screen.getByRole('link', { name: '开始这一项' })).toBeVisible();
    expect(
      screen.getAllByRole('link').filter((link) => link.className === 'book-entry'),
    ).toHaveLength(4);
  });
  it('日期使用后端上海日期，不按设备替换', async () => {
    mount();
    await screen.findByRole('heading', { name: '完成今日计划条目' });
    expect(screen.getByText(/2026-10-02 ·/)).toBeVisible();
    expect(dateLabel('2026-10-24')).toBe('10/24');
  });
  it('缺少课程的最近位置不会成为可点击学习目标', async () => {
    server.use(
      http.get('/api/v1/dashboard', () =>
        HttpResponse.json({
          code: 0,
          message: 'ok',
          data: {
            ...fixture,
            todaySuggestion: null,
            continueLearning: { ...fixture.continueLearning, courseId: 'missing' },
            selectedPlanId: null,
          },
        }),
      ),
    );
    mount();
    await screen.findByRole('link', { name: '选择课程' });
    expect(screen.queryByRole('link', { name: '开始这一项' })).toBeNull();
  });
  it('考试顺序计算不修改原始快照', () => {
    const data = structuredClone(fixture);
    data.countdowns.push({
      ...data.countdowns[0],
      courseId: 'x',
      examDate: null,
      daysRemaining: null,
      status: 'DATE_UNKNOWN',
    } as Dashboard['countdowns'][number]);
    const original = structuredClone(data);
    orderedExams(data);
    expect(data).toEqual(original);
  });
  it('笔记与计划都有可导航的出口', async () => {
    mount();
    await screen.findByRole('heading', { name: '完成今日计划条目' });
    expect(screen.getByRole('link', { name: '打开学习笔记' })).toHaveAttribute(
      'href',
      '/zikao/notes',
    );
    expect(screen.getByRole('link', { name: '调整安排' })).toHaveAttribute(
      'href',
      '/zikao/schedule',
    );
  });
});
