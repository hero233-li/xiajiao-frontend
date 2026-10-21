import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SheetAssessment } from './SheetAssessment';
import type { BankSession } from '../api/bank';

const request = vi.hoisted(() => vi.fn());
const pdf = vi.hoisted(() => vi.fn());
vi.mock('../api/bank', () => ({ bankRequest: request }));
vi.mock('../features/bank/assessmentSheetPdf', () => ({ assessmentSheetPdf: pdf }));
vi.mock('../components/ConfirmationProvider', () => ({
  useConfirmation: () => async () => true,
}));

const question = (id: string, type: string, maximum: number) => ({
  id,
  point_key: 'p',
  type,
  stem: `题干 ${id}`,
  options: type === 'CHOICE' ? ['选项一', '选项二'] : [],
  maximum,
  level: 'simple' as const,
  saved: {
    answer: null,
    grading_state: 'PENDING',
    earned: null,
    revision: 0,
    feedback: null,
  },
});

const makeSession = (): BankSession => ({
  id: 'session-1',
  status: 'IN_PROGRESS',
  kind: 'CHAPTER',
  variant: 'A',
  revision: 0,
  questions: [question('q1', 'CHOICE', 50), question('q2', 'CALCULATION', 50)],
  earned: null,
  maximum: 100,
  passed: false,
  timed_out: false,
  answers_previously_revealed: false,
  rate: null,
  rateLabel: '得分率',
  deadline_at: new Date(Date.now() + 3600_000).toISOString(),
  serverTime: new Date().toISOString(),
  complete: false,
  submissionMode: 'SHEET_PHOTOS',
  sheetFiles: [],
  workerOnline: false,
  workerReason: '批改程序离线，提交后排队等待',
  started_at: new Date(Date.now() - 65_000).toISOString(),
});
let session: BankSession;
beforeEach(() => {
  session = makeSession();
  request.mockReset();
  pdf.mockReset();
  pdf.mockResolvedValue({ blob: new Blob(['pdf'], { type: 'application/pdf' }), pageCount: 2 });
  URL.createObjectURL = vi.fn(() => 'blob:sheet');
  URL.revokeObjectURL = vi.fn();
  request.mockImplementation(async (path: string, method: string, data: FormData) => {
    if (path.endsWith('/sheet-pages') && method === 'POST') {
      expect(data.get('expectedRevision')).toBe(String(session.revision));
      session.sheetFiles = [
        ...(session.sheetFiles ?? []),
        {
          id: `f${session.sheetFiles?.length ?? 0}`,
          name: (data.get('file') as File).name,
          mimeType: 'image/png',
        },
      ];
      session.revision += 1;
    }
    if (path.endsWith('/grading')) {
      session.status = 'PENDING';
      session.taskId = 'task-1';
    }
    return structuredClone(session);
  });
});
afterEach(cleanup);

const mount = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <SheetAssessment session={session} testId="session-1" code="00023" />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('章节检测 PDF 试卷与整卷照片批改', () => {
  it('以 PDF 样式展示全部题目，不显示逐题选择或答题框', async () => {
    mount();
    expect(
      screen.getAllByRole('heading', { name: '独立章节检测 A 卷', level: 1 }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('题干 q1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('题干 q2').length).toBeGreaterThan(0);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '试卷题号' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/已用时 1 分/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '提交整卷并申请AI批改' })).toBeDisabled();
  });

  it('生成包含全部题目的PDF并下载', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: '生成试卷PDF' }));
    await waitFor(() => expect(pdf).toHaveBeenCalledTimes(1));
    const sheet = pdf.mock.calls[0][0] as HTMLElement;
    expect(sheet.querySelectorAll('[data-exam-block]')).toHaveLength(3);
    expect(sheet).toHaveTextContent('题干 q2');
    expect(await screen.findByRole('link', { name: '下载PDF' })).toHaveAttribute(
      'download',
      '独立章节检测 A 卷.pdf',
    );
    expect(screen.getByText('已生成 2 页 PDF。')).toBeInTheDocument();
  });

  it('依次上传照片并使用最新版本号提交整卷', async () => {
    mount();
    const upload = screen.getByLabelText('上传整卷作答照片');
    fireEvent.change(upload, {
      target: {
        files: [
          new File(['1'], '1.png', { type: 'image/png' }),
          new File(['2'], '2.png', { type: 'image/png' }),
        ],
      },
    });
    await screen.findByText(/已保存2张照片/);
    expect(await screen.findByText('2 / 20 张')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '提交整卷并申请AI批改' }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith('/bank/sessions/session-1/grading', 'POST', {
        expectedRevision: 2,
      }),
    );
    expect(await screen.findByText(/已提交批改/)).toBeInTheDocument();
    expect(request.mock.calls.filter((c) => String(c[0]).endsWith('/sheet-pages'))).toHaveLength(2);
  });
});

