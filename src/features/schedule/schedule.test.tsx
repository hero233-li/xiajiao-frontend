import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../../mocks/server';
import { SchedulePage } from '../../pages/SchedulePage';
import { completeCatalogItem } from '../../api/generated/catalog/catalog';
import type {
  Catalog,
  Course,
  Plan,
  PlanPreview,
  PlanTask,
  PreviewConfirm,
  RescheduleRequest,
  TaskCompletionWrite,
} from '../../api/generated/models';
const course: Course = {
  id: 'course',
  code: '00023',
  name: '高等数学',
  courseType: 'THEORY',
  active: true,
  releaseId: 'release',
  enrollment: null,
  capabilities: { catalog: true, knowledge: true, practice: true, exams: true, manual: false },
  progress: { completedItems: 1, totalItems: 4, percent: 25 },
};
const task = (id: string, kind: PlanTask['kind'] = 'ITEM', completed = false): PlanTask => ({
  id,
  courseId: 'course',
  itemId: kind === 'ITEM' ? id : null,
  templateId: kind === 'ITEM' ? null : id,
  kind,
  title: `任务${id}`,
  estimatedMinutes: 120,
  releaseId: 'release',
  completed,
  completedAt: completed ? '2026-10-01T00:00:00Z' : null,
  target: {
    pane: kind === 'PAPER' ? 'EXAMS' : 'CATALOG',
    courseCode: '00023',
    chapterId: kind === 'ITEM' ? 'chapter' : null,
    itemId: kind === 'ITEM' ? id : null,
    questionId: null,
  },
});
let plan: Plan;
let catalog: Catalog;
let previewBodies: RescheduleRequest[];
let confirmations: PreviewConfirm[];
let writes: { taskId: string; body: TaskCompletionWrite }[];
let failCompletion: boolean;
let gap: number;
const ok = (data: unknown) => HttpResponse.json({ code: 0, message: '成功', data });
function fixture(): Plan {
  const dates = Array.from({ length: 35 }, (_, i) =>
    new Date(Date.UTC(2026, 8, 28 + i)).toISOString().slice(0, 10),
  );
  const tasks = [task('past'), task('done', 'REVIEW', true), task('today'), task('paper', 'PAPER')];
  return {
    id: 'plan',
    revision: 1,
    config: {
      cycleId: 'cycle',
      startDate: dates[0],
      endDate: dates[34],
      coursePriority: ['course'],
      courseScope: ['course'],
      dayCapacities: dates.map((day) => ({ day, capacityMinutes: 120 })),
    },
    tasks,
    days: dates.map((day, i) => ({
      day,
      capacityMinutes: 120,
      reservedMinutes: i === 0 || i === 3 || i === 4 || i === 28 ? 120 : 0,
      remainingMinutes: i === 0 || i === 3 || i === 4 || i === 28 ? 0 : 120,
      completedMinutes: i === 3 ? 120 : 0,
      percent: i === 3 ? 100 : 0,
      segments:
        i === 0 || i === 3 || i === 4 || i === 28
          ? [
              {
                id: `s${i}`,
                taskId: i === 0 ? 'past' : i === 3 ? 'done' : i === 4 ? 'today' : 'paper',
                scheduledOn: day,
                minutes: 120,
                state: 'SCHEDULED',
                sortOrder: 0,
              },
            ]
          : [],
    })),
    unscheduled: [],
    awaitingDate: [],
    progress: { completedMinutes: 120, totalEstimatedMinutes: 480, percent: 25 },
    createdAt: '2026-09-28T00:00:00Z',
    confirmedAt: null,
    asOf: '2026-10-02T02:00:00Z',
    weeks: Array.from({ length: 5 }, (_, i) => ({
      index: i + 1,
      startDate: dates[i * 7],
      endDate: dates[i * 7 + 6],
      scheduledMinutes: i === 0 ? 360 : i === 4 ? 120 : 0,
      completedMinutes: i === 0 ? 120 : 0,
      percent: i === 0 ? 33 : 0,
    })),
    completedDayCount: 1,
    dayCount: 35,
    overdueUncompletedMinutes: 120,
    courseSummaries: [course],
  };
}
function previewFixture(): PlanPreview {
  return {
    id: 'preview',
    planId: 'plan',
    baseRevision: plan.revision,
    asOf: '2026-10-02',
    inputFingerprint: 'a'.repeat(64),
    proposedPlan: plan,
    moves: [
      {
        segmentId: 's0',
        fromDate: '2026-09-28',
        toSegments: [{ ...plan.days[0].segments[0], scheduledOn: '2026-10-03' }],
      },
    ],
    gapMinutes: gap * 60,
    gapHours: gap,
    options: ['INCREASE_DAILY_TIME', 'CHANGE_COURSE_PRIORITY', 'ACCEPT_UNSCHEDULED'],
    createdAt: '2026-10-02T02:00:00Z',
  };
}
beforeEach(() => {
  plan = fixture();
  previewBodies = [];
  confirmations = [];
  writes = [];
  failCompletion = false;
  gap = 54;
  catalog = {
    courseId: 'course',
    releaseId: 'release',
    courseProgress: course.progress,
    overallProgress: course.progress,
    asOf: plan.asOf,
    chapters: [
      {
        id: 'chapter',
        title: '函数',
        sortOrder: 0,
        participatesInAssessment: true,
        items: ['past', 'today'].map((id) => ({
          id,
          title: `任务${id}`,
          estimatedMinutes: 120,
          completed: false,
          completedAt: null,
          revision: 7,
          resource: null,
        })),
      },
    ],
  };
  HTMLElement.prototype.scrollIntoView = vi.fn();
  server.use(
    http.get('/api/v1/schedule/plans', () =>
      ok({
        items: [
          {
            id: plan.id,
            cycleId: 'cycle',
            startDate: plan.config.startDate,
            endDate: plan.config.endDate,
            revision: plan.revision,
            completedPercent: plan.progress.percent,
          },
        ],
        page: 1,
        size: 100,
        total: 1,
      }),
    ),
    http.get('/api/v1/schedule/plans/plan', () => ok(plan)),
    http.get('/api/v1/catalog/courses/course', () => ok(catalog)),
    http.put(
      '/api/v1/schedule/plans/plan/tasks/:taskId/completion',
      async ({ params, request }) => {
        const body = (await request.json()) as TaskCompletionWrite;
        writes.push({ taskId: String(params.taskId), body });
        await delay(80);
        if (failCompletion) return HttpResponse.error();
        plan = {
          ...plan,
          tasks: plan.tasks.map((task) =>
            task.id === params.taskId ? { ...task, completed: body.completed } : task,
          ),
          progress: { completedMinutes: 240, totalEstimatedMinutes: 480, percent: 50 },
        };
        catalog = {
          ...catalog,
          chapters: catalog.chapters.map((chapter) => ({
            ...chapter,
            items: chapter.items.map((item) =>
              item.id === params.taskId
                ? { ...item, completed: body.completed, revision: item.revision + 1 }
                : item,
            ),
          })),
        };
        return ok({
          task: plan.tasks.find((task) => task.id === params.taskId),
          planRevision: plan.revision,
          courseProgress: course.progress,
          overallProgress: course.progress,
          affectedPlanIds: ['plan'],
          clientMutationId: body.clientMutationId,
          asOf: plan.asOf,
        });
      },
    ),
    http.post('/api/v1/schedule/plans/plan/reschedule-previews', async ({ request }) => {
      previewBodies.push((await request.json()) as RescheduleRequest);
      return ok(previewFixture());
    }),
    http.post(
      '/api/v1/schedule/plans/plan/reschedule-previews/preview/confirmation',
      async ({ request }) => {
        confirmations.push((await request.json()) as PreviewConfirm);
        plan = { ...plan, revision: 2 };
        return ok(plan);
      },
    ),
    http.put(
      '/api/v1/catalog/courses/course/items/:itemId/completion',
      async ({ params, request }) => {
        const body = (await request.json()) as { completed: boolean };
        plan = {
          ...plan,
          tasks: plan.tasks.map((task) =>
            task.id === params.itemId ? { ...task, completed: body.completed } : task,
          ),
        };
        const item = catalog.chapters[0].items.find((item) => item.id === params.itemId)!;
        return ok({
          item: { ...item, completed: body.completed },
          courseProgress: course.progress,
          overallProgress: course.progress,
          asOf: plan.asOf,
          clientMutationId: 'mutation',
        });
      },
    ),
  );
});
function mount(url = '/zikao/schedule?cycleId=cycle') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      { path: '/zikao/schedule', element: <SchedulePage /> },
      { path: '/zikao/course/:code/exams', element: <h1>历年试卷</h1> },
    ],
    { initialEntries: [url] },
  );
  return {
    ...render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
    client,
    router,
  };
}
async function ready() {
  return screen.findByRole('region', { name: '今天的安排' });
}
describe('学习安排', () => {
  it('初始概览可见，今天与逾期突出；跳到今天由用户触发', async () => {
    mount();
    const today = await ready();
    expect(screen.getAllByRole('heading', { name: '学习安排' })).toHaveLength(1);
    expect(screen.getByText(/第 1 周 ·/).closest('details')).toHaveAttribute('open');
    expect(screen.getByText('1 / 35 天（3%）')).toBeVisible();
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
    await userEvent.setup().click(screen.getByRole('button', { name: '跳到今天' }));
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
      block: 'start',
      behavior: 'auto',
    });
    expect(today).toHaveClass('schedule-today');
    expect(screen.getByRole('button', { name: '已过去 4 天 · 展开' })).toBeVisible();
    expect(screen.getByRole('checkbox', { name: '任务past' })).toBeVisible();
    expect(within(today).queryByText('课程目录完成度')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '计划完成度' })).toHaveAttribute(
      'aria-valuenow',
      '25',
    );
  });
  it('周切换保持在URL；第五周试卷链接打开正确页面', async () => {
    const user = userEvent.setup();
    const view = mount();
    await ready();
    await user.click(screen.getByText(/第 5 周 ·/));
    expect(view.router.state.location.search).toContain('week=5');
    const link = await screen.findByRole('link', { name: '进入历年试卷' });
    expect(link).toHaveAttribute('href', '/zikao/course/00023/exams');
    await user.click(link);
    expect(await screen.findByRole('heading', { name: '历年试卷' })).toBeVisible();
    view.unmount();
    mount('/zikao/schedule?cycleId=cycle&week=5');
    expect((await screen.findByText(/第 5 周 ·/)).closest('details')).toHaveAttribute('open');
  });
  it('从未来周跳回今天，且短任务以分钟显示', async () => {
    plan.days[4].segments[0].minutes = 2;
    const user = userEvent.setup();
    mount('/zikao/schedule?cycleId=cycle&week=5');
    await screen.findByRole('checkbox', { name: '任务paper' });
    expect(screen.queryByRole('region', { name: '今天的安排' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '跳到今天' }));
    const today = await ready();
    expect(within(today).getByText('2 分钟')).toBeVisible();
    expect(today).toHaveFocus();
    expect(screen.getByText(/第 5 周 ·/).closest('details')).not.toHaveAttribute('open');
  });
  it('链接指定其他周期的计划时不显示任务和修改入口', async () => {
    plan.config.cycleId = 'another-cycle';
    mount();
    await screen.findByText('这份计划不属于当前考试周期，请重新选择计划。');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '顺延未完成任务' })).not.toBeInTheDocument();
  });
  it('非35天计划按实际日期显示范围与天数', async () => {
    plan.config.endDate = '2026-10-04';
    mount();
    await ready();
    expect(screen.getByText(/共 7 天/)).toBeVisible();
  });
  it('失效预览确认失败后须重新预览，不能直接重试确认', async () => {
    server.use(
      http.post('/api/v1/schedule/plans/plan/reschedule-previews/preview/confirmation', () =>
        HttpResponse.json(
          { code: 40901, message: '预览已过期，请重新预览', data: null },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    mount();
    await ready();
    await user.click(screen.getByRole('button', { name: '顺延未完成任务' }));
    const dialog = await screen.findByRole('dialog', { name: '顺延预览' });
    await within(dialog).findByText(/缺口约/);
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: '确认顺延' }));
    await within(dialog).findByText(/如预览已失效/);
    expect(within(dialog).getByRole('button', { name: '确认顺延' })).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: '重新预览' }));
    await waitFor(() => expect(previewBodies).toHaveLength(2));
    expect(within(dialog).getByRole('checkbox')).not.toBeChecked();
    expect(confirmations).toHaveLength(0);
  });
  it('顺延先预览后确认；缺口整数展示、三个选项、已完成任务保留', async () => {
    const user = userEvent.setup();
    mount();
    await ready();
    await user.click(screen.getByRole('button', { name: '顺延未完成任务' }));
    const dialog = screen.getByRole('dialog', { name: '顺延预览' });
    await within(dialog).findByText(/缺口约 54 小时/);
    expect(previewBodies).toEqual([{ baseRevision: 1 }]);
    expect(confirmations).toHaveLength(0);
    expect(writes).toHaveLength(0);
    expect(plan.revision).toBe(1);
    expect(within(dialog).getByText(/2026-09-28 → 2026-10-03/)).toBeVisible();
    expect(within(dialog).getByRole('button', { name: '增加每日时长' })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: '调整科目优先级' })).toBeVisible();
    await user.click(within(dialog).getByText('不动的已完成任务'));
    expect(within(dialog).getByText('任务done')).toBeVisible();
    expect(within(dialog).getByRole('button', { name: '确认顺延' })).toBeDisabled();
    await user.click(within(dialog).getByRole('checkbox', { name: '接受溢出任务标记为“未排入”' }));
    await user.click(within(dialog).getByRole('button', { name: '确认顺延' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(confirmations).toEqual([
      { baseRevision: 1, inputFingerprint: 'a'.repeat(64), acceptUnscheduled: true, confirm: true },
    ]);
    expect(plan.revision).toBe(2);
  });
  it('改变时长重新预览，未确认前不修改正式计划', async () => {
    const user = userEvent.setup();
    mount();
    await ready();
    await user.click(screen.getByRole('button', { name: '顺延未完成任务' }));
    await screen.findByText(/缺口约/);
    await user.click(screen.getByRole('button', { name: '增加每日时长' }));
    await user.type(screen.getByLabelText('工作日每日小时'), '4');
    gap = 0;
    await user.click(screen.getByRole('button', { name: '重新预览' }));
    await waitFor(() => expect(previewBodies).toHaveLength(2));
    expect(
      previewBodies[1].dayCapacities?.find((day) => day.day === '2026-10-05')?.capacityMinutes,
    ).toBe(240);
    expect(plan.config.dayCapacities[7].capacityMinutes).toBe(120);
    expect(confirmations).toHaveLength(0);
    await waitFor(() => expect(screen.getByRole('button', { name: '确认顺延' })).toBeEnabled());
  });
  it('勾选乐观更新，使用目录修订号；完成后失效聚合查询', async () => {
    const user = userEvent.setup();
    const { client } = mount();
    await ready();
    ['catalog', 'dashboard', 'home', 'home-aggregate'].forEach((name) =>
      client.setQueryData([name, 'seed'], {}),
    );
    const checkbox = screen.getByRole('checkbox', { name: '任务today' });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByRole('progressbar', { name: '计划完成度' })).toHaveAttribute(
      'aria-valuenow',
      '25',
    );
    await waitFor(() => expect(checkbox).toBeEnabled());
    expect(writes[0].body.expectedItemRevision).toBe(7);
    expect(writes[0].body.expectedCompleted).toBe(false);
    expect(screen.getByRole('progressbar', { name: '计划完成度' })).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
    ['catalog', 'dashboard', 'home', 'home-aggregate'].forEach((name) =>
      expect(client.getQueryState([name, 'seed'])?.isInvalidated).toBe(true),
    );
    expect(
      within(screen.getByRole('region', { name: '今天的安排' })).getByRole('link', {
        name: '进入学习目录',
      }),
    ).toHaveAttribute('href', '/zikao/course/00023/catalog?chapterId=chapter&itemId=today#chapter');
  });
  it('失败回滚并可重试；目录侧修改后重新进入计划读取同步状态', async () => {
    failCompletion = true;
    const user = userEvent.setup();
    const view = mount();
    await ready();
    await user.click(screen.getByRole('checkbox', { name: '任务today' }));
    await screen.findByRole('button', { name: '重试保存任务' });
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: '任务today' })).not.toBeChecked(),
    );
    failCompletion = false;
    await user.click(screen.getByRole('button', { name: '重试保存任务' }));
    await waitFor(() => expect(screen.getByRole('checkbox', { name: '任务today' })).toBeEnabled());
    view.unmount();
    await completeCatalogItem(
      'course',
      'today',
      { completed: false, expectedRevision: 8, clientMutationId: 'external' },
      { silent: true },
    );
    mount();
    await ready();
    expect(screen.getByRole('checkbox', { name: '任务today' })).not.toBeChecked();
  });
  it('第五周非目录任务无需条目修订号', async () => {
    const user = userEvent.setup();
    mount('/zikao/schedule?cycleId=cycle&week=5');
    const checkbox = await screen.findByRole('checkbox', { name: '任务paper' });
    await user.click(checkbox);
    await waitFor(() => expect(checkbox).toBeEnabled());
    expect(writes[0].body.expectedItemRevision).toBeNull();
  });
  it('设置只读，无编辑控件或保存按钮；Esc关闭并恢复焦点', async () => {
    const user = userEvent.setup();
    mount();
    await ready();
    const button = screen.getByRole('button', { name: '查看计划设置' });
    await user.click(button);
    const dialog = screen.getByRole('dialog', { name: '查看计划设置' });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(within(dialog).getByText('2026-09-28')).toBeVisible();
    expect(within(dialog).getAllByText('2 小时').length).toBeGreaterThan(0);
    expect(within(dialog).getByRole('note')).toHaveTextContent('仅供查看');
    expect(dialog.querySelectorAll('input, select, textarea')).toHaveLength(0);
    expect(within(dialog).queryByRole('button', { name: '保存设置' })).not.toBeInTheDocument();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });
  it('加载中、空计划、请求失败重试', async () => {
    server.use(
      http.get('/api/v1/schedule/plans', async () => {
        await delay(50);
        return ok({ items: [], page: 1, size: 100, total: 0 });
      }),
    );
    const user = userEvent.setup();
    const view = mount();
    expect(screen.getByRole('status')).toHaveTextContent('正在加载安排');
    await screen.findByText(
      '当前周期尚未生成学习计划。计划根据本周期的科目、学习内容与考试日期安排。',
    );
    expect(screen.getByRole('button', { name: '刷新计划列表' })).toBeVisible();
    view.unmount();
    server.use(http.get('/api/v1/schedule/plans', () => HttpResponse.error()));
    mount();
    await screen.findByRole('button', { name: '重新加载' });
    server.use(
      http.get('/api/v1/schedule/plans', () =>
        ok({
          items: [
            {
              id: 'plan',
              cycleId: 'cycle',
              startDate: plan.config.startDate,
              endDate: plan.config.endDate,
              revision: 1,
              completedPercent: 25,
            },
          ],
          page: 1,
          size: 100,
          total: 1,
        }),
      ),
    );
    await user.click(screen.getByRole('button', { name: '重新加载' }));
    await ready();
  });
  it('预览失败可重试，取消不会确认', async () => {
    server.use(
      http.post('/api/v1/schedule/plans/plan/reschedule-previews', () => HttpResponse.error()),
    );
    const user = userEvent.setup();
    mount();
    await ready();
    await user.click(screen.getByRole('button', { name: '顺延未完成任务' }));
    await screen.findByRole('button', { name: '重新加载' });
    server.use(
      http.post('/api/v1/schedule/plans/plan/reschedule-previews', () => ok(previewFixture())),
    );
    await user.click(screen.getByRole('button', { name: '重新加载' }));
    await screen.findByText(/缺口约/);
    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(confirmations).toHaveLength(0);
  });
  it('多条目任务展开并全部完成；子项使用独立复选框', async () => {
    const items = Array.from({ length: 24 }, (_, i) => task(`item${i}`));
    plan = {
      ...plan,
      tasks: [...plan.tasks.filter((task) => task.id !== 'today'), ...items],
      days: plan.days.map((day) =>
        day.day === '2026-10-02'
          ? {
              ...day,
              segments: items.map((task, i) => ({
                id: `many${i}`,
                taskId: task.id,
                scheduledOn: day.day,
                minutes: 20,
                state: 'SCHEDULED',
                sortOrder: i,
              })),
            }
          : day,
      ),
    };
    catalog.chapters[0].items = items.map((task) => ({
      id: task.id,
      title: task.title,
      estimatedMinutes: 120,
      completed: false,
      completedAt: null,
      revision: 7,
      resource: null,
    }));
    const user = userEvent.setup();
    mount();
    const today = await ready();
    await user.click(within(today).getByText('高等数学 · 24 项任务'));
    expect(within(today).getAllByRole('checkbox')).toHaveLength(24);
    await user.click(within(today).getByRole('button', { name: '全部标记完成' }));
    await waitFor(() => expect(writes).toHaveLength(24), { timeout: 4000 });
    await waitFor(() =>
      expect(within(today).getByRole('button', { name: '全部标记完成' })).toBeDisabled(),
    );
    await waitFor(() =>
      expect(
        plan.tasks.filter((task) => task.id.startsWith('item')).every((task) => task.completed),
      ).toBe(true),
    );
  });
  it('计划详情失败可重试；每日安排为空提供行动按钮', async () => {
    server.use(http.get('/api/v1/schedule/plans/plan', () => HttpResponse.error()));
    const user = userEvent.setup();
    mount();
    await screen.findByRole('button', { name: '重新加载' });
    plan.days = [];
    server.use(http.get('/api/v1/schedule/plans/plan', () => ok(plan)));
    await user.click(screen.getByRole('button', { name: '重新加载' }));
    expect(await screen.findByText('这一周暂无每日安排。')).toBeVisible();
    expect(screen.getByRole('button', { name: '查看计划设置' })).toBeVisible();
  });
});
