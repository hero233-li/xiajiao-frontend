import { localToday, shiftDate } from '../../api/fitness';
import { Button } from '../../components/Button';

import type { FitnessWorkspace } from '../../pages/FitnessPage';
import { MealList } from './display';

export function MealsSection({ workspace }: { workspace: FitnessWorkspace }) {
  const { date, setCopy, setDestination, setTemplateName, remove, data, action } = workspace;
  if (!data) return null;
  return (
    <>
      <div className="planning-workspace">
        <section className="planning-column">
          <div className="section-title">
            <h2>计划吃什么</h2>
            {action('meal-plan', '编辑食谱')}
          </div>
          <MealList meal={data.records['meal-plan']?.data} nutrition={data.plannedNutrition} />
          {data.records['meal-plan']?.data && (
            <div className="row">
              <Button
                variant="ghost"
                onClick={() => {
                  setCopy({
                    kind: 'meal-plan',
                    mode: 'copy',
                    sourceKind: 'meal-plan',
                    sourceKey: date,
                    data: data.records['meal-plan']!.data!,
                  });
                  setDestination(shiftDate(date, 1));
                }}
              >
                复制食谱到日期
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setCopy({
                    kind: 'meal-plan',
                    mode: 'template',
                    data: data.records['meal-plan']!.data!,
                  });
                  setTemplateName('');
                }}
              >
                存为食谱模板
              </Button>
            </div>
          )}
        </section>
        <section className="planning-column">
          <div className="section-title">
            <h2>实际吃了什么</h2>
            {date <= localToday() && action('meals', '记录饮食')}
          </div>
          <MealList meal={data.records.meals?.data} nutrition={data.nutrition} />
          {date <= localToday() &&
            data.records['meal-plan']?.data &&
            action(
              'meals',
              '从计划复制为实际后修改',
              structuredClone(data.records['meal-plan'].data),
            )}
          {data.records.meals?.data && (
            <Button variant="ghost" onClick={() => remove(data.records.meals!, '实际饮食')}>
              删除实际饮食
            </Button>
          )}
        </section>
      </div>
      <section className="planning-column">
        <div className="section-title">
          <h2>饮水</h2>
          {date <= localToday() && action('water')}
        </div>
        <strong>
          {data.records.water?.data ? `${data.records.water.data.ml} ml` : '尚未记录'}
        </strong>
      </section>
    </>
  );
}
