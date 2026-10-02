import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../../mocks/server';
import { PracticePage } from '../../pages/PracticePage';
import { MathText } from './MathText';
import type {
  AnswerWrite,
  Course,
  PracticeOverview,
  PracticeResult,
  PracticeStats,
  QuestionMark,
  QuestionPublic,
} from '../../api/generated/models';
import { vi } from 'vitest';
const stats: PracticeStats = {
  courseId: 'course',
  chapterId: 'chapter',
  availableOriginalCount: 2,
  answeredOriginalCount: 0,
  practiceAttemptCount: 0,
  practiceCorrectCount: 0,
  practiceAccuracy: 0,
  latestWrongCount: 1,
  gateThreshold: 2,
  canApplyChapterAssessment: false,
  blockReasons: [],
};
const course: Course = {
  id: 'course',
  code: '00001',
  name: '测试课程',
  courseType: 'THEORY',
  active: true,
  releaseId: 'release',
  enrollment: null,
  progress: { completedItems: 0, totalItems: 2, percent: 0 },
  capabilities: { catalog: true, knowledge: true, practice: true, exams: true, manual: false },
};
const overview: PracticeOverview = {
  courseId: 'course',
  releaseId: 'release',
  chapters: [
    { chapterId: 'chapter', title: '第一章 函数', stats, passed: false, passReleaseIds: [] },
  ],
  stats,
  variantQuestionCount: 0,
};
const baseQuestion: QuestionPublic = {
  id: 'q1',
  revisionId: 'r1',
  releaseId: 'release',
  courseId: 'course',
  chapterId: 'chapter',
  mode: 'CHAPTER',
  pointIds: [],
  stem: '函数 $x^2$ 的结果是什么？',
  options: ['$x$', '$x^2$', '三', '四'],
  difficulty: 3,
  sourceLabel: '题库',
  mark: { bookmarked: false, uncertain: false, revision: 0 },
  latestOutcome: null,
};
let questions: QuestionPublic[];
let submittedBodies: { key: string | null; body: AnswerWrite }[];
let failFirst: boolean;
let mark: QuestionMark;
let listFilters: string[];
const ok = (data: unknown) => HttpResponse.json({ code: 0, message: '成功', data });
beforeEach(() => {
  questions = [baseQuestion, { ...baseQuestion, id: 'q2', revisionId: 'r2' }];
  submittedBodies = [];
  listFilters = [];
  failFirst = false;
  mark = {
    questionId: 'q1',
    bookmarked: false,
    uncertain: false,
    revision: 0,
    updatedAt: '2026-10-02T00:00:00Z',
  };
  server.use(
    http.get('/api/v1/courses/by-code/:code', () => ok(course)),
    http.get('/api/v1/practice/courses/course/overview', () => ok(overview)),
    http.get('/api/v1/practice/courses/course/questions', ({ request }) => {
      const url = new URL(request.url);
      const filter = url.searchParams.get('filter') || 'ALL';
      listFilters.push(filter);
      const rows = filter === 'WRONG' ? [questions[1]].filter(Boolean) : questions;
      const page = Number(url.searchParams.get('page'));
      return ok({
        items: rows.slice((page - 1) * 100, page * 100),
        page,
        size: 100,
        total: rows.length,
      });
    }),
    http.get('/api/v1/practice/courses/course/questions/:id', ({ params }) =>
      ok({ ...questions.find((q) => q.id === params.id), mark }),
    ),
    http.put('/api/v1/practice/courses/course/questions/:id/mark', async ({ request }) => {
      const body = (await request.json()) as {
        bookmarked: boolean;
        uncertain: boolean;
        expectedRevision: number;
      };
      mark = {
        ...mark,
        bookmarked: body.bookmarked,
        uncertain: body.uncertain,
        revision: mark.revision + 1,
      };
      return ok(mark);
    }),
    http.post(
      '/api/v1/practice/courses/course/questions/:id/submissions',
      async ({ request, params }) => {
        const body = (await request.json()) as AnswerWrite;
        const key = request.headers.get('Idempotency-Key');
        submittedBodies.push({ key, body });
        // 模拟服务端已落库但第一次响应丢失，第二次重放同一 submissionId。
        if (failFirst && submittedBodies.length === 1) return HttpResponse.error();
        const result: PracticeResult = {
          submissionId: key!,
          questionId: String(params.id),
          revisionId: body.revisionId,
          selectedOption: body.selectedOption,
          correct: body.selectedOption === 1,
          correctOption: 1,
          correctAnswer: '$x^2$',
          explanation: '根据公式 $x^2$ 判断。',
          submittedAt: '2026-10-24T06:30:00Z',
          stats,
        };
        return ok(result);
      },
    ),
  );
});
function mount(
  path = '/zikao/course/00001/practice/chapter?cycleId=cycle',
  onNoteRequest?: (detail: unknown) => void,
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      {
        path: '/zikao/course/:code/practice/:chapterId',
        element: <PracticePage onNoteRequest={onNoteRequest} />,
      },
    ],
    { initialEntries: [path] },
  );
  const view = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...view, router, client };
}
async function ready() {
  return screen.findByRole('radiogroup');
}
describe('专注做题页', () => {
  it('未选择时解释禁用原因；键盘完成选择、提交、下一题；预取与公式生效', async () => {
    const user = userEvent.setup();
    const { client, router } = mount();
    const group = await ready();
    expect(screen.getByRole('button', { name: '提交答案' })).toBeDisabled();
    expect(screen.getByText('请先选择一个答案')).toBeVisible();
    expect(within(group).getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByText('难度 ★★★☆☆')).toBeVisible();
    await waitFor(() => expect(group.querySelector('.katex')).not.toBeNull());
    await waitFor(() =>
      expect(client.getQueryData(['practice-question', 'course', 'q2'])).toBeTruthy(),
    );
    await user.keyboard('b{Enter}');
    expect(await screen.findByText('回答正确')).toBeVisible();
    expect(screen.getByText('正确答案')).toBeVisible();
    expect(screen.getByText('提交于 10/24 14:30')).toBeVisible();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(router.state.location.search).toContain('questionId=q2'));
    expect(submittedBodies).toHaveLength(1);
    expect(submittedBodies[0].body).toEqual({ revisionId: 'r1', selectedOption: 1 });
  });
  it('切换筛选由后端执行并恢复合理位置，URL刷新保留题号', async () => {
    const user = userEvent.setup();
    const view = mount();
    await ready();
    await user.click(screen.getByRole('button', { name: '错题 1' }));
    await waitFor(() => expect(view.router.state.location.search).toContain('questionId=q2'));
    expect(listFilters).toContain('WRONG');
    const url = view.router.state.location.pathname + view.router.state.location.search;
    view.unmount();
    mount(url);
    await ready();
    expect(screen.getByText('第 1 / 1 题')).toBeVisible();
  });
  it('收藏和不确定写入接口并在重新挂载后恢复', async () => {
    const user = userEvent.setup();
    const view = mount();
    await ready();
    await user.click(screen.getByRole('button', { name: '收藏' }));
    await screen.findByRole('button', { name: '已收藏' });
    await user.click(screen.getByRole('button', { name: '不确定' }));
    await screen.findByRole('button', { name: '已标不确定' });
    expect(mark.revision).toBe(2);
    view.unmount();
    mount();
    await ready();
    expect(screen.getByRole('button', { name: '已收藏' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '已标不确定' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
  it('响应丢失后重试保持相同键和正文，错误答案标出正确项并预填备注', async () => {
    failFirst = true;
    const user = userEvent.setup();
    const note = vi.fn();
    mount(undefined, note);
    await ready();
    await user.keyboard('a{Enter}');
    await screen.findByText('网络连接失败，请检查网络');
    await user.click(screen.getByRole('button', { name: '重试提交' }));
    await screen.findByText('回答错误');
    expect(submittedBodies).toHaveLength(2);
    expect(submittedBodies[1]).toEqual(submittedBodies[0]);
    expect(new Set(submittedBodies.map((value) => value.key)).size).toBe(1);
    expect(screen.getByText('选择错误')).toBeVisible();
    expect(screen.getByText('正确答案')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '记为备注' }));
    expect(note).toHaveBeenCalledWith({
      questionId: 'q1',
      revisionId: 'r1',
      summary: baseQuestion.stem,
    });
  });
  it('刷新后待重试提交仍复用同一幂等键', async () => {
    failFirst = true;
    const user = userEvent.setup();
    const view = mount();
    await ready();
    await user.keyboard('a{Enter}');
    await screen.findByText('网络连接失败，请检查网络');
    view.unmount();
    mount();
    await ready();
    await user.click(await screen.findByRole('button', { name: '重试提交' }));
    await screen.findByText('回答错误');
    expect(submittedBodies[1]).toEqual(submittedBodies[0]);
  });
  it('加载、空列表、错误重试三种状态', async () => {
    server.use(
      http.get('/api/v1/practice/courses/course/questions', async () => {
        await delay(100);
        return ok({ items: [], page: 1, size: 100, total: 0 });
      }),
    );
    const user = userEvent.setup();
    const view = mount();
    expect(screen.getByRole('status')).toHaveTextContent('加载中');
    await screen.findByText('当前筛选下没有题目。');
    expect(screen.getByRole('button', { name: '查看全部题目' })).toBeVisible();
    view.unmount();
    server.use(
      http.get('/api/v1/practice/courses/course/questions', () =>
        HttpResponse.json({ code: 50001, message: '题目加载失败', data: null }, { status: 500 }),
      ),
    );
    mount();
    await screen.findByText('题目加载失败');
    server.use(
      http.get('/api/v1/practice/courses/course/questions', () =>
        ok({ items: questions, page: 1, size: 100, total: 2 }),
      ),
    );
    await user.click(screen.getByRole('button', { name: '重新加载' }));
    await ready();
  });
  it('输入框内快捷键不选择或提交；无效公式保留原文', async () => {
    const user = userEvent.setup();
    mount();
    await ready();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    await user.keyboard('a{Enter}{ArrowRight}');
    expect(submittedBodies).toHaveLength(0);
    expect(
      screen.getAllByRole('radio').every((radio) => radio.getAttribute('aria-checked') === 'false'),
    ).toBe(true);
    input.remove();
    render(<MathText text={'失败 $\\invalidcommand$'} />);
    expect(await screen.findByText('$\\invalidcommand$')).toBeVisible();
  });
  it('十题提示非阻断，最后一题显示本章小结', async () => {
    questions = Array.from({ length: 10 }, (_, i) => ({
      ...baseQuestion,
      id: `q${i + 1}`,
      revisionId: `r${i + 1}`,
    }));
    const user = userEvent.setup();
    mount();
    for (let i = 0; i < 10; i++) {
      await ready();
      await user.keyboard('b{Enter}');
      await screen.findByText('回答正确');
      if (i < 9) {
        await user.keyboard('{Enter}');
        await waitFor(() => expect(screen.queryByText('回答正确')).not.toBeInTheDocument());
      }
    }
    expect(await screen.findByText('本次练习已答 10 题，正确 10 题')).toBeVisible();
    expect(screen.getByText('本章练习小结')).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '下一题' })).toBeDisabled();
  });
});
