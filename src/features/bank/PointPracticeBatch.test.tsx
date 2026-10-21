import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PointPracticeBatch } from './PointPracticeBatch';
import type { BankChapter, BankPoint } from '../../api/bank';
const request = vi.hoisted(() => vi.fn());
const pdf = vi.hoisted(() => vi.fn());
vi.mock('../../api/bank', () => ({ bankRequest: request }));
vi.mock('./practiceSheetPdf', () => ({ practiceSheetPdf: pdf }));
vi.mock('../../components/ConfirmationProvider', () => ({
  useConfirmation: () => async () => true,
}));
const point = { point_key: 'p', title: '测试考点' } as BankPoint;
const chapter = { chapter_id: 'ch', title: '测试章节' } as BankChapter;
const makeBatch = () => ({
  id: 'batch',
  revision: 0,
  state: 'DRAFT',
  taskId: null as string | null,
  submissionMode: 'PER_QUESTION',
  sheetFiles: [] as { id: string; name: string; mimeType: string }[],
  workerOnline: false,
  workerReason: '离线等待',
  questions: Array.from({ length: 10 }, (_, i) => ({
    id: `q${i}`,
    stem: `题干${i}`,
    type: 'CALCULATION',
    options: [],
    maximum: 10,
    level: 'simple',
    answer: {},
    files: [],
  })),
});
let batch: ReturnType<typeof makeBatch>;
beforeEach(() => {
  batch = makeBatch();
  request.mockReset();
  pdf.mockReset();
  pdf.mockResolvedValue({
    blob: new Blob(['pdf'], { type: 'application/pdf' }),
    imageUrl: 'data:image/jpeg;base64,AA==',
  });
  URL.createObjectURL = vi.fn(() => 'blob:test');
  URL.revokeObjectURL = vi.fn();
  request.mockImplementation(async (path: string, method: string, data: FormData) => {
    if (path.endsWith('/sheet-pages') && method === 'POST') {
      expect(data.get('expectedRevision')).toBe(String(batch.revision));
      batch.sheetFiles.push({
        id: `f${batch.sheetFiles.length}`,
        name: (data.get('file') as File).name,
        mimeType: 'image/png',
      });
      batch.revision++;
      batch.submissionMode = 'SHEET_PHOTOS';
    }
    if (path.endsWith('/grading')) {
      batch.state = 'QUEUED';
      batch.taskId = 'task';
    }
    return structuredClone(batch);
  });
});
afterEach(cleanup);
const mount = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PointPracticeBatch courseId="course" chapter={chapter} point={point} level="simple" />
    </QueryClientProvider>,
  );
