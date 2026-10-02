import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../../mocks/server';
import operations from '../../mocks/generated.json';
import type {
  Unlock,
  Paper,
  Prediction,
  ScoreChange,
  LegacyDetail,
} from '../../api/generated/models';
import { ExamContent } from '../../pages/ExamsPage';
const example = <T,>(name: string) =>
  structuredClone(operations.find((op) => op.operationId === name)!.example.data) as T;
const unlock = example<Unlock>('getUnlock');
const change = example<ScoreChange>('createScore');
const paper = example<Paper>('getPaper');
const prediction = example<Prediction>('getPrediction');
const ok = (data: unknown) => HttpResponse.json({ code: 0, data, message: 'ok' });
const base = '*/api/v1/exams/courses/:courseId';
const handlers = [
  http.get(`${base}/unlock`, () => ok(unlock)),
  http.get(`${base}/papers`, () => ok({ items: [paper], page: 1, size: 100, total: 1 })),
  http.get(`${base}/scores`, () => ok({ items: [], page: 1, size: 20, total: 0 })),
  http.get(`${base}/prediction`, () => ok(prediction)),
  http.get(`${base}/score-trend`, () => ok({ courseId: unlock.courseId, records: [] })),
  http.get('*/api/v1/exams/history', () => ok({ items: [], page: 1, size: 20, total: 0 })),
];
beforeEach(() => server.use(...handlers));
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ExamContent courseId={unlock.courseId} cycleId={unlock.cycleId} code="00023" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
const denied = (message: string) =>
  HttpResponse.json({ code: 40301, data: null, message }, { status: 403 });
