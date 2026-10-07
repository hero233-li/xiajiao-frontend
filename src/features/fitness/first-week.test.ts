import { describe, expect, it } from 'vitest';
import type { Day } from '../../api/fitness';
import { createFirstWeek } from './first-week';

const savedWeek = () =>
  Array.from({ length: 7 }, (_, i) => ({
    date: `2026-10-${String(i + 5).padStart(2, '0')}`,
    records: {
      'training-plan': {
        kind: 'training-plan',
        key: 'day',
        revision: 1,
        data: {
          rest: i >= 5,
          note: `Day ${i + 1}｜已保存安排。恢复说明。`,
          exercises:
            i >= 5
              ? []
              : [
                  {
                    id: `saved-${i}`,
                    name: '平地快走',
                    type: 'CARDIO',
                    minutes: 15,
                    sets: null,
                    reps: null,
                    kg: null,
                    km: null,
                    note: '按感受调整',
                    completed: false,
                  },
                ],
        },
      },
      'meal-plan': {
        kind: 'meal-plan',
        key: 'day',
        revision: 2,
        data: {
          note: '账号中的备餐说明',
          foods: [
            {
              meal: 'BREAKFAST',
              name: '米饭',
              quantity: 180,
              unit: 'g',
              kcal: null,
              protein: null,
              carbs: null,
              fat: null,
              note: '熟重',
            },
          ],
        },
      },
    },
  })) as Day[];

describe('saved personal first week', () => {
  it('reads the saved plan without inventing data or actual completion', () => {
    const saved = savedWeek();
    const days = createFirstWeek(saved);
    expect(days).toHaveLength(7);
    expect(days[0].meals).toEqual(saved[0].records['meal-plan']!.data);
    expect(days[0].training.exercises[0].completed).toBeNull();
    expect(days[0].training.exercises[0].kg).toBeNull();
    expect(days[5].training.rest).toBe(true);
    expect(days[6].training.exercises).toEqual([]);
  });
  it('does not substitute an old template when saved days are missing', () => {
    expect(createFirstWeek([])).toEqual([]);
    expect(createFirstWeek(savedWeek().slice(0, 6))).toEqual([]);
    const missing = savedWeek();
    delete missing[2].records['meal-plan'];
    expect(createFirstWeek(missing)).toEqual([]);
  });
  it('keeps account records and other drafts independent', () => {
    const saved = savedWeek();
    const original = JSON.stringify(saved);
    const first = createFirstWeek(saved),
      second = createFirstWeek(saved);
    first[0].meals.foods[0].quantity = 1;
    first[0].training.exercises[0].minutes = 99;
    expect(JSON.stringify(saved)).toBe(original);
    expect(second[0].meals.foods[0].quantity).toBe(180);
    expect(second[0].training.exercises[0].minutes).toBe(15);
    expect(first[0].training.exercises[0].id).not.toBe(second[0].training.exercises[0].id);
  });
});
