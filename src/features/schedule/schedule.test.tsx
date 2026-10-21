import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { SchedulePage } from '../../pages/SchedulePage';
describe('移除自考计划后的旧链接', () => {
  it('旧计划与编辑链接跳转到今日倒计时，不再显示计划表单', async () => {
    const router = createMemoryRouter([
      { path: '/study/schedule', element: <SchedulePage /> },
      { path: '/study', element: <h1>考试倒计时</h1> },
    ], { initialEntries: ['/study/schedule?create=1&planId=old-plan'] });
    render(<RouterProvider router={router} />);
    expect(await screen.findByRole('heading', { name: '考试倒计时' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/study');
    expect(router.state.location.search).toBe('');
    expect(screen.queryByRole('button', { name: '建立学习计划' })).toBeNull();
  });
});
