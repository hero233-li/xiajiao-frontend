import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PointPracticeBatch } from './PointPracticeBatch';
import type { BankChapter, BankPoint } from '../../api/bank';
const request = vi.hoisted(() => vi.fn());
vi.mock('../../api/bank', () => ({ bankRequest: request }));
const point = { point_key: 'p', title: '测试考点' } as BankPoint;
const chapter = { chapter_id: 'ch' } as BankChapter;
const makeBatch = () => ({
  id: 'batch',
  revision: 0,
  state: 'DRAFT',
  taskId: null,
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
  request.mockImplementation(async (path: string, method: string, data: { answer: object }) => {
    if (method === 'PUT') {
      const i = Number(path.split('/').at(-1)?.slice(1));
      batch.questions[i].answer = data.answer;
      batch.revision++;
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
describe('整组练习作答', () => {
  it('保存失败保留当前输入与题号，重试后才能切换', async () => {
    mount();
    const text = await screen.findByRole('textbox', { name: '作答文本' });
    fireEvent.change(text, { target: { value: '需要保留的推导' } });
    request.mockRejectedValueOnce(new Error('服务暂不可用'));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('你的输入仍保留');
    expect(screen.getByRole('textbox', { name: '作答文本' })).toHaveValue('需要保留的推导');
    expect(screen.getByText('第 1 / 10 题 · 已作答 1/10')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() => expect(screen.getByText('第 2 / 10 题 · 已作答 1/10')).toBeInTheDocument());
  });

  it('未作答十题时不能申请，换题保存当前答案并可恢复', async () => {
    mount();
    const text = await screen.findByRole('textbox', { name: '作答文本' });
    expect(screen.getByRole('button', { name: '完成10题，申请批改' })).toBeDisabled();
    fireEvent.change(text, { target: { value: '第一题的手写说明' } });
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith('/bank/practice-batches/batch/answers/q0', 'PUT', {
        answer: { text: '第一题的手写说明' },
        expectedRevision: 0,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '1 ✓' }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: '作答文本' })).toHaveValue('第一题的手写说明'),
    );
  });
  it('图片单独作答也计为已作答，但选项题必须选答案', async () => {
    batch.questions.forEach((q) => {
      q.files = [{ id: 'file', name: '作答.png', mimeType: 'image/png' }] as never[];
    });
    batch.questions[0].type = 'CHOICE';
    batch.questions[0].options = ['A', 'B'] as never[];
    mount();
    await screen.findByText('第 1 / 10 题 · 已作答 9/10');
    expect(screen.getByRole('button', { name: '完成10题，申请批改' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'A' }));
    expect(screen.getByRole('button', { name: '完成10题，申请批改' })).toBeEnabled();
  });
  it('拒绝超限或非图片文件，不发出上传请求', async () => {
    mount();
    const upload = await screen.findByLabelText('上传本题作答图片');
    fireEvent.change(upload, {
      target: { files: [new File(['bad'], 'file.txt', { type: 'text/plain' })] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('JPG或PNG');
    expect(request).toHaveBeenCalledTimes(1);
  });
});
