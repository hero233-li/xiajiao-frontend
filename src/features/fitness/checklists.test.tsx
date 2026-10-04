import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../mocks/server';
import {
  useFitnessDay,
  localToday,
  type Day,
  type Food,
  type Meals,
  type Training,
} from '../../api/fitness';
import { ConfirmationProvider } from '../../components/ConfirmationProvider';
import { MealTracker } from './MealTracker';
import { TrainingChecklist } from './TrainingChecklist';

const ok = (data: unknown) => HttpResponse.json({ code: 0, message: '成功', data });
const food = (name: string, meal: Food['meal']): Food => ({
  meal,
  name,
  quantity: 1,
  unit: '份',
  kcal: null,
  protein: null,
  carbs: null,
  fat: null,
  note: null,
});
const empty = { knownTotal: null, complete: false, knownCount: 0, foodCount: 0 };
function fixture(): Day {
  const nutrition = { kcal: empty, protein: empty, carbs: empty, fat: empty };
  return {
    date: localToday(),
    records: {},
    checkedIn: false,
    rest: false,
    partial: false,
    state: 'EMPTY',
    trainingState: 'UNPLANNED',
    nutrition,
    plannedNutrition: nutrition,
  };
}
function setup(training = false) {
  const day = fixture();
  const planned = [food('鸡蛋', 'BREAKFAST'), food('米饭', 'LUNCH'), food('鱼', 'DINNER')];
  day.records['meal-plan'] = {
    kind: 'meal-plan',
    key: day.date,
    revision: 1,
    data: { foods: planned, note: '计划' },
  };
  const exercises = ['腿举', '下拉'].map((name, i) => ({
    id: `exercise-${i}`,
    name,
    type: 'STRENGTH' as const,
    sets: 2,
    reps: 12,
    kg: 10,
    minutes: null,
    km: null,
    note: null,
    completed: false,
  }));
  day.records['training-plan'] = {
    kind: 'training-plan',
    key: day.date,
    revision: 1,
    data: { rest: false, exercises, note: '训练计划' },
  };
  let writes = 0;
  server.use(
    http.get('/api/v1/fitness/days/:date', () => ok(day)),
    http.get('/api/v1/fitness/records/:kind/:date', ({ params }) =>
      ok(day.records[params.kind as 'meals' | 'training'] ?? null),
    ),
    http.put('/api/v1/fitness/records/:kind/:date', async ({ params, request }) => {
      const kind = params.kind as 'meals' | 'training';
      const body = (await request.json()) as { data: Meals & Training; expectedRevision: number };
      expect(body.expectedRevision).toBe(day.records[kind]?.revision ?? -1);
      writes++;
      const revision = body.expectedRevision + 1;
      if (kind === 'meals') day.records.meals = { kind, key: day.date, revision, data: body.data };
      else day.records.training = { kind, key: day.date, revision, data: body.data };
      return ok(day.records[kind]);
    }),
  );
  function View() {
    const query = useFitnessDay(day.date);
    if (!query.data) return null;
    return training ? (
      <TrainingChecklist
        day={query.data}
        rows={query.data.records['training-plan']!.data!.exercises}
      />
    ) : (
      <MealTracker day={query.data} />
    );
  }
  const mount = () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const router = createMemoryRouter([
      {
        path: '*',
        element: (
          <ConfirmationProvider>
            <View />
          </ConfirmationProvider>
        ),
      },
    ]);
    return render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
  };
  return { day, mount, writes: () => writes };
}

