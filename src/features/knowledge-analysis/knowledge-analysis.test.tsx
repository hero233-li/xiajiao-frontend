import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { delay, http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { sessionStore } from '../../api/session';
import {
  knowledgeAnalysisApi as api,
  type CardDetail,
  type ReviewWrite,
  type TaskSummary,
} from '../../api/knowledge-analysis';
import { KnowledgeAnalysis } from './KnowledgeAnalysis';
import { safeAnalysisImage, safeAnalysisUrl } from './safeUrl';
import { AnalysisMarkdown } from './AnalysisMarkdown';

const base = '/api/v1/knowledge-analysis';
const courseId = '11111111-1111-4111-8111-111111111111';
const cardId = '22222222-2222-4222-8222-222222222222';
const overview = {
  courses: [
    { id: courseId, code: '00023', name: '高等数学' },
    { id: 'other', code: '02324', name: '离散数学' },
  ],
  stats: { total: 1, pending: 1, repeated: 1, reviewed: 0 },
  workerOnline: true,
  workerReason: '工作程序就绪',
};
export const fixture: CardDetail = {
  id: cardId,
  courseId,
  courseCode: '00023',
  courseName: '高等数学',
  pointKey: 'derivative',
  pointTitle: '导数定义',
  chapterTitle: '导数与微分',
  title: '复合函数求导遗漏内层导数',
  issueType: 'OMISSION',
  errorCategory: 'METHOD',
  confidence: 'SUPPORTED',
  summary: '求导时遗漏了内层函数的变化率。',
  occurrences: 2,
  lostPoints: 3,
  reviewState: 'PENDING',
  analysisState: 'COMPLETED',
  updatedAt: '2026-10-18T10:00:00Z',
  revision: 4,
  knowledge: '复合函数遵循 **链式法则**。',
  steps: ['先识别内外层函数。'],
  pitfalls: ['不要遗漏内层导数。'],
  checklist: ['核对每一层导数。'],
  selfTest: '求 $y=(2x+1)^2$ 的导数。',
  selfTestAnswer: '$y\u0027=4(2x+1)$',
  note: '已有笔记',
  model: 'analysis-model',
  evidence: [
    {
      id: 'e1',
      sourceType: 'GRADING',
      sourceId: 's1',
      questionId: 'q1',
      questionNumber: '3',
      stem: '原题：求复合函数的导数。',
      answer: '我的答案：只计算了外层。',
      referenceAnswer: '参考答案：外层导数乘以内层导数。',
      earned: 2,
      maximum: 5,
      reasons: ['遗漏内层导数，扣 3 分。'],
      pages: [2, 3],
      occurredAt: '2026-10-17T08:00:00Z',
      sourceUrl: '/study/course/00023/exams?view=grading&taskId=t1',
      pointKey: 'derivative',
      pointTitle: '导数定义',
    },
  ],
};
let stored: CardDetail;
let items: CardDetail[];
let tasks: TaskSummary[];
let writes: ReviewWrite[];
const ok = (data: unknown) => HttpResponse.json({ code: 0, message: 'ok', data });
beforeEach(() => {
  // A new login epoch isolates intentionally retained in-memory drafts between test sessions.
  sessionStore.start({
    accessToken: 'test',
    refreshToken: 'test',
    user: { id: 'fixture-user', role: 'USER', username: 'fixture' },
  } as Parameters<typeof sessionStore.start>[0]);
  sessionStore.clear();
  stored = structuredClone(fixture);
  items = [stored];
  tasks = [];
  writes = [];
  server.use(
    http.get(`${base}/overview`, () => ok(overview)),
    http.get(`${base}/cards`, () => ok({ items, page: 1, size: 20, total: items.length })),
    http.get(`${base}/cards/${cardId}`, () => ok(stored)),
    http.get(`${base}/tasks`, () => ok(tasks)),
    http.post(`${base}/sync`, () => ok({ queued: 1, unchanged: 2, skipped: 1 })),
    http.put(`${base}/cards/${cardId}/review`, async ({ request }) => {
      const body = (await request.json()) as ReviewWrite;
      writes.push(body);
      stored = { ...stored, ...body, revision: body.expectedRevision + 1 };
      return ok(stored);
    }),
  );
});
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, refetchOnWindowFocus: false } },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <KnowledgeAnalysis global />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { client, ...view };
}
async function openCard() {
  await userEvent.click(await screen.findByRole('button', { name: /复合函数求导遗漏内层导数/ }));
  const detail = await screen.findByRole('region', { name: '知识点详情' });
  await within(detail).findByRole('textbox', { name: '个人笔记' });
  return detail;
}

