import { beforeEach, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import operations from '../../../mocks/generated.json';
import type { Paper, Unlock } from '../../../api/generated/models';
import type { GradingTask, Rubric, Submission } from '../../../api/grading';
import { Workbench } from './Workbench';

const example = <T,>(name: string) =>
  structuredClone(operations.find((op) => op.operationId === name)!.example.data) as T;
const unlock = example<Unlock>('getUnlock');
const paper = example<Paper>('getPaper');
const file = example<{ file: unknown; contentBase64: string }>('downloadPaper');
const ok = (data: unknown) => HttpResponse.json({ code: 0, data, message: 'ok' });
const examsBase = '*/api/v1/exams/courses/:courseId';

const page = (index: number) => ({
  fileId: `file-${index}`,
  pageNo: index,
  name: `答题${index}.png`,
  mimeType: 'image/png',
  sizeBytes: 1024,
  sha256: '0'.repeat(64),
});

const submission = (pages: number, id = 'submission-1'): Submission => ({
  id,
  courseId: unlock.courseId,
  cycleId: unlock.cycleId,
  paperId: paper.id,
  revision: pages,
  pages: Array.from({ length: pages }, (_, index) => page(index + 1)),
});

const completedTask = (result: GradingTask['result'] = null): GradingTask => ({
  id: 'task-1',
  kind: 'GRADE',
  state: 'COMPLETED',
  submissionId: 'submission-1',
  rubricId: 'rubric-1',
  model: 'test-model',
  result,
  rubricDraft: null,
  scoreId: 'score-1',
  error: null,
  leaseUntil: null,
  workerOnline: true,
  workerReason: null,
});

const publishedRubric: Rubric = {
  id: 'rubric-1',
  paperId: paper.id,
  version: 1,
  state: 'PUBLISHED',
  document: {
    questions: [
      {
        number: '1',
        stem: '',
        referenceAnswer: '',
        maximum: 10,
        points: [{ id: '1', description: '', maximum: 10 }],
      },
    ],
  },
};

function mount(
  entry = '/',
  overrides: { submissions?: Submission[]; setup?: () => void } = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  server.use(
    http.get(`${examsBase}/papers/:paperId`, () => ok(paper)),
    http.get(`${examsBase}/papers/:paperId/file`, () => ok(file)),
    http.get(`${examsBase}/unlock`, () => ok(unlock)),
    http.get(`${examsBase}/scores`, () => ok({ items: [], page: 1, size: 20, total: 0 })),
    http.get(`${examsBase}/score-trend`, () => ok({ courseId: unlock.courseId, records: [] })),
    http.get('*/api/v1/grading/submissions', () => ok(overrides.submissions ?? [])),
    http.get('*/api/v1/grading/rubrics', () => ok([])),
    http.get('*/api/v1/grading/workers', () =>
      ok([{ id: 'worker-1', label: 'Mac', online: true, paused: false, revoked: false, reason: null }]),
    ),
  );
  overrides.setup?.();
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <Workbench
          courseId={unlock.courseId}
          cycleId={unlock.cycleId}
          code="00023"
          paperId={paper.id}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}

beforeEach(() => {
  URL.createObjectURL = () => 'blob:paper';
  URL.revokeObjectURL = () => {};
});

it('工作台按「试卷 → 答卷 → 批改 → 进度 → 成绩 → 分析」排列', async () => {
  mount();
  expect(await screen.findByRole('heading', { name: '试卷' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '我的答卷' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '发起批改' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '批改进度' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '成绩' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '本卷分析' })).toBeInTheDocument();
  const anchors = screen.getByRole('navigation', { name: '工作台区块' });
  expect(within(anchors).getAllByRole('link')).toHaveLength(6);
});

it('没有答卷时批改按钮禁用并说明原因', async () => {
  mount();
  await screen.findByRole('heading', { name: '发起批改' });
  expect(screen.getByText('先新建一份答卷。')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /提交批改/ })).toBeDisabled();
});

it('上传前拦截超大图片并提示', async () => {
  mount('/', { submissions: [submission(1)] });
  await screen.findByRole('heading', { name: '我的答卷' });
  const input = screen.getByLabelText('添加答题照片');
  const big = new File(['x'], '超大.png', { type: 'image/png' });
  Object.defineProperty(big, 'size', { value: 9 * 1024 * 1024 });
  await userEvent.upload(input, big);
  expect(await screen.findByText(/超大\.png 超过 8MB/)).toBeInTheDocument();
});

it('上传前拦截超过 20 张的批量选择', async () => {
  mount('/', { submissions: [submission(19)] });
  await screen.findByRole('heading', { name: '我的答卷' });
  const files = [
    new File(['a'], 'a.png', { type: 'image/png' }),
    new File(['b'], 'b.png', { type: 'image/png' }),
  ];
  await userEvent.upload(screen.getByLabelText('添加答题照片'), files);
  expect(await screen.findByText(/还能再加 1 张/)).toBeInTheDocument();
});

it('新建答卷后上传图片，页序与缩略图立即显示', async () => {
  let list: Submission[] = [];
  mount('/', {
    setup: () =>
      server.use(
        http.get('*/api/v1/grading/submissions', () => ok(list)),
        http.post('*/api/v1/grading/submissions', () => {
          list = [submission(0)];
          return ok(list[0]);
        }),
        http.post('*/api/v1/grading/submissions/:id/pages', () => {
          list = [submission(1)];
          return ok(list[0]);
        }),
      ),
  });
  await screen.findByRole('heading', { name: '我的答卷' });
  await userEvent.click(screen.getByRole('button', { name: '新建一份答卷' }));
  expect(await screen.findByText(/已新建一份答卷/)).toBeInTheDocument();
  await userEvent.upload(
    screen.getByLabelText('添加答题照片'),
    new File(['abc'], '答题1.png', { type: 'image/png' }),
  );
  expect(await screen.findByText('第 1 页')).toBeInTheDocument();
  expect(screen.getByAltText('答题1.png 预览')).toBeInTheDocument();
});

