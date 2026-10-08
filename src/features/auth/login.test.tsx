import { expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderRoute } from '../../test/helpers';
import { server } from '../../mocks/server';

it('登录标题正确，空字段提示具体且聚焦第一个无效字段', async () => {
  renderRoute('/login');
  await screen.findByRole('heading', { name: '欢迎回来' });
  expect(document.title).toBe('登录 · 知途个人成长平台');
  const username = screen.getByLabelText('用户名或邮箱');
  const password = screen.getByLabelText('密码');
  await userEvent.click(screen.getByRole('button', { name: '登录' }));
  expect(username).toHaveFocus();
  expect(username).toHaveAccessibleDescription('请输入用户名或邮箱。');
  expect(password).toHaveAccessibleDescription('请输入密码。');
  await userEvent.type(username, 'learner');
  await userEvent.click(screen.getByRole('button', { name: '登录' }));
  expect(password).toHaveFocus();
  expect(username).toHaveAttribute('aria-invalid', 'false');
});

it('Enter 可提交，失败保留输入，pending 时多次提交仅发一个请求', async () => {
  let finish!: () => void;
  const held = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const request = vi.fn();
  server.use(
    http.post('/api/v1/auth/login', async () => {
      request();
      await held;
      return HttpResponse.json(
        { code: 40101, message: '用户名、邮箱或密码不正确', data: null },
        { status: 401 },
      );
    }),
  );
  renderRoute('/login');
  await screen.findByRole('heading', { name: '欢迎回来' });
  const username = screen.getByLabelText('用户名或邮箱');
  const password = screen.getByLabelText('密码');
  await userEvent.type(username, 'learner');
  await userEvent.type(password, 'invalid{Enter}');
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('button', { name: '正在登录…' })).toBeDisabled();
  expect(username).toBeDisabled();
  const form = username.closest('form')!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  finish();
  await waitFor(() =>
    expect(screen.getByRole('alert', { name: '' })).toHaveTextContent('用户名、邮箱或密码不正确'),
  );
  expect(request).toHaveBeenCalledTimes(1);
  expect(username).toHaveValue('learner');
  expect(password).toHaveValue('invalid');
  expect(screen.getByRole('button', { name: '登录' })).toBeEnabled();
});

it('成功登录完整保留原深链接的查询参数和锚点', async () => {
  const target = '/health?source=login-check#service';
  const { router } = renderRoute(`/login?${new URLSearchParams({ redirect: target })}`);
  await screen.findByRole('heading', { name: '欢迎回来' });
  await userEvent.click(screen.getByRole('button', { name: '使用演示账号' }));
  await screen.findByRole('heading', { name: '工程健康检查' });
  expect(
    router.state.location.pathname + router.state.location.search + router.state.location.hash,
  ).toBe(target);
});
