import { describe, expect, it } from 'vitest';
import { createFirstWeek } from './first-week';

describe('user-supplied first week', () => {
  it('preserves the seven-day sequence, two-set strength and rest day', () => {
    const days = createFirstWeek();
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.training.rest)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(days[0].training.exercises.map((e) => e.name)).toEqual([
      '跑步机热身',
      '动态热身',
      '腿举 Leg Press',
      '高位下拉 Lat Pulldown',
      '坐姿推胸 Chest Press',
      '坐姿划船 Seated Row',
      '坐姿腿弯举 Leg Curl',
      '髋外展 Hip Abduction',
      '跑步机爬坡',
      '慢走冷身',
    ]);
    expect(
      days
        .flatMap((d) => d.training.exercises)
        .filter((e) => e.type === 'STRENGTH')
        .every((e) => e.sets === 2),
    ).toBe(true);
    expect(days[5].training.exercises.reduce((sum, e) => sum + (e.minutes ?? 0), 0)).toBe(45);
    expect(days[6].training.exercises).toEqual([]);
    expect(days[0].training.exercises[3].kg).toBeNull();
    expect(days[0].training.exercises[3].note).toContain('10～15kg');
  });
  it('preserves all four meals with known portions and unknown nutrition', () => {
    const days = createFirstWeek();
    for (const day of days) {
      expect(new Set(day.meals.foods.map((f) => f.meal))).toEqual(
        new Set(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']),
      );
      expect(
        day.meals.foods.every(
          (f) => f.kcal === null && f.protein === null && f.carbs === null && f.fat === null,
        ),
      ).toBe(true);
    }
    expect(days[0].meals.foods.find((f) => f.name === '鸡胸肉')?.quantity).toBe(160);
    expect(days[6].meals.foods.find((f) => f.name === '全麦面包')?.note).toContain('1～2片');
  });
  it('creates independent drafts so edits do not mutate the supplied content', () => {
    const first = createFirstWeek(),
      second = createFirstWeek();
    first[0].training.exercises[2].kg = 25;
    first[0].meals.foods[0].quantity = 3;
    expect(second[0].training.exercises[2].kg).toBe(20);
    expect(second[0].meals.foods[0].quantity).toBe(2);
    expect(first[0].training.exercises[2].id).not.toBe(second[0].training.exercises[2].id);
  });
});
