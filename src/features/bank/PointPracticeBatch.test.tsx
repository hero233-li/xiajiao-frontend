import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
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
    await waitFor(() => expect(pdf).toHaveBeenCalled());
    const sheet = pdf.mock.calls[0][0] as HTMLElement;
    expect(sheet.querySelectorAll('section')).toHaveLength(10);
    expect(sheet).toHaveTextContent('题干9');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(await screen.findByRole('link', { name: '下载PDF' })).toHaveAttribute(
      'download',
      '测试考点-simple-十题练习单.pdf',
    );
    expect(screen.getByRole('button', { name: '申请AI批改全部10题' })).toBeDisabled();
  });
  it('多张照片依次携带最新版本号保存，一次申请十题批改', async () => {
    mount();
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
