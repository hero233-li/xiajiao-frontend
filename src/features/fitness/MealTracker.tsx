import { useState } from 'react';
import { fitnessApi, localToday, useFitnessMutation, type Day, type Food } from '../../api/fitness';
import { Button } from '../../components/Button';
import { useConfirmation } from '../../components/ConfirmationProvider';
import { FoodFields, mealNames } from './Editor';
import { Nutrition } from './display';
import { foodOccurrence, matchingFoodIndex, replaceMeal, toggleFood } from './meal-progress';
import { UnsavedGuard } from '../../components/UnsavedGuard';

export function MealTracker({ day, kind = 'meals' }: { day: Day; kind?: 'meals' | 'meal-plan' }) {
  const mutation = useFitnessMutation();
  const confirm = useConfirmation();
  const actual = kind === 'meals';
  const value = day.records[kind]?.data;
  const [editor, setEditor] = useState<{
    meal: Food['meal'];
    rows: Food[];
    baseline: Food[];
    dirty: boolean;
  } | null>(null);
  const [notice, setNotice] = useState('');
  const disabled = mutation.isPending || (actual && day.date > localToday());
  const perform = async (action: () => Promise<unknown>, message: string) => {
    setNotice('');
    try {
      await mutation.mutateAsync(action);
      setNotice(message);
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存失败，请重试');
      return false;
    }
  };
  const saveMeal = async () => {
    if (!editor) return;
    const saved = await perform(async () => {
      const latest = await fitnessApi.get(kind, day.date);
      const current = latest?.data?.foods.filter((food) => food.meal === editor.meal) ?? [];
      if (JSON.stringify(current) !== JSON.stringify(editor.baseline))
        throw new Error('这餐记录已在其他位置修改，请重新打开本餐编辑。当前输入仍保留。');
      return fitnessApi.save(
        kind,
        day.date,
        replaceMeal(latest?.data, editor.meal, editor.rows),
        latest?.revision ?? -1,
      );
    }, `${mealNames[editor.meal]}已保存，其他餐次保持不变`);
    if (saved) setEditor(null);
  };
  const mark = async (food: Food, occurrence: number, checked: boolean) => {
    await perform(
      async () => {
        const latest = await fitnessApi.get('meals', day.date);
        return fitnessApi.save(
          'meals',
          day.date,
          toggleFood(latest?.data, food, occurrence, checked),
          latest?.revision ?? -1,
        );
      },
      checked ? `${food.name}已记录为已吃` : `${food.name}已取消记录`,
    );
  };
  return (
    <div className="meal-tracker">
      {editor?.dirty && <UnsavedGuard dirty />}
      <p className="help">
        {actual
          ? '吃完一项勾选一项，进度自动保存。每餐可单独编辑和保存。'
          : '每餐食谱可以单独编辑和保存。'}
      </p>
      {Object.entries(mealNames).map(([type, name]) => {
        const meal = type as Food['meal'];
        const recorded = value?.foods.filter((food) => food.meal === meal) ?? [];
        const planned =
          day.records['meal-plan']?.data?.foods.filter((food) => food.meal === meal) ?? [];
        const rows = actual
          ? [
              ...planned,
              ...recorded.filter(
                (food, i) => matchingFoodIndex(planned, food, foodOccurrence(recorded, i)) < 0,
              ),
            ]
          : recorded;
        return (
          <section className="meal-line" key={meal} aria-label={name}>
            <div className="section-title">
              <h4>{name}</h4>
              <Button
                variant="ghost"
                disabled={disabled || !!editor}
                onClick={() => {
                  setNotice('');
                  setEditor({
                    meal,
                    rows: structuredClone(recorded.length ? recorded : actual ? planned : recorded),
                    baseline: structuredClone(recorded),
                    dirty: false,
                  });
                }}
              >
                {actual ? `编辑${name}` : `编辑${name}食谱`}
              </Button>
            </div>
            {editor?.meal === meal ? (
              <form
                className="platform-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveMeal();
                }}
              >
                <fieldset disabled={mutation.isPending}>
                  <FoodFields
                    mealType={meal}
                    rows={editor.rows}
                    onChange={(foods) => setEditor({ ...editor, rows: foods, dirty: true })}
                  />
                </fieldset>
                <div className="row">
                  <Button type="submit" disabled={mutation.isPending}>
                    保存{name}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={mutation.isPending}
                    onClick={async () => {
                      if (!editor.dirty || (await confirm('放弃这餐尚未保存的修改？')))
                        setEditor(null);
                    }}
                  >
                    取消
                  </Button>
                </div>
              </form>
            ) : (
              <div>
                {rows.map((food, index) => {
                  const occurrence = foodOccurrence(rows, index);
                  const recordedIndex = matchingFoodIndex(recorded, food, occurrence);
                  const checked = recordedIndex >= 0;
                  const displayed = checked ? recorded[recordedIndex] : food;
                  return (
                    <div className="food-check-row" key={`${food.name}-${occurrence}`}>
                      {actual && (
                        <input
                          type="checkbox"
                          aria-label={`${name}：${food.name} 已吃${occurrence ? `（第${occurrence + 1}份）` : ''}`}
                          checked={checked}
                          disabled={disabled || !!editor}
                          onChange={(event) => {
                            void mark(food, occurrence, event.target.checked);
                          }}
                        />
                      )}
                      <div>
                        <strong>{food.name}</strong> {displayed.quantity ?? '份量未填'}
                        {displayed.unit ?? ''}
                        {displayed.note && <small> · {displayed.note}</small>}
                      </div>
                    </div>
                  );
                })}
                {!rows.length && <p className="secondary">尚未填写</p>}
              </div>
            )}
          </section>
        );
      })}
      {notice && (
        <p role={mutation.isError ? 'alert' : 'status'} className="platform-notice">
          {notice}
        </p>
      )}
      {value && <Nutrition data={actual ? day.nutrition : day.plannedNutrition} />}
    </div>
  );
}
