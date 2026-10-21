import { render, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GenerationProgress } from './GenerationProgress';
import type { WeaknessPlan } from '../../api/bank';
const plan = (data: Partial<WeaknessPlan>) => data as WeaknessPlan;
afterEach(() => vi.useRealTimers());
describe('阶梯题生成进度', () => {
  it('显示真实排队状态与离线提示', () => {
    render(<GenerationProgress plan={plan({ generationState: 'QUEUED', workerOnline: false })} />);
    expect(screen.getByRole('status')).toHaveTextContent('正在等待处理');
    expect(screen.getByText(/生成程序暂未在线/)).toBeInTheDocument();
    expect(screen.getByText('等待处理').closest('li')).toHaveAttribute('aria-current', 'step');
  });
  it('跟随后端更新到生成与校验阶段', () => {
    const { rerender } = render(<GenerationProgress plan={plan({ generationState: 'GRADING', generationProgress: { stage: 'GENERATING', updatedAt: '' } })} />);
    expect(screen.getByText('AI 生成题目').closest('li')).toHaveAttribute('aria-current', 'step');
    rerender(<GenerationProgress plan={plan({ generationState: 'GRADING', generationProgress: { stage: 'VALIDATING', updatedAt: '' } })} />);
    expect(screen.getByText('校验并保存').closest('li')).toHaveAttribute('aria-current', 'step');
  });
  it('等待时间按申请时间持续更新', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-19T12:00:10Z'));
    render(<GenerationProgress plan={plan({ generationState: 'GRADING', generationCreatedAt: '2026-10-19T12:00:00Z' })} />);
    expect(screen.getByText('已等待 10 秒')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText('已等待 15 秒')).toBeInTheDocument();
  });
  it('完成后显示新组号与成功状态，失败时保留原因', () => {
    const { rerender } = render(<GenerationProgress plan={plan({ generationState: 'COMPLETED', drillRound: 3 })} />);
    expect(screen.getByRole('status')).toHaveTextContent('第 3 组阶梯题已生成');
    rerender(<GenerationProgress plan={plan({ generationState: 'FAILED', generationError: '连接中断' })} />);
    expect(screen.getByText(/连接中断.*可重新申请/)).toBeInTheDocument();
  });
});

describe('阶梯题批改进度', () => {
  it('显示排队、逐题批改和核验阶段', () => {
    const { rerender } = render(<GenerationProgress mode="grading" plan={plan({ taskState: 'QUEUED', workerOnline: false })} />);
    expect(screen.getByRole('status')).toHaveTextContent('正在等待批改');
    expect(screen.getByText(/批改程序暂未在线/)).toBeInTheDocument();
    rerender(<GenerationProgress mode="grading" plan={plan({ taskState: 'GRADING', gradingProgress: { stage: 'GRADING', updatedAt: '' } })} />);
    expect(screen.getByText('AI 逐题批改').closest('li')).toHaveAttribute('aria-current', 'step');
    rerender(<GenerationProgress mode="grading" plan={plan({ taskState: 'GRADING', gradingProgress: { stage: 'VALIDATING', updatedAt: '' } })} />);
    expect(screen.getByText('核验并保存').closest('li')).toHaveAttribute('aria-current', 'step');
  });
  it('批改计时使用批改申请时间，独立于生成时间', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-19T12:00:10Z'));
    render(<GenerationProgress mode="grading" plan={plan({ taskState: 'GRADING', gradingCreatedAt: '2026-10-19T12:00:00Z', generationCreatedAt: '2026-10-18T12:00:00Z' })} />);
    expect(screen.getByText('已等待 10 秒')).toBeInTheDocument();
  });
  it('完成后显示真实答对数，需核对时明确提示', () => {
    const { rerender } = render(<GenerationProgress mode="grading" plan={plan({ taskState: 'COMPLETED', drillCorrect: 4, drillTotal: 10 })} />);
    expect(screen.getByText(/本组 4\/10 道已答对/)).toBeInTheDocument();
    rerender(<GenerationProgress mode="grading" plan={plan({ taskState: 'REVIEW' })} />);
    expect(screen.getByRole('status')).toHaveTextContent('部分题目待核对');
  });
});