describe('单页十题PDF与整组照片批改', () => {
  it('生成一个包含全部十题且无答案的PDF，不显示逐题答题框', async () => {
    mount();
    await screen.findByRole('heading', { name: '测试考点', level: 1 });
    expect(pdf).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '生成练习PDF' }));
    await waitFor(() => expect(pdf).toHaveBeenCalled());
    const sheet = pdf.mock.calls[0][0] as HTMLElement;
    expect(sheet.querySelectorAll('section')).toHaveLength(10);
    expect(sheet).toHaveTextContent('题干9');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(await screen.findByRole('link', { name: '下载PDF' })).toHaveAttribute(
      'download',
      '测试考点-simple-十题练习单.pdf',
    );
    fireEvent.click(screen.getByRole('tab', { name: '作答照片' }));
    expect(screen.getByRole('button', { name: '申请AI批改全部10题' })).toBeDisabled();
  });
  it('多张照片依次携带最新版本号保存，一次申请十题批改', async () => {
    mount();
    await screen.findByRole('heading', { name: '测试考点', level: 1 });
    fireEvent.click(screen.getByRole('tab', { name: '作答照片' }));
    const upload = await screen.findByLabelText('上传整组作答照片');
    fireEvent.change(upload, {
      target: {
        files: [
          new File(['1'], '1.png', { type: 'image/png' }),
          new File(['2'], '2.png', { type: 'image/png' }),
        ],
      },
    });
    await screen.findByText(/已上传 2\/20 张/);
    fireEvent.click(screen.getByRole('button', { name: '申请AI批改全部10题' }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith('/bank/practice-batches/batch/grading', 'POST', {
        expectedRevision: 2,
      }),
    );
    expect(await screen.findByText('离线等待')).toBeInTheDocument();
    expect(screen.getByLabelText('上传整组作答照片')).toBeDisabled();
  });
  it('上传中途失败保留已成功的照片，不创建批改任务', async () => {
    mount();
    await screen.findByRole('heading', { name: '测试考点', level: 1 });
    fireEvent.click(screen.getByRole('tab', { name: '作答照片' }));
    await screen.findByLabelText('上传整组作答照片');
    const original = request.getMockImplementation()!;
    let n = 0;
    request.mockImplementation(async (...args: unknown[]) => {
      if (String(args[0]).endsWith('/sheet-pages') && ++n === 2) throw Error('网络中断');
      return original(...args);
    });
    fireEvent.change(screen.getByLabelText('上传整组作答照片'), {
      target: {
        files: [
          new File(['1'], '1.png', { type: 'image/png' }),
          new File(['2'], '2.png', { type: 'image/png' }),
        ],
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('已保存1张');
    expect(screen.getByText(/已上传 1\/20 张/)).toBeInTheDocument();
    expect(request.mock.calls.some((c) => String(c[0]).endsWith('/grading'))).toBe(false);
  });
  it('拒绝非图片和超过张数限制，不上传', async () => {
    mount();
    await screen.findByRole('heading', { name: '测试考点', level: 1 });
    fireEvent.click(screen.getByRole('tab', { name: '作答照片' }));
    const upload = await screen.findByLabelText('上传整组作答照片');
    fireEvent.change(upload, {
      target: { files: [new File(['bad'], 'x.txt', { type: 'text/plain' })] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('JPG或PNG');
    expect(request).toHaveBeenCalledTimes(1);
    fireEvent.change(upload, {
      target: {
        files: Array.from({ length: 21 }, () => new File(['a'], 'a.png', { type: 'image/png' })),
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('最多20张');
    expect(request).toHaveBeenCalledTimes(1);
  });
});

it('restored review opens results first, keeps provisional scores clear and expands flagged questions', async () => {
  batch.state = 'REVIEW';
  batch.taskId = 'task';
  (batch as any).result = {
    reviewItems: ['第10题字迹不清，需核对'],
    answers: Array.from({ length: 10 }, (_, i) => ({
      number: String(i + 1),
      recognizedAnswer: '作答',
      pages: [1],
      reviewItems: i === 9 ? ['末尾理由看不清'] : [],
      points: [{ pointId: 'p', score: i === 9 ? 0 : 10, reason: i === 9 ? '需核对' : '通过' }],
    })),
  };
  mount();
  await screen.findByRole('heading', { name: '测试考点', level: 1 });
  const results = screen.getByRole('tabpanel', { name: '批改结果' });
  expect(results).toBeVisible();
  expect(within(results).getByText('模型参考得分')).toBeVisible();
  expect(within(results).getByText(/不计入通过资格/)).toBeVisible();
  expect(pdf).not.toHaveBeenCalled();
  const flagged = within(results).getByText('第 10 题').closest('details')!;
  expect(flagged).toHaveAttribute('open');
  expect(within(flagged).getByText('末尾理由看不清')).toBeVisible();
  expect(within(results).getByText('第 1 题').closest('details')).not.toHaveAttribute('open');
  fireEvent.click(screen.getByRole('tab', { name: '练习题目' }));
  expect(screen.getByRole('tabpanel', { name: '练习题目' })).toBeVisible();
  expect(screen.queryByRole('tabpanel', { name: '批改结果' })).not.toBeInTheDocument();
});
it('restored photos open the upload list and tab navigation supports keyboard', async () => {
  batch.sheetFiles = [{ id: 'saved', name: '已保存.png', mimeType: 'image/png' }];
  mount();
  await screen.findByText('已保存.png');
  expect(screen.getByRole('tabpanel', { name: '作答照片 · 1' })).toBeVisible();
  fireEvent.keyDown(screen.getByRole('tab', { name: '作答照片 · 1' }), { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: '批改结果' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(screen.getByRole('tab', { name: '批改结果' }), { key: 'Home' });
  expect(screen.getByRole('tab', { name: '练习题目' })).toHaveFocus();
});
it('shows upload progress before confirmation and uses a longer upload timeout', async () => {
  const original = request.getMockImplementation()!;
  let release!: () => void;
  const pending = new Promise<void>((r) => {
    release = r;
  });
  request.mockImplementation(async (...args: any[]) => {
    if (args[0].endsWith('/sheet-pages')) {
      args[4].onUploadProgress({ loaded: 50, total: 100 });
      await pending;
    }
    return original(...args);
  });
  mount();
  await screen.findByRole('heading', { name: '测试考点', level: 1 });
  fireEvent.click(screen.getByRole('tab', { name: '作答照片' }));
  fireEvent.change(screen.getByLabelText('上传整组作答照片'), {
    target: { files: [new File(['x'], '作答.png', { type: 'image/png' })] },
  });
  expect(await screen.findByText('正在保存第 1 / 1 张照片')).toBeVisible();
  expect(screen.getByRole('progressbar')).toHaveValue(50);
  expect(request.mock.calls.find((c) => c[0].endsWith('/sheet-pages'))?.[4].timeout).toBe(120000);
  release();
  await screen.findByText(/已上传 1\/20 张/);
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});
