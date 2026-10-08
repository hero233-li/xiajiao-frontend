import { it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderRoute, startDemoSession } from '../test/helpers';
import { sessionStore } from '../api/session';
import { server } from '../mocks/server';
const protectedPaths = [
  '/',
  '/study',
  '/study/courses',
  '/study/schedule',
  '/study/notes',
  ...['catalog', 'knowledge', 'practice', 'exams', 'notes', 'manual'].map(
    (pane) => `/study/course/00023/${pane}`,
  ),
  '/study/course/00023/practice/9d632f9c-4bc7-4ab7-a725-f307df14a92e',
  '/study/course/00023/tests/8375a115-2386-4c89-b9c1-45b61ef58349',
  '/admin/example',
  '/health',
];
it.each(protectedPaths)('未登录路由 %s 携带原地址跳转登录', async (path) => {
  const { router } = renderRoute(`${path}?cycleId=example#anchor`);
  await screen.findByRole('heading', { name: '欢迎回来' });
  expect(router.state.location.pathname).toBe('/login');
  expect(new URLSearchParams(router.state.location.search).get('redirect')).toBe(
    `${path}?cycleId=example#anchor`,
  );
});
it('登录后回到稳定章节ID深链接', async () => {
  server.use(
    http.get('/api/v1/exams/cycles', () =>
      HttpResponse.json({
        code: 0,
        message: 'ok',
        data: {
          items: [
            {
              id: 'example',
              name: '测试周期',
              startDate: '2026-10-01',
              endDate: '2026-10-31',
              timezone: 'Asia/Shanghai',
              courses: [],
            },
          ],
          page: 1,
          size: 100,
          total: 1,
        },
      }),
    ),
  );
  const path = '/study/course/00023/practice/b8816b55-e24a-5653-b1af-5c962d1b54f1#anchor';
  const { router } = renderRoute(path);
  await screen.findByRole('heading', { name: '欢迎回来' });
  await userEvent.click(screen.getByRole('button', { name: '使用演示账号' }));
  await screen.findByRole('link', { name: '← 返回考点与进度' });
  expect(screen.getByText(/函数与极限 · simple/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '当前练习尚未开放' })).toBeInTheDocument();
  expect(
    router.state.location.pathname + router.state.location.search + router.state.location.hash,
  ).toBe(path);
});
it('未知地址无需登录即可显示404', async () => {
  renderRoute('/does-not-exist');
  expect(await screen.findByRole('heading', { name: '页面未找到' })).toBeInTheDocument();
});
it('普通用户无法访问管理入口', async () => {
  const session = await startDemoSession();
  sessionStore.start({ ...session, user: { ...session.user, role: 'USER' } });
  renderRoute('/admin/content');
  expect(await screen.findByText('当前账号没有管理员权限。')).toBeInTheDocument();
});
it('管理员可以访问真实管理工作台', async () => {
  await startDemoSession();
  renderRoute('/admin/content');
  expect(await screen.findByRole('heading', { name: '内容发布' })).toBeInTheDocument();
});
it('刷新失败后跳转登录并保留原地址', async () => {
  await startDemoSession();
  server.use(
    http.get('/api/v1/health', () =>
      HttpResponse.json({ code: 40101, data: null, message: '令牌失效' }, { status: 401 }),
    ),
    http.post('/api/v1/auth/refresh', () =>
      HttpResponse.json({ code: 40101, data: null, message: '刷新失效' }, { status: 401 }),
    ),
  );
  const { router } = renderRoute('/health?source=example#check');
  await screen.findByRole('heading', { name: '欢迎回来' });
  expect(new URLSearchParams(router.state.location.search).get('redirect')).toBe(
    '/health?source=example#check',
  );
});
it('登录失败保持原地址并显示中文错误', async () => {
  const { router } = renderRoute('/login?redirect=%2Fhealth');
  await screen.findByRole('heading', { name: '欢迎回来' });
  await userEvent.type(screen.getByLabelText('用户名或邮箱'), 'wrong');
  await userEvent.type(screen.getByLabelText('密码'), 'wrong');
  await userEvent.click(screen.getByRole('button', { name: '登录' }));
  await waitFor(() =>
    expect(
      screen
        .getAllByRole('alert')
        .some((el) => el.textContent?.includes('用户名、邮箱或密码不正确')),
    ).toBe(true),
  );
  expect(router.state.location.pathname).toBe('/login');
});
