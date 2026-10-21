import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { bankRequest } from '../../api/bank';
import type { BankGradingAnswer } from '../../api/bank';
import { RapidPhotoPanel } from './RapidPhotoPanel';
vi.mock('../../api/bank', () => ({ bankRequest: vi.fn() }));
vi.mock('../../api/generated/courses/courses', () => ({
  listCourses: vi.fn(async () => ({ data: { items: [{ id: 'course', code: '00023' }] } })),
}));
vi.mock('../cycle/CycleContext', () => ({
  useCycle: () => ({ cycleId: 'cycle', pending: false, error: false }),
}));
it('多页排序与提交、待核对不计零分、账号隔离', async () => {
  localStorage.clear();
  let photo = 0;
  type Submission = { requestId: string; fileIds: string[]; closedBook: boolean; pagesComplete: boolean };
  type Attempt = {
    id: string; state: string; pages: unknown[];
    practice: { minutes: number; closedBook: boolean; answersSeenBefore: boolean; complete: boolean };
    maximums: { number: string; maximum: number }[];
    result: { reviewItems: string[]; answers: BankGradingAnswer[] } | null;
    workerOnline: boolean; workerReason: string;
  };
  let history: Attempt[] = [];
  let submitted: Submission | undefined;
  let owner = 'one';
  vi.mocked(bankRequest).mockImplementation((async (path: string, method = 'GET', data?: unknown) => {
    if (path === '/grading/workers') return [];
    if (path === '/rapid/materials' && method === 'POST')
      return {
        fileId: 'file' + ++photo,
        pageNo: photo,
        name: 'page' + photo + '.png',
        mimeType: 'image/png',
        sizeBytes: 10,
      };
    if (path.startsWith('/rapid/materials/'))
      return { mimeType: 'image/png', contentBase64: 'aW1hZ2U=' };
    if (path === '/rapid/attempts' && method === 'POST') {
      submitted = data as Submission;
      history = [
        {
          id: submitted.requestId,
          state: 'QUEUED',
          pages: [],
          practice: { minutes: 25, closedBook: true, answersSeenBefore: false, complete: true },
          maximums: [{ number: 'H1', maximum: 5 }],
          result: null,
          workerOnline: false,
          workerReason: '批改程序离线，照片已保存',
        },
      ];
      return history[0];
    }
    if (path.startsWith('/rapid/attempts?')) return owner === 'one' ? history : [];
    throw new Error(path);
  }) as typeof bankRequest);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = (id: string) => (
    <QueryClientProvider client={client}>
      <RapidPhotoPanel userId={id} packId="diagnostic-00023-v1" code="00023" minutes={25} />
    </QueryClientProvider>
  );
  const r = render(view('one'));
  const u = userEvent.setup();
  const input = await screen.findByLabelText('选择手写作答图片');
  await u.upload(input, [
    new File(['x'], 'a.png', { type: 'image/png' }),
    new File(['y'], 'b.png', { type: 'image/png' }),
  ]);
  await screen.findByText(/已上传2张/);
  expect(screen.getByRole('button', { name: '第1页前移' })).toBeDisabled();
  await u.click(screen.getByRole('button', { name: '第2页前移' }));
  await u.click(screen.getByLabelText('闭卷独立作答'));
  await u.click(screen.getByLabelText('本次作答页面已全部拍齐'));
  await u.click(screen.getByRole('button', { name: '提交图片批改' }));
  await screen.findByText('批改程序离线，照片已保存');
  expect(submitted?.fileIds).toEqual(['file2', 'file1']);
  expect(submitted?.closedBook).toBe(true);
  expect(submitted?.pagesComplete).toBe(true);
  expect(screen.getByRole('button', { name: '本次已提交' })).toBeDisabled();
  history = [
    {
      ...history[0],
      state: 'REVIEW',
      result: {
        reviewItems: [],
        answers: [
          {
            number: 'H1',
            recognizedAnswer: '未拍到',
            pages: [],
            reviewItems: ['缺页待核对'],
            points: [{ pointId: 'step1', score: 0, reason: '未拍到' }],
          },
        ],
      },
    },
  ];
  await u.click(screen.getByRole('button', { name: '刷新状态' }));
  await screen.findByText('H1 · 图片识别或缺页待核对');
  expect(screen.queryByText('0/5（练习用）')).toBeNull();
  owner = 'two';
  r.rerender(view('two'));
  await screen.findByText('本材料还没有图片批改提交。');
  expect(screen.queryByText(/第1页 ·/)).toBeNull();
  expect(screen.queryByText('H1 · 图片识别或缺页待核对')).toBeNull();
});
it('拒绝HEIC，不调用上传接口', async () => {
  localStorage.clear();
  vi.mocked(bankRequest).mockResolvedValue([]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RapidPhotoPanel userId="three" packId="diagnostic-00023-v1" code="00023" minutes={25} />
    </QueryClientProvider>,
  );
  const input = await screen.findByLabelText('选择手写作答图片');
  const u = userEvent.setup({ applyAccept: false });
  vi.mocked(bankRequest).mockClear();
  await u.upload(input, new File(['x'], 'x.heic', { type: 'image/heic' }));
  await screen.findByRole('alert');
  expect(vi.mocked(bankRequest).mock.calls.some((c) => c[0] === '/rapid/materials')).toBe(false);
});
