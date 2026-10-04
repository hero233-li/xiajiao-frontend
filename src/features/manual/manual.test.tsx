import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse, delay } from 'msw';
import type { Catalog, CatalogItem, CompletionWrite, Manual } from '../../api/generated/models';
import ManualReader from './ManualReader';
import { CatalogPanel } from '../catalog/CatalogPanel';
import { ManualMarkdown } from './ManualMarkdown';
import { CodeBlock } from './CodeBlock';
import { indexManual } from './markdown-index';
const markdown = `# Java 基础

学习变量和数据类型。

## 编写程序

使用变量实现输出。

\`\`\`java
public class Demo { public static void main(String[] args) { System.out.println("这是一条很长的代码行，用于验证横向滚动显示完整的代码内容。"); } }
\`\`\`

| 类型 | 含义 |
| --- | --- |
| int | 整数 |

公式 $x^2$。

<script>window.manualXss = true</script>

<img src="invalid" onerror="window.manualXss = true" />

[危险链接](javascript:alert(1))
`;
const item: CatalogItem = {
  id: 'item-a',
  title: '完成变量练习',
  estimatedMinutes: 20,
  completed: false,
  completedAt: null,
  revision: 2,
  resource: null,
};
const fixture: Manual = {
  courseId: 'course-a',
  releaseId: 'release-a',
  sections: [
    {
      chapterId: 'chapter-a',
      title: 'Java 基础',
      markdown,
      exercises: [{ item, exampleId: null }],
    },
  ],
};
let manual: Manual;
let lastWrite: CompletionWrite | undefined;
const envelope = (data: unknown) => HttpResponse.json({ code: 0, message: '成功', data });
const progress = { completedItems: 0, totalItems: 1, percent: 0 };
function catalog(): Catalog {
  return {
    courseId: 'course-a',
    releaseId: 'release-a',
    asOf: '2026-10-02T02:00:00Z',
    courseProgress: manual.sections[0].exercises[0].item.completed
      ? { completedItems: 1, totalItems: 1, percent: 100 }
      : progress,
    overallProgress: progress,
    chapters: [
      {
        id: 'chapter-a',
        title: 'Java 基础',
        sortOrder: 0,
        participatesInAssessment: false,
        items: manual.sections[0].exercises.map((exercise) => exercise.item),
      },
    ],
  };
}
const server = setupServer(
  http.get('/api/v1/courses/:id/learning-position', () => envelope(null)),
  http.get('/api/v1/catalog/courses/course-a/manual', () => envelope(manual)),
  http.get('/api/v1/catalog/courses/course-a', () => envelope(catalog())),
  http.put('/api/v1/catalog/courses/course-a/items/item-a/completion', async ({ request }) => {
    lastWrite = (await request.json()) as CompletionWrite;
    Object.assign(manual.sections[0].exercises[0].item, {
      completed: lastWrite.completed,
      revision: manual.sections[0].exercises[0].item.revision + 1,
    });
    return envelope({
      item: manual.sections[0].exercises[0].item,
      courseProgress: catalog().courseProgress,
      overallProgress: progress,
      affectedPlanIds: ['plan-a'],
      clientMutationId: lastWrite.clientMutationId,
      asOf: '2026-10-02T02:00:00Z',
    });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
beforeEach(() => {
  manual = structuredClone(fixture);
  lastWrite = undefined;
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true });
});
function mount(hash = '') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      {
        path: '/manual',
        element: (
          <>
            <Link to="/catalog">前往目录</Link>
            <ManualReader courseId="course-a" />
          </>
        ),
      },
      {
        path: '/catalog',
        element: (
          <>
            <Link to="/manual">返回手册</Link>
            <CatalogPanel courseId="course-a" />
          </>
        ),
      },
    ],
    { initialEntries: [{ pathname: '/manual', hash, key: crypto.randomUUID() }] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, client };
}
describe('实践手册', () => {
  it('生成Markdown标题目录，支持公式和可滚动表格，HTML不会执行', async () => {
    const { container } = render(
      <ManualMarkdown chapterId="chapter-a" markdown={markdown} search="" onAnchor={vi.fn()} />,
    );
    expect(container.querySelector('h1')).toHaveAttribute('id', 'manual-chapter-a-line-1');
    expect(container.querySelector('[aria-label="手册表格，可横向滚动"]')).toHaveClass(
      'manual-table',
    );
    await waitFor(() => expect(container.querySelector('.katex')).toBeInTheDocument());
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('a')).not.toHaveAttribute('href', 'javascript:alert(1)');
    expect(indexManual(fixture).headings.map((heading) => heading.text)).toEqual([
      'Java 基础',
      '编写程序',
    ]);
    await waitFor(() => expect(container.querySelector('.hljs-keyword')).toBeInTheDocument());
  });
  it('代码可复制，长行保持横向滚动容器', async () => {
    const user = userEvent.setup();
    const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<CodeBlock source={'public class Demo {}\n'} language="java" />);
    const pre = screen.getByLabelText('代码内容，可横向滚动');
    expect(pre.tagName).toBe('PRE');
    expect(pre).toHaveAttribute('tabindex', '0');
    await user.click(screen.getByRole('button', { name: '复制' }));
    await screen.findByText('代码已复制到剪贴板');
    expect(copy).toHaveBeenCalledWith('public class Demo {}\n');
  });
  it('复制失败会提示，并可重试', async () => {
    const user = userEvent.setup();
    const copy = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockRejectedValueOnce(new Error('拒绝访问'))
      .mockResolvedValue();
    render(<CodeBlock source="select 1;" language="sql" />);
    await user.click(screen.getByRole('button', { name: '复制' }));
    await screen.findByText('复制失败，请重试或手动选择代码复制。');
    await user.click(screen.getByRole('button', { name: '复制' }));
    await screen.findByText('代码已复制到剪贴板');
    expect(copy).toHaveBeenCalledTimes(2);
  });
  it('代码高亮加载失败仍可复制，并提供重试', async () => {
    const module = await import('./highlight');
    vi.spyOn(module, 'highlightCode').mockRejectedValueOnce(new Error('加载失败'));
    const { container } = render(<CodeBlock source="public class Demo {}" language="java" />);
    await screen.findByText('代码高亮加载失败，仍可阅读和复制原文。');
    expect(screen.getByLabelText('代码内容，可横向滚动')).toHaveTextContent('public class Demo {}');
    expect(screen.getByRole('button', { name: '复制' })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: '重试代码高亮' }));
    await waitFor(() => expect(container.querySelector('.hljs-keyword')).toBeInTheDocument());
  });
  it('搜索结果跳转并高亮，无结果提供清空操作', async () => {
    mount();
    const search = await screen.findByRole('searchbox', { name: '搜索手册' });
    await userEvent.type(search, '数据类型');
    expect(screen.getByRole('status')).toHaveTextContent('找到 1 处匹配内容');
    await userEvent.click(screen.getByRole('button', { name: '学习变量和数据类型。' }));
    await waitFor(() =>
      expect(document.activeElement).toBe(document.getElementById('manual-chapter-a-line-3')),
    );
    expect(document.querySelector('mark')).toHaveTextContent('数据类型');
    expect(document.activeElement).toHaveAttribute('data-reading-target', 'true');
    await userEvent.clear(search);
    await userEvent.type(search, '没有这个词');
    expect(screen.getByText('没有找到匹配内容，请尝试其他关键词。')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '清空搜索' }));
    expect(search).toHaveValue('');
  });
  it('hash定位和浏览器前进后退恢复各自滚动位置', async () => {
    const { router } = mount('#manual-chapter-a-line-1');
    await screen.findByRole('heading', { name: 'Java 基础', level: 1 });
    await waitFor(() =>
      expect(document.activeElement).toBe(document.getElementById('manual-chapter-a-line-1')),
    );
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 320, writable: true });
    await userEvent.click(
      within(screen.getByRole('navigation', { name: '手册目录' })).getByRole('link', {
        name: '编写程序',
      }),
    );
    expect(router.state.location.hash).toBe('#manual-chapter-a-line-5');
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 700, writable: true });
    await act(() => router.navigate(-1));
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 320, behavior: 'instant' });
    await act(() => router.navigate(1));
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 700, behavior: 'instant' });
  });
  it('手册勾选成功后目录页同步变化，并可从目录取消后返回手册', async () => {
    const { client } = mount();
    const checkbox = await screen.findByRole('checkbox', { name: '完成变量练习完成状态' });
    client.setQueryData(['course-progress', 'course-a'], progress);
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    await screen.findByText('已保存');
    expect(lastWrite?.expectedRevision).toBe(2);
    expect(client.getQueryState(['course-progress', 'course-a'])?.isInvalidated).toBe(true);
    await userEvent.click(screen.getByRole('link', { name: '前往目录' }));
    const cancel = await screen.findByRole('button', { name: '取消完成' });
    expect(document.querySelector('.reading-metadata')).toHaveTextContent(/预计.*已完成/);
    await userEvent.click(cancel);
    await screen.findByText('已取消完成标记。');
    await userEvent.click(screen.getByRole('link', { name: '返回手册' }));
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: '完成变量练习完成状态' })).not.toBeChecked(),
    );
  });
  it('勾选失败立即回滚，并保留目录缓存原状态', async () => {
    server.use(
      http.put('/api/v1/catalog/courses/course-a/items/item-a/completion', async () => {
        await delay(60);
        return HttpResponse.error();
      }),
    );
    const { client } = mount();
    client.setQueryData(['catalog', 'course-a'], catalog());
    const checkbox = await screen.findByRole('checkbox', { name: '完成变量练习完成状态' });
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    await screen.findByText(/保存失败，已恢复原状态/);
    expect(checkbox).not.toBeChecked();
    expect(
      client.getQueryData<Catalog>(['catalog', 'course-a'])?.chapters[0].items[0].completed,
    ).toBe(false);
  });
  it('加载状态有说明', async () => {
    server.use(
      http.get('/api/v1/catalog/courses/course-a/manual', async () => {
        await delay(60);
        return envelope(manual);
      }),
    );
    mount();
    expect(screen.getByText('正在加载实践手册')).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'Java 基础', level: 1 });
  });
  it('空手册有说明和刷新按钮', async () => {
    manual.sections = [];
    mount();
    await screen.findByText('本课程暂未发布实践手册。');
    expect(screen.getByRole('button', { name: '刷新手册' })).toBeInTheDocument();
  });
  it('出错状态可以重试', async () => {
    server.use(http.get('/api/v1/catalog/courses/course-a/manual', () => HttpResponse.error()));
    mount();
    await screen.findByText('实践手册加载失败，请重试。');
    server.resetHandlers();
    await userEvent.click(screen.getByRole('button', { name: '重新加载手册' }));
    await screen.findByRole('heading', { name: 'Java 基础', level: 1 });
  });
  it('完全断网时显示回滚提示和原正文', async () => {
    mount();
    const checkbox = await screen.findByRole('checkbox', { name: '完成变量练习完成状态' });
    server.use(
      http.put('/api/v1/catalog/courses/course-a/items/item-a/completion', () =>
        HttpResponse.error(),
      ),
      http.get('/api/v1/catalog/courses/course-a/manual', () => HttpResponse.error()),
    );
    await userEvent.click(checkbox);
    await screen.findByText(/保存失败，已恢复原状态/);
    await screen.findByText('手册刷新失败，正在显示上次加载的内容。');
    expect(screen.getByRole('heading', { name: 'Java 基础', level: 1 })).toBeInTheDocument();
  });
  it('Markdown原始HTML包含事件、iframe、SVG时都不生成对应DOM', () => {
    const { container } = render(
      <ManualMarkdown
        chapterId="a"
        search=""
        onAnchor={vi.fn()}
        markdown={
          '<iframe src="https://example.com"></iframe>\n\n<svg onload="alert(1)"></svg>\n\n<button onclick="alert(1)">执行</button>'
        }
      />,
    );
    expect(container.querySelector('iframe,svg,button')).toBeNull();
  });
});
