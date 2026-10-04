import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useLocation, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import type {
  AssessmentSession,
  Course,
  ExamCycle,
  PracticeOverview,
  PracticeStats,
  QuestionPublic,
} from '../../api/generated/models';
import { cycleKey, CycleProvider, useCycle } from '../cycle/CycleContext';
import { PracticeSelectionPage } from '../../pages/PracticeSelectionPage';

const courseId = 'afdac469-0fe4-5007-833c-51a71333967b';
const chapterId = 'b8816b55-e24a-5653-b1af-5c962d1b54f1';
const otherId = '482e7a78-6eef-5bc6-b480-cb8652339a3f';
const cycleId = '0ebdbbfe-d607-54b5-9c21-4e0adade5e4c';
const stats: PracticeStats = {
  courseId,
  chapterId,
  availableOriginalCount: 50,
  answeredOriginalCount: 30,
  practiceAttemptCount: 35,
  practiceCorrectCount: 28,
  practiceAccuracy: 80,
  latestWrongCount: 7,
  gateThreshold: 30,
  canApplyChapterAssessment: true,
  blockReasons: [],
};
const fixture: PracticeOverview = {
  courseId,
  releaseId: otherId,
  variantQuestionCount: 12,
  stats: { ...stats, chapterId: null },
  chapters: [
    { chapterId, title: '函数与极限', stats, passed: false, passReleaseIds: [] },
    {
      chapterId: otherId,
      title: '导数与微分',
      stats: {
        ...stats,
        chapterId: otherId,
        answeredOriginalCount: 1,
        canApplyChapterAssessment: false,
        blockReasons: ['后端尚未开放检测'],
      },
      passed: false,
      passReleaseIds: [],
    },
  ],
};
const course: Course = {
  id: courseId,
  code: '00023',
  name: '高等数学',
  courseType: 'THEORY',
  active: true,
  releaseId: otherId,
  enrollment: null,
  capabilities: { catalog: true, knowledge: true, practice: true, exams: true, manual: false },
  progress: { completedItems: 999, totalItems: 999, percent: 100 },
};
const cycle: ExamCycle = {
  id: cycleId,
  name: '十月考试',
  startDate: '2026-10-01',
  endDate: '2026-10-31',
  timezone: 'Asia/Shanghai',
  courses: [],
};
const question: QuestionPublic = {
  id: otherId,
  revisionId: otherId,
  releaseId: otherId,
  courseId,
  chapterId,
  mode: 'CHAPTER',
  pointIds: [],
  stem: '函数连续的条件是什么？',
  options: ['甲', '乙'],
  difficulty: 1,
  sourceLabel: '原创',
  mark: { bookmarked: false, uncertain: false, revision: 0 },
  latestOutcome: 'WRONG',
};
const session: AssessmentSession = {
  id: otherId,
  courseId,
  chapterId,
  kind: 'CHAPTER',
  releaseId: otherId,
  policyId: otherId,
  status: 'IN_PROGRESS',
  startedAt: '2026-10-02T02:00:00Z',
  deadlineAt: '2026-10-02T02:40:00Z',
  serverTime: '2026-10-02T02:00:00Z',
  deadlineReached: false,
  questionCount: 20,
  limitMinutes: 40,
  passScore: 90,
  answerFingerprint: '0'.repeat(64),
  questions: [],
};
const ok = (data: unknown) => HttpResponse.json({ code: 0, data, message: 'ok' });
const overviewUrl = `/api/v1/practice/courses/${courseId}/overview`;
const questionsUrl = `/api/v1/practice/courses/${courseId}/questions`;
const applyUrl = `/api/v1/practice/courses/${courseId}/assessments`;
const server = setupServer(
  http.get('/api/v1/courses/by-code/00023', () => ok(course)),
  http.get(overviewUrl, () => ok(fixture)),
  http.get('/api/v1/exams/cycles', () => ok({ items: [cycle], page: 1, size: 20, total: 1 })),
  http.get(questionsUrl, ({ request }) => {
    const params = new URL(request.url).searchParams;
    if (params.get('size') === '1')
      return ok({
        items: [question],
        page: 1,
        size: 1,
        total: params.get('filter') === 'UNANSWERED' ? 300 : 315,
      });
    return ok({ items: [question], page: 1, size: 20, total: 1 });
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
function Destination() {
  const location = useLocation();
  const selectedCycle = useCycle();
  return (
    <p>
      目标位置：{location.pathname}
      {location.search}
      <span data-testid="destination-cycle">{selectedCycle?.cycleId}</span>
    </p>
  );
}
function mount(path = `/study/course/00023/practice?cycleId=${cycleId}`, withCycle = false) {
  const routes = [
    { path: '/study/course/:code/practice', element: <PracticeSelectionPage /> },
    { path: '*', element: <Destination /> },
  ];
  const router = createMemoryRouter(
    withCycle
      ? [
          {
            element: (
              <CycleProvider>
                <Outlet />
              </CycleProvider>
            ),
            children: routes,
          },
        ]
      : routes,
    { initialEntries: [path], future: { v7_relativeSplatPath: true } },
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </QueryClientProvider>,
  );
  return router;
}
describe('刷题章节选择', () => {
  it('展示题目统计、无目录数字；缺少推荐信息时不伪造主按钮', async () => {
    mount();
    await screen.findByText('函数与极限');
    expect(screen.getAllByRole('definition')).toHaveLength(3);
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.queryByText(/999/)).not.toBeInTheDocument();
    expect(screen.queryByText('推荐')).not.toBeInTheDocument();
    screen
      .getAllByRole('button', { name: '开始练习' })
      .forEach((button) => expect(button).toHaveClass('button-primary'));
    expect(await screen.findByRole('progressbar', { name: '函数与极限练习进度' })).toHaveAttribute(
      'aria-valuenow',
      '15',
    );
    expect(screen.getAllByText('后端尚未开放检测')[0]).toBeInTheDocument();
  });
  it('原创资格计数为零仍可开始普通练习，检测保持关闭', async () => {
    server.use(
      http.get(overviewUrl, () =>
        ok({
          ...fixture,
          chapters: [
            {
              ...fixture.chapters[0],
              stats: {
                ...stats,
                availableOriginalCount: 0,
                answeredOriginalCount: 0,
                canApplyChapterAssessment: false,
                blockReasons: ['检测尚未开放'],
              },
            },
          ],
        }),
      ),
    );
    const router = mount();
    await screen.findByText('函数与极限');
    expect(screen.getAllByText('检测尚未开放')[0]).toBeInTheDocument();
    const start = screen.getByRole('button', { name: '开始练习' });
    expect(start).toBeEnabled();
    await userEvent.click(start);
    expect(router.state.location.pathname).toBe(`/study/course/00023/practice/${chapterId}`);
  });
  it('开始使用稳定 chapterId，内部链接不带周期 UUID', async () => {
    const router = mount();
    await screen.findByText('函数与极限');
    await userEvent.click(screen.getAllByRole('button', { name: '开始练习' })[0]);
    expect(router.state.location.pathname).toBe(`/study/course/00023/practice/${chapterId}`);
    expect(router.state.location.search).not.toContain(cycleId);
    expect(router.state.location.pathname).not.toMatch(/ch\d+/);
  });
  it('真题变种没有解锁门槛，切换可刷新恢复', async () => {
    const router = mount();
    await screen.findByText('函数与极限');
    await userEvent.click(screen.getByRole('button', { name: '真题变种' }));
    expect(router.state.location.search).toContain('mode=VARIANT');
    expect(screen.getByText('共 12 题，直接开始练习。')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '开始真题变种' }));
    expect(router.state.location.pathname).toBe('/study/course/00023/practice/variant');
  });
  it('错题按钮请求真实 WRONG 列表，并携带错题模式和题目 ID', async () => {
    let filter = '';
    server.use(
      http.get(questionsUrl, ({ request }) => {
        filter = new URL(request.url).searchParams.get('filter') || '';
        return ok({ items: [question], page: 1, size: 20, total: 1 });
      }),
    );
    const router = mount();
    await screen.findByText('函数与极限');
    await userEvent.click(screen.getByRole('button', { name: '错题重做' }));
    await screen.findByText(question.stem);
    expect(filter).toBe('WRONG');
    expect(router.state.location.search).toContain('filter=WRONG');
    await userEvent.click(screen.getByRole('link', { name: '重做此题' }));
    expect(router.state.location.pathname).toContain(chapterId);
    expect(router.state.location.search).toContain('filter=WRONG');
    expect(router.state.location.search).toContain(`questionId=${question.id}`);
  });
  it('没有错题时禁用并解释原因', async () => {
    server.use(
      http.get(overviewUrl, () => ok({ ...fixture, stats: { ...stats, latestWrongCount: 0 } })),
    );
    mount();
    await screen.findByText('函数与极限');
    expect(screen.getByRole('button', { name: '错题重做' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '错题重做' })).toHaveAccessibleDescription(
      '暂无错题',
    );
  });
  it('课程与章节依次展示加载状态', async () => {
    server.use(
      http.get('/api/v1/courses/by-code/00023', async () => {
        await delay(60);
        return ok(course);
      }),
      http.get(overviewUrl, async () => {
        await delay(80);
        return ok(fixture);
      }),
    );
    mount();
    expect(screen.getByText('正在加载课程')).toBeInTheDocument();
    await screen.findByText('正在加载刷题统计与章节');
    await screen.findByText('函数与极限');
  });
  it('章节空状态提供行动按钮', async () => {
    server.use(http.get(overviewUrl, () => ok({ ...fixture, chapters: [] })));
    mount();
    await screen.findByText('当前课程暂无已发布的刷题章节。');
    expect(screen.getByRole('button', { name: '查看我的科目' })).toBeInTheDocument();
  });
  it('章节请求失败可重试恢复', async () => {
    let calls = 0;
    server.use(
      http.get(overviewUrl, () =>
        ++calls === 1
          ? HttpResponse.json({ code: 50001, message: '失败', data: null }, { status: 500 })
          : ok(fixture),
      ),
    );
    mount();
    await screen.findByText('刷题统计与章节加载失败，请重试。');
    await userEvent.click(screen.getByRole('button', { name: '重新加载' }));
    await screen.findByText('函数与极限');
    expect(calls).toBe(2);
  });
  it('错题区域加载、失败重试、空状态均有反馈', async () => {
    server.use(
      http.get(questionsUrl, async () => {
        await delay(80);
        return HttpResponse.json({ code: 50001, data: null, message: '失败' }, { status: 500 });
      }),
    );
    mount(`/study/course/00023/practice?cycleId=${cycleId}&filter=WRONG`);
    await screen.findByText('正在加载错题');
    await screen.findByText('错题加载失败，请重试。');
    server.use(http.get(questionsUrl, () => ok({ items: [], page: 1, size: 20, total: 0 })));
    await userEvent.click(screen.getByRole('button', { name: '重新加载' }));
    await screen.findByText('当前没有可重做的错题。');
    await userEvent.click(screen.getByRole('button', { name: '返回章节刷题' }));
    await screen.findByText('函数与极限');
  });
  it('后端题量不足不能申请；已通过不伪造分数', async () => {
    server.use(
      http.get(overviewUrl, () =>
        ok({
          ...fixture,
          chapters: [
            {
              ...fixture.chapters[0],
              stats: { ...stats, canApplyChapterAssessment: true, blockReasons: ['题量不足'] },
            },
            { ...fixture.chapters[1], passed: true },
          ],
        }),
      ),
    );
    mount();
    await screen.findAllByText('题量不足');
    expect(screen.queryByRole('button', { name: '可申请检测' })).not.toBeInTheDocument();
    expect(screen.getByText('已通过')).toBeInTheDocument();
    expect(screen.queryByText(/^已通过.*\d+.*分/)).not.toBeInTheDocument();
  });
  it('申请失败展示后端原因，重试保留幂等键，成功进入检测', async () => {
    const keys: (string | null)[] = [];
    const bodies: unknown[] = [];
    server.use(
      http.post(applyUrl, async ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        bodies.push(await request.json());
        return keys.length === 1
          ? HttpResponse.json(
              { code: 40901, data: null, message: '题量不足，无法组卷' },
              { status: 409 },
            )
          : ok(session);
      }),
    );
    const router = mount();
    await screen.findByText('函数与极限');
    await userEvent.click(screen.getByRole('button', { name: '可申请检测' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByLabelText('考试周期');
    await userEvent.click(within(dialog).getByRole('button', { name: '申请检测' }));
    await screen.findByText('题量不足，无法组卷');
    expect(within(dialog).getByLabelText('考试周期')).toHaveValue(cycleId);
    await userEvent.click(within(dialog).getByRole('button', { name: '申请检测' }));
    await waitFor(() => expect(router.state.location.pathname).toContain(`/tests/${session.id}`));
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
    expect(bodies[0]).toEqual({ kind: 'CHAPTER', chapterId });
  });
  it('315 道练习题不产生检测资格，不参与检测不显示 0/0', async () => {
    server.use(
      http.get(overviewUrl, () =>
        ok({
          ...fixture,
          chapters: [
            {
              ...fixture.chapters[0],
              stats: {
                ...stats,
                availableOriginalCount: 0,
                answeredOriginalCount: 0,
                canApplyChapterAssessment: false,
                blockReasons: [
                  '可用且已审核原创题不足20道',
                  '已答原创题数未达到门槛',
                  '此章节不参与检测',
                ],
              },
            },
          ],
        }),
      ),
    );
    mount();
    await screen.findByText('不参与检测');
    await waitFor(() => expect(screen.getAllByText('可练习 315 题 · 已答 15 题')).toHaveLength(2));
    expect(screen.queryByText(/0\s*\/\s*0/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '可申请检测' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始练习' })).toBeEnabled();
    await userEvent.click(screen.getByText('查看检测条件'));
    expect(screen.getByText('可用且已审核原创题不足20道')).toBeVisible();
  });
  it('可练习题数确认为零时说明暂无题目，不误报加载失败', async () => {
    server.use(http.get(questionsUrl, () => ok({ items: [], page: 1, size: 1, total: 0 })));
    mount();
    await screen.findAllByText('可练习 0 题 · 已答 0 题');
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: '开始练习' })[0]).toBeDisabled(),
    );
    expect(screen.getAllByRole('button', { name: '开始练习' })[0]).toHaveAccessibleDescription(
      '当前章节暂无可练习题目',
    );
    expect(screen.queryByText('可练习题数暂时无法读取。')).not.toBeInTheDocument();
  });
  it('零作答样本不显示 0% 正确率，非零样本显示计数及跨周期范围', async () => {
    server.use(
      http.get(overviewUrl, () =>
        ok({
          ...fixture,
          stats: {
            ...stats,
            practiceAttemptCount: 0,
            practiceCorrectCount: 0,
            practiceAccuracy: 0,
          },
        }),
      ),
    );
    mount();
    await screen.findByText('暂无作答样本');
    await userEvent.click(screen.getByText('我的练习记录与统计口径'));
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('统计口径与检测规则'));
    expect(screen.getByText(/正确率按本课程所有周期的正式练习提交计算/)).toBeVisible();
  });
  it('题数读取失败可重试，不能阻止现有练习入口', async () => {
    server.use(
      http.get(questionsUrl, () =>
        HttpResponse.json({ code: 50001, message: '失败', data: null }, { status: 500 }),
      ),
    );
    mount();
    await screen.findAllByText('可练习题数暂时无法读取。');
    expect(screen.getAllByRole('button', { name: '开始练习' })[0]).toBeEnabled();
    server.use(
      http.get(questionsUrl, ({ request }) =>
        ok({
          items: [],
          page: 1,
          size: 1,
          total: new URL(request.url).searchParams.get('filter') === 'UNANSWERED' ? 300 : 315,
        }),
      ),
    );
    await userEvent.click(screen.getAllByRole('button', { name: '重试题数' })[0]);
    await screen.findByRole('progressbar', { name: '函数与极限练习进度' });
  });
  it('创建中连续点击及 Esc 关闭不会重复请求，成功沿用所选周期', async () => {
    const nextCycle = { ...cycle, id: otherId, name: '下个考试周期', startDate: '2027-04-01' };
    let calls = 0;
    let receivedCycle = '';
    server.use(
      http.get('/api/v1/exams/cycles', () =>
        ok({ items: [cycle, nextCycle], page: 1, size: 20, total: 2 }),
      ),
      http.post(applyUrl, async ({ request }) => {
        calls++;
        receivedCycle = new URL(request.url).searchParams.get('cycleId') || '';
        await delay(250);
        return ok(session);
      }),
    );
    const router = mount();
    await userEvent.click(await screen.findByRole('button', { name: '可申请检测' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.selectOptions(await within(dialog).findByLabelText('考试周期'), otherId);
    await userEvent.dblClick(within(dialog).getByRole('button', { name: '申请检测' }));
    await screen.findByText('正在创建检测，请稍候。');
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: '关闭弹窗' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toContain(`/tests/${session.id}`));
    expect(calls).toBe(1);
    expect(receivedCycle).toBe(otherId);
    expect(router.state.location.search).toBe(`?cycle=${cycleKey(nextCycle)}`);
  });
  it('实际周期上下文在申请切换后解析为所选周期', async () => {
    localStorage.clear();
    const next = {
      ...cycle,
      id: otherId,
      name: '另一周期',
      startDate: '2099-11-01',
      endDate: '2099-11-30',
    };
    server.use(
      http.get('/api/v1/exams/cycles', () =>
        ok({ items: [{ ...cycle, endDate: '2099-10-31' }, next], page: 1, size: 100, total: 2 }),
      ),
      http.post(applyUrl, () => ok(session)),
    );
    const router = mount(undefined, true);
    await userEvent.click(await screen.findByRole('button', { name: '可申请检测' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.selectOptions(await within(dialog).findByLabelText('考试周期'), otherId);
    await userEvent.click(within(dialog).getByRole('button', { name: '申请检测' }));
    await screen.findByTestId('destination-cycle');
    expect(screen.getByTestId('destination-cycle')).toHaveTextContent(otherId);
    expect(router.state.location.search).toBe(`?cycle=${cycleKey(next)}`);
  });
  it('弹窗焦点陷阱、Esc 关闭和焦点回到触发按钮', async () => {
    mount();
    await screen.findByText('函数与极限');
    const trigger = screen.getByRole('button', { name: '可申请检测' });
    await userEvent.click(trigger);
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByLabelText('考试周期');
    const close = within(dialog).getByRole('button', { name: '关闭弹窗' });
    expect(close).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(within(dialog).getByRole('button', { name: '申请检测' })).toHaveFocus();
    await userEvent.tab();
    expect(close).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it('缺少周期时先选择，使用后端周期 ID 请求课程', async () => {
    let received = '';
    server.use(
      http.get('/api/v1/courses/by-code/00023', ({ request }) => {
        received = new URL(request.url).searchParams.get('cycleId') || '';
        return ok(course);
      }),
    );
    mount('/study/course/00023/practice');
    await screen.findByLabelText('考试周期');
    await userEvent.selectOptions(screen.getByLabelText('考试周期'), cycleId);
    await screen.findByText('函数与极限');
    expect(received).toBe(cycleId);
  });
  it('周期异步区域失败可重试，空状态可重新加载', async () => {
    server.use(
      http.get('/api/v1/exams/cycles', () =>
        HttpResponse.json({ code: 50001, data: null, message: '失败' }, { status: 500 }),
      ),
    );
    mount('/study/course/00023/practice');
    await screen.findByText('考试周期加载失败，请重试。');
    server.use(
      http.get('/api/v1/exams/cycles', () => ok({ items: [], page: 1, size: 20, total: 0 })),
    );
    await userEvent.click(screen.getByRole('button', { name: '重新加载' }));
    await screen.findByText('暂无可选考试周期。');
  });
});
