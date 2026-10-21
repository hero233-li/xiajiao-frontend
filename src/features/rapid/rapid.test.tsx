import { expect, it, vi } from 'vitest';
vi.mock('./RapidPhotoPanel', () => ({ RapidPhotoPanel: () => <p>上传手写作答图片批改</p> }));
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext, type AuthState } from '../auth/AuthProvider';
import { Component } from '../../pages/RapidPage';
import { spaceModules } from '../../spaces/registry';
const auth = (id: string): AuthState => ({
  status: 'authenticated',
  user: { id, username: id, email: '', role: 'USER' },
  signIn: async () => {},
  signOut: async () => {},
});
it('入口位于今日之前，诊断与独立题没有答案，使用图片上传而非填空', async () => {
  expect(spaceModules.find((m) => m.id === 'study')?.navigation.slice(0, 2)).toEqual([
    ['/study/rapid', '速刷提升'],
    ['/study', '今日'],
  ]);
  localStorage.clear();
  const u = userEvent.setup();
  const v = render(
    <AuthContext.Provider value={auth('one')}>
      <Component />
    </AuthContext.Provider>,
  );
  await u.click(screen.getByRole('tab', { name: '四科短诊断' }));
  expect(screen.queryByText(/z_x=2xy/)).toBeNull();
  expect(screen.queryByLabelText('作答草稿')).toBeNull();
  expect(screen.getByText('上传手写作答图片批改')).toBeInTheDocument();
  await u.click(screen.getByRole('tab', { name: '独立练习' }));
  expect(screen.queryByText(/k=21或/)).toBeNull();
  expect(screen.queryByText('方法卡（独立题前盖住）')).toBeNull();
});
