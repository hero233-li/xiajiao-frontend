import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import operations from '../mocks/generated.json';
import { Component as PaperPreviewPage } from './PaperPreviewPage';

const file = operations.find((op) => op.operationId === 'downloadPaper')!.example.data;
const ok = (data: unknown) => HttpResponse.json({ code: 0, data, message: 'ok' });

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:paper');
  URL.revokeObjectURL = vi.fn();
});

function mount(search = '?courseId=course-1&part=QUESTION&month=2025-04&code=00023') {
  render(
    <MemoryRouter initialEntries={[`/study/paper-preview/paper-1${search}`]}>
      <Routes>
        <Route path="/study/paper-preview/:paperId" element={<PaperPreviewPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

it('在新页面内嵌展示试卷 PDF，并提供原文件下载', async () => {
  server.use(
    http.get('*/api/v1/exams/courses/:courseId/papers/:paperId/file', () => ok(file)),
  );
  mount();
  expect(await screen.findByRole('heading', { name: '2025-04 题目预览' })).toBeVisible();
  const frame = await screen.findByTitle('2025-04 题目预览');
  expect(frame.tagName).toBe('IFRAME');
  expect(frame).toHaveAttribute('src', 'blob:paper');
  expect(screen.getByRole('button', { name: /下载原文件/ })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '← 返回真题列表' })).toHaveAttribute(
    'href',
    '/study/course/00023/exams',
  );
  expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
  expect(blob.type).toBe('application/pdf');
});

it('读取失败时给出可理解的提示，而不是空白页', async () => {
  server.use(
    http.get('*/api/v1/exams/courses/:courseId/papers/:paperId/file', () =>
      HttpResponse.json({ code: 40301, data: null, message: '未解锁，禁止下载' }, { status: 403 }),
    ),
  );
  mount('?courseId=course-1&part=ANSWER&month=2025-04&code=00023');
  expect(await screen.findByRole('alert')).toHaveTextContent('未解锁，禁止下载');
  await waitFor(() => expect(screen.queryByTitle('2025-04 答案预览')).not.toBeInTheDocument());
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

it('缺少courseId时提示重新打开', async () => {
  mount('?part=QUESTION');
  expect(await screen.findByRole('alert')).toHaveTextContent('缺少试卷信息');
});
