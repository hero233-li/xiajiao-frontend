import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../mocks/server';
import { Component as Home } from '../pages/PersonalPage';
import { useFitnessDay, useFitnessHistory, localToday, type Day } from '../api/fitness';
import { QuickRecords } from './fitness/QuickRecords';
import { FitnessEditPage } from './fitness/EditPage';
import { ConfirmationProvider } from '../components/ConfirmationProvider';
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { username: '验收', role: 'ADMIN' } }),
}));
const ok = (data: unknown) => HttpResponse.json({ code: 0, message: '成功', data });
const emptyNutrition = {
  kcal: { knownTotal: null, complete: false, knownCount: 0, foodCount: 0 },
  protein: { knownTotal: null, complete: false, knownCount: 0, foodCount: 0 },
  carbs: { knownTotal: null, complete: false, knownCount: 0, foodCount: 0 },
  fat: { knownTotal: null, complete: false, knownCount: 0, foodCount: 0 },
};
const day: Day = {
  date: localToday(),
  records: {},
  checkedIn: false,
  rest: false,
  partial: false,
  state: 'EMPTY',
  trainingState: 'UNPLANNED',
  nutrition: emptyNutrition,
  plannedNutrition: emptyNutrition,
};
function mount(element: React.ReactNode, url = '/') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [{ path: '*', element: <ConfirmationProvider>{element}</ConfirmationProvider> }],
    { initialEntries: [url] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { client, router };
}
function Daily() {
  const query = useFitnessDay(day.date);
  const history = useFitnessHistory(day.date, day.date);
  return (
    <>
      {history.error && <p>历史暂不可用</p>}
      {query.data && <QuickRecords day={query.data} />}
    </>
  );
}
describe('重构后的核心任务路径', () => {
  it('首页使用后端具体目标，而不是空间首页', async () => {
    server.use(
      http.get('/api/v1/personal/summary', () =>
        ok({
          today: day.date,
          study: {
            title: '集合基础',
            message: '今天待学习',
            target: {
              courseCode: '00023',
              pane: 'CATALOG',
              chapterId: 'chapter-real',
              itemId: 'item-real',
            },
          },
          fitness: { streak: 0 },
          fitnessToday: { checkedIn: false, rest: false, partial: false },
        }),
      ),
    );
    mount(<Home />);
    const link = await screen.findByRole('link', { name: '开始这一项' });
    expect(link.getAttribute('href')).toContain('/study/course/00023/catalog');
    expect(link.getAttribute('href')).toContain('itemId=item-real');
  });
  it('首页无安排提供直接配置入口', async () => {
    server.use(
      http.get('/api/v1/personal/summary', () =>
        ok({
          today: day.date,
          study: { title: '今日学习', message: '暂无今日安排', target: null },
          fitness: { streak: 0 },
          fitnessToday: { checkedIn: false, rest: false, partial: false },
        }),
      ),
    );
    mount(<Home />);
    expect(await screen.findByRole('link', { name: '安排学习' })).toHaveAttribute(
      'href',
      '/study/schedule?create=1',
    );
    expect(screen.queryByRole('link', { name: '开始这一项' })).not.toBeInTheDocument();
  });
  it('历史失败时体重仍可保存，携带修订号并读回真实响应', async () => {
    let current = structuredClone(day);
    let write: unknown;
    server.use(
      http.get('/api/v1/fitness/history', () =>
        HttpResponse.json({ message: '历史服务失败' }, { status: 503 }),
      ),
      http.get('/api/v1/fitness/days/:date', () => ok(current)),
      http.put('/api/v1/fitness/records/weight/:date', async ({ request }) => {
        write = await request.json();
        current = {
          ...current,
          records: {
            weight: { kind: 'weight', key: day.date, revision: 1, data: { kg: 72.3, note: null } },
          },
        };
        return ok(current.records.weight);
      }),
    );
    mount(<Daily />);
    await screen.findByText('历史暂不可用');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('体重（kg）'), '72.3');
    await user.click(screen.getByRole('button', { name: '保存体重' }));
    await screen.findByText('72.3 kg · 已记录');
    expect(write).toMatchObject({ expectedRevision: -1, data: { kg: 72.3, note: null } });
    expect(screen.getByRole('button', { name: '保存体重' })).toBeEnabled();
  });
  it('保存冲突保留输入，不覆盖后端值', async () => {
    let writes = 0;
    server.use(
      http.put('/api/v1/fitness/records/weight/:date', () => {
        writes++;
        return HttpResponse.json(
          { code: 40901, message: '记录已被修改，请重新读取' },
          { status: 409 },
        );
      }),
    );
    mount(
      <QuickRecords
        day={{
          ...day,
          records: {
            weight: { kind: 'weight', key: day.date, revision: 7, data: { kg: 70, note: null } },
          },
        }}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('体重（kg）'), '72.3');
    await user.click(screen.getByRole('button', { name: '保存体重' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('输入已保留');
    expect(screen.getByLabelText('体重（kg）')).toHaveValue(72.3);
    expect(writes).toBe(1);
    expect(screen.getByText('70 kg · 已记录')).toBeVisible();
  });
  it('从计划复制动作后状态未选、动作未完成，由用户明确填写', async () => {
    const exercise = {
      type: 'STRENGTH',
      name: '深蹲',
      sets: 3,
      reps: 10,
      kg: 20,
      minutes: null,
      km: null,
      note: null,
      completed: null,
    };
    server.use(
      http.get('/api/v1/fitness/days/:date', () =>
        ok({
          ...day,
          records: {
            'training-plan': {
              kind: 'training-plan',
              key: day.date,
              revision: 2,
              data: { rest: false, exercises: [exercise], note: null },
            },
          },
        }),
      ),
    );
    mount(<FitnessEditPage kind="training" />, `/fitness/edit/training?date=${day.date}&copy=1`);
    const status = await screen.findByLabelText('训练状态');
    expect(status).toHaveValue('');
    expect(screen.getByLabelText('项目 1 已完成')).not.toBeChecked();
    expect(status).toBeRequired();
    await userEvent.selectOptions(status, 'PARTIAL');
    expect(status).toHaveValue('PARTIAL');
  });
  it('未保存输入时空间路由被拦截，取消后输入继续保留', async () => {
    const { router } = mount(<QuickRecords day={day} />);
    await userEvent.type(screen.getByLabelText('体重（kg）'), '71');
    await router.navigate('/study');
    expect(await screen.findByRole('dialog', { name: '有未保存的修改' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/');
    await userEvent.click(screen.getByRole('button', { name: '取消' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText('体重（kg）')).toHaveValue(71);
  });
  it('训练编辑成功保存后直接返回，不重复触发放弃修改提示', async () => {
    server.use(
      http.get('/api/v1/fitness/days/:date', () => ok(day)),
      http.put('/api/v1/fitness/records/training-plan/:date', () =>
        ok({
          kind: 'training-plan',
          key: day.date,
          revision: 0,
          data: { rest: true, exercises: [], note: null },
        }),
      ),
    );
    const { router } = mount(
      <FitnessEditPage kind="training-plan" />,
      `/fitness/edit/training-plan?date=${day.date}`,
    );
    await userEvent.click(await screen.findByLabelText('安排为休息日'));
    await userEvent.click(screen.getByRole('button', { name: '保存训练安排' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/fitness'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