describe('按餐保存和逐项完成进度', () => {
  it('早餐保存合并最新午餐和晚餐，不覆盖其他餐次与每日备注', async () => {
    const state = setup();
    const { day } = state;
    day.records.meals = {
      kind: 'meals',
      key: day.date,
      revision: 2,
      data: { foods: [food('鸡蛋', 'BREAKFAST'), food('牛肉', 'LUNCH')], note: '每日备注' },
    };
    state.mount();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '编辑早餐' }));
    const breakfast = within(screen.getByRole('region', { name: '早餐' }));
    await user.clear(breakfast.getByRole('textbox', { name: '食物名称' }));
    await user.type(breakfast.getByRole('textbox', { name: '食物名称' }), '牛奶');
    // A different meal was saved while this form remained open.
    day.records.meals!.revision = 3;
    day.records.meals!.data!.foods.push(food('虾仁', 'DINNER'));
    await user.click(breakfast.getByRole('button', { name: '保存早餐' }));
    await screen.findByText('早餐已保存，其他餐次保持不变');
    expect(day.records.meals!.data).toEqual({
      foods: [food('牛肉', 'LUNCH'), food('虾仁', 'DINNER'), food('牛奶', 'BREAKFAST')],
      note: '每日备注',
    });
    await user.click(screen.getByRole('button', { name: '编辑午餐' }));
    expect(
      within(screen.getByRole('region', { name: '午餐' })).getByRole('combobox', { name: '餐次' }),
    ).toHaveValue('LUNCH');
  });

  it('同一餐被其他位置修改时保留输入并阻止覆盖', async () => {
    const state = setup();
    state.mount();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '记录早餐' }));
    const field = within(screen.getByRole('region', { name: '早餐' })).getByRole('textbox', {
      name: '食物名称',
    });
    await user.clear(field);
    await user.type(field, '燕麦');
    state.day.records.meals = {
      kind: 'meals',
      key: state.day.date,
      revision: 0,
      data: { foods: [food('豆浆', 'BREAKFAST')], note: null },
    };
    await user.click(screen.getByRole('button', { name: '保存早餐' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('这餐记录已在其他位置修改');
    expect(field).toHaveValue('燕麦');
    expect(state.writes()).toBe(0);
  });

  it('食物勾选持久保存，重新打开后保留状态，取消只移除该食物', async () => {
    const state = setup();
    const first = state.mount();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('checkbox', { name: '早餐：鸡蛋 已吃' }));
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: '早餐：鸡蛋 已吃' })).toBeChecked(),
    );
    await user.click(screen.getByRole('checkbox', { name: '午餐：米饭 已吃' }));
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: '午餐：米饭 已吃' })).toBeChecked(),
    );
    first.unmount();
    state.mount();
    expect(await screen.findByRole('checkbox', { name: '早餐：鸡蛋 已吃' })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: '早餐：鸡蛋 已吃' }));
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: '早餐：鸡蛋 已吃' })).not.toBeChecked(),
    );
    expect(state.day.records.meals!.data!.foods).toEqual([food('米饭', 'LUNCH')]);
    expect(state.day.records['meal-plan']!.data!.foods).toHaveLength(3);
  });

  it('训练逐项保存，仅全部动作完成才完成整次训练，取消后恢复部分完成', async () => {
    const state = setup(true);
    state.mount();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('checkbox', { name: '腿举 已完成' }));
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: '腿举 已完成' })).toBeChecked(),
    );
    expect(state.day.records.training!.data!.status).toBe('PARTIAL');
    await user.click(screen.getByRole('checkbox', { name: '下拉 已完成' }));
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: '下拉 已完成' })).toBeChecked(),
    );
    expect(state.day.records.training!.data!.status).toBe('COMPLETED');
    await user.click(screen.getByRole('checkbox', { name: '腿举 已完成' }));
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: '腿举 已完成' })).not.toBeChecked(),
    );
    expect(state.day.records.training!.data!.status).toBe('PARTIAL');
    expect(state.day.records['training-plan']!.data!.exercises.every((e) => !e.completed)).toBe(
      true,
    );
  });

  it('取消编辑不触发保存，确认前保留未保存内容', async () => {
    const state = setup();
    state.mount();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '记录早餐' }));
    const field = within(screen.getByRole('region', { name: '早餐' })).getByRole('textbox', {
      name: '食物名称',
    });
    await user.type(field, '加餐');
    await user.click(screen.getByRole('button', { name: '取消' }));
    await user.click(await screen.findByRole('button', { name: '取消，保留内容' }));
    expect(field).toHaveValue('鸡蛋加餐');
    expect(state.writes()).toBe(0);
  });
});