it('深链 taskId 自动定位到对应答卷', async () => {
  mount('/?taskId=linked-task', {
    submissions: [submission(2, 'linked-submission')],
    setup: () =>
      server.use(
        http.get('*/api/v1/grading/tasks/linked-task', () =>
          ok({ ...completedTask(), id: 'linked-task', submissionId: 'linked-submission' }),
        ),
      ),
  });
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: '已有答卷' })).toHaveValue('linked-submission'),
  );
});

it('批改完成后显示本次总分与成绩记录', async () => {
  const result = {
    rubricId: 'rubric-1',
    reviewItems: [],
    answers: [
      {
        number: '1',
        recognizedAnswer: '答案',
        points: [{ pointId: '1', score: 7, reason: '步骤不完整' }],
        pages: [1],
        reviewItems: [],
      },
    ],
  };
  mount('/', {
    submissions: [submission(1)],
    setup: () =>
      server.use(
        http.get('*/api/v1/grading/submissions/:id/tasks', () => ok([completedTask(result)])),
        http.get(`${examsBase}/scores`, () =>
          ok({
            items: [
              {
                ...(example<{ record: unknown }>('createScore').record as Record<string, unknown>),
                paperId: paper.id,
                score: 7,
              },
            ],
            page: 1,
            size: 20,
            total: 1,
          }),
        ),
        http.get('*/api/v1/grading/rubrics', () => ok([publishedRubric])),
      ),
  });
  expect(await screen.findByText('本次批改总分')).toBeInTheDocument();
  await waitFor(() => expect(screen.getAllByText('7').length).toBeGreaterThan(0));
  expect(await screen.findByText(/得分率 7%/)).toBeInTheDocument();
});

it('本卷分析在批改后展示逐题得分率与失分原因', async () => {
  const result = {
    rubricId: 'rubric-1',
    reviewItems: [],
    answers: [
      {
        number: '1',
        recognizedAnswer: '答案',
        points: [
          { pointId: '1', score: 7, reason: '步骤不完整' },
          { pointId: '2', score: 0, reason: '步骤不完整' },
        ],
        pages: [1],
        reviewItems: [],
      },
    ],
  };
  mount('/', {
    submissions: [submission(1)],
    setup: () =>
      server.use(
        http.get('*/api/v1/grading/submissions/:id/tasks', () => ok([completedTask(result)])),
        http.get('*/api/v1/grading/rubrics', () => ok([publishedRubric])),
      ),
  });
  await screen.findByRole('heading', { name: '本卷分析' });
  expect(await screen.findByText(/总得分率 70\.0%/)).toBeInTheDocument();
  expect(screen.getByText('第 1 题')).toBeInTheDocument();
  expect(screen.getByText('步骤不完整')).toBeInTheDocument();
  expect(screen.getByText('×2')).toBeInTheDocument();
});

it('安卓手机浏览器不渲染内嵌 PDF，只给打开/下载两个按钮', async () => {
  const original = navigator.userAgent;
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36',
    configurable: true,
  });
  mount();
  expect(await screen.findByText('手机浏览器不支持在页面内显示 PDF')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /打开 PDF/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /下载到本地/ })).toBeInTheDocument();
  expect(document.querySelector('iframe.wb-paper-frame')).toBeNull();
  Object.defineProperty(navigator, 'userAgent', { value: original, configurable: true });
});

it('微信内置浏览器不渲染内嵌 PDF，只给打开/下载两个按钮', async () => {
  const original = navigator.userAgent;
  Object.defineProperty(navigator, 'userAgent', {
    value: `${original} MicroMessenger/8.0`,
    configurable: true,
  });
  mount();
  expect(await screen.findByText('手机浏览器不支持在页面内显示 PDF')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /打开 PDF/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /下载到本地/ })).toBeInTheDocument();
  expect(document.querySelector('iframe.wb-paper-frame')).toBeNull();
  Object.defineProperty(navigator, 'userAgent', { value: original, configurable: true });
});

it('条件满足时提交批改可用，且不再显示作答条件', async () => {
  mount('/', {
    submissions: [submission(1)],
    setup: () => server.use(http.get('*/api/v1/grading/rubrics', () => ok([publishedRubric]))),
  });
  expect(await screen.findByText('条件已满足，可以直接提交批改。')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /提交批改/ })).toBeEnabled();
  expect(screen.queryByText(/作答条件/)).not.toBeInTheDocument();
  expect(screen.queryByLabelText('实际用时')).not.toBeInTheDocument();
});

it('可以创建一次性配对凭证', async () => {
  mount('/', {
    setup: () =>
      server.use(
        http.post('*/api/v1/grading/workers', () => ok({ id: 'worker-2', token: 'pair-token-123' })),
      ),
  });
  await userEvent.click(await screen.findByText('批改程序配对与状态'));
  await userEvent.click(screen.getByRole('button', { name: /创建专用配对凭证/ }));
  expect(await screen.findByDisplayValue('pair-token-123')).toBeInTheDocument();
});