describe('知识点梳理', () => {
  it('renders real summary, evidence snapshots and collapsed learning blocks', async () => {
    mount();
    expect(await screen.findByText('工作程序就绪', { exact: false })).toBeVisible();
    const detail = await openCard();
    await userEvent.click(within(detail).getByText('原始批改证据 · 1 条'));
    for (const text of [
      '原题：求复合函数的导数。',
      '我的答案：只计算了外层。',
      '参考答案：外层导数乘以内层导数。',
      '遗漏内层导数，扣 3 分。',
    ])
      expect(within(detail).getByText(text)).toBeVisible();
    expect(within(detail).getByText(/页码：2、3/)).toBeVisible();
    expect(within(detail).getByRole('link', { name: '查看原始记录 ↗' })).toHaveAttribute(
      'href',
      fixture.evidence[0].sourceUrl,
    );
    expect(within(detail).getByText('知识点讲解').closest('details')).toHaveAttribute('open');
    for (const name of ['解题方法', '易混与易错', '答题检查表', '自测练习', '查看自测答案'])
      expect(
        within(detail).getByText(name, { selector: 'summary' }).closest('details'),
      ).not.toHaveAttribute('open');
    expect(within(detail).getByText('链式法则')).toBeVisible();
    expect(within(detail).getByRole('textbox', { name: '个人笔记' })).toHaveValue('已有笔记');
  });
  it('tells the truth for empty lists and distinguishes request errors', async () => {
    items = [];
    mount();
    expect(await screen.findByText('当前暂无可展示的知识点')).toBeVisible();
    expect(screen.getByText(/这不代表没有错误，也不代表没有批改记录/)).toBeVisible();
    expect(screen.queryByText('暂无批改记录')).not.toBeInTheDocument();
  });
  it('keeps failures distinct from empty state with retry', async () => {
    server.use(
      http.get(`${base}/cards`, () =>
        HttpResponse.json({ code: 1, data: null, message: '暂时无法读取' }, { status: 503 }),
      ),
    );
    mount();
    expect(await screen.findByText('知识点列表读取失败')).toBeVisible();
    expect(screen.queryByText('当前暂无可展示的知识点')).not.toBeInTheDocument();
    server.use(http.get(`${base}/cards`, () => ok({ items: [], page: 1, size: 20, total: 0 })));
    await userEvent.click(screen.getByRole('button', { name: '重新加载' }));
    expect(await screen.findByText('当前暂无可展示的知识点')).toBeVisible();
  });
  it('syncs history with null for all courses and supports cross-course and state filters', async () => {
    const syncBodies: unknown[] = [];
    const urls: string[] = [];
    server.use(
      http.post(`${base}/sync`, async ({ request }) => {
        syncBodies.push(await request.json());
        return ok({ queued: 1, unchanged: 2, skipped: 3 });
      }),
      http.get(`${base}/cards`, ({ request }) => {
        urls.push(request.url);
        return ok({ items: [], page: 1, size: 20, total: 0 });
      }),
    );
    mount();
    await screen.findByText('当前暂无可展示的知识点');
    await userEvent.click(screen.getByRole('button', { name: '同步历史记录' }));
    expect(await screen.findByText(/新排队 1 项，未变化 2 项，跳过 3 项/)).toBeVisible();
    expect(syncBodies).toEqual([{ courseId: null }]);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: '分析课程' }), courseId);
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '筛选复习状态' }),
      'VERIFYING',
    );
    await userEvent.type(screen.getByRole('searchbox'), '链式法则');
    await waitFor(() => {
      const url = new URL(urls.at(-1)!);
      expect(url.searchParams.get('courseId')).toBe(courseId);
      expect(url.searchParams.get('reviewState')).toBe('VERIFYING');
      expect(url.searchParams.get('q')).toBe('链式法则');
    });
    await userEvent.click(screen.getByRole('button', { name: '同步历史记录' }));
    await waitFor(() => expect(syncBodies.at(-1)).toEqual({ courseId }));
  });
  it('shows queued, running, failed and stale tasks, retries without claiming no errors', async () => {
    tasks = ['QUEUED', 'RUNNING', 'FAILED', 'STALE'].map((state, index) => ({
      id: `task${index}`,
      cardId: null,
      courseId,
      state: state as TaskSummary['state'],
      error: state === 'FAILED' ? '分析服务暂不可用' : null,
      createdAt: fixture.updatedAt,
      updatedAt: fixture.updatedAt,
    }));
    const retries: string[] = [];
    server.use(
      http.post(`${base}/tasks/:id/retry`, ({ params }) => {
        retries.push(String(params.id));
        return ok({ ...tasks[2], state: 'QUEUED' });
      }),
    );
    items = [];
    mount();
    expect(await screen.findByText('知识点正在整理中')).toBeVisible();
    for (const text of ['排队中', '分析中', '分析失败', '结果已过期', '分析服务暂不可用'])
      expect(await screen.findByText(text)).toBeVisible();
    await userEvent.click(screen.getAllByRole('button', { name: '重试分析' })[0]);
    expect(await screen.findByText('任务已重新提交，请留意分析状态。')).toBeVisible();
    expect(retries).toEqual(['task2']);
  });
  it('invalidates results when an asynchronous task completes', async () => {
    tasks = [
      {
        id: 'task',
        courseId,
        cardId,
        state: 'RUNNING',
        error: null,
        createdAt: fixture.updatedAt,
        updatedAt: fixture.updatedAt,
      },
    ];
    const { client } = mount();
    await openCard();
    stored = { ...stored, summary: '异步完成后的新结果' };
    items = [stored];
    tasks = [{ ...tasks[0], state: 'COMPLETED', updatedAt: '2026-10-19T10:00:00Z' }];
    await act(async () => {
      await client.invalidateQueries({
        queryKey: ['knowledge-analysis', `anonymous:${sessionStore.getEpoch()}`, 'tasks'],
      });
    });
    expect(await screen.findAllByText('异步完成后的新结果')).toHaveLength(2);
  });
  it('retains local note on conflict and uses refreshed expectedRevision only after explicit retry', async () => {
    let conflict = true;
    server.use(
      http.put(`${base}/cards/${cardId}/review`, async ({ request }) => {
        const body = (await request.json()) as ReviewWrite;
        writes.push(body);
        if (conflict) {
          conflict = false;
          stored = { ...stored, revision: 8, note: '其他设备的笔记' };
          return HttpResponse.json({ code: 409, data: null, message: '版本冲突' }, { status: 409 });
        }
        stored = {
          ...stored,
          note: body.note,
          reviewState: body.reviewState,
          revision: body.expectedRevision + 1,
        };
        return ok(stored);
      }),
    );
    mount();
    const detail = await openCard();
    const input = within(detail).getByRole('textbox', { name: '个人笔记' });
    await userEvent.clear(input);
    await userEvent.type(input, '这份本地草稿不能丢');
    await userEvent.click(within(detail).getByRole('button', { name: '保存复习记录' }));
    expect(await screen.findByText(/记录已在别处更新/)).toBeVisible();
    expect(input).toHaveValue('这份本地草稿不能丢');
    expect(writes[0].expectedRevision).toBe(4);
    await userEvent.click(screen.getByRole('button', { name: '保留本地内容并重试保存' }));
    await waitFor(() =>
      expect(writes[1]).toMatchObject({ expectedRevision: 8, note: '这份本地草稿不能丢' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '保存复习记录' })).toBeDisabled(),
    );
  });
  it('serializes edits made during an in-flight save and retains failed drafts across card switches', async () => {
    let fail = false;
    server.use(
      http.put(`${base}/cards/${cardId}/review`, async ({ request }) => {
        const body = (await request.json()) as ReviewWrite;
        writes.push(body);
        await delay(120);
        if (fail)
          return HttpResponse.json({ code: 1, data: null, message: '网络繁忙' }, { status: 503 });
        stored = {
          ...stored,
          note: body.note,
          reviewState: body.reviewState,
          revision: body.expectedRevision + 1,
        };
        return ok(stored);
      }),
    );
    mount();
    await openCard();
    const input = screen.getByRole('textbox', { name: '个人笔记' });
    await userEvent.clear(input);
    await userEvent.type(input, '第一稿');
    await userEvent.click(screen.getByRole('button', { name: '保存复习记录' }));
    await userEvent.type(input, '继续编辑');
    await waitFor(() => expect(writes).toHaveLength(2));
    expect(writes.map((item) => item.expectedRevision)).toEqual([4, 5]);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '保存复习记录' })).toBeDisabled(),
    );
    fail = true;
    await userEvent.type(input, '失败稿');
    await userEvent.click(screen.getByRole('button', { name: '保存复习记录' }));
    expect(await screen.findByText(/保存失败，草稿已保留/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: '收起详情' }));
    await openCard();
    expect(screen.getByRole('textbox', { name: '个人笔记' })).toHaveValue('第一稿继续编辑失败稿');
  });
  it('keeps one writer when a saving detail is closed and reopened', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let running = 0;
    let maximumRunning = 0;
    server.use(
      http.put(`${base}/cards/${cardId}/review`, async ({ request }) => {
        const body = (await request.json()) as ReviewWrite;
        writes.push(body);
        running += 1;
        maximumRunning = Math.max(maximumRunning, running);
        await gate;
        stored = {
          ...stored,
          note: body.note,
          reviewState: body.reviewState,
          revision: body.expectedRevision + 1,
        };
        running -= 1;
        return ok(stored);
      }),
    );
    mount();
    await openCard();
    await userEvent.clear(screen.getByRole('textbox', { name: '个人笔记' }));
    await userEvent.type(screen.getByRole('textbox', { name: '个人笔记' }), '保存中的稿件');
    await userEvent.click(screen.getByRole('button', { name: '保存复习记录' }));
    await waitFor(() => expect(writes).toHaveLength(1));
    await userEvent.click(screen.getByRole('button', { name: '收起详情' }));
    await openCard();
    expect(screen.getByRole('textbox', { name: '个人笔记' })).toHaveValue('保存中的稿件');
    expect(screen.getByRole('button', { name: '正在保存…' })).toBeDisabled();
    await userEvent.type(screen.getByRole('textbox', { name: '个人笔记' }), '，重开后继续');
    release();
    await waitFor(() => expect(writes).toHaveLength(2));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '保存复习记录' })).toBeDisabled(),
    );
    expect(maximumRunning).toBe(1);
    expect(writes.map((write) => write.expectedRevision)).toEqual([4, 5]);
    expect(stored.note).toBe('保存中的稿件，重开后继续');
  });
  it('isolates queries by session identity', async () => {
    const { client } = mount();
    await openCard();
    const before = client
      .getQueryCache()
      .findAll({ queryKey: ['knowledge-analysis'] })
      .map((query) => query.queryKey);
    expect(before.length).toBeGreaterThan(0);
    expect(
      before.every(
        (key) => key[0] === 'knowledge-analysis' && String(key[1]).startsWith('anonymous:'),
      ),
    ).toBe(true);
    act(() => {
      sessionStore.start({
        accessToken: 'test',
        refreshToken: 'test',
        user: { id: 'another-user', role: 'USER', username: 'another' },
      } as Parameters<typeof sessionStore.start>[0]);
    });
    await screen.findByRole('heading', { name: '知识点梳理' });
    await waitFor(() =>
      expect(
        client
          .getQueryCache()
          .getAll()
          .some((query) => String(query.queryKey[1]).startsWith('another-user:')),
      ).toBe(true),
    );
    expect(screen.queryByRole('textbox', { name: '个人笔记' })).not.toBeInTheDocument();
  });
});

