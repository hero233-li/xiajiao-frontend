import { expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { Operations } from './Operations';
import { Fields } from './Fields';
import { useState } from 'react';
import type { Row } from './api';
const envelope = (data: unknown) => HttpResponse.json({ code: 0, message: 'ok', data });
it('paper list supplies its required cycle and edits retain file metadata IDs and optional fields', async () => {
  let readCycle = '';
  let saved: Row | undefined;
  server.use(
    http.get('/api/v1/exams/courses/course/papers', ({ request }) => {
      readCycle = new URL(request.url).searchParams.get('cycleId') ?? '';
      return envelope({
        items: [
          {
            id: 'paper',
            paperMonth: '2026-04',
            questionFile: { id: 'file', name: '试卷.pdf' },
            answerFile: null,
            questionPages: 3,
            answerPages: null,
            note: '原备注',
            sourceCourseCode: null,
          },
        ],
        page: 1,
        size: 20,
        total: 1,
      });
    }),
    http.get('/api/v1/admin/files', () =>
      envelope({
        items: [{ id: 'file', name: '试卷.pdf', purpose: 'PAPER', state: 'ACTIVE' }],
        page: 1,
        size: 100,
        total: 1,
      }),
    ),
    http.put('/api/v1/admin/exams/courses/course/papers/paper', async ({ request }) => {
      saved = (await request.json()) as Row;
      return envelope({});
    }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Operations
        mode="papers"
        courseId="course"
        cycleId="cycle"
        courses={[]}
        directory={[]}
        cycles={[]}
        setDirty={vi.fn()}
      />
    </QueryClientProvider>,
  );
  await screen.findByText('2026-04');
  expect(readCycle).toBe('cycle');
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: '编辑' }));
  expect(screen.getByLabelText('题目文件')).toHaveValue('file');
  await user.clear(screen.getByLabelText('试卷年月'));
  await user.type(screen.getByLabelText('试卷年月'), '2025-10');
  await user.click(screen.getByRole('button', { name: '确认提交' }));
  await waitFor(() =>
    expect(saved).toEqual({
      paperMonth: '2025-10',
      sourceCourseCode: null,
      questionFileId: 'file',
      answerFileId: null,
      questionPages: 3,
      answerPages: null,
      note: '原备注',
    }),
  );
});
it('new array records open for editing and native dates retain full YYYY-MM-DD values', async () => {
  function Editor() {
    const [value, setValue] = useState<Row>({
      name: '',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      courses: [],
    });
    return (
      <>
        <Fields
          name="CycleWrite"
          value={value}
          onChange={(v) => setValue(v as Row)}
          choices={{ courseId: [{ value: 'course', label: '现有课程' }] }}
        />
        <output>{JSON.stringify(value)}</output>
      </>
    );
  }
  render(<Editor />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: '新增考试安排' }));
  expect(screen.getByLabelText('课程')).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('课程'), 'course');
  expect(screen.getByRole('status')).toHaveTextContent('"courseId":"course"');
  expect(screen.getByLabelText('开始日期')).toHaveValue('2026-10-01');
  fireEvent.input(screen.getByLabelText('开始日期'), { target: { value: '2026-09-30' } });
  expect(screen.getByRole('status')).toHaveTextContent('"startDate":"2026-09-30"');
});
