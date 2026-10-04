import type { Food, Meals } from '../../api/fitness';

// Match repeated foods by occurrence within a meal; amounts remain editable in actual records.
export function matchingFoodIndex(rows: Food[], food: Food, occurrence: number): number {
  const matches = rows.flatMap((row, i) =>
    row.meal === food.meal && row.name === food.name ? [i] : [],
  );
  return matches[occurrence] ?? -1;
}
export function foodOccurrence(rows: Food[], index: number): number {
  const food = rows[index];
  return rows.slice(0, index).filter((row) => row.meal === food.meal && row.name === food.name)
    .length;
}
export function replaceMeal(
  current: Meals | null | undefined,
  meal: Food['meal'],
  foods: Food[],
): Meals {
  return {
    foods: [
      ...(current?.foods ?? []).filter((food) => food.meal !== meal),
      ...foods.map((food) => ({ ...food, meal })),
    ],
    note: current?.note ?? null,
  };
}
export function toggleFood(
  current: Meals | null | undefined,
  food: Food,
  occurrence: number,
  completed: boolean,
): Meals {
  const foods = [...(current?.foods ?? [])];
  const index = matchingFoodIndex(foods, food, occurrence);
  if (completed && index < 0) foods.push({ ...food });
  if (!completed && index >= 0) foods.splice(index, 1);
  return { foods, note: current?.note ?? null };
}
