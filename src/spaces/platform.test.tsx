import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { moduleFor, personalSpaces, spaceModules, switchTarget } from './registry';
import { testDirectory, testModule } from './testing';
import { ActionDesk } from '../features/platform/ActionDesk';
import { SpaceSwitcher } from '../features/platform/SpaceSwitcher';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'test-user' } }) }));
const original = [...spaceModules];
afterEach(() => spaceModules.splice(0, spaceModules.length, ...original));
function mount(element: React.ReactNode) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RouterProvider router={createMemoryRouter([{ path: '*', element }])} />
    </QueryClientProvider>,
  );
}
describe('可扩展平台契约', () => {
  it.each([2, 6, 12] as const)('%s 个空间通过统一注册排序，切换面板可搜索', (count) => {
    const d = testDirectory(count);
    for (const s of d.spaces.slice(2)) spaceModules.push(testModule(s.id));
    expect(personalSpaces(d)).toHaveLength(count);
    d.preferences[0].hidden = true;
    expect(personalSpaces(d)).toHaveLength(count - 1);
    expect(personalSpaces(d, true)).toHaveLength(count);
    d.preferences[1].position = 0;
    expect(personalSpaces(d)[0].space.id).toBe('fitness');
    mount(<SpaceSwitcher directory={d} close={() => {}} />);
    expect(screen.getByRole('searchbox')).toBeVisible();
    expect(screen.getByRole('link', { name: '查看完整空间目录' })).toBeVisible();
  });
  it('新测试模块只需注册便出现在首页摘要，不改平台首页和导航', async () => {
    const module = testModule('test-growth');
    spaceModules.splice(0, spaceModules.length, module);
    const d = testDirectory(2);
    d.spaces = d.spaces
      .slice(0, 1)
      .map((s) => ({ ...s, id: module.id, name: '测试成长（仅验收）', entry: module.entry }));
    d.preferences = d.preferences.slice(0, 1).map((p) => ({ ...p, spaceId: module.id }));
    mount(<ActionDesk directory={d} />);
    expect(await screen.findByText('测试模块，没有模拟任务或进度')).toBeVisible();
    expect(screen.getByRole('link', { name: '进入空间' })).toHaveAttribute('href', '/test-growth');
    expect(moduleFor(module.id)?.navigation).toEqual([['/test-growth', '测试首页']]);
  });
  it('自学摘要失败不阻止健身任务与真实链接', async () => {
    server.use(
      http.get('/api/v1/personal/study-summary', () =>
        HttpResponse.json({ message: '学习暂不可用' }, { status: 503 }),
      ),
      http.get('/api/v1/fitness/summary', () =>
        HttpResponse.json({
          code: 0,
          message: 'ok',
          data: { today: '2026-10-07', streak: 2, latestWeight: null },
        }),
      ),
      http.get('/api/v1/fitness/days/:date', () =>
        HttpResponse.json({
          code: 0,
          message: 'ok',
          data: {
            checkedIn: false,
            trainingState: 'PENDING',
            records: { 'training-plan': { data: { rest: false, exercises: [{ name: '散步' }] } } },
          },
        }),
      ),
    );
    mount(<ActionDesk directory={testDirectory(2)} />);
    expect(await screen.findByRole('button', { name: '重试自学摘要' })).toBeVisible();
    expect(await screen.findByRole('link', { name: /今日训练/ })).toHaveAttribute(
      'href',
      '/fitness?date=2026-10-07',
    );
  });
  it('未上线空间没有个人入口；恢复位置保留日期并排除编辑草稿', () => {
    const d = testDirectory(2);
    d.spaces[0].status = 'COMING_SOON';
    expect(personalSpaces(d)).toHaveLength(1);
    const s = d.spaces[1];
    const p = { ...d.preferences[1], lastPath: '/fitness/weight?date=2026-10-01' };
    expect(switchTarget(s, p)).toBe(p.lastPath);
    expect(switchTarget(s, { ...p, lastPath: '/fitness/edit/training?date=2026-10-01' })).toBe(
      '/fitness',
    );
    expect(switchTarget(s, { ...p, lastPath: 'https://example.com' })).toBe('/fitness');
  });
});