describe('整卷批改结果', () => {
  it('人工复核中显示 AI 参考分与待核对题目', async () => {
    session = structuredClone(makeSession());
    session.status = 'NEEDS_REVIEW';
    session.sheetFiles = [{ id: 'f0', name: 'answers.png', mimeType: 'image/png' }];
    session.questions[0].saved = {
      answer: { fileIds: ['f0'] },
      grading_state: 'NEEDS_REVIEW',
      earned: null,
      revision: 2,
      feedback: '待核对',
      result_snapshot: {
        number: '1',
        recognizedAnswer: 'B',
        points: [{ pointId: 'answer', score: 50, reason: '选项正确' }],
        pages: [1],
        reviewItems: ['第1题字迹略浅'],
      },
    };
    session.questions[1].saved = {
      answer: { fileIds: ['f0'] },
      grading_state: 'GRADED',
      earned: 50,
      revision: 2,
      feedback: 'AI批改',
      result_snapshot: {
        number: '2',
        recognizedAnswer: '42',
        points: [
          { pointId: 'method', score: 25, reason: '方法正确' },
          { pointId: 'answer', score: 25, reason: '结果正确' },
        ],
        pages: [1],
        reviewItems: [],
      },
    };
    mount();
    expect(screen.getAllByText('AI 参考得分').length).toBeGreaterThan(0);
    expect(screen.getAllByText('待核对').length).toBeGreaterThan(0);
    expect(screen.getByText('第1题字迹略浅')).toBeInTheDocument();
    expect(screen.getAllByText('方法正确').length).toBeGreaterThan(0);
  });

  it('已评分时展示章节三套进度与最终得分', async () => {
    session = structuredClone(makeSession());
    session.status = 'GRADED';
    session.earned = 100;
    session.passed = true;
    session.chapterPassed = true;
    session.sheetFiles = [{ id: 'f0', name: 'answers.png', mimeType: 'image/png' }];
    session.questions[0].saved = {
      answer: { fileIds: ['f0'] },
      grading_state: 'GRADED',
      earned: 50,
      revision: 2,
      feedback: 'AI批改',
      result_snapshot: {
        number: '1',
        recognizedAnswer: 'B',
        points: [{ pointId: 'answer', score: 50, reason: '选项正确' }],
        pages: [1],
        reviewItems: [],
      },
    };
    session.questions[1].saved = {
      answer: { fileIds: ['f0'] },
      grading_state: 'GRADED',
      earned: 50,
      revision: 2,
      feedback: 'AI批改',
      result_snapshot: {
        number: '2',
        recognizedAnswer: '42',
        points: [
          { pointId: 'method', score: 25, reason: '方法正确' },
          { pointId: 'answer', score: 25, reason: '结果正确' },
        ],
        pages: [1],
        reviewItems: [],
      },
    };
    session.chapterProgress = {
      required: 3,
      submitted: 3,
      graded: 3,
      meanRate: 95,
      rateLabel: '平均得分率',
      meetsThreshold: true,
      papers: [
        { variant: 'A', status: 'GRADED', rate: 100 },
        { variant: 'B', status: 'GRADED', rate: 90 },
        { variant: 'C', status: 'GRADED', rate: 95 },
      ],
    };
    mount();
    expect(screen.getAllByText('本卷得分').length).toBeGreaterThan(0);
    expect(
      screen.getByText('本章三套检测已完成评分并取得本章通过资格。'),
    ).toBeInTheDocument();
    expect(screen.getByText(/已评分 3\/3/)).toBeInTheDocument();
    expect(screen.getByText('B 卷 · 90%')).toBeInTheDocument();
  });
});
