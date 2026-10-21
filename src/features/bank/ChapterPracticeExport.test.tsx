import { Blob as NodeBlob } from 'node:buffer';
import { writeFileSync } from 'node:fs';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { BankChapter } from '../../api/bank';
import { ChapterPracticeExport } from './ChapterPracticeExport';
const request = vi.hoisted(() => vi.fn());
const pdf = vi.hoisted(() => vi.fn());
const printPdf = vi.hoisted(() => vi.fn());
const syncPdf = vi.hoisted(() => vi.fn());
vi.mock('../../api/bank', () => ({ bankRequest: request }));
vi.mock('./practiceSheetPdf', () => ({ practiceSheetPdf: pdf }));
vi.mock('../printing/practicePrintPdf', () => ({ practicePrintPdf: printPdf }));
vi.mock('../printing/printApi', () => ({ syncPrintPdf: syncPdf }));
vi.mock('../course/CourseContext',()=>({useCourse:()=>({id:'course',code:'00023'})}));
vi.mock('../cycle/navigation', () => ({ Link: ({ children,to }: { children: React.ReactNode;to:string }) => <a href={to}>{children}</a> }));
vi.mock('./QuestionStem', () => ({ QuestionStem: ({ text }: { text: string }) => <p>{text}</p> }));
const chapter = { chapter_id: 'chapter', title: '第一章', points: [
  { point_key: 'p1', title: '考点一', levels: { simple: { available: 10 } } },
  { point_key: 'p2', title: '考点二', levels: { simple: { available: 10 } } },
] } as BankChapter;
const makeQuestions = (title: string) => Array.from({ length: 10 }, (_, i) => ({ id: title + i, stem: title + i, options: [], maximum: 10, solution: { referenceAnswer: '答案不得导出' } }));
beforeEach(() => {
  vi.stubGlobal('Blob', NodeBlob);
  URL.createObjectURL = vi.fn(() => 'blob:zip');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  request.mockReset(); pdf.mockReset(); printPdf.mockReset(); syncPdf.mockReset();
  printPdf.mockImplementation(async (node: HTMLElement) => {
    expect(node.textContent).not.toContain('答案不得导出');
    expect(node.querySelectorAll('.print-pdf-pair')).toHaveLength(5);
    return new NodeBlob(['%PDF-print\n' + node.querySelector('h1')!.textContent]);
  });
  request.mockImplementation(async (path: string) => makeQuestions(new URLSearchParams(path.split('?')[1]).get('pointKey')!));
  pdf.mockImplementation(async (node: HTMLElement) => {
    expect(node.textContent).not.toContain('答案不得导出');
    return { blob: new NodeBlob(['%PDF-1.4\n' + node.querySelector('h1')!.textContent]), imageUrl: '' };
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('exports one PDF per point into a UTF-8 ZIP using only the selected chapter and level', async () => {
  render(<ChapterPracticeExport courseId="course" chapter={chapter} level="simple" enabled />);
  expect(pdf).not.toHaveBeenCalled();
  expect(printPdf).not.toHaveBeenCalled();
  expect(screen.getByRole('link',{name:'查看打印功能区'})).toHaveAttribute('href','/study/course/00023/printing');
  fireEvent.click(screen.getByRole('button', { name: '导出本章当前难度练习题 ZIP' }));
  await screen.findByRole('link', { name: '下载考点 PDF 压缩包' });
  expect(pdf).toHaveBeenCalledTimes(2);
  expect(printPdf).not.toHaveBeenCalled();
  expect(syncPdf).not.toHaveBeenCalled();
  expect(request.mock.calls.map(([path]) => new URLSearchParams(path.split('?')[1]).get('pointKey'))).toEqual(['p1', 'p2']);
  for (const [path] of request.mock.calls) expect(path).toContain('chapterId=chapter&pointKey=');
  const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  expect([...bytes.slice(0, 4)]).toEqual([80, 75, 3, 4]);
  writeFileSync('/private/tmp/chapter-practice-export-test.zip', bytes);
  expect(screen.getByRole('link', { name: '下载考点 PDF 压缩包' })).toHaveAttribute('download', '第一章-simple-各考点练习题.zip');
});
it('syncs one A4 PDF per point without generating the ZIP format', async () => {
  render(<ChapterPracticeExport courseId="course" chapter={chapter} level="simple" enabled />);
  fireEvent.click(screen.getByRole('button', { name: '打印同步' }));
  await screen.findByText('已同步 2 份独立A4打印版。重复同步不会新增相同文件。');
  expect(printPdf).toHaveBeenCalledTimes(2);
  expect(pdf).not.toHaveBeenCalled();
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(syncPdf.mock.calls.map((call) => call.slice(1, 6))).toEqual([
    ['course', '第一章', '考点一', 'simple', 'p1'],
    ['course', '第一章', '考点二', 'simple', 'p2'],
  ]);
  expect(syncPdf.mock.calls.every(([blob]) => blob instanceof NodeBlob)).toBe(true);
  for (const call of syncPdf.mock.calls) expect(call[6]).toHaveLength(10);
});
it('reports an error instead of downloading an incomplete ZIP', async () => {
  request.mockRejectedValueOnce(new Error('题库读取失败'));
  render(<ChapterPracticeExport courseId="course" chapter={chapter} level="simple" enabled />);
  expect(screen.getByRole('link',{name:'查看打印功能区'})).toHaveAttribute('href','/study/course/00023/printing');
  fireEvent.click(screen.getByRole('button', { name: '导出本章当前难度练习题 ZIP' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('题库读取失败'));
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
