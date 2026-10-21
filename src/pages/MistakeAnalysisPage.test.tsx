import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Component } from './MistakeAnalysisPage';
vi.mock('../features/knowledge-analysis/KnowledgeAnalysis', () => ({
  KnowledgeAnalysis: ({ global }: { global?: boolean }) => (
    <h1>{global ? '跨课程知识点梳理' : '课程知识点梳理'}</h1>
  ),
}));
it('reuses the shared feature in cross-course mode instead of the old placeholder', () => {
  render(<Component />);
  expect(screen.getByRole('heading', { name: '跨课程知识点梳理' })).toBeVisible();
  expect(screen.queryByText('暂无批改记录')).not.toBeInTheDocument();
  expect(document.querySelector('input[type=file]')).toBeNull();
});
