import { localToday, shiftDate } from '../../api/fitness';
import { Button } from '../../components/Button';

import type { FitnessWorkspace } from '../../pages/FitnessPage';
import { MealTracker } from './MealTracker';

export function MealsSection({ workspace }: { workspace: FitnessWorkspace }) {
  const { date, setCopy, setDestination, setTemplateName, data, action } = workspace;
  if (!data) return null;
  return (
    <>
      <div className="meal-workspace">
        <section className="planning-column">
          <div className="section-title">
            <h2>当天食谱</h2>
          </div>
          <MealTracker key={date} day={data} />
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
