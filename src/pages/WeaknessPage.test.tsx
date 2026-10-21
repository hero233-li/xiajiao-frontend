import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Component } from './WeaknessPage';
import { bankRequest } from '../api/bank';
import type { WeaknessPlan, WeaknessQuestion } from '../api/bank';

vi.mock('../api/bank', () => ({ bankRequest: vi.fn() }));
vi.mock('../features/course/CourseContext', () => ({ useCourse: () => ({ id: 'course' }) }));
const question = (id: string, earned?: number): WeaknessQuestion => ({
  id, type: 'CHOICE', stem: `题目 ${id}`, options: ['选项甲', '选项乙'],
  maximum: 3, level: 'simple', point_title: '测试知识点',
  solution: { correctOption: 1 }, explanation: '由条件代入计算。',
  ...(earned === undefined ? {} : { saved: {
    grading_state: 'GRADED', earned, maximum: 3, revision: 1,
    answer: { selectedOption: earned === 3 ? 1 : 0 },
    feedback: `AI批改：${earned}/3`, result_snapshot: { recognizedAnswer: earned === 3 ? 'B' : 'A' },
  } }),
});
function setup(overrides: Partial<WeaknessPlan> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(['weakness-plan', 'course', ''], {
    id: 'plan', status: 'DRILL', revision: 1, paperTitle: '第一章 A 卷',
    sourceSessionId: 'source', sourcePaper: 'paper', kind: 'CHAPTER', completed: false,
    sourceScore: 60, sourceMaximum: 100, weakPoints: [], analysis: [],
    example: { question_id: 'example', type: 'CHOICE', stem: '例题', options: [], solution: {}, explanation: '', maximum: 3, earned: 0, answer: null, unanswered: true, point_key: 'point', pointTitle: '测试知识点' },
    drill: [question('correct', 3), question('wrong', 0), question('new')],
    drillCorrect: 1, drillTotal: 3, redoUnlocked: false, redo: [], redoCorrect: 0, redoTotal: 2,
    ...overrides,
  } satisfies WeaknessPlan);
  render(<QueryClientProvider client={client}><MemoryRouter><Component /></MemoryRouter></QueryClientProvider>);
  return client;
}
describe('弱项练习复习流程', () => {
  it('筛选待巩固时保留错题与未提交题，已答对筛选只显示满分题', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: '待巩固 2' }));
    expect(screen.queryByText('题目 correct')).not.toBeInTheDocument();
    expect(screen.getByText('题目 wrong')).toBeInTheDocument();
    expect(screen.getByText('题目 new')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '已答对 1' }));
    expect(screen.getByText('题目 correct')).toBeInTheDocument();
    expect(screen.queryByText('题目 wrong')).not.toBeInTheDocument();
  });
  it('已批改题展示识别结果和得分，正确选项带标记，不再重复作答说明和分数反馈', () => {
    setup();
    const card = screen.getByText('题目 wrong').closest('article')!;
    expect(within(card).getByText('本次作答 · AI 识别')).toBeInTheDocument();
    expect(within(card).getByText('本题得分')).toBeInTheDocument();
    expect(within(card).getByText('正确答案')).toBeInTheDocument();
    expect(within(card).queryByText('AI批改：0/3')).not.toBeInTheDocument();
    expect(screen.queryByText(/这题在整组照片中作答/)).not.toBeInTheDocument();
    expect(within(card).getByText('解题思路与易错提醒')).toBeInTheDocument();
  });
  it('题号定位可退出筛选并滚动到目标题', async () => {
    setup();
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { setTimeout(() => cb(0), 0); return 1; });
    fireEvent.click(screen.getByRole('button', { name: '已答对 1' }));
    fireEvent.click(screen.getByRole('button', { name: '定位阶梯练习第 2 题，待巩固' }));
    expect(screen.getByText('题目 wrong')).toBeInTheDocument();
    await vi.waitFor(() => expect(scroll).toHaveBeenCalled());
    vi.restoreAllMocks();
  });
  it('已批改照片只读，不再显示提交按钮；保留重新作答上传入口', () => {
    setup({ taskState: 'COMPLETED', canSubmitSheet: false, submittedSheetFileIds: ['old'], sheetFiles: [{ id: 'old', name: 'old.png', mimeType: 'image/png' }] });
    expect(screen.getByText('本组批改已完成')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '提交 AI 批改' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '移除 old.png' })).not.toBeInTheDocument();
    expect(screen.getByText('重新作答并上传')).toBeInTheDocument();
  });
  it('上传新作答后允许提交，并可删除尚未提交的新照片', () => {
    setup({ taskState: 'COMPLETED', canSubmitSheet: true, submittedSheetFileIds: ['old'], sheetFiles: [{ id: 'new', name: 'new.png', mimeType: 'image/png' }] });
    expect(screen.getByRole('button', { name: '提交新作答批改' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '移除 new.png' })).toBeEnabled();
  });
  it('生成中不能重复申请或提交批改', () => {
    setup({ generationState: 'GRADING', canSubmitSheet: false, sheetFiles: [{ id: 'new', name: 'new.png', mimeType: 'image/png' }] });
    expect(screen.getByRole('button', { name: /正在生成阶梯题/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: '提交 AI 批改' })).toBeDisabled();
  });
  it('申请新题提交当前版本并进入生成等待状态', async () => {
    const client = setup();
    vi.mocked(bankRequest).mockResolvedValueOnce({ ...client.getQueryData<WeaknessPlan>(['weakness-plan', 'course', '']), generationState: 'QUEUED' });
    fireEvent.click(screen.getByRole('button', { name: '申请新的 10 道阶梯题' }));
    await vi.waitFor(() => expect(bankRequest).toHaveBeenCalledWith('/bank/weakness/plans/plan/drill-generation', 'POST', { expectedRevision: 1 }));
    expect(await screen.findByRole('button', { name: /正在生成阶梯题/ })).toBeDisabled();
  });

});
