/// <reference types="node" />
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { delay, http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import type {
  Course,
  KnowledgeModule,
  KnowledgeNoteWrite,
  KnowledgePage as KnowledgePageData,
} from '../../api/generated/models';
import { KnowledgePage } from '../../pages/KnowledgePage';

const courseId = 'afdac469-0fe4-5007-833c-51a71333967b';
const moduleId = '88bc3df9-2983-5074-8d70-092aa6cf9e59';
const secondId = '482e7a78-6eef-5bc6-b480-cb8652339a3f';
const exampleId = '805c5427-486e-51e4-aee4-36950f81dae0';
const cycleId = '0ebdbbfe-d607-54b5-9c21-4e0adade5e4c';
const module: KnowledgeModule = {
  id: moduleId,
  title: '导数定义',
  content: '函数的变化率由 $f\u0027(x)$ 描述。',
  difficulty: 2,
  formulas: [
    {
      label: '导数定义式',
      tex: "f'(x)=\\lim_{h\\to0}\\frac{f(x+h)-f(x)}{h}",
      condition: '极限存在',
    },
  ],
  examples: [{ id: exampleId, question: '求 $f(x)=x^2$ 的导数。', stars: 2 }],
  resources: [
    { kind: 'LINK', label: '学习资料', url: 'https://example.com/learning', fileId: null },
  ],
  userNote: { mastery: 1, note: '已有笔记', revision: 4 },
};
const second: KnowledgeModule = {
  ...module,
  id: secondId,
  title: '极限性质',
  examples: [],
  formulas: [],
  resources: [],
  userNote: { mastery: 0, note: '', revision: 0 },
};
const course: Course = {
  id: courseId,
  code: '00023',
  name: '高等数学',
  courseType: 'THEORY',
  active: true,
  releaseId: secondId,
  enrollment: null,
  progress: { completedItems: 1, totalItems: 2, percent: 50 },
  capabilities: { knowledge: true, catalog: true, practice: true, exams: true, manual: false },
};
const listUrl = `/api/v1/catalog/courses/${courseId}/knowledge`;
const detailUrl = `${listUrl}/${moduleId}`;
const saveUrl = `${detailUrl}/note`;
const solutionUrl = `/api/v1/catalog/courses/${courseId}/examples/${exampleId}/solution`;
const ok = (data: unknown) => HttpResponse.json({ code: 0, data, message: 'ok' });
const page: KnowledgePageData = { items: [module, second], page: 1, size: 20, total: 2 };
let stored: KnowledgeModule;
const writes: KnowledgeNoteWrite[] = [];
let solutions = 0;
const server = setupServer(
  http.get('/api/v1/courses/by-code/00023', () => ok(course)),
  http.get('/api/v1/exams/cycles', () =>
    ok({
      items: [
        {
          id: cycleId,
          name: '十月考试',
          startDate: '2026-10-01',
          endDate: '2026-10-31',
          timezone: 'Asia/Shanghai',
          courses: [],
        },
      ],
      page: 1,
      size: 20,
      total: 1,
    }),
  ),
  http.get(listUrl, () => ok({ ...page, items: [stored, second] })),
  http.get(detailUrl, () => ok(stored)),
  http.get(`${listUrl}/${secondId}`, () => ok(second)),
  http.get(solutionUrl, () => {
    solutions++;
    return ok({ exampleId, answer: "$f'(x)=2x$", solution: '根据导数定义求解。' });
  }),
  http.put(saveUrl, async ({ request }) => {
    const body = (await request.json()) as KnowledgeNoteWrite;
    writes.push(body);
    stored = {
      ...stored,
      userNote: { note: body.note, mastery: body.mastery, revision: body.expectedRevision + 1 },
    };
    return ok(stored);
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  stored = structuredClone(module);
  writes.length = 0;
  solutions = 0;
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
function mount(selected = true, initialPath?: string) {
  const path =
    initialPath ||
    `/study/course/00023/knowledge?cycleId=${cycleId}${selected ? `&moduleId=${moduleId}` : ''}`;
  const router = createMemoryRouter(
    [{ path: '/study/course/:code/knowledge', element: <KnowledgePage /> }],
    { initialEntries: [path], future: { v7_relativeSplatPath: true } },
  );
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </QueryClientProvider>,
  );
  return { router, client, ...view };
}
async function loaded() {
  await screen.findByRole('textbox', { name: '知识笔记' });
}
const pause = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });

describe('知识合集', () => {
  it('列表与详情使用不含解答的生成类型；契约禁止例题解答字段', async () => {
    const spec = parse(readFileSync('docs/openapi.yaml', 'utf8'));
    expect(Object.keys(spec.components.schemas.KnowledgeExample.properties).sort()).toEqual([
      'id',
      'question',
      'stars',
    ]);
    expect(spec.components.schemas.KnowledgeExample.additionalProperties).toBe(false);
    mount();
    await loaded();
    expect(solutions).toBe(0);
    expect(screen.queryByText('根据导数定义求解。')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看答案与解法' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('link', { name: /学习资料/ })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    await waitFor(() => expect(document.querySelector('.kh-formula-scroll .katex')).not.toBeNull());
  });
  it('点击后才请求解答，可收起；收起后移除受保护查询缓存', async () => {
    const { client } = mount();
    await loaded();
    await userEvent.click(screen.getByRole('button', { name: '查看答案与解法' }));
    await screen.findByText('根据导数定义求解。');
    expect(solutions).toBe(1);
    await userEvent.click(screen.getByRole('button', { name: '收起答案与解法' }));
    expect(screen.queryByText('根据导数定义求解。')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(client.getQueryData(['knowledge-solution', courseId, exampleId])).toBeUndefined(),
    );
    await userEvent.click(screen.getByRole('button', { name: '查看答案与解法' }));
    await screen.findByText('根据导数定义求解。');
    expect(solutions).toBe(2);
  });
  it('解答加载、失败可重试、空状态提供行动', async () => {
    server.use(
      http.get(solutionUrl, async () => {
        await delay(100);
        return HttpResponse.json(
          { code: 50001, data: null, message: '解答暂不可用' },
          { status: 500 },
        );
      }),
    );
    mount();
    await loaded();
    await userEvent.click(screen.getByRole('button', { name: '查看答案与解法' }));
    await screen.findByText('正在加载答案与解法');
    await screen.findByText('解答暂不可用');
    server.use(http.get(solutionUrl, () => ok({ exampleId, answer: '', solution: '' })));
    await userEvent.click(screen.getByRole('button', { name: '重新加载' }));
    await screen.findByText('本例题答案与解法准备中。');
  });
  it('搜索防抖，不为每个字符请求，并发送难度筛选', async () => {
    const received: string[] = [];
    server.use(
      http.get(listUrl, ({ request }) => {
        received.push(new URL(request.url).search);
        return ok(page);
      }),
    );
    const { router } = mount(false);
    await screen.findByRole('button', { name: /导数定义/ });
    await userEvent.type(screen.getByRole('searchbox', { name: '搜索知识模块' }), '导数');
    expect(received).toHaveLength(1);
    await pause(400);
    await waitFor(() => expect(received).toHaveLength(2));
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('导数');
    await userEvent.selectOptions(screen.getByLabelText('难度筛选'), '5');
    await waitFor(() => expect(received.at(-1)).toContain('difficulty=5'));
    expect(received.at(-1)).toContain(encodeURIComponent('导数'));
  });
  it('选择模块写入稳定 ID，返回列表清除详情并恢复焦点', async () => {
    const { router } = mount(false);
    await screen.findByRole('button', { name: /导数定义/ });
    await userEvent.click(screen.getByRole('button', { name: /导数定义/ }));
    await loaded();
    expect(new URLSearchParams(router.state.location.search).get('moduleId')).toBe(moduleId);
    await userEvent.click(screen.getByRole('button', { name: '返回模块列表' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '知识模块' })).toHaveFocus());
    expect(new URLSearchParams(router.state.location.search).has('moduleId')).toBe(false);
  });
  it('模块列表加载、空状态、错误重试', async () => {
    server.use(
      http.get(listUrl, async () => {
        await delay(100);
        return HttpResponse.json(
          { code: 50001, data: null, message: '模块列表加载失败' },
          { status: 500 },
        );
      }),
    );
    mount(false);
    await screen.findByText('正在加载知识模块');
    await screen.findByText('模块列表加载失败');
    server.use(http.get(listUrl, () => ok({ items: [], page: 1, size: 20, total: 0 })));
    await userEvent.click(screen.getByRole('button', { name: '重新加载' }));
    await screen.findByText('没有符合条件的知识模块。');
  });
  it('模块详情加载、错误重试后显示正文', async () => {
    server.use(
      http.get(detailUrl, async () => {
        await delay(100);
        return HttpResponse.json(
          { code: 50001, data: null, message: '模块详情加载失败' },
          { status: 500 },
        );
      }),
    );
    mount();
    await screen.findByText('正在加载模块详情');
    await screen.findByText('模块详情加载失败');
    server.use(http.get(detailUrl, () => ok(stored)));
    await userEvent.click(screen.getByRole('button', { name: '重新加载' }));
    await loaded();
  });
  it('没有公式、例题和资源时各有说明及行动', async () => {
    mount(true, `/study/course/00023/knowledge?cycleId=${cycleId}&moduleId=${secondId}`);
    await loaded();
    expect(screen.getByText('本模块暂无独立公式。')).toBeInTheDocument();
    expect(screen.getByText('本模块暂无例题。')).toBeInTheDocument();
    expect(screen.getByText('本模块暂无资源链接。')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '查看其他模块' })).toHaveLength(2);
  });
  it('五档掌握程度立即保存，携带当前笔记和后端修订号', async () => {
    mount();
    await loaded();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    await userEvent.click(screen.getByRole('radio', { name: '4 · 精通' }));
    await screen.findByText('已保存');
    expect(writes).toEqual([{ mastery: 4, note: '已有笔记', expectedRevision: 4 }]);
  });
  it('笔记防抖 1 秒，明确显示等待、保存中和已保存', async () => {
    server.use(
      http.put(saveUrl, async ({ request }) => {
        const body = (await request.json()) as KnowledgeNoteWrite;
        writes.push(body);
        await delay(150);
        return ok({ ...stored, userNote: { ...body, revision: 5 } });
      }),
    );
    mount();
    await loaded();
    await userEvent.clear(screen.getByRole('textbox', { name: '知识笔记' }));
    await userEvent.type(screen.getByRole('textbox', { name: '知识笔记' }), '新的笔记');
    expect(screen.getByText('等待自动保存')).toBeInTheDocument();
    expect(writes).toHaveLength(0);
    await pause(500);
    expect(writes).toHaveLength(0);
    await screen.findByText('保存中');
    await screen.findByText('已保存');
    expect(writes).toHaveLength(1);
    expect(writes[0].note).toBe('新的笔记');
  });
  it('保存失败保留草稿，重试先读取修订号后保存', async () => {
    server.use(
      http.put(saveUrl, () =>
        HttpResponse.json({ code: 40901, data: null, message: '修订号冲突' }, { status: 409 }),
      ),
    );
    mount();
    await loaded();
    await userEvent.clear(screen.getByRole('textbox', { name: '知识笔记' }));
    await userEvent.type(screen.getByRole('textbox', { name: '知识笔记' }), '本地草稿');
    await screen.findByText('保存失败', {}, { timeout: 2500 });
    expect(screen.getByRole('textbox', { name: '知识笔记' })).toHaveValue('本地草稿');
    stored = { ...stored, userNote: { ...stored.userNote, note: '服务器新笔记', revision: 10 } };
    server.use(
      http.put(saveUrl, async ({ request }) => {
        const body = (await request.json()) as KnowledgeNoteWrite;
        writes.push(body);
        return ok({
          ...stored,
          userNote: { note: body.note, mastery: body.mastery, revision: 11 },
        });
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await screen.findByText('已保存');
    expect(writes.at(-1)).toMatchObject({ note: '本地草稿', expectedRevision: 10 });
  });
  it('保存期间继续输入不被旧响应覆盖，后续请求使用新修订号', async () => {
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.put(saveUrl, async ({ request }) => {
        const body = (await request.json()) as KnowledgeNoteWrite;
        writes.push(body);
        if (writes.length === 1) await pending;
        stored = {
          ...stored,
          userNote: { note: body.note, mastery: body.mastery, revision: body.expectedRevision + 1 },
        };
        return ok(stored);
      }),
    );
    mount();
    await loaded();
    await userEvent.click(screen.getByRole('radio', { name: '3 · 掌握' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    await userEvent.clear(screen.getByRole('textbox', { name: '知识笔记' }));
    await userEvent.type(screen.getByRole('textbox', { name: '知识笔记' }), '保存期间的新内容');
    await pause(1100);
    expect(writes).toHaveLength(1);
    release?.();
    await screen.findByText('已保存');
    expect(screen.getByRole('textbox', { name: '知识笔记' })).toHaveValue('保存期间的新内容');
    expect(writes[1]).toEqual({ mastery: 3, note: '保存期间的新内容', expectedRevision: 5 });
  });
  it('切换模块时提交未到防抖时间的笔记', async () => {
    mount();
    await loaded();
    await userEvent.clear(screen.getByRole('textbox', { name: '知识笔记' }));
    await userEvent.type(screen.getByRole('textbox', { name: '知识笔记' }), '切换前的草稿');
    await userEvent.click(screen.getByRole('button', { name: '返回模块列表' }));
    await userEvent.click(await screen.findByRole('button', { name: /极限性质/ }));
    await waitFor(() => expect(writes[0]?.note).toBe('切换前的草稿'));
    await screen.findByRole('heading', { name: '极限性质' });
    expect(screen.getByRole('textbox', { name: '知识笔记' })).toHaveValue('');
  });
  it('失败草稿在切换模块后仍保留，不被旧服务器内容覆盖', async () => {
    server.use(
      http.put(saveUrl, () =>
        HttpResponse.json({ code: 50001, data: null, message: '暂时无法保存' }, { status: 500 }),
      ),
    );
    mount();
    await loaded();
    await userEvent.clear(screen.getByRole('textbox', { name: '知识笔记' }));
    await userEvent.type(screen.getByRole('textbox', { name: '知识笔记' }), '需要保留的失败草稿');
    await userEvent.click(screen.getByRole('radio', { name: '3 · 掌握' }));
    await screen.findByText('保存失败');
    await userEvent.click(screen.getByRole('button', { name: '返回模块列表' }));
    await userEvent.click(await screen.findByRole('button', { name: /极限性质/ }));
    await screen.findByRole('heading', { name: '极限性质' });
    await userEvent.click(screen.getByRole('button', { name: '返回模块列表' }));
    await userEvent.click(await screen.findByRole('button', { name: /导数定义/ }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: '知识笔记' })).toHaveValue('需要保留的失败草稿'),
    );
    expect(screen.getByRole('radio', { name: '3 · 掌握' })).toBeChecked();
    await screen.findByText('保存失败', {}, { timeout: 2500 });
  });
  it('输入最多 10000 个 Unicode 字符，超限不覆盖草稿', async () => {
    mount();
    await loaded();
    const note = screen.getByRole('textbox', { name: '知识笔记' });
    await userEvent.click(note);
    await userEvent.clear(note);
    await userEvent.paste('学'.repeat(10000));
    expect(screen.getByText('10000 / 10000 字')).toBeInTheDocument();
    await userEvent.paste('多');
    expect(note).toHaveValue('学'.repeat(10000));
    expect(screen.getByText('笔记最多 10000 字，超出的输入未加入草稿。')).toBeInTheDocument();
    await screen.findByText('已保存', {}, { timeout: 2500 });
    expect(writes[0].note).toHaveLength(10000);
  });
  it('资源不预加载，下载失败可重试且非法链接禁用', async () => {
    stored = {
      ...stored,
      resources: [
        { kind: 'FILE', label: '章节附件', fileId: secondId, url: null },
        { kind: 'LINK', label: '无效资源', url: 'javascript:alert(1)', fileId: null },
      ],
    };
    let requests = 0;
    server.use(
      http.get(`/api/v1/catalog/courses/${courseId}/resources/${secondId}`, () => {
        requests++;
        return HttpResponse.json(
          { code: 40301, data: null, message: '当前资源不可下载' },
          { status: 403 },
        );
      }),
    );
    mount();
    await loaded();
    expect(requests).toBe(0);
    expect(screen.getByRole('button', { name: '无效资源' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: '章节附件' }));
    await screen.findByText('当前资源不可下载');
    await userEvent.click(screen.getByRole('button', { name: '章节附件 · 重试下载' }));
    await waitFor(() => expect(requests).toBe(2));
  });
  it('窄屏详情聚焦，公式是可聚焦的横向滚动区域', async () => {
    vi.mocked(window.matchMedia).mockReturnValueOnce({ matches: true } as MediaQueryList);
    mount();
    await loaded();
    expect(document.querySelector('.kh-detail')).toHaveFocus();
    expect(screen.getByRole('region', { name: '导数定义式公式，可横向滚动' })).toHaveAttribute(
      'tabindex',
      '0',
    );
    expect(document.querySelector('.kh-workspace')).toHaveAttribute('data-detail', 'true');
  });
  it('未选模块不显示返回按钮，知识合集只有二级标题且不写入掌握状态', async () => {
    mount(false);
    await screen.findByRole('button', { name: /导数定义/ });
    expect(screen.getByRole('heading', { name: '知识索引' })).toHaveProperty('tagName', 'H2');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '返回模块列表' })).not.toBeInTheDocument();
    expect(writes).toHaveLength(0);
  });
  it('无结果清除组合筛选并重置页码，周期保留', async () => {
    server.use(
      http.get(listUrl, ({ request }) => {
        const params = new URL(request.url).searchParams;
        return ok(
          params.get('q')
            ? { items: [], page: 2, size: 20, total: 0 }
            : {
                items: [{ id: moduleId, title: module.title, difficulty: 2 }],
                page: 1,
                size: 20,
                total: 1,
              },
        );
      }),
    );
    const { router } = mount(
      false,
      `/study/course/00023/knowledge?cycleId=${cycleId}&q=无结果&difficulty=5&page=2`,
    );
    await screen.findByText('没有符合条件的知识模块。');
    await userEvent.click(screen.getAllByRole('button', { name: '清除筛选' }).at(-1)!);
    await screen.findByRole('button', { name: /导数定义/ });
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('cycleId')).toBe(cycleId);
    ['q', 'difficulty', 'page'].forEach((key) => expect(params.has(key)).toBe(false));
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });
  it('返回模块列表保留筛选并恢复原滚动位置', async () => {
    const scroll = vi.spyOn(window, 'scrollTo');
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(480);
    const { router } = mount(
      false,
      `/study/course/00023/knowledge?cycleId=${cycleId}&q=导数&difficulty=2`,
    );
    await screen.findByRole('button', { name: /导数定义/ });
    await userEvent.click(screen.getByRole('button', { name: /导数定义/ }));
    await loaded();
    await userEvent.click(screen.getByRole('button', { name: '返回模块列表' }));
    expect(router.state.location.search).toContain('difficulty=2');
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('导数');
    expect(scroll).toHaveBeenCalledWith({ top: 480, behavior: 'auto' });
    vi.restoreAllMocks();
  });
  it('Markdown表格使用局部滚动区域，代码与公式保留，例题可键盘展开', async () => {
    stored.content =
      '# 定义\n\n| 条件 | 结论 |\n| --- | --- |\n| 极限存在 | 可导 |\n\n```java\nSystem.out.println("学习");\n```';
    mount();
    await loaded();
    expect(
      within(screen.getByRole('region', { name: '知识表格，可横向滚动' })).getByRole('table'),
    ).toBeVisible();
    expect(screen.getByText('System.out.println("学习");')).toBeVisible();
    expect(document.querySelector('.katex')).not.toBeNull();
    const button = screen.getByRole('button', { name: '查看答案与解法' });
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    await screen.findByText('答案');
    await userEvent.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
  it('缺少周期时选择后加载课程', async () => {
    const { router } = mount(false, '/study/course/00023/knowledge');
    await screen.findByLabelText('考试周期');
    await userEvent.selectOptions(screen.getByLabelText('考试周期'), cycleId);
    await screen.findByRole('button', { name: /导数定义/ });
    expect(router.state.location.search).toContain(cycleId);
  });
});