describe('历年试卷与成绩', () => {
  it('加载中、空数据和可重试的失败区域独立展示', async () => {
    let calls = 0;
    server.use(
      http.get(`${base}/unlock`, async () => {
        await delay(80);
        return ok(unlock);
      }),
      http.get(`${base}/prediction`, () => (++calls === 1 ? denied('预测不可用') : ok(prediction))),
    );
    mount();
    expect(screen.getByText('正在加载解锁信息…')).toBeInTheDocument();
    expect(await screen.findByText('暂无刷题成绩，完成试卷后可记录成绩。')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: '重新加载成绩预测' }));
    expect(await screen.findByText('根据你的练习成绩估算，不代表正式成绩')).toBeInTheDocument();
  });
  it('未解锁时显示紧凑试卷且没有下载或录入按钮', async () => {
    server.use(
      http.get(`${base}/unlock`, () =>
        ok({ ...unlock, canDownloadPapers: false, canWriteScores: false }),
      ),
    );
    mount();
    expect(await screen.findByText('未开放下载')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '下载题目' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '记录成绩' })).not.toBeInTheDocument();
    expect(screen.queryByText(/练习次数/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: '真题解锁步骤' }).querySelectorAll('a'),
    ).toHaveLength(4);
    expect(screen.queryByRole('button', { name: '手动跳过' })).not.toBeInTheDocument();
  });
  it('窗口内二次确认跳过，成功后可撤销', async () => {
    let state: Unlock = {
      ...unlock,
      activeOverride: null,
      skipWindow: { ...unlock.skipWindow, canConfirm: true },
    };
    let confirms = 0;
    let revokes = 0;
    server.use(
      http.get(`${base}/unlock`, () => ok(state)),
      http.post(`${base}/cycles/:cycleId/overrides`, async ({ request }) => {
        expect(await request.json()).toEqual({ confirm: true });
        confirms++;
        state = {
          ...state,
          activeOverride: {
            id: 'override',
            courseId: unlock.courseId,
            cycleId: unlock.cycleId,
            confirmedAt: unlock.evaluatedAt,
            examDateSnapshot: '2026-10-17',
            revokedAt: null,
            revision: 2,
          },
        };
        return ok(state.activeOverride);
      }),
      http.post(`${base}/cycles/:cycleId/overrides/current/revocation`, async ({ request }) => {
        expect(await request.json()).toEqual({ confirm: true, expectedRevision: 2 });
        revokes++;
        state = { ...state, activeOverride: null };
        return ok(null);
      }),
    );
    mount();
    await userEvent.click(await screen.findByRole('button', { name: '手动跳过' }));
    expect(confirms).toBe(0);
    await userEvent.click(screen.getByRole('button', { name: '确认跳过' }));
    await userEvent.click(await screen.findByRole('button', { name: '撤销跳过' }));
    await userEvent.click(screen.getByRole('button', { name: '确认撤销' }));
    await waitFor(() => expect(revokes).toBe(1));
    expect(confirms).toBe(1);
  });
  it('不足样本使用一行提示；排除原因采用后端结果', async () => {
    server.use(
      http.get(`${base}/prediction`, () =>
        ok({
          ...prediction,
          status: 'INSUFFICIENT_SAMPLES',
          sampleCount: 1,
          predictedScore: null,
          actualMinimum: null,
          actualMaximum: null,
        }),
      ),
      http.get(`${base}/scores`, () =>
        ok({
          items: [
            {
              ...change.record,
              includedInPrediction: false,
              predictionExclusionReasons: ['ANSWERS_SEEN', 'OVERTIME'],
            },
          ],
          page: 1,
          size: 20,
          total: 1,
        }),
      ),
    );
    mount();
    const hint = await screen.findByText(/至少完成 3 套合格试卷后可预测/);
    expect(hint.tagName).toBe('P');
    expect(hint.closest('.card')).toBeNull();
    expect(await screen.findByText(/不参与预测：做题前看过答案；超出限时/)).toBeInTheDocument();
  });
  it('成绩弹窗自报单选清晰，焦点陷阱与 Esc 焦点返回', async () => {
    mount();
    const trigger = await screen.findByRole('button', { name: '记录成绩' });
    await userEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: '录入试卷成绩' });
    for (const label of ['是否完整作答？', '是否闭卷？', '做题前是否看过本卷答案？'])
      expect(within(dialog).getByRole('group', { name: label })).toBeInTheDocument();
    const buttons = within(dialog).getAllByRole('button');
    buttons.at(-1)!.focus();
    await userEvent.tab();
    expect(within(dialog).getByRole('button', { name: '关闭弹窗' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it('保存成绩后图片失败重试只上传，不重复创建成绩', async () => {
    let saves = 0;
    let uploads = 0;
    let body: unknown;
    server.use(
      http.post(`${base}/scores`, async ({ request }) => {
        saves++;
        body = await request.json();
        return ok(change);
      }),
      http.post(`${base}/scores/:scoreId/images`, () =>
        ++uploads === 1 ? denied('图片上传失败') : ok(change.record.images),
      ),
    );
    mount();
    await userEvent.click(await screen.findByRole('button', { name: '记录成绩' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('练习日期'), '2026-10-02');
    await userEvent.type(within(dialog).getByLabelText('分数（0–100）'), '80');
    await userEvent.type(within(dialog).getByLabelText('实际用时（分钟）'), '100');
    await userEvent.type(within(dialog).getByLabelText('限时（分钟）'), '120');
    for (const label of ['是否完整作答？', '是否闭卷？'])
      await userEvent.click(
        within(within(dialog).getByRole('group', { name: label })).getByLabelText('是'),
      );
    await userEvent.click(
      within(
        within(dialog).getByRole('group', { name: '做题前是否看过本卷答案？' }),
      ).getByLabelText('否'),
    );
    await userEvent.upload(
      within(dialog).getByLabelText('可选图片存档'),
      new File(['image'], '成绩.png', { type: 'image/png' }),
    );
    await userEvent.click(within(dialog).getByRole('button', { name: '保存成绩' }));
    await userEvent.click(await screen.findByRole('button', { name: '重试图片存档' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(saves).toBe(1);
    expect(uploads).toBe(2);
    expect(body).toMatchObject({
      complete: true,
      closedBook: true,
      answersSeenBefore: false,
      score: 80,
      minutes: 100,
      limitMinutes: 120,
    });
  });
  it('编辑成绩携带原修订号并保留试卷与周期', async () => {
    let body: unknown;
    server.use(
      http.get(`${base}/scores`, () => ok({ items: [change.record], page: 1, size: 20, total: 1 })),
      http.put(`${base}/scores/:scoreId`, async ({ request }) => {
        body = await request.json();
        return ok(change);
      }),
    );
    mount();
    await userEvent.click(await screen.findByRole('button', { name: '编辑成绩' }));
    const dialog = screen.getByRole('dialog', { name: '编辑试卷成绩' });
    expect(within(dialog).getByRole('combobox')).toBeDisabled();
    const score = within(dialog).getByLabelText('分数（0–100）');
    await userEvent.clear(score);
    await userEvent.type(score, '88');
    await userEvent.click(within(dialog).getByRole('button', { name: '保存成绩' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(body).toMatchObject({ score: 88, expectedRevision: change.record.revision });
    expect(body).not.toHaveProperty('paperId');
    expect(body).not.toHaveProperty('cycleId');
  });
  it('考试窗口外已有跳过仍可撤销，不能重新确认跳过', async () => {
    const active = {
      id: 'override',
      courseId: unlock.courseId,
      cycleId: unlock.cycleId,
      confirmedAt: unlock.evaluatedAt,
      examDateSnapshot: '2026-10-17',
      revokedAt: null,
      revision: 1,
    };
    server.use(
      http.get(`${base}/unlock`, () =>
        ok({
          ...unlock,
          activeOverride: active,
          skipWindow: { ...unlock.skipWindow, canConfirm: false },
        }),
      ),
    );
    mount();
    expect(await screen.findByRole('button', { name: '撤销跳过' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '手动跳过' })).not.toBeInTheDocument();
  });
  it('受控下载失败保留错误和重试入口', async () => {
    let calls = 0;
    server.use(
      http.get(`${base}/papers/:paperId/file`, () => {
        calls++;
        return denied('未解锁，禁止下载');
      }),
    );
    mount();
    await userEvent.click(await screen.findByRole('button', { name: '下载题目' }));
    expect(await screen.findByText('下载失败：未解锁，禁止下载')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '下载题目' }));
    await waitFor(() => expect(calls).toBe(2));
  });
  it('历史详情只读展示上海时间、类型、分数', async () => {
    const legacy = example<LegacyDetail>('getLegacyHistory');
    legacy.oldScore = 86;
    server.use(
      http.get('*/api/v1/exams/history', () =>
        ok({ items: [legacy.summary], page: 1, size: 20, total: 1 }),
      ),
      http.get('*/api/v1/exams/history/:id', () => ok(legacy)),
    );
    mount();
    await userEvent.click(screen.getByText('历史检测与批改记录（只读）'));
    expect(await screen.findByText('10/02 10:00 · 检测 · 86 分')).toBeInTheDocument();
    expect(screen.getByText('历史记录，不计入当前解锁 · 只读')).toBeInTheDocument();
  });
});
