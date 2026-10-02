import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse, delay } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../mocks/server';
import generated from '../../mocks/generated.json';
import type { AssessmentSession, AssessmentResult, Course } from '../../api/generated/models';
import { Component } from '../../pages/AssessmentPage';

function example<T>(operation: string): T {
  return structuredClone(generated.find((row) => row.operationId === operation)!.example.data) as T;
}
let session: AssessmentSession;
let result: AssessmentResult;
let course: Course;
let resultReads: number;
let submissions: number;
let saved: number;
const envelope = (data: unknown) => HttpResponse.json({ code: 0, data, message: 'ok' });
const cycle = 'cycle';
function mount(path = `/zikao/course/00023/tests/session?cycleId=${cycle}`) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/zikao/course/:code/tests/:testId" element={<Component />} />
          <Route path="/zikao/course/:code/tests/:testId/result" element={<Component />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  localStorage.clear();
  resultReads = 0;
  submissions = 0;
  saved = 0;
  session = example<AssessmentSession>('getAssessment');
  session.questions = session.questions.slice(0, 2);
  session.questionCount = 2;
  session.serverTime = '2026-10-02T02:00:00Z';
  session.deadlineAt = '2026-10-02T02:40:00Z';
  session.deadlineReached = false;
  session.status = 'IN_PROGRESS';
  result = example<AssessmentResult>('getAssessmentResult');
  result.answers = result.answers.filter((answer) =>
    session.questions.some((row) => row.question.revisionId === answer.revisionId),
  );
  course = example<Course>('getCourseByCode');
  course.id = session.courseId;
  server.use(
    http.get('*/api/v1/courses/by-code/:code', () => envelope(course)),
    http.get('*/api/v1/practice/courses/:course/assessments/:session', () => envelope(session)),
    http.put(
      '*/api/v1/practice/courses/:course/assessments/:session/answers/:revision',
      async ({ request, params }) => {
        const body = (await request.json()) as {
          selectedOption: number;
          expectedSavedAt: string | null;
        };
        const row = session.questions.find((item) => item.question.revisionId === params.revision)!;
        expect(body.expectedSavedAt).toBe(row.answerSavedAt);
        row.selectedOption = body.selectedOption;
        row.answerSavedAt = '2026-10-02T02:01:00Z';
        session.answerFingerprint = String(++saved).padStart(64, '0');
        return envelope({
          sessionId: session.id,
          revisionId: params.revision,
          selectedOption: body.selectedOption,
          savedAt: row.answerSavedAt,
          answerFingerprint: session.answerFingerprint,
          serverTime: session.serverTime,
        });
      },
    ),
    http.post(
      '*/api/v1/practice/courses/:course/assessments/:session/submission',
      async ({ request }) => {
        const body = (await request.json()) as { answerFingerprint: string; confirm: boolean };
        expect(body.answerFingerprint).toBe(session.answerFingerprint);
        expect(body.confirm).toBe(true);
        submissions++;
        session.status = session.deadlineReached ? 'TIMED_OUT' : 'SUBMITTED';
        return envelope(result);
      },
    ),
    http.get('*/api/v1/practice/courses/:course/assessments/:session/result', () => {
      resultReads++;
      return envelope(result);
    }),
  );
});
describe('检测作答与结果', () => {
  it('选择、防抖保存、跳题与待查；交卷前不获取答案', async () => {
    const user = userEvent.setup();
    mount();
    await screen.findByText('第 1 题 · 单选');
    await user.click(screen.getAllByRole('radio')[0]);
    await waitFor(() => expect(saved).toBe(1));
    expect(screen.getByText('已答 1 / 2')).toBeInTheDocument();
    expect(resultReads).toBe(0);
    await user.click(screen.getByRole('button', { name: '标记待查' }));
    expect(screen.getByRole('button', { name: '第 1 题，已答，标记待查' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '下一题' }));
    expect(screen.getByText('第 2 题 · 单选')).toBeInTheDocument();
  });
  it('未答确认、Esc 恢复焦点，等待保存再交卷并展示结果', async () => {
    const user = userEvent.setup();
    mount();
    await screen.findByText('第 1 题 · 单选');
    await user.click(screen.getByRole('button', { name: '交卷' }));
    expect(screen.getByText(/还有 2 题未答/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '交卷' })).toHaveFocus();
    await user.click(screen.getAllByRole('radio')[1]);
    await user.click(screen.getByRole('button', { name: '交卷' }));
    await user.click(screen.getByRole('button', { name: '确认交卷' }));
    await screen.findByText('题目回顾');
    expect(saved).toBe(1);
    expect(submissions).toBe(1);
    expect(resultReads).toBeGreaterThan(0);
    expect(screen.getByText(/通过线 90 分/)).toBeInTheDocument();
  });
  it('保存失败本地暂存，刷新恢复并在网络恢复后补发', async () => {
    server.use(
      http.put('*/api/v1/practice/courses/:course/assessments/:session/answers/:revision', () =>
        HttpResponse.error(),
      ),
    );
    const user = userEvent.setup();
    const first = mount();
    await screen.findByText('第 1 题 · 单选');
    await user.click(screen.getAllByRole('radio')[1]);
    await screen.findByText(/未保存：/);
    first.unmount();
    mount();
    await screen.findByText('第 1 题 · 单选');
    expect(screen.getAllByRole('radio')[1]).toBeChecked();
    server.use(
      http.put(
        '*/api/v1/practice/courses/:course/assessments/:session/answers/:revision',
        ({ params }) =>
          envelope({
            sessionId: session.id,
            revisionId: params.revision,
            selectedOption: 1,
            savedAt: '2026-10-02T02:01:00Z',
            answerFingerprint: session.answerFingerprint,
            serverTime: session.serverTime,
          }),
      ),
    );
    act(() => window.dispatchEvent(new Event('online')));
    await waitFor(() => expect(screen.getByText('答案已保存')).toBeInTheDocument());
    expect(resultReads).toBe(0);
  });
  it('刷新恢复服务端答案；改本机时间不影响倒计时', async () => {
    session.questions[0].selectedOption = 1;
    mount();
    await screen.findByText('第 1 题 · 单选');
    expect(screen.getAllByRole('radio')[1]).toBeChecked();
    const now = vi.spyOn(Date, 'now').mockReturnValue(0);
    expect(screen.getByText(/剩余 40:00/)).toBeInTheDocument();
    now.mockRestore();
  });
  it('后端声明截止后自动交卷进入结果，不能再修改', async () => {
    session.deadlineReached = true;
    session.serverTime = session.deadlineAt;
    mount();
    await screen.findByText('题目回顾');
    expect(submissions).toBe(1);
  });
  it('加载状态', async () => {
    server.use(
      http.get('*/api/v1/practice/courses/:course/assessments/:session', async () => {
        await delay(100);
        return envelope(session);
      }),
    );
    mount();
    expect(screen.getByRole('status')).toHaveTextContent('正在加载');
    await screen.findByText('第 1 题 · 单选');
  });
  it('空题目状态有行动按钮', async () => {
    session.questions = [];
    mount();
    await screen.findByText('试卷暂无题目，请重新加载。');
    expect(screen.getByRole('button', { name: '重新加载' })).toBeInTheDocument();
  });
  it('归属错误说明和重试', async () => {
    server.use(
      http.get('*/api/v1/practice/courses/:course/assessments/:session', () =>
        HttpResponse.json(
          { code: 40401, data: null, message: '资源不存在或不属于当前用户' },
          { status: 404 },
        ),
      ),
    );
    const user = userEvent.setup();
    mount();
    await screen.findByText('试卷不存在或不属于当前用户，无法查看。');
    server.use(
      http.get('*/api/v1/practice/courses/:course/assessments/:session', () => envelope(session)),
    );
    await user.click(screen.getByRole('button', { name: '重新加载' }));
    await screen.findByText('第 1 题 · 单选');
  });
  it('开始前缺少规则时禁止创建计时会话', async () => {
    mount(`/zikao/course/00023/tests/new?cycleId=${cycle}&kind=MOCK`);
    await screen.findByText('模拟卷 · 开始前确认');
    expect(screen.getByRole('button', { name: '开始作答' })).toBeDisabled();
  });
  it('已提交恢复结果；按后端 passed 展示而不按分数重判', async () => {
    session.status = 'SUBMITTED';
    result.passed = false;
    result.score = 100;
    mount();
    await screen.findByText('题目回顾');
    expect(screen.getByText(/未通过 · 通过线/)).toBeInTheDocument();
    expect(submissions).toBe(0);
  });
  it('结果请求失败可重试，不暴露猜测的考点汇总', async () => {
    session.status = 'SUBMITTED';
    server.use(
      http.get('*/api/v1/practice/courses/:course/assessments/:session/result', () =>
        HttpResponse.error(),
      ),
    );
    const user = userEvent.setup();
    mount();
    await screen.findByText('加载遇到问题');
    server.use(
      http.get('*/api/v1/practice/courses/:course/assessments/:session/result', () =>
        envelope(result),
      ),
    );
    await user.click(screen.getByRole('button', { name: '重新加载' }));
    await screen.findByText('考点掌握情况');
    expect(screen.getByRole('button', { name: '去练习薄弱考点' })).toBeDisabled();
  });
  it('界面倒计时归零时先同步服务端，未到期不自行判定交卷', async () => {
    session.serverTime = session.deadlineAt;
    session.deadlineReached = false;
    mount();
    await screen.findByText('正在核对服务端截止状态，暂不可改选。');
    expect(screen.getAllByRole('radio')[0]).toBeDisabled();
    expect(submissions).toBe(0);
    expect(resultReads).toBe(0);
  });
  it('保存失败阻止手动交卷，保留本地选项', async () => {
    server.use(
      http.put('*/api/v1/practice/courses/:course/assessments/:session/answers/:revision', () =>
        HttpResponse.error(),
      ),
    );
    const user = userEvent.setup();
    mount();
    await screen.findByText('第 1 题 · 单选');
    await user.click(screen.getAllByRole('radio')[0]);
    await user.click(screen.getByRole('button', { name: '交卷' }));
    await user.click(screen.getByRole('button', { name: '确认交卷' }));
    await screen.findByText(/交卷失败：/);
    expect(submissions).toBe(0);
    expect(resultReads).toBe(0);
    expect(screen.getAllByRole('radio')[0]).toBeChecked();
  });
  it('模拟卷通过但后端未解锁时不展示真题入口', async () => {
    session.kind = 'MOCK';
    session.status = 'SUBMITTED';
    result.passed = true;
    result.unlock.canDownloadPapers = false;
    mount();
    await screen.findByText('题目回顾');
    expect(screen.queryByText('真题已开放')).not.toBeInTheDocument();
  });
  it('模拟卷通过且后端已解锁时显示真题入口', async () => {
    session.kind = 'MOCK';
    session.status = 'SUBMITTED';
    result.passed = true;
    result.unlock.canDownloadPapers = true;
    mount();
    await screen.findByText('真题已开放');
    expect(screen.getByRole('link', { name: '查看历年真题' })).toHaveAttribute(
      'href',
      '/zikao/course/00023/exams?cycleId=cycle',
    );
  });
  it('快速改选串行保存并使用上一次保存时间，最后选项保持选中', async () => {
    let writes = 0;
    server.use(
      http.put(
        '*/api/v1/practice/courses/:course/assessments/:session/answers/:revision',
        async ({ request, params }) => {
          const body = (await request.json()) as {
            selectedOption: number;
            expectedSavedAt: string | null;
          };
          const row = session.questions.find(
            (item) => item.question.revisionId === params.revision,
          )!;
          expect(body.expectedSavedAt).toBe(row.answerSavedAt);
          writes++;
          await delay(150);
          row.answerSavedAt = `2026-10-02T02:01:0${writes}Z`;
          row.selectedOption = body.selectedOption;
          return envelope({
            sessionId: session.id,
            revisionId: params.revision,
            selectedOption: body.selectedOption,
            savedAt: row.answerSavedAt,
            answerFingerprint: session.answerFingerprint,
            serverTime: session.serverTime,
          });
        },
      ),
    );
    const user = userEvent.setup();
    mount();
    await screen.findByText('第 1 题 · 单选');
    await user.click(screen.getAllByRole('radio')[0]);
    await waitFor(() => expect(writes).toBe(1));
    await user.click(screen.getAllByRole('radio')[1]);
    await waitFor(() => expect(screen.getByText('答案已保存')).toBeInTheDocument());
    expect(writes).toBe(2);
    expect(session.questions[0].selectedOption).toBe(1);
    expect(screen.getAllByRole('radio')[1]).toBeChecked();
  });
  it('结果回顾为空时提供返回刷题行动', async () => {
    session.status = 'SUBMITTED';
    result.answers = [];
    mount();
    await screen.findByText('暂无题目回顾。');
    expect(screen.getByRole('button', { name: '返回刷题' })).toBeInTheDocument();
  });
});
