import { beforeAll, afterAll, afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { BatchCompletionWrite, Catalog, CompletionWrite } from '../../api/generated/models';
import { CatalogPanel } from './CatalogPanel';
import { CatalogPage } from '../../pages/CatalogPage';

const fixture: Catalog = {
  courseId: 'course-a',
  releaseId: 'release-a',
  asOf: '2026-10-02T02:00:00Z',
  courseProgress: { completedItems: 1, totalItems: 3, percent: 33 },
  overallProgress: { completedItems: 1, totalItems: 6, percent: 17 },
  chapters: [
    {
      id: 'stage-a',
      title: '工专基础补充',
      sortOrder: 0,
      participatesInAssessment: false,
      items: [
        {
          id: 'item-a',
          title: '集合基础',
          estimatedMinutes: 20,
          completed: false,
          completedAt: null,
          revision: 2,
          resource: {
            kind: 'LINK',
            label: '视频',
            url: 'https://www.bilibili.com/video/example',
            fileId: null,
          },
        },
        {
          id: 'item-b',
          title: '逻辑运算',
          estimatedMinutes: 10,
          completed: false,
          completedAt: null,
          revision: 0,
          resource: null,
        },
      ],
    },
    {
      id: 'stage-b',
      title: '工本考点解析',
      sortOrder: 1,
      participatesInAssessment: true,
      items: [
        {
          id: 'item-c',
          title: '关系与函数',
          estimatedMinutes: 30,
          completed: true,
          completedAt: '2026-10-01T02:00:00Z',
          revision: 1,
          resource: null,
        },
      ],
    },
  ],
};
let data: Catalog;
const envelope = (data: unknown) => HttpResponse.json({ code: 0, message: '成功', data });
const server = setupServer(
  http.get('/api/v1/courses/:id/learning-position', () =>
    HttpResponse.json({ code: 40401, data: null, message: '无记录' }, { status: 404 }),
  ),
  http.get('/api/v1/catalog/courses/course-a', () => envelope(data)),
  http.put(
    '/api/v1/catalog/courses/course-a/items/:itemId/completion',
    async ({ request, params }) => {
      const write = (await request.json()) as CompletionWrite;
      const item = data.chapters
        .flatMap((chapter) => chapter.items)
        .find((item) => item.id === params.itemId)!;
      Object.assign(item, { completed: write.completed, revision: item.revision + 1 });
      data.courseProgress = { completedItems: 2, totalItems: 3, percent: 67 };
      return envelope({
        item,
        courseProgress: data.courseProgress,
        overallProgress: data.overallProgress,
        affectedPlanIds: ['plan-a'],
        clientMutationId: write.clientMutationId,
        asOf: data.asOf,
      });
    },
  ),
);
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterAll(() => server.close());
beforeEach(() => {
  data = structuredClone(fixture);
});
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function mount(hash = '', page = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      {
        path: '/study/course/:code/catalog',
        element: page ? <CatalogPage /> : <CatalogPanel courseId="course-a" />,
      },
    ],
    { initialEntries: [`/study/course/00023/catalog?cycleId=cycle-a${hash}`] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { client, router };
}
describe('任务式学习目录', () => {
  it('默认选择首个未完成项，资料入口不改变完成状态', async () => {
    mount();
    await screen.findByRole('heading', { name: '集合基础' });
    expect(screen.getByRole('link', { name: '打开视频' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    expect(data.chapters[0].items[0].completed).toBe(false);
    expect(document.querySelector('.reading-metadata')).toHaveTextContent(/预计 20 分钟.*待学习/);
  });
  it('深链接以稳定 item ID 定位，保留周期', async () => {
    const { router } = mount('&itemId=item-c#stage-b');
    await screen.findByRole('heading', { name: '关系与函数' });
    expect(router.state.location.search).toContain('cycleId=cycle-a');
    expect(screen.getByRole('button', { name: '取消完成' })).toBeVisible();
  });
  it('完成后接收后端修订号与进度，并自动进入下一项', async () => {
    const writes: CompletionWrite[] = [];
    server.use(
      http.put('/api/v1/catalog/courses/course-a/items/:itemId/completion', async ({ request }) => {
        const body = (await request.json()) as CompletionWrite;
        writes.push(body);
        Object.assign(data.chapters[0].items[0], { completed: true, revision: 3 });
        return envelope({
          item: data.chapters[0].items[0],
          courseProgress: { completedItems: 2, totalItems: 3, percent: 67 },
          overallProgress: data.overallProgress,
          asOf: data.asOf,
        });
      }),
    );
    const { router, client } = mount();
    client.setQueryData(['personal-home'], { study: { title: '集合基础' } });
    await screen.findByRole('heading', { name: '集合基础' });
    await userEvent.click(screen.getByRole('button', { name: '完成并继续' }));
    await screen.findByRole('heading', { name: '逻辑运算' });
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ completed: true, expectedRevision: 2 });
    expect(writes[0].clientMutationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(router.state.location.search).toContain('itemId=item-b');
    expect(client.getQueryState(['personal-home'])?.isInvalidated).toBe(true);
  });
  it('冲突保留当前任务，读取最新修订号后可重试', async () => {
    let requests = 0;
    const revisions: number[] = [];
    server.use(
      http.put('/api/v1/catalog/courses/course-a/items/:itemId/completion', async ({ request }) => {
        const body = (await request.json()) as CompletionWrite;
        revisions.push(body.expectedRevision);
        if (++requests === 1) {
          data.chapters[0].items[0].revision = 7;
          return HttpResponse.json(
            { code: 40901, data: null, message: '进度已变化' },
            { status: 409 },
          );
        }
        Object.assign(data.chapters[0].items[0], { completed: true, revision: 8 });
        return envelope({
          item: data.chapters[0].items[0],
          courseProgress: data.courseProgress,
          overallProgress: data.overallProgress,
          asOf: data.asOf,
        });
      }),
    );
    mount();
    await screen.findByRole('heading', { name: '集合基础' });
    await userEvent.click(screen.getByRole('button', { name: '完成并继续' }));
    await screen.findByText(/原进度已保留/);
    expect(screen.getByRole('heading', { name: '集合基础' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: '完成并继续' }));
    await screen.findByRole('heading', { name: '逻辑运算' });
    expect(revisions).toEqual([2, 7]);
  });
  it('网络失败不推进任务、不保留乐观完成状态', async () => {
    server.use(
      http.put('/api/v1/catalog/courses/course-a/items/:id/completion', () => HttpResponse.error()),
    );
    mount();
    await screen.findByRole('heading', { name: '集合基础' });
    await userEvent.click(screen.getByRole('button', { name: '完成并继续' }));
    await screen.findByText(/原进度已保留/);
    expect(data.chapters[0].items[0].completed).toBe(false);
    expect(screen.getByRole('heading', { name: '集合基础' })).toBeVisible();
  });
  it('整章操作先确认，取消无写入，确认带明确条目修订号', async () => {
    const writes: BatchCompletionWrite[] = [];
    server.use(
      http.patch('/api/v1/catalog/courses/course-a/completions', async ({ request }) => {
        const body = (await request.json()) as BatchCompletionWrite;
        writes.push(body);
        return envelope({
          items: [],
          courseProgress: data.courseProgress,
          overallProgress: data.overallProgress,
          asOf: data.asOf,
        });
      }),
    );
    mount();
    await screen.findByRole('heading', { name: '集合基础' });
    if (!screen.queryByRole('navigation', { name: '课程目录' }))
      await userEvent.click(screen.getByRole('button', { name: '选择章节与条目' }));
    await userEvent.click(screen.getAllByRole('button', { name: '本章全部标记完成' })[0]);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '取消' }));
    expect(writes).toHaveLength(0);
    if (!screen.queryByRole('navigation', { name: '课程目录' }))
      await userEvent.click(screen.getByRole('button', { name: '选择章节与条目' }));
    await userEvent.click(screen.getAllByRole('button', { name: '本章全部标记完成' })[0]);
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: '确认完成' }),
    );
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0].updates).toEqual([
      { itemId: 'item-a', completed: true, expectedRevision: 2 },
      { itemId: 'item-b', completed: true, expectedRevision: 0 },
    ]);
  });
  it('没有资料时明确说明，不生成虚假资源链接', async () => {
    mount('&itemId=item-b');
    await screen.findByRole('heading', { name: '逻辑运算' });
    expect(screen.getByText('此目录项暂未关联可打开的资料。')).toBeVisible();
    expect(screen.queryByRole('link', { name: /打开/ })).toBeNull();
  });
  it('危险外链不成为可点击入口', async () => {
    data.chapters[0].items[0].resource!.url = 'javascript:alert(1)';
    mount();
    await screen.findByRole('heading', { name: '集合基础' });
    expect(screen.queryByRole('link', { name: '打开视频' })).toBeNull();
  });
  it('空目录与错误状态提供真实恢复入口', async () => {
    data.chapters = [];
    mount();
    await screen.findByText('此课程暂未发布学习条目。');
    expect(screen.getByRole('link', { name: '查看学习书架' })).toHaveAttribute(
      'href',
      '/study/courses',
    );
  });
  it('失败重试恢复目录', async () => {
    server.use(http.get('/api/v1/catalog/courses/course-a', () => HttpResponse.error()));
    mount();
    await screen.findByText('学习目录加载失败。');
    server.resetHandlers();
    await userEvent.click(screen.getByRole('button', { name: '重新加载' }));
    await screen.findByRole('heading', { name: '集合基础' });
  });
  it('已完成项可取消完成，仍使用当前资源修订号', async () => {
    mount('&itemId=item-c');
    await screen.findByRole('heading', { name: '关系与函数' });
    await userEvent.click(screen.getByRole('button', { name: '取消完成' }));
    await screen.findByText('已取消完成标记。');
    expect(data.chapters[1].items[0].completed).toBe(false);
  });
});
