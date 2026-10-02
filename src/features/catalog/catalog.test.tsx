import { beforeAll, afterAll, afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';
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
        path: '/zikao/course/:code/catalog',
        element: page ? <CatalogPage /> : <CatalogPanel courseId="course-a" />,
      },
    ],
    { initialEntries: [`/zikao/course/00023/catalog?cycleId=cycle-a${hash}`] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { client, router };
}
describe('课程目录', () => {
  it('默认展开当前章，课程进度只有一次，继续学习聚焦具体条目', async () => {
    const scroll = vi.fn();
    HTMLElement.prototype.scrollIntoView = scroll;
    const { router } = mount();
    await screen.findByText('课程总进度');
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /工专基础补充 共 2 项/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /工本考点解析 共 1 项/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await userEvent.click(screen.getByRole('button', { name: '继续学习' }));
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('item-a')));
    expect(scroll).toHaveBeenCalled();
    expect(router.state.location.pathname).toBe('/zikao/course/00023/catalog');
    expect(router.state.location.hash).toBe('#stage-a');
    expect(
      screen.getByRole('link', { name: '打开集合基础（工专基础补充，新窗口打开）' }),
    ).toHaveAttribute('rel', 'noopener noreferrer');
  });
  it('带 hash 直接展开章节；点击另一锚点也可定位', async () => {
    mount('#stage-b');
    const heading = await screen.findByRole('button', { name: /工本考点解析 共 1 项/ });
    await waitFor(() => expect(heading).toHaveAttribute('aria-expanded', 'true'));
    expect(screen.getByRole('button', { name: /工专基础补充 共 2 项/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await userEvent.click(
      within(screen.getByRole('navigation')).getByRole('link', { name: '工专基础补充' }),
    );
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('stage-a')));
  });
  it('HTTP 环境没有 randomUUID 时仍能保存完成状态', async () => {
    const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
    vi.stubGlobal('crypto', { getRandomValues });
    mount();
    const checkbox = await screen.findByRole('checkbox', { name: '集合基础完成状态' });
    await userEvent.click(checkbox);
    await screen.findByText('已保存');
    expect(checkbox).toBeChecked();
    expect(data.chapters[0].items[0].completed).toBe(true);
    expect(screen.queryByText(/randomUUID/)).not.toBeInTheDocument();
  });
  it('单项保存即时反馈，接收后端进度，并失效关联汇总及35天安排', async () => {
    const { client } = mount();
    for (const key of [
      ['dashboard', 'cycle-a'],
      ['home'],
      ['schedule', 'plan-a'],
      ['course-progress', 'course-a'],
    ])
      client.setQueryData(key, { status: '旧状态' });
    const checkbox = await screen.findByRole('checkbox', { name: '集合基础完成状态' });
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    await screen.findByText('已保存');
    expect(checkbox).toHaveFocus();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67');
    for (const key of [
      ['dashboard', 'cycle-a'],
      ['home'],
      ['schedule', 'plan-a'],
      ['course-progress', 'course-a'],
    ])
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    await userEvent.click(checkbox);
    await waitFor(() => expect(checkbox).not.toBeChecked());
  });
  it('网络失败回滚，可再次勾选重试', async () => {
    server.use(
      http.put('/api/v1/catalog/courses/course-a/items/:itemId/completion', async () => {
        await delay(80);
        return HttpResponse.error();
      }),
    );
    mount();
    const checkbox = await screen.findByRole('checkbox', { name: '集合基础完成状态' });
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    await screen.findByRole('alert');
    expect(screen.getByText(/保存失败，已恢复原状态/)).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
    await waitFor(() => expect(checkbox).not.toBeDisabled());
  });
  it('整章完成需二次确认，Esc回焦，确认发送明确条目和修订号', async () => {
    let body: BatchCompletionWrite | undefined;
    server.use(
      http.patch('/api/v1/catalog/courses/course-a/completions', async ({ request }) => {
        body = (await request.json()) as BatchCompletionWrite;
        data.chapters[0].items.forEach((item) => {
          item.completed = true;
          item.revision += 1;
        });
        return envelope({
          items: data.chapters[0].items,
          courseProgress: data.courseProgress,
          overallProgress: data.overallProgress,
          affectedPlanIds: [],
          clientMutationId: body.clientMutationId,
          asOf: data.asOf,
        });
      }),
    );
    mount();
    const trigger = await screen.findByRole('button', { name: '全部标记完成' });
    await userEvent.click(trigger);
    expect(screen.getByRole('dialog')).toHaveTextContent('2 个未完成条目');
    expect(document.activeElement).toBe(
      within(screen.getByRole('dialog')).getByRole('button', { name: '关闭弹窗' }),
    );
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '确认标记 2 项' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole('button', { name: '确认标记 2 项' }));
    await screen.findByText('已保存');
    expect(body?.updates).toEqual([
      { itemId: 'item-a', completed: true, expectedRevision: 2 },
      { itemId: 'item-b', completed: true, expectedRevision: 0 },
    ]);
  });
  it('保存冲突回滚并重新读取最新修订号', async () => {
    server.use(
      http.put('/api/v1/catalog/courses/course-a/items/:itemId/completion', () => {
        data.chapters[0].items[0].revision = 9;
        return HttpResponse.json(
          { code: 40901, message: '状态已被其他设备修改', data: null },
          { status: 409 },
        );
      }),
    );
    const { client } = mount();
    const checkbox = await screen.findByRole('checkbox', { name: '集合基础完成状态' });
    await userEvent.click(checkbox);
    await screen.findByText(/保存失败，已恢复原状态/);
    await waitFor(() =>
      expect(
        client.getQueryData<Catalog>(['catalog', 'course-a'])?.chapters[0].items[0].revision,
      ).toBe(9),
    );
    expect(checkbox).not.toBeChecked();
  });
  it('断网导致保存和刷新都失败时仍保留目录与回滚提示', async () => {
    mount();
    const checkbox = await screen.findByRole('checkbox', { name: '集合基础完成状态' });
    server.use(
      http.put('/api/v1/catalog/courses/course-a/items/:itemId/completion', () =>
        HttpResponse.error(),
      ),
      http.get('/api/v1/catalog/courses/course-a', () => HttpResponse.error()),
    );
    await userEvent.click(checkbox);
    await screen.findByText(/保存失败，已恢复原状态/);
    await screen.findByText('目录刷新失败，正在显示上次加载的内容。');
    expect(checkbox).not.toBeChecked();
    expect(screen.getByRole('button', { name: '重试刷新目录' })).toBeInTheDocument();
  });
  it('加载状态可见', async () => {
    server.use(
      http.get('/api/v1/catalog/courses/course-a', async () => {
        await delay(60);
        return envelope(data);
      }),
    );
    mount();
    expect(screen.getByRole('status')).toHaveTextContent('正在加载课程目录');
    await screen.findByText('课程总进度');
  });
  it('空目录有说明和刷新操作', async () => {
    data.chapters = [];
    mount();
    await screen.findByText('本课程暂未发布目录，请稍后查看。');
    expect(screen.getByRole('button', { name: '刷新目录' })).toBeInTheDocument();
  });
  it('出错可重试，恢复正常目录', async () => {
    server.use(http.get('/api/v1/catalog/courses/course-a', () => HttpResponse.error()));
    mount();
    await screen.findByRole('alert');
    server.resetHandlers();
    await userEvent.click(screen.getByRole('button', { name: '重新加载目录' }));
    await screen.findByText('课程总进度');
  });
  it('后端已完成课程显示完成文案', async () => {
    data.chapters.forEach((chapter) =>
      chapter.items.forEach((item) => {
        item.completed = true;
      }),
    );
    data.courseProgress = { completedItems: 3, totalItems: 3, percent: 100 };
    mount();
    await screen.findByText('本课程目录已全部完成，可展开章节复习。');
    expect(screen.queryByRole('button', { name: '继续学习' })).not.toBeInTheDocument();
  });
  it('课程解析加载失败可以重试且保留hash', async () => {
    server.use(http.get('/api/v1/courses/by-code/00023', () => HttpResponse.error()));
    const { router } = mount('#stage-b', true);
    expect(screen.getByRole('status')).toHaveTextContent('正在加载课程');
    await screen.findByText('课程加载失败，请重试。');
    expect(router.state.location.hash).toBe('#stage-b');
  });
});
