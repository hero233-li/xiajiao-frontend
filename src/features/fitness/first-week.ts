import type { Day, Meals, TrainingPlan } from '../../api/fitness';
import { createUuid } from '../../utils/uuid';

export interface FirstWeekDay {
  title: string;
  training: TrainingPlan;
  meals: Meals;
}

// This page previews the saved week; it never invents a new week from a template.
export const firstWeekStartDate = '2026-10-05';

export function createFirstWeek(savedDays: Day[]): FirstWeekDay[] {
  if (
    savedDays.length !== 7 ||
    savedDays.some((day) => !day.records['training-plan']?.data || !day.records['meal-plan']?.data)
  )
    return [];
  return savedDays.map((day, index) => {
    const training = structuredClone(day.records['training-plan']!.data!);
    const meals = structuredClone(day.records['meal-plan']!.data!);
    training.exercises = training.exercises.map((exercise) => ({
      ...exercise,
      id: createUuid(),
      completed: null,
    }));
    return {
      title: training.note?.split('。')[0].replace(/^Day \d+｜/, '') || `第${index + 1}天`,
      training,
      meals,
    };
  });
}