describe('API and untrusted AI content', () => {
  it('uses the existing HTTP envelope and default pagination', async () => {
    let requested = '';
    server.use(
      http.get(`${base}/cards`, ({ request }) => {
        requested = request.url;
        return ok({ items: [], page: 1, size: 20, total: 0 });
      }),
    );
    expect(await api.cards({ courseId })).toMatchObject({ items: [], total: 0 });
    const url = new URL(requested);
    expect(url.searchParams.get('page')).toBe('1');
    expect(url.searchParams.get('size')).toBe('20');
    expect(url.searchParams.get('courseId')).toBe(courseId);
  });
  it('rejects unsafe URLs, scripts and HTML while preserving markdown', () => {
    for (const url of [
      'javascript:alert(1)',
      'data:image/svg+xml,x',
      '//evil.test/a',
      '/\\evil.test',
      'java\nscript:alert(1)',
      'file:///etc/passwd',
    ])
      expect(safeAnalysisUrl(url)).toBeUndefined();
    expect(safeAnalysisImage('data:image/png;base64,abc')).toBeUndefined();
    expect(safeAnalysisUrl('https://example.com/a')).toBe('https://example.com/a');
    render(
      <AnalysisMarkdown
        text={
          '<script>alert(1)</script>\n\n<img src="x" onerror="alert(1)">\n\n[bad](javascript:alert%281%29)\n\n![bad](data:image/svg+xml,x)\n\n**安全内容**'
        }
      />,
    );
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(screen.getByText('安全内容')).toBeVisible();
  });
});
