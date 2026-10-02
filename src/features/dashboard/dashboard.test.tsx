import { CycleProvider } from '../cycle/CycleContext';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { act, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';
import type { Course, Dashboard, ExamCycle } from '../../api/generated/models';
import { DashboardPage } from '../../pages/DashboardPage';
import { learningTargetPath, dateLabel, orderedExams, todayPlanState } from './navigation';
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
describe('备考总览', () => {
  it('展示全部课程及各课进度，保留接口课程顺序', async () => {
    mount();
    await screen.findByRole('heading', { name: '测试理论课程' });
    const cards = screen.getAllByRole('article');
    expect(cards.map((c) => within(c).getByRole('heading').textContent)).toEqual([
      '测试理论课程',
      '测试未开始课程',
      '测试实践课程',
      '第四门课程',
    ]);
    expect(screen.getByText('第四门课程')).toBeInTheDocument();
    expect(within(cards[0]).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '40');
    expect(within(cards[1]).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(within(cards[2]).queryByText('历年试卷')).not.toBeInTheDocument();
    expect(screen.getByText('63 / 546 项已完成 · 12%')).toBeInTheDocument();
    expect(screen.getByText('10/24 14:30–17:00')).toBeInTheDocument();
  });
  it('建议与后端最近位置使用完全相同的结构化路由', async () => {
    const router = mount();
    await screen.findByRole('heading', { name: '测试理论课程' });
    const suggestion = screen.getByRole('link', { name: '按计划学习' });
    expect(suggestion).toHaveAttribute('href', learningTargetPath(target, 'cycle-1'));
    expect(screen.getByRole('link', { name: '继续学习' })).toHaveAttribute(
      'href',
      suggestion.getAttribute('href'),
    );
    await userEvent.click(suggestion);
    expect(router.state.location.pathname).toBe('/zikao/course/99999/practice/chapter-1');
    expect(router.state.location.search).toContain('questionId=question-3');
  });
  it('计划和目录位置不同则说明来源并提供两个入口', async () => {
    server.use(
      http.get('/api/v1/dashboard', () =>
        HttpResponse.json({
          code: 0,
          message: 'ok',
          data: {
            ...fixture,
            continueLearning: {
              ...fixture.continueLearning!,
              title: '上次目录条目',
              target: { ...target, pane: 'CATALOG', itemId: 'previous-item' },
            },
          },
        }),
      ),
    );
    mount();
    await screen.findByText('上次学习：上次目录条目。今日安排与上次位置不同，可选择从哪里继续。');
    expect(screen.getByRole('link', { name: '按计划学习' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '继续上次位置' })).toHaveAttribute(
      'href',
      '/zikao/course/99999/catalog?chapterId=chapter-1&itemId=previous-item&questionId=question-3',
    );
    expect(
      await screen.findByText('测试理论课程 · 来自学习安排 · 第 2 / 37 天'),
    ).toBeInTheDocument();
  });
  it('移除页内重复路由导航，课程列表链接支持历史返回', async () => {
    const router = mount();
    await screen.findByRole('heading', { name: '测试理论课程' });
    expect(screen.queryByRole('navigation', { name: '备考页面' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: '查看全部' }));
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
      '/zikao/notes',
    );
    expect(screen.getByRole('link', { name: '查看全部' })).toHaveAttribute(
      'href',
      '/zikao/courses',
    );
    expect(screen.getAllByRole('link', { name: '管理' })[0]).toHaveAttribute(
      'href',
      '/zikao/courses',
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
    expect(await screen.findAllByText('正在加载备考数据…')).toHaveLength(1);
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
            continueLearning: null,
            courses: [],
            countdowns: [],
            overallProgress: { completedItems: 0, totalItems: 0, percent: 0 },
          },
        }),
      ),
    );
    mount();
    await screen.findByText('今天没有计划任务，可按自己的节奏学习。');
    expect(screen.getByRole('link', { name: '查看学习安排' })).toBeInTheDocument();
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
    expect(screen.getAllByRole('alert')).toHaveLength(1);
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
  it('缺少下一位置时主入口可用，直接进入目录', async () => {
    mount();
    await screen.findByText('测试未开始课程');
    const card = screen.getAllByRole('article')[1];
    expect(within(card).getByRole('link', { name: '进入课程' })).toHaveAttribute(
      'href',
      '/zikao/course/00001/catalog',
    );
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
    expect(within(card).queryByText('查看课程目录')).not.toBeInTheDocument();
  });
  it('单周期自动选中，没有选择器或周期 UUID', async () => {
    const router = mount('/zikao');
    await screen.findByRole('heading', { name: '测试理论课程' });
    expect(screen.queryByLabelText('考试周期')).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('');
    expect(document.querySelector('a[href*="cycleId"]')).toBeNull();
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
    await screen.findByText('暂无考试周期。');
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
  it('考试简表按日期时间排序，待定日期在末尾，不修改接口数组', () => {
    const data = {
      ...fixture,
      countdowns: [
        {
          ...fixture.countdowns[0],
          courseId: 'c',
          examDate: null,
          status: 'DATE_UNKNOWN' as const,
        },
        { ...fixture.countdowns[0], courseId: 'b', examDate: '2026-10-25' },
        { ...fixture.countdowns[0], courseId: 'a', examDate: '2026-10-24' },
      ],
    };
    expect(orderedExams(data).map((item) => item.courseId)).toEqual(['a', 'b', 'c']);
    expect(data.countdowns[0].courseId).toBe('c');
  });

  it('无计划时提供真实课程入口，不能凭空展示上次位置', async () => {
    server.use(
      http.get('/api/v1/dashboard', () =>
        HttpResponse.json({
          code: 0,
          message: 'ok',
          data: { ...fixture, selectedPlanId: null, todaySuggestion: null, continueLearning: null },
        }),
      ),
    );
    mount();
    await screen.findByText('还没有学习计划，可先继续学习或查看学习安排。');
    expect(screen.getByRole('link', { name: '选择课程开始学习' })).toHaveAttribute(
      'href',
      '/zikao/courses',
    );
    expect(screen.queryByRole('link', { name: '继续上次位置' })).not.toBeInTheDocument();
  });

  it('只有计划分段对应的任务都完成时才说明今日已完成', async () => {
    const completedPlan = {
      id: 'plan-1',
      config: { cycleId: cycle.id, startDate: '2026-10-01', endDate: '2026-11-06' },
      tasks: [{ id: 'today-task', completed: true }],
      days: [{ day: fixture.localDate, segments: [{ taskId: 'today-task' }] }],
    };
    server.use(
      http.get('/api/v1/dashboard', () =>
        HttpResponse.json({ code: 0, message: 'ok', data: { ...fixture, todaySuggestion: null } }),
      ),
      http.get('/api/v1/schedule/plans/:id', () =>
        HttpResponse.json({ code: 0, message: 'ok', data: completedPlan }),
      ),
    );
    mount();
    await screen.findByText('今日计划任务已全部完成。');
    expect(screen.getByRole('link', { name: '继续上次位置' })).toHaveAttribute(
      'href',
      learningTargetPath(target),
    );
    expect(
      todayPlanState(
        { ...completedPlan, tasks: [] } as unknown as import('../../api/generated/models').Plan,
        fixture.localDate,
      ),
    ).toBe('unknown');
  });

  it('计划局部失败保留任务与课程，重试只恢复计划详情', async () => {
    let calls = 0;
    server.use(
      http.get('/api/v1/schedule/plans/:id', () => {
        calls++;
        return calls === 1
          ? HttpResponse.json({ code: 50001, message: '失败', data: null }, { status: 500 })
          : HttpResponse.json({
              code: 0,
              message: 'ok',
              data: {
                id: 'plan-1',
                config: { cycleId: cycle.id, startDate: '2026-10-01', endDate: '2026-11-06' },
                tasks: [],
                days: [],
              },
            });
      }),
    );
    mount();
    await screen.findByText('计划详情加载失败，学习入口仍可使用。');
    expect(screen.getByRole('link', { name: '按计划学习' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(4);
    await userEvent.click(screen.getByRole('button', { name: '重新加载' }));
    await screen.findByText('测试理论课程 · 来自学习安排 · 第 2 / 37 天');
    expect(calls).toBe(2);
  });

  it('切换周期不展示前一周期内容，课程进入及返回保留选择', async () => {
    const other = {
      ...cycle,
      id: 'cycle-2',
      name: '第二个考试周期',
      startDate: '2027-04-01',
      endDate: '2027-04-30',
    };
    server.use(
      http.get('/api/v1/exams/cycles', () =>
        HttpResponse.json({
          code: 0,
          message: 'ok',
          data: { items: [cycle, other], page: 1, size: 100, total: 2 },
        }),
      ),
      http.get('/api/v1/dashboard', async ({ request }) => {
        const selected = new URL(request.url).searchParams.get('cycleId');
        if (selected === other.id) {
          await delay(100);
          return HttpResponse.json({
            code: 0,
            message: 'ok',
            data: {
              ...fixture,
              cycle: other,
              courses: [course('new', '88888', '第二周期课程', 0)],
              continueLearning: null,
              selectedPlanId: null,
              todaySuggestion: {
                ...fixture.todaySuggestion!,
                title: '第二周期今日任务',
                target: { ...target, courseCode: '88888' },
              },
            },
          });
        }
        return HttpResponse.json({ code: 0, message: 'ok', data: fixture });
      }),
    );
    const router = mount();
    await screen.findByRole('heading', { name: '测试理论课程' });
    await userEvent.selectOptions(screen.getByLabelText('考试周期'), other.id);
    await screen.findByText('正在加载备考数据…');
    expect(screen.queryByRole('heading', { name: '测试理论课程' })).not.toBeInTheDocument();
    await screen.findByRole('heading', { name: '第二周期课程' });
    const selectedSearch = router.state.location.search;
    expect(selectedSearch).toContain('cycle=');
    await userEvent.click(screen.getByRole('link', { name: '进入课程' }));
    expect(router.state.location.pathname).toBe('/zikao/course/88888/catalog');
    expect(router.state.location.search).toBe(selectedSearch);
    await act(() => router.navigate(-1));
    await screen.findByRole('heading', { name: '第二周期课程' });
    expect(screen.queryByRole('heading', { name: '测试理论课程' })).not.toBeInTheDocument();
    expect(router.state.location.search).toBe(selectedSearch);
    await userEvent.selectOptions(screen.getByLabelText('考试周期'), cycle.id);
    await screen.findByRole('heading', { name: '测试理论课程' });
    expect(screen.queryByRole('heading', { name: '第二周期课程' })).not.toBeInTheDocument();
  });
});
